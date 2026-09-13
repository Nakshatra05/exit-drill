import type { DrillResult, Evidence } from "./types";

/** Portable planning evidence. Never a signed order or an executable quote. */
export function createExitBrief(evidence: Evidence, result: DrillResult) {
  const decimal = (value: number, places = 6) => Number(value.toFixed(places));
  if (
    evidence.mode !== "graph" ||
    result.evidenceMode !== "graph" ||
    evidence.block !== result.evidenceBlock
  )
    throw new Error(
      "A brief requires matching live Graph evidence and analysis.",
    );
  const { amountEth, payrollUsdc, shockPercent } = result.input;
  if (
    ![
      amountEth,
      payrollUsdc,
      shockPercent,
      result.amountOutUsdc,
      result.baselineUsdc,
    ].every(Number.isFinite) ||
    amountEth <= 0 ||
    payrollUsdc <= 0
  )
    throw new Error("Invalid analysis amounts.");
  const selected = result.routes.find(
    (route) => route.feeTier === result.selectedFee,
  );
  if (
    result.routes.length !== 2 ||
    result.routes.some(
      (r) =>
        ![r.baselineUsdc, r.stressedUsdc].every(
          (v) => Number.isFinite(v) && v >= 0,
        ),
    )
  )
    throw new Error("Invalid route estimates.");
  if (
    !selected ||
    Math.abs(selected.stressedUsdc - result.amountOutUsdc) > 0.000001
  )
    throw new Error("Selected route does not match analysis output.");
  const shortfall = Math.max(0, payrollUsdc - result.amountOutUsdc);
  return {
    schema: "exit-risk-brief/v1" as const,
    id: result.id,
    createdAt: result.executedAt,
    purpose:
      "Treasury cash-coverage planning; not an order or settlement quote",
    provenance: {
      provider: "The Graph",
      chainId: 1,
      block: evidence.block,
      blockTimestamp: evidence.timestamp,
      deployment: evidence.deployment ?? null,
      pools: evidence.pools.map((p) => ({
        address: p.id,
        feeTier: p.feeTier,
        tvlUsd: p.tvlUsd,
        volume24hUsd: p.volume24h,
      })),
    },
    inputs: {
      wethToSell: amountEth,
      cashTargetUsdc: payrollUsdc,
      priceShockPercent: shockPercent,
    },
    decision: {
      targetCovered: shortfall === 0,
      shortfallUsdc: decimal(shortfall),
      coveragePercent: decimal((result.amountOutUsdc / payrollUsdc) * 100, 4),
      estimatedBaselineUsdc: result.baselineUsdc,
      estimatedStressedUsdc: result.amountOutUsdc,
      preferredAnalysisFeeTier: result.selectedFee,
      routeAdvantageUsdc: decimal(
        Math.max(
          0,
          result.amountOutUsdc -
            Math.min(...result.routes.map((r) => r.stressedUsdc)),
        ),
      ),
    },
    routes: result.routes.map((r) => ({
      feeTier: r.feeTier,
      estimatedBaselineUsdc: r.baselineUsdc,
      estimatedStressedUsdc: r.stressedUsdc,
    })),
    assumptions: [
      result.caveat,
      "Full-range liquidity is inferred from TVL and price; historical tick liquidity is not reconstructed.",
      "The shock is a user-specified scenario, not a price prediction.",
      "Sepolia settlement uses separate pools and test assets. Obtain a fresh quote before trading.",
      "This JSON is a portable report, not a cryptographic attestation or an authorization to spend.",
    ],
    handoff: {
      network: "Sepolia",
      chainId: 11155111,
      requiresHumanConfirmation: true,
      requiresFreshQuote: true,
    },
  };
}
export type ExitBrief = ReturnType<typeof createExitBrief>;
