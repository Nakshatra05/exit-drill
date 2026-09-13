import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const base = process.argv[2] || "http://localhost:3000";
const input = {
  amountEth: 30,
  payrollUsdc: 60000,
  shockPercent: 25,
  slippageBps: 100,
};
async function post(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  return { status: response.status, body: await response.json() };
}
const evidence = await fetch(`${base}/api/evidence?mode=reference`).then((r) =>
  r.json(),
);
assert.equal(evidence.mode, "reference");
assert.equal(evidence.pools.length, 2);
const drill = await post("/api/drill", {
  input,
  evidenceMode: "reference",
  evidenceBlock: 0,
});
assert.equal(drill.status, 200, JSON.stringify(drill.body));
assert.equal(drill.body.selectedFee, 3000);
const execution = {
  input,
  evidenceMode: "reference",
  evidenceBlock: 0,
  feeTier: drill.body.selectedFee,
  minimumOutUsdc: drill.body.amountOutUsdc * 0.99,
  approved: true,
};
const rejected = await post("/api/execute", {
  ...execution,
  testViolation: true,
});
assert.equal(rejected.status, 400);
assert.match(rejected.body.error, /WrongRecipient/);
const settled = await post("/api/execute", execution);
assert.equal(settled.status, 200, JSON.stringify(settled.body));
const { checksum, ...receipt } = settled.body;
assert.equal(receipt.status, "confirmed");
assert.equal(
  Number(
    BigInt(receipt.balances.afterUsdc) - BigInt(receipt.balances.beforeUsdc),
  ) / 1e6,
  receipt.amountOutUsdc,
);
assert.equal(
  createHash("sha256").update(JSON.stringify(receipt)).digest("hex"),
  checksum,
);
const invalid = await post("/api/drill", {
  input: { ...input, amountEth: -1 },
});
assert.equal(invalid.status, 400);
const unapproved = await post("/api/execute", {
  ...execution,
  approved: false,
});
assert.equal(unapproved.status, 400);
const unauthenticated = await post("/api/privy/wallet", {});
assert.equal(unauthenticated.status, 401);
console.log(
  JSON.stringify(
    {
      base,
      checks: 7,
      amountOutUsdc: receipt.amountOutUsdc,
      coverage: drill.body.coveragePercent,
      transactionHash: receipt.transactionHash,
      receiptChecksumVerified: true,
    },
    null,
    2,
  ),
);
