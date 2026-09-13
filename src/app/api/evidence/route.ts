import { getEvidence } from "@/lib/graph";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return Response.json(
      await getEvidence(
        new URL(request.url).searchParams.get("mode") ?? "reference",
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Evidence unavailable" },
      { status: 503 },
    );
  }
}
