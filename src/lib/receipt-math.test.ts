import { expect, it } from "vitest";
import { balanceDeltaUsdc } from "./receipt-math";
it("preserves cents when reconciling transfers against very large balances", () => {
  const before = 1000000000000000000000n;
  const delta = 54896276370n;
  expect(balanceDeltaUsdc(before.toString(), (before + delta).toString())).toBe(
    54896.27637,
  );
});
