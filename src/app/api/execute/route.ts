import { acquire } from "@/lib/api-guard";
import { executeSchema } from "@/lib/validation";
import { getEvidence } from "@/lib/graph";
import { executeSandbox } from "@/lib/sandbox";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    release = acquire(request);
    const body = executeSchema.parse(await request.json());
    const evidence = await getEvidence(body.evidenceMode, body.evidenceBlock);
    return Response.json(
      await executeSandbox(
        body.input,
        evidence,
        body.feeTier,
        body.minimumOutUsdc,
        body.testViolation,
      ),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Execution failed";
    return Response.json(
      {
        error: message.includes("WrongRecipient")
          ? "WrongRecipient: the contract rejected the unauthorized recipient. No tokens moved."
          : message.slice(0, 300),
      },
      { status: 400 },
    );
  } finally {
    release?.();
  }
}
