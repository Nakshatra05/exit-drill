export async function GET() {
  return Response.json(
    {
      graph: !!(process.env.GRAPH_API_KEY && process.env.GRAPH_SUBGRAPH_ID),
      privy: !!(
        process.env.PRIVY_APP_ID &&
        process.env.PRIVY_APP_SECRET &&
        process.env.NEXT_PUBLIC_PRIVY_APP_ID
      ),
      executor: !!process.env.NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS,
      rpc: true,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
