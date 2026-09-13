import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const client = new Client({ name: "exit-drill-stdio-check", version: "1.0.0" });
try {
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [
        "--conditions=react-server",
        "--import",
        "tsx",
        resolve("tools/exit-risk-mcp/index.ts"),
      ],
      cwd: process.cwd(),
      stderr: "pipe",
    }),
  );
  const { tools } = await client.listTools();
  assert.equal(tools.length, 3);
  assert(tools.some((tool) => tool.name === "compare_price_shocks"));
  console.log("MCP stdio startup and discovery passed.");
} finally {
  await client.close();
}
