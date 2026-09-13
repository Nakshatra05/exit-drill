import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createRiskServer } from "../tools/exit-risk-mcp/server";
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const server = createRiskServer();
const client = new Client({ name: "exit-risk-verifier", version: "1.0.0" });
try {
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
  assert.ok(tools.every((t) => t.annotations?.readOnlyHint === true));
  const invalid = await client.callTool({
    name: "assess_treasury_exit",
    arguments: { amountWeth: -1, cashTargetUsdc: 25, priceShockPercent: 25 },
  });
  assert.equal(invalid.isError, true);
  console.log(
    "MCP discovery and invalid-input rejection passed; no transaction tools exposed.",
  );
  if (process.argv.includes("--live")) {
    const assessed = await client.callTool(
      {
        name: "compare_price_shocks",
        arguments: {
          amountWeth: 0.01,
          cashTargetUsdc: 22,
          priceShocks: [0, 25],
        },
      },
      undefined,
      { timeout: 120000 },
    );
    assert.ok(!assessed.isError);
    const content = assessed.content as { type: string; text: string }[];
    const value = JSON.parse(content[0].text);
    assert.ok(value.sourceBlock > 0);
    assert.equal(value.briefs.length, 2);
    assert.ok(
      value.briefs.every(
        (b: { provenance: { block: number } }) =>
          b.provenance.block === value.sourceBlock,
      ),
    );
    assert.ok(
      value.briefs[0].decision.estimatedStressedUsdc >
        value.briefs[1].decision.estimatedStressedUsdc,
    );
    console.log(
      JSON.stringify(
        {
          sourceBlock: value.sourceBlock,
          firstTestedUncoveredShock: value.firstTestedUncoveredShock,
          scenarios: value.briefs.map(
            (b: { inputs: unknown; decision: unknown }) => ({
              inputs: b.inputs,
              decision: b.decision,
            }),
          ),
        },
        null,
        2,
      ),
    );
  }
} finally {
  await client.close();
  await server.close();
}
