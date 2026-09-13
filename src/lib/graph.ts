import "server-only";
import { referenceEvidence } from "./reference";
import type { Evidence, PoolEvidence } from "./types";
const query = `query TreasuryEvidence { _meta { block { number timestamp } deployment hasIndexingErrors } pools(first: 2, orderBy: totalValueLockedUSD, orderDirection: desc, where: { feeTier_in: [500,3000], token0: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", token1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2" }) { id feeTier liquidity sqrtPrice tick totalValueLockedUSD token0 { symbol decimals } token1 { symbol decimals } poolDayData(first:7,orderBy:date,orderDirection:desc) {date tvlUSD volumeUSD} } }`;
export async function getEvidence(mode: string, block = 0): Promise<Evidence> {
  if (mode !== "graph") return referenceEvidence();
  const key = process.env.GRAPH_API_KEY,
    id = process.env.GRAPH_SUBGRAPH_ID;
  if (!key || !id)
    throw new Error(
      "Live Graph data needs GRAPH_API_KEY and GRAPH_SUBGRAPH_ID. Reference mode remains available.",
    );
  if (!Number.isSafeInteger(block) || block < 0 || block > 2147483647)
    throw new Error("Invalid evidence block.");
  const pinnedQuery = block
    ? query
        .replace("_meta {", `_meta(block: {number: ${block}}) {`)
        .replace("pools(first:", `pools(block: {number: ${block}}, first:`)
    : query;
  const res = await fetch(
    `https://gateway.thegraph.com/api/${encodeURIComponent(key)}/subgraphs/id/${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: pinnedQuery }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error(`Graph provider returned HTTP ${res.status}.`);
  const json = await res.json();
  if (json.errors?.length)
    throw new Error(
      "Graph query failed. Verify the deployment uses the Uniswap v3 schema and API access is enabled.",
    );
  const data = json.data;
  if (!data?._meta?.block?.timestamp || data._meta.hasIndexingErrors)
    throw new Error(
      "Graph source is missing freshness metadata or has indexing errors.",
    );
  const age = Date.now() / 1000 - data._meta.block.timestamp;
  if (age > 600 || age < -60)
    throw new Error(
      "Graph source is stale or its timestamp is invalid. Planning is blocked.",
    );
  const raw = data.pools.filter(
    (p: { token0: { symbol: string }; token1: { symbol: string } }) =>
      [p.token0.symbol, p.token1.symbol].sort().join("/") === "USDC/WETH",
  );
  if (
    ![500, 3000].every((fee) =>
      raw.some((p: { feeTier: string }) => Number(p.feeTier) === fee),
    )
  )
    throw new Error(
      "Both WETH/USDC fee tiers are required. Choose an Ethereum Uniswap v3 deployment.",
    );
  const pools: PoolEvidence[] = raw.map(
    (p: {
      id: string;
      feeTier: string;
      totalValueLockedUSD: string;
      liquidity: string;
      sqrtPrice: string;
      tick: string;
      token0: PoolEvidence["token0"];
      token1: PoolEvidence["token1"];
      poolDayData: PoolEvidence["history"];
    }) => ({
      id: p.id,
      feeTier: Number(p.feeTier),
      label: "WETH / USDC",
      tvlUsd: Number(p.totalValueLockedUSD),
      volume24h: Number(p.poolDayData[0]?.volumeUSD ?? 0),
      liquidity: p.liquidity,
      sqrtPrice: p.sqrtPrice,
      tick: Number(p.tick),
      token0: p.token0,
      token1: p.token1,
      history: [...p.poolDayData].reverse(),
    }),
  );
  return {
    mode: "graph",
    source: "The Graph · Uniswap v3",
    chain: "Ethereum · read only",
    block: data._meta.block.number,
    timestamp: new Date(data._meta.block.timestamp * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    deployment: data._meta.deployment,
    pools,
    warning:
      "Live discovery and history. Rehearsals use isolated reference pools, not a fork of this market.",
  };
}
