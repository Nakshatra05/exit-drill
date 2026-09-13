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
      "Market data is unavailable right now. Try an example scenario or retry shortly.",
    );
  if (!Number.isSafeInteger(block) || block < 0 || block > 2147483647)
    throw new Error("Invalid evidence block.");
  const pinnedQuery = block
    ? query
        .replace("_meta {", `_meta(block: {number: ${block}}) {`)
        .replace("pools(first:", `pools(block: {number: ${block}}, first:`)
    : query;
  const res = await fetch(
    `https://gateway.thegraph.com/api/subgraphs/id/${encodeURIComponent(id)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({ query: pinnedQuery }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok)
    throw new Error(
      "Market data is temporarily unavailable. Please retry shortly.",
    );
  const json = await res.json();
  if (json.errors?.length)
    throw new Error(
      "We couldn’t load this market snapshot. Refresh market data and try again.",
    );
  const data = json.data;
  if (!data?._meta?.block?.number || data._meta.hasIndexingErrors)
    throw new Error(
      "This market snapshot could not be verified. Please refresh market data.",
    );
  if (block && data._meta.block.number !== block)
    throw new Error(
      "The market snapshot changed. Refresh market data and run a new drill.",
    );
  // Graph Node can omit timestamps for historical _meta queries. Verify the
  // exact pinned Ethereum block over RPC rather than substituting latest data.
  let timestamp: number = data._meta.block.timestamp;
  if (!timestamp && block) {
    const response = await fetch(
      process.env.ETHEREUM_RPC_URL || "https://ethereum-rpc.publicnode.com",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBlockByNumber",
          params: [`0x${block.toString(16)}`, false],
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const canonical = await response.json();
    if (!response.ok || Number(canonical.result?.number) !== block)
      throw new Error(
        "This market snapshot could not be verified. Please refresh market data.",
      );
    timestamp = Number(canonical.result.timestamp);
  }
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0)
    throw new Error(
      "This market snapshot could not be verified. Please refresh market data.",
    );
  const age = Date.now() / 1000 - timestamp;
  if (age > 600 || age < -60)
    throw new Error(
      "Your market snapshot has expired. Refresh market data and run a new drill.",
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
      "We couldn’t compare both routes. Refresh market data or try an example scenario.",
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
    timestamp: new Date(timestamp * 1000).toISOString(),
    fetchedAt: new Date().toISOString(),
    deployment: data._meta.deployment,
    pools,
    warning:
      "Live discovery and history. Rehearsals use isolated reference pools, not a fork of this market.",
  };
}
