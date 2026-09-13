import type { Evidence } from "./types";
export function referenceEvidence(): Evidence {
  return {
    mode: "reference",
    source: "Exit Drill reproducible reference scenario",
    chain: "Isolated EVM · chain 31337",
    block: 0,
    timestamp: "2026-09-13T00:00:00.000Z",
    fetchedAt: new Date().toISOString(),
    warning:
      "Reference liquidity, not live market data. No partner credentials required. Transactions use valueless test tokens.",
    pools: [
      {
        id: "reference-500",
        feeTier: 500,
        label: "WETH / USDC",
        tvlUsd: 1100000,
        volume24h: 425000,
        liquidity: "0",
        sqrtPrice: "0",
        tick: 0,
        token0: { symbol: "WETH", decimals: "18" },
        token1: { symbol: "USDC", decimals: "6" },
        history: [
          1100000, 1080000, 1120000, 1040000, 980000, 1020000, 1100000,
        ].map((v, i) => ({
          date: 1788652800 + i * 86400,
          tvlUSD: String(v),
          volumeUSD: String(340000 + i * 14000),
        })),
      },
      {
        id: "reference-3000",
        feeTier: 3000,
        label: "WETH / USDC",
        tvlUsd: 6000000,
        volume24h: 1380000,
        liquidity: "0",
        sqrtPrice: "0",
        tick: 0,
        token0: { symbol: "WETH", decimals: "18" },
        token1: { symbol: "USDC", decimals: "6" },
        history: [
          5500000, 5700000, 5600000, 5800000, 6100000, 5900000, 6000000,
        ].map((v, i) => ({
          date: 1788652800 + i * 86400,
          tvlUSD: String(v),
          volumeUSD: String(1000000 + i * 60000),
        })),
      },
    ],
  };
}
