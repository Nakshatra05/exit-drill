import { acquire } from "@/lib/api-guard";
import { requestSchema } from "@/lib/validation";
import { getEvidence } from "@/lib/graph";
import { rehearse } from "@/lib/sandbox";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: Request) {
  let release: (() => void) | undefined;
  try {
    release = acquire(request);
    const body = requestSchema.parse(await request.json());
    const evidence = await getEvidence(body.evidenceMode);
    return Response.json(await rehearse(body.input, evidence));
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof Error ? e.message.slice(0, 300) : "Rehearsal failed",
      },
      { status: 400 },
    );
  } finally {
    release?.();
  }
}
