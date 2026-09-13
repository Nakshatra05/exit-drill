import { describe, it, expect } from "vitest";
import { drillSchema, executeSchema } from "./validation";
describe("untrusted request boundary", () => {
  const valid = {
    amountEth: 30,
    payrollUsdc: 60000,
    shockPercent: 25,
    slippageBps: 100,
  };
  it("rejects invalid numerical domains", () => {
    for (const amountEth of [NaN, Infinity, -1, 0, 101])
      expect(drillSchema.safeParse({ ...valid, amountEth }).success).toBe(
        false,
      );
  });
  it("caps stress and slippage", () => {
    expect(drillSchema.safeParse({ ...valid, shockPercent: 100 }).success).toBe(
      false,
    );
    expect(
      drillSchema.safeParse({ ...valid, slippageBps: 10000 }).success,
    ).toBe(false);
  });
  it("requires an explicit approval and whitelisted pool", () => {
    const body = {
      input: valid,
      feeTier: 500,
      minimumOutUsdc: 100,
      approved: true,
    };
    expect(executeSchema.safeParse(body).success).toBe(true);
    expect(executeSchema.safeParse({ ...body, approved: false }).success).toBe(
      false,
    );
    expect(executeSchema.safeParse({ ...body, feeTier: 10000 }).success).toBe(
      false,
    );
  });
  it("rejects injected arbitrary calldata or RPC destinations", () =>
    expect(
      executeSchema.safeParse({
        input: valid,
        feeTier: 500,
        minimumOutUsdc: 100,
        approved: true,
        rpcUrl: "http://localhost/admin",
      }).success,
    ).toBe(false));
});
