import "server-only";
import {
  createPublicClient,
  http,
  parseAbi,
  decodeEventLog,
  decodeFunctionData,
  encodeAbiParameters,
  keccak256,
  formatUnits,
  type Hex,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { liveConfig } from "./privy";
const executorAbi = parseAbi([
  "function tokenOut() view returns(address)",
  "function execute((uint256 amountIn,uint256 minOut,uint24 fee,address recipient,uint256 deadline,uint256 nonce) p) returns(uint256)",
  "event ExitSettled(address indexed owner,bytes32 indexed planHash,address indexed recipient,uint256 amountIn,uint256 amountOut,uint24 fee,uint256 nonce)",
]);
const transferAbi = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
export async function verifySettlement(hash: Hex) {
  const { executor } = liveConfig();
  const rpc = createPublicClient({
    chain: sepolia,
    transport: http(
      process.env.SEPOLIA_RPC_URL ||
        "https://ethereum-sepolia-rpc.publicnode.com",
      { timeout: 10000, retryCount: 1 },
    ),
  });
  const [receipt, transaction] = await Promise.all([
    rpc.getTransactionReceipt({ hash }),
    rpc.getTransaction({ hash }),
  ]);
  if (
    receipt.status !== "success" ||
    receipt.to?.toLowerCase() !== executor.toLowerCase()
  )
    throw new Error("Not a successful Exit Drill settlement.");
  const decoded = decodeFunctionData({
    abi: executorAbi,
    data: transaction.input,
  });
  if (decoded.functionName !== "execute")
    throw new Error("Not an exit transaction.");
  const plan = decoded.args[0];
  const events = receipt.logs
    .filter((log) => log.address.toLowerCase() === executor.toLowerCase())
    .flatMap((log) => {
      try {
        const event = decodeEventLog({
          abi: executorAbi,
          data: log.data,
          topics: log.topics,
        });
        return event.eventName === "ExitSettled" ? [event.args] : [];
      } catch {
        return [];
      }
    });
  if (events.length !== 1)
    throw new Error("Settlement event could not be verified.");
  const e = events[0];
  const expectedHash = keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        {
          type: "tuple",
          components: [
            { name: "amountIn", type: "uint256" },
            { name: "minOut", type: "uint256" },
            { name: "fee", type: "uint24" },
            { name: "recipient", type: "address" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        },
      ],
      [11155111n, executor, transaction.from, plan],
    ),
  );
  if (
    e.planHash !== expectedHash ||
    e.owner.toLowerCase() !== transaction.from.toLowerCase() ||
    e.recipient.toLowerCase() !== e.owner.toLowerCase() ||
    plan.recipient.toLowerCase() !== e.recipient.toLowerCase() ||
    e.amountIn !== plan.amountIn ||
    e.fee !== plan.fee ||
    e.nonce !== plan.nonce ||
    e.amountOut < plan.minOut
  )
    throw new Error("Transaction, limits, and settlement event disagree.");
  const [tokenOut, block] = await Promise.all([
    rpc.readContract({
      address: executor,
      abi: executorAbi,
      functionName: "tokenOut",
    }),
    rpc.getBlock({ blockNumber: receipt.blockNumber }),
  ]);
  let inflow = 0n;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== (tokenOut as Address).toLowerCase())
      continue;
    try {
      const { args } = decodeEventLog({
        abi: transferAbi,
        data: log.data,
        topics: log.topics,
      });
      if (args.to.toLowerCase() === e.recipient.toLowerCase())
        inflow += args.value;
      if (args.from.toLowerCase() === e.recipient.toLowerCase())
        inflow -= args.value;
    } catch {}
  }
  if (inflow !== e.amountOut)
    throw new Error("USDC transfer logs do not reconcile.");
  return {
    verified: true,
    chainId: 11155111,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    settledAt: new Date(Number(block.timestamp) * 1000).toISOString(),
    treasury: e.recipient,
    executor,
    amountInWeth: formatUnits(e.amountIn, 18),
    amountOutUsdc: formatUnits(e.amountOut, 6),
    minimumOutUsdc: formatUnits(plan.minOut, 6),
    planHash: expectedHash,
    feeTier: e.fee,
    checks: [
      "Successful transaction to the configured exit contract",
      "Sender and recipient match the treasury",
      "Calldata reproduces the onchain plan hash",
      "Received amount meets the signed minimum",
      "Token transfer logs match the settlement event",
    ],
    scope:
      "Verifies Sepolia transaction and token movements. Does not attest model accuracy or historical Privy policy configuration.",
  };
}
export type SettlementProof = Awaited<ReturnType<typeof verifySettlement>>;
