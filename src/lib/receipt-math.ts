export function balanceDeltaUsdc(before: string, after: string): number {
  // Subtract integer token units first. Converting large wallet balances to
  // Number before subtraction destroys precision even for a small transfer.
  return Number(BigInt(after) - BigInt(before)) / 1e6;
}
