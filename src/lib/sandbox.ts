import ganache from "ganache";
import {
  createPublicClient,
  createWalletClient,
  custom,
  parseAbi,
  parseUnits,
  formatUnits,
  keccak256,
  encodeAbiParameters,
  decodeEventLog,
  toHex,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import Router from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import Token from "../generated/TestToken.json";
import Seeder from "../generated/LiquiditySeeder.json";
import Executor from "../generated/ExitExecutor.json";
import type { DrillInput, DrillResult, Receipt, Evidence } from "./types";
import { randomUUID, createHash } from "node:crypto";
const erc20 = parseAbi([
  "function mint(address,uint256)",
  "function approve(address,uint256) returns(bool)",
  "function balanceOf(address) view returns(uint256)",
]);
const poolAbi = parseAbi([
  "function initialize(uint160)",
  "function slot0() view returns(uint160,int24,uint16,uint16,uint16,uint8,bool)",
]);
const chain = {
  id: 31337,
  name: "Exit Drill sandbox",
  nativeCurrency: { name: "Test ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://localhost:8545"] } },
} as const;
function sqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("Negative root");
  if (n < 2n) return n;
  let a = n,
    b = (a + 1n) / 2n;
  while (b < a) {
    a = b;
    b = (a + n / a) / 2n;
  }
  return a;
}
export function calibration(evidence?: Evidence) {
  let price = 2500;
  const reserves: Record<number, number> = { 500: 220, 3000: 1200 };
  if (evidence?.mode === "graph") {
    const p =
      evidence.pools.find((p) => p.feeTier === 500) || evidence.pools[0];
    const ratio =
      (Number(BigInt(p.sqrtPrice)) / 2 ** 96) ** 2 *
      10 ** (Number(p.token0.decimals) - Number(p.token1.decimals));
    price = p.token0.symbol === "WETH" ? ratio : 1 / ratio;
    if (!Number.isFinite(price) || price <= 1 || price > 1000000)
      throw new Error("Invalid Graph pool price.");
    for (const fee of [500, 3000]) {
      const match = evidence.pools.find((p) => p.feeTier === fee);
      if (!match) throw new Error(`Live source is missing fee tier ${fee}.`);
      reserves[fee] = Math.min(1000000, Math.max(1, match.tvlUsd / 2 / price));
    }
  }
  return { price, reserves };
}
export async function createSandbox(evidence?: Evidence) {
  const provider = ganache.provider({
    logging: { quiet: true },
    chain: {
      chainId: 31337,
      hardfork: "shanghai",
      time: new Date("2026-09-13T00:00:00Z"),
    },
    wallet: { deterministic: true, totalAccounts: 3, defaultBalance: 1000 },
    miner: { blockGasLimit: 30000000 },
  });
  const transport = custom({
    async request(args) {
      try {
        return await provider.request(args as Parameters<typeof provider.request>[0]);
      } catch (error) {
        // Ganache reports eth_call reverts as -32000. Normalize only EVM
        // reverts with return data so viem can decode the contract error.
        const failure = error as { code?: number; data?: unknown; message?: string };
        if (args.method === "eth_call" && typeof failure.data === "string" && failure.message?.includes("revert")) {
          throw Object.assign(new Error(failure.message), {code: 3, data: failure.data});
        }
        throw error;
      }
    },
  });
  const publicClient = createPublicClient({
    chain,
    transport,
    pollingInterval: 10,
  });
  const wallet = createWalletClient({ chain, transport });
  const [owner, attacker] = await wallet.getAddresses();
  const send = async (
    address: Address,
    abi: Abi,
    fn: string,
    args: readonly unknown[] = [],
    account = owner,
  ) => {
    const hash = await wallet.writeContract({
      address,
      abi,
      functionName: fn,
      args,
      account,
      gas: 12000000n,
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      pollingInterval: 10,
    });
    if (receipt.status !== "success")
      throw new Error(`Sandbox transaction reverted: ${fn}`);
    return receipt;
  };
  const deploy = async (
    a: { abi: unknown; bytecode: string },
    args: readonly unknown[] = [],
  ) => {
    const hash = await wallet.deployContract({
      abi: a.abi as Abi,
      bytecode: a.bytecode as Hex,
      args,
      account: owner,
      gas: 15000000n,
    });
    const r = await publicClient.waitForTransactionReceipt({
      hash,
      pollingInterval: 10,
    });
    if (!r.contractAddress || r.status !== "success")
      throw new Error("Sandbox deployment failed");
    return r.contractAddress;
  };
  try {
    const weth = await deploy(Token, ["Test Wrapped Ether", "WETH", 18]);
    const usdc = await deploy(Token, ["Test USD Coin", "USDC", 6]);
    const factory = await deploy(Factory),
      router = await deploy(Router, [factory, weth]),
      seeder = await deploy(Seeder),
      executor = await deploy(Executor, [
        router,
        weth,
        usdc,
        parseUnits("100", 18),
      ]);
    await send(weth, erc20, "mint", [owner, parseUnits("100000000", 18)]);
    await send(usdc, erc20, "mint", [owner, parseUnits("1000000000000000", 6)]);
    for (const token of [weth, usdc])
      await send(token, erc20, "approve", [seeder, 2n ** 256n - 1n]);
    await send(weth, erc20, "approve", [router, 2n ** 256n - 1n]);
    await send(weth, erc20, "approve", [executor, parseUnits("100", 18)]);
    const { price, reserves } = calibration(evidence);
    const pools: Record<number, Address> = {};
    for (const fee of [500, 3000]) {
      await send(factory, Factory.abi as Abi, "createPool", [weth, usdc, fee]);
      const pool = (await publicClient.readContract({
        address: factory,
        abi: Factory.abi as Abi,
        functionName: "getPool",
        args: [weth, usdc, fee],
      })) as Address;
      pools[fee] = pool;
      const eth = 10n ** 18n,
        usd = parseUnits(price.toFixed(6), 6);
      const wethFirst = weth.toLowerCase() < usdc.toLowerCase();
      const ratio = wethFirst
        ? sqrt((usd * 2n ** 192n) / eth)
        : sqrt((eth * 2n ** 192n) / usd);
      await send(pool, poolAbi, "initialize", [ratio]);
      const x = parseUnits(reserves[fee].toFixed(8), 18),
        y = parseUnits((reserves[fee] * price).toFixed(6), 6),
        liquidity = sqrt(x * y);
      const bound = fee === 500 ? 887270 : 887220;
      await send(seeder, Seeder.abi as Abi, "seed", [
        pool,
        -bound,
        bound,
        liquidity,
      ]);
    }
    const snapshot = () =>
      provider.request({
        method: "evm_snapshot",
        params: [],
      }) as Promise<string>;
    const revert = (id: string) =>
      provider.request({ method: "evm_revert", params: [id] });
    const shock = async (fee: number, percent: number) => {
      if (percent === 0) return;
      const amount =
        (reserves[fee] * (1 / Math.sqrt(1 - percent / 100) - 1)) /
        (1 - fee / 1e6);
      const block = await publicClient.getBlock();
      await send(router, Router.abi as Abi, "exactInputSingle", [
        {
          tokenIn: weth,
          tokenOut: usdc,
          fee,
          recipient: owner,
          deadline: block.timestamp + 600n,
          amountIn: parseUnits(amount.toFixed(12), 18),
          amountOutMinimum: 0n,
          sqrtPriceLimitX96: 0n,
        },
      ]);
    };
    const balance = () =>
      publicClient.readContract({
        address: usdc,
        abi: erc20,
        functionName: "balanceOf",
        args: [owner],
      });
    const plan = async (
      input: DrillInput,
      fee: number,
      minOut: number,
      bad = false,
    ) => ({
      amountIn: parseUnits(input.amountEth.toFixed(8), 18),
      minOut: parseUnits(Math.max(0.000001, minOut).toFixed(6), 6),
      fee,
      recipient: bad ? attacker : owner,
      deadline: (await publicClient.getBlock()).timestamp + 600n,
      nonce: 1n,
    });
    const exit = async (
      input: DrillInput,
      fee: number,
      minOut: number,
      bad = false,
    ) => {
      const p = await plan(input, fee, minOut, bad);
      const before = await balance();
      // Simulate first so named custom errors surface, rather than silently accepting a reverted receipt.
      await publicClient.simulateContract({
        address: executor,
        abi: Executor.abi as Abi,
        functionName: "execute",
        args: [p],
        account: owner,
      });
      const r = await send(executor, Executor.abi as Abi, "execute", [p]);
      const after = await balance();
      return { receipt: r, amountOut: after - before, before, after, plan: p };
    };
    return {
      provider,
      publicClient,
      wallet,
      owner,
      attacker,
      weth,
      usdc,
      executor,
      router,
      pools,
      send,
      snapshot,
      revert,
      shock,
      exit,
      plan,
      price,
      close: () => provider.disconnect(),
    };
  } catch (e) {
    await provider.disconnect();
    throw e;
  }
}
export async function rehearse(
  input: DrillInput,
  evidence: Evidence,
): Promise<DrillResult> {
  const s = await createSandbox(evidence);
  try {
    const routes = [];
    for (const fee of [500, 3000]) {
      let snap = await s.snapshot();
      const baseline = await s.exit(input, fee, 0.000001);
      await s.revert(snap);
      snap = await s.snapshot();
      await s.shock(fee, input.shockPercent);
      const stressed = await s.exit(input, fee, 0.000001);
      routes.push({
        feeTier: fee,
        baselineUsdc: Number(formatUnits(baseline.amountOut, 6)),
        stressedUsdc: Number(formatUnits(stressed.amountOut, 6)),
        priceImpactPercent:
          100 *
          (1 -
            Number(formatUnits(stressed.amountOut, 6)) /
              (input.amountEth * s.price)),
        gasUsed: stressed.receipt.gasUsed.toString(),
        pool: s.pools[fee],
      });
      await s.revert(snap);
    }
    const best = routes.reduce((a, b) =>
      a.stressedUsdc > b.stressedUsdc ? a : b,
    );
    return {
      id: randomUUID(),
      input,
      routes,
      selectedFee: best.feeTier,
      amountOutUsdc: best.stressedUsdc,
      coveragePercent: (best.stressedUsdc / input.payrollUsdc) * 100,
      shortfallUsdc: Math.max(0, input.payrollUsdc - best.stressedUsdc),
      baselineUsdc: best.baselineUsdc,
      executedAt: new Date().toISOString(),
      engine: "uniswap-v3-evm",
      chainId: 31337,
      evidenceMode: evidence.mode,
      evidenceBlock: evidence.block,
      scenarioDescription: `Competing WETH sells target a ${input.shockPercent}% marginal price decline in each isolated pool before the treasury exit.`,
      caveat:
        evidence.mode === "graph"
          ? "Synthetic full-range pools calibrated to live Graph TVL and price; not a mainnet fork or reconstruction of actual ticks."
          : "Reference full-range liquidity with initial WETH price of 2,500 USDC. No live market claim.",
    };
  } finally {
    await s.close();
  }
}
export async function executeSandbox(
  input: DrillInput,
  evidence: Evidence,
  fee: number,
  minOut: number,
  bad = false,
): Promise<Receipt> {
  const s = await createSandbox(evidence);
  try {
    await s.shock(fee, input.shockPercent);
    const r = await s.exit(input, fee, minOut, bad);
    let planHash = "";
    for (const log of r.receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: Executor.abi as Abi,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "ExitSettled")
          planHash = (decoded.args as unknown as { planHash: string }).planHash;
      } catch {}
    }
    const receipt: Receipt = {
      id: randomUUID(),
      chainId: 31337,
      mode: "sandbox",
      transactionHash: r.receipt.transactionHash,
      blockNumber: Number(r.receipt.blockNumber),
      executor: s.executor,
      recipient: s.owner,
      amountInEth: input.amountEth,
      amountOutUsdc: Number(formatUnits(r.amountOut, 6)),
      minimumOutUsdc: minOut,
      gasUsed: r.receipt.gasUsed.toString(),
      feeTier: fee,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      planHash,
      evidenceBlock: evidence.block,
      policy: {
        engine: "contract",
        checks: [
          "Recipient equals calling treasury",
          "Input <= 100 WETH",
          "Minimum output checked from balance delta",
          "Expiry within 15 minutes",
          "Nonce consumed once",
          "Uniswap v3 fee tier allowlist",
        ],
      },
      balances: {
        beforeUsdc: r.before.toString(),
        afterUsdc: r.after.toString(),
      },
    };
    receipt.checksum = createHash("sha256")
      .update(JSON.stringify(receipt))
      .digest("hex");
    return receipt;
  } finally {
    await s.close();
  }
}
