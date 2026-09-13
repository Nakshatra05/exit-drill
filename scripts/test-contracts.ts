import assert from "node:assert/strict";
import { parseAbi, parseUnits, type Abi } from "viem";
import { createSandbox, rehearse, executeSandbox } from "../src/lib/sandbox";
import Executor from "../src/generated/ExitExecutor.json";
import { referenceEvidence } from "../src/lib/reference";
const input = {
  amountEth: 30,
  payrollUsdc: 60000,
  shockPercent: 25,
  slippageBps: 100,
};
const result = await rehearse(input, referenceEvidence());
assert.equal(result.routes.length, 2);
assert.ok(result.amountOutUsdc > 0);
assert.ok(result.amountOutUsdc < result.baselineUsdc);
assert.equal(result.selectedFee, 3000);
console.log(
  "PASS: official Uniswap v3 rehearsal, shock and route selection",
  result.routes,
);
const receipt = await executeSandbox(
  input,
  referenceEvidence(),
  result.selectedFee,
  result.amountOutUsdc * 0.99,
);
assert.ok(receipt.amountOutUsdc >= receipt.minimumOutUsdc);
assert.ok(receipt.planHash.startsWith("0x"));
assert.equal(
  Number(
    BigInt(receipt.balances.afterUsdc) - BigInt(receipt.balances.beforeUsdc),
  ) / 1e6,
  receipt.amountOutUsdc,
);
console.log("PASS: settlement receipt matches ERC20 balance delta");
const s = await createSandbox();
try {
  const test = async (name: string, p: unknown, error: string) => {
    await assert.rejects(
      s.publicClient.simulateContract({
        address: s.executor,
        abi: Executor.abi as Abi,
        functionName: "execute",
        args: [p],
        account: s.owner,
      }),
      new RegExp(error),
    );
    console.log("PASS:", name);
  };
  const p = await s.plan(input, 500, 1);
  await test(
    "wrong recipient",
    { ...p, recipient: s.attacker },
    "WrongRecipient",
  );
  await test(
    "oversized input",
    { ...p, amountIn: parseUnits("101", 18) },
    "InputLimit",
  );
  await test("zero minimum output", { ...p, minOut: 0n }, "InputLimit");
  await test("expired plan", { ...p, deadline: 1n }, "Expired");
  await test(
    "unbounded expiry",
    { ...p, deadline: p.deadline + 1000n },
    "Expired",
  );
  await test("unknown fee tier", { ...p, fee: 10000 }, "UnsupportedPool");
  await assert.rejects(s.exit(input, 500, 500000));
  console.log("PASS: insufficient output reverts");
  await s.exit(input, 500, 1);
  await test("replay protection", p, "Replay");
  const allowance = await s.publicClient.readContract({
    address: s.weth,
    abi: parseAbi([
      "function allowance(address,address) view returns(uint256)",
    ]),
    functionName: "allowance",
    args: [s.executor, s.router],
  });
  assert.equal(allowance, 0n);
  console.log("PASS: executor router approval cleared after exit");
} finally {
  await s.close();
}
console.log("All EVM integration and guard checks passed.");
