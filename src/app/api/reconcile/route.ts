import { authenticate, liveConfig } from "@/lib/privy";
import {
  createPublicClient,
  http,
  decodeEventLog,
  decodeFunctionData,
  parseAbi,
  formatUnits,
  type Hex,
  type Address,
  type Abi,
} from "viem";
import { sepolia } from "viem/chains";
import { z } from "zod";
import { randomUUID, createHash } from "node:crypto";
import Executor from "@/generated/ExitExecutor.json";
import type { Receipt } from "@/lib/types";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { hash } = z
      .object({ hash: z.string().regex(/^0x[0-9a-fA-F]{64}$/) })
      .strict()
      .parse(await request.json());
    const { client, userId } = await authenticate(request);
    const { executor } = liveConfig();
    const rpc = createPublicClient({
      chain: sepolia,
      transport: http(
        process.env.SEPOLIA_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com",
      ),
    });
    const tx = await rpc.getTransactionReceipt({ hash: hash as Hex });
    if (
      tx.status !== "success" ||
      tx.to?.toLowerCase() !== executor.toLowerCase()
    )
      throw new Error("Not a confirmed ExitExecutor transaction.");
    let args:
      | {
          owner: Address;
          recipient: Address;
          amountIn: bigint;
          amountOut: bigint;
          fee: number;
          planHash: Hex;
        }
      | undefined;
    for (const log of tx.logs) {
      if (log.address.toLowerCase() !== executor.toLowerCase()) continue;
      try {
        const e = decodeEventLog({
          abi: Executor.abi as Abi,
          topics: log.topics,
          data: log.data,
        });
        if (e.eventName === "ExitSettled")
          args = e.args as unknown as typeof args;
      } catch {}
    }
    if (!args) throw new Error("Settlement event missing.");
    const wallets = await client
      .wallets()
      .list({ user_id: userId, chain_type: "ethereum" });
    if (
      !wallets.data.some(
        (w) => w.address.toLowerCase() === args!.owner.toLowerCase(),
      )
    )
      throw new Error("This settlement belongs to another wallet.");
    const outputToken = (await rpc.readContract({
      address: executor,
      abi: Executor.abi as Abi,
      functionName: "tokenOut",
    })) as Address;
    let net = 0n;
    const transferAbi = parseAbi([
      "event Transfer(address indexed from,address indexed to,uint256 value)",
    ]);
    for (const log of tx.logs) {
      if (log.address.toLowerCase() !== outputToken.toLowerCase()) continue;
      try {
        const e = decodeEventLog({
          abi: transferAbi,
          topics: log.topics,
          data: log.data,
        });
        if (e.args.to.toLowerCase() === args.recipient.toLowerCase())
          net += e.args.value;
        if (e.args.from.toLowerCase() === args.recipient.toLowerCase())
          net -= e.args.value;
      } catch {}
    }
    if (net !== args.amountOut)
      throw new Error("Transfer-log reconciliation failed.");
    const transaction = await rpc.getTransaction({ hash: hash as Hex });
    const decoded = decodeFunctionData({
      abi: Executor.abi as Abi,
      data: transaction.input,
    });
    const plan = (decoded.args as unknown as [{ minOut: bigint }])[0];
    const receipt: Receipt = {
      id: randomUUID(),
      chainId: 11155111,
      mode: "sepolia",
      transactionHash: hash,
      blockNumber: Number(tx.blockNumber),
      executor,
      recipient: args.recipient,
      amountInEth: Number(formatUnits(args.amountIn, 18)),
      amountOutUsdc: Number(formatUnits(args.amountOut, 6)),
      minimumOutUsdc: Number(formatUnits(plan.minOut, 6)),
      gasUsed: tx.gasUsed.toString(),
      feeTier: args.fee,
      status: "confirmed",
      createdAt: new Date().toISOString(),
      planHash: args.planHash,
      evidenceBlock: 0,
      policy: {
        engine: "privy-and-contract",
        checks: [
          "Authenticated Privy owner",
          "Successful executor transaction",
          "Settlement event matches token transfer logs",
        ],
      },
      balances: {
        beforeUsdc: "0",
        afterUsdc: net.toString(),
        basis: "transaction-logs",
      },
    };
    receipt.checksum = createHash("sha256")
      .update(JSON.stringify(receipt))
      .digest("hex");
    return Response.json(receipt);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error
            ? e.message.slice(0, 200)
            : "Reconciliation failed",
      },
      { status: 400 },
    );
  }
}
