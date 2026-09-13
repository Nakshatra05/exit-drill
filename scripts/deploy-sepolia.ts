import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseUnits,
  type Abi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { mkdirSync, writeFileSync } from "node:fs";
import Factory from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import Router from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import Token from "../src/generated/TestToken.json";
import Seeder from "../src/generated/LiquiditySeeder.json";
import Executor from "../src/generated/ExitExecutor.json";

// A public test deployment with independent pools and valueless tokens.
// The factory/router use official v3 package bytecode; these are NOT canonical
// Uniswap deployments or real WETH/USDC. Never run this on a funded mainnet key.
if (!process.argv.includes("--broadcast")) {
  console.log(
    "Deploy six contracts and seed two valueless Uniswap v3 pools on Sepolia. Add --broadcast to execute. Requires DEPLOYER_PRIVATE_KEY and Sepolia gas.",
  );
  process.exit(0);
}
const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key))
  throw new Error("Set DEPLOYER_PRIVATE_KEY in .env.local.");
const account = privateKeyToAccount(key as Hex);
const transport = http(
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
);
const rpc = createPublicClient({ chain: sepolia, transport });
if ((await rpc.getChainId()) !== 11155111)
  throw new Error("Only Sepolia is supported.");
const wallet = createWalletClient({ account, chain: sepolia, transport });
const deploy = async (
  artifact: { abi: unknown; bytecode: string },
  args: readonly unknown[] = [],
) => {
  const hash = await wallet.deployContract({
    abi: artifact.abi as Abi,
    bytecode: artifact.bytecode as Hex,
    args,
  });
  const r = await rpc.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (r.status !== "success" || !r.contractAddress)
    throw new Error(`Deployment failed: ${hash}`);
  console.log("Deployed", r.contractAddress);
  return r.contractAddress;
};
const send = async (
  address: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[],
) => {
  const simulated = await rpc.simulateContract({
    account,
    address,
    abi,
    functionName,
    args,
  });
  const hash = await wallet.writeContract(simulated.request);
  const r = await rpc.waitForTransactionReceipt({ hash, confirmations: 2 });
  if (r.status !== "success") throw new Error(`Transaction failed: ${hash}`);
};
const weth = await deploy(Token, ["Exit Drill Test Ether", "WETH", 18]);
const usdc = await deploy(Token, ["Exit Drill Test Dollar", "USDC", 6]);
const factory = await deploy(Factory);
const router = await deploy(Router, [factory, weth]);
const seeder = await deploy(Seeder);
const executor = await deploy(Executor, [
  router,
  weth,
  usdc,
  parseUnits("100", 18),
]);
mkdirSync(".local", { recursive: true });
writeFileSync(
  ".local/sepolia-deployment.json",
  JSON.stringify(
    {
      chainId: 11155111,
      weth,
      usdc,
      factory,
      router,
      seeder,
      executor,
      deployer: account.address,
      seeded: false,
    },
    null,
    2,
  ),
);
const tokenAbi = parseAbi([
  "function mint(address,uint256)",
  "function approve(address,uint256) returns(bool)",
]);
await send(weth, tokenAbi, "mint", [account.address, parseUnits("10000", 18)]);
await send(usdc, tokenAbi, "mint", [
  account.address,
  parseUnits("25000000", 6),
]);
for (const token of [weth, usdc])
  await send(token, tokenAbi, "approve", [seeder, 2n ** 256n - 1n]);
const sqrt = (n: bigint) => {
  let a = n,
    b = (a + 1n) / 2n;
  while (b < a) {
    a = b;
    b = (a + n / a) / 2n;
  }
  return a;
};
const pools: Record<number, Address> = {};
for (const [fee, reserve] of [
  [500, 220],
  [3000, 1200],
]) {
  await send(factory, Factory.abi as Abi, "createPool", [weth, usdc, fee]);
  const pool = (await rpc.readContract({
    address: factory,
    abi: Factory.abi as Abi,
    functionName: "getPool",
    args: [weth, usdc, fee],
  })) as Address;
  pools[fee] = pool;
  const eth = 10n ** 18n,
    usd = parseUnits("2500", 6);
  const ratio =
    weth.toLowerCase() < usdc.toLowerCase()
      ? sqrt((usd * 2n ** 192n) / eth)
      : sqrt((eth * 2n ** 192n) / usd);
  await send(pool, parseAbi(["function initialize(uint160)"]), "initialize", [
    ratio,
  ]);
  const liquidity = sqrt(
    parseUnits(String(reserve), 18) * parseUnits(String(reserve * 2500), 6),
  );
  const bound = fee === 500 ? 887270 : 887220;
  await send(seeder, Seeder.abi as Abi, "seed", [
    pool,
    -bound,
    bound,
    liquidity,
  ]);
}
writeFileSync(
  ".local/sepolia-deployment.json",
  JSON.stringify(
    {
      chainId: 11155111,
      weth,
      usdc,
      factory,
      router,
      seeder,
      executor,
      pools,
      seeded: true,
    },
    null,
    2,
  ),
);
console.log(
  `NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS=${executor}\nNEXT_PUBLIC_TEST_TOKEN_ADDRESS=${weth}`,
);
