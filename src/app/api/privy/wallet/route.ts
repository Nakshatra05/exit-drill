import { provisionWallet } from "@/lib/privy";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!request.headers.get("Authorization")?.startsWith("Bearer "))
    return Response.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  try {
    return Response.json(await provisionWallet(request));
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message.slice(0, 200) : "Wallet setup failed",
      },
      { status: 400 },
    );
  }
}
