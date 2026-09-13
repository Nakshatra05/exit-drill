import { describe, expect, it } from "vitest";
import { createExitBrief } from "./exit-brief";
import type { Evidence, DrillResult } from "./types";
const evidence = {
  mode: "graph",
  block: 123,
  timestamp: "2026-09-13T10:00:00Z",
  pools: [],
} as unknown as Evidence;
const result = {
  id: "analysis",
  input: {
    amountEth: 1,
    payrollUsdc: 2000,
    shockPercent: 25,
    slippageBps: 100,
  },
  evidenceMode: "graph",
  evidenceBlock: 123,
  selectedFee: 500,
  baselineUsdc: 2400,
  amountOutUsdc: 1800,
  routes: [
    { feeTier: 500, baselineUsdc: 2400, stressedUsdc: 1800 },
    { feeTier: 3000, baselineUsdc: 2390, stressedUsdc: 1780 },
  ],
  caveat: "Model estimate",
  executedAt: "2026-09-13T10:01:00Z",
} as DrillResult;
describe("portable exit brief", () => {
  it("binds cash coverage and route advantage to the reported evidence", () => {
    const b = createExitBrief(evidence, result);
    expect(b.decision).toMatchObject({
      targetCovered: false,
      shortfallUsdc: 200,
      coveragePercent: 90,
      routeAdvantageUsdc: 20,
    });
    expect(b.provenance.block).toBe(123);
    expect(b.handoff.requiresHumanConfirmation).toBe(true);
  });
  it("rejects evidence substitution and reference fixtures", () => {
    expect(() =>
      createExitBrief({ ...evidence, block: 124 }, result),
    ).toThrow();
    expect(() =>
      createExitBrief({ ...evidence, mode: "reference" }, result),
    ).toThrow();
  });
  it("rejects altered winning output and invalid targets", () => {
    expect(() =>
      createExitBrief(evidence, { ...result, amountOutUsdc: 2500 }),
    ).toThrow();
    expect(() =>
      createExitBrief(evidence, {
        ...result,
        input: { ...result.input, payrollUsdc: 0 },
      }),
    ).toThrow();
  });
});
