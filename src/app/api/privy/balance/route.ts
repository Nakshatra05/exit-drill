import { authorizeWallet, liveConfig } from "@/lib/privy";
import { walletError } from "@/lib/wallet-errors";
import {
  createPublicClient,
  http,
  parseAbi,
  formatUnits,
  type Address,
} from "viem";
import { sepolia } from "viem/chains";
import { z } from "zod";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  try {
    const { walletId } = z
      .object({ walletId: z.string().min(1).max(100) })
      .strict()
      .parse(await request.json());
    const { wallet } = await authorizeWallet(request, walletId);
    const { executor, token } = liveConfig();
    const rpc = createPublicClient({
      chain: sepolia,
      transport: http(
        process.env.SEPOLIA_RPC_URL ||
          "https://ethereum-sepolia-rpc.publicnode.com",
        { timeout: 10000, retryCount: 1 },
      ),
    });
    const address = wallet.address as Address;
    const output = await rpc.readContract({
      address: executor,
      abi: parseAbi(["function tokenOut() view returns(address)"]),
      functionName: "tokenOut",
    });
    const abi = parseAbi([
      "function balanceOf(address) view returns(uint256)",
      "function allowance(address,address) view returns(uint256)",
    ]);
    const [eth, weth, usdc, allowance] = await Promise.all([
      rpc.getBalance({ address }),
      rpc.readContract({
        address: token,
        abi,
        functionName: "balanceOf",
        args: [address],
      }),
      rpc.readContract({
        address: output,
        abi,
        functionName: "balanceOf",
        args: [address],
      }),
      rpc.readContract({
        address: token,
        abi,
        functionName: "allowance",
        args: [address, executor],
      }),
    ]);
    return Response.json({
      address,
      eth: formatUnits(eth, 18),
      weth: formatUnits(weth, 18),
      usdc: formatUnits(usdc, 6),
      allowance: formatUnits(allowance, 18),
    });
  } catch (e) {
    const { error, status } = walletError(e);
    return Response.json({ error }, { status });
  }
}
