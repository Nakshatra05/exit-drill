import { authorizeWallet, liveConfig } from "@/lib/privy";
import { walletError } from "@/lib/wallet-errors";
import {
  createPublicClient,
  http,
  encodeFunctionData,
  parseAbi,
  parseUnits,
  type Abi,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { z } from "zod";
import Executor from "@/generated/ExitExecutor.json";
const schema = z
  .object({
    walletId: z.string().min(1).max(100),
    action: z.enum(["mint", "approve", "quote", "execute", "test-policy"]),
    amount: z.number().finite().min(0.001).max(100).default(0.01),
    fee: z.union([z.literal(500), z.literal(3000)]).default(3000),
    minimumOut: z.string().regex(/^\d+$/).optional(),
    nonce: z.string().regex(/^\d+$/).optional(),
    deadline: z.number().int().optional(),
  })
  .strict();
const tokenAbi = parseAbi([
  "function mint(address to,uint256 amount)",
  "function approve(address spender,uint256 amount) returns(bool)",
  "function transfer(address to,uint256 amount) returns(bool)",
]);
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const { client, wallet } = await authorizeWallet(request, body.walletId);
    const { executor, token } = liveConfig();
    const rpc = createPublicClient({
      chain: sepolia,
      transport: http(
        process.env.SEPOLIA_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com",
        { timeout: 15000 },
      ),
    });
    const owner = wallet.address as Address,
      amount = parseUnits(body.amount.toFixed(8), 18);
    const p = {
      amountIn: amount,
      minOut: BigInt(body.minimumOut ?? "1"),
      fee: body.fee,
      recipient: owner,
      deadline: BigInt(
        body.deadline ?? Number((await rpc.getBlock()).timestamp) + 600,
      ),
      nonce: BigInt(body.nonce ?? Date.now()),
    };
    if (body.action === "quote") {
      const r = await rpc.simulateContract({
        address: executor,
        abi: Executor.abi as Abi,
        functionName: "execute",
        args: [p],
        account: owner,
      });
      return Response.json({
        amountOut: String(r.result),
        nonce: p.nonce.toString(),
        deadline: Number(p.deadline),
        chainId: 11155111,
      });
    }
    let to: Address = token,
      data;
    if (body.action === "mint")
      data = encodeFunctionData({
        abi: tokenAbi,
        functionName: "mint",
        args: [owner, amount],
      });
    else if (body.action === "approve")
      data = encodeFunctionData({
        abi: tokenAbi,
        functionName: "approve",
        args: [executor, amount],
      });
    else if (body.action === "test-policy")
      data = encodeFunctionData({
        abi: tokenAbi,
        functionName: "transfer",
        args: [owner, 0n],
      });
    else {
      if (!body.minimumOut || !body.nonce || !body.deadline || p.minOut <= 0n)
        throw new Error(
          "A fresh quote and explicit minimum output are required.",
        );
      to = executor;
      data = encodeFunctionData({
        abi: Executor.abi as Abi,
        functionName: "execute",
        args: [p],
      });
      await rpc.simulateContract({
        address: executor,
        abi: Executor.abi as Abi,
        functionName: "execute",
        args: [p],
        account: owner,
      });
    }
    const sent = await client
      .wallets()
      .ethereum()
      .sendTransaction(wallet.id, {
        caip2: "eip155:11155111",
        params: { transaction: { to, data, value: "0x0", chain_id: 11155111 } },
        idempotency_key: `${wallet.id}-${body.action}-${p.nonce}`,
      });
    return Response.json({
      hash: sent.hash,
      chainId: 11155111,
      action: body.action,
    });
  } catch (e) {
    if (e instanceof z.ZodError)
      return Response.json(
        { error: "Check the amount and request a fresh preview." },
        { status: 400 },
      );
    const { error, status } = walletError(e);
    return Response.json({ error }, { status });
  }
}
