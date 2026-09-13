import { verifySettlement } from "@/lib/verify-settlement";
import { acquire } from "@/lib/api-guard";
import type { Hex } from "viem";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  let release: (() => void) | undefined;
  try {
    release = acquire(request);
    const hash = new URL(request.url).searchParams.get("hash");
    if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash))
      return Response.json(
        { error: "Enter a valid transaction hash." },
        { status: 400 },
      );
    return Response.json(await verifySettlement(hash as Hex));
  } catch {
    return Response.json(
      {
        error:
          "This settlement could not be verified. Check that the hash belongs to a confirmed Exit Drill transaction on Sepolia, then retry.",
      },
      { status: 400 },
    );
  } finally {
    release?.();
  }
}
