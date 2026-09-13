import { provisionWallet } from "@/lib/privy";
import { walletError } from "@/lib/wallet-errors";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  if (!request.headers.get("Authorization")?.startsWith("Bearer "))
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  try {
    return Response.json(await provisionWallet(request));
  } catch (e) {
    const { error, status } = walletError(e);
    return Response.json({ error }, { status });
  }
}
