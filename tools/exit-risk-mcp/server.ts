import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getEvidence } from "../../src/lib/graph";
import { rehearse } from "../../src/lib/sandbox";
import { createExitBrief } from "../../src/lib/exit-brief";

export function createRiskServer() {
  const server = new McpServer(
    { name: "exit-risk-mcp", version: "1.0.0" },
    {
      instructions:
        "Read-only treasury analysis using live Ethereum data from The Graph. Call assess_treasury_exit or compare_price_shocks to reason about cash coverage. All outputs are model estimates, not executable quotes. State their block provenance and assumptions. No tool can authorize or submit a transaction. Users must separately review a fresh quote and confirm a trade. Never ask for private keys or signing secrets.",
    },
  );
  const annotations = {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  };
  let running = false;
  const guarded = async (work: () => Promise<unknown>) => {
    if (running)
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: "An analysis is already running. Wait for it before requesting another.",
          },
        ],
      };
    running = true;
    try {
      const value = await work();
      return {
        content: [{ type: "text" as const, text: JSON.stringify(value) }],
      };
    } catch {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: "Live evidence or analysis could not be verified. Check Graph configuration and retry; no substitute dataset was used.",
          },
        ],
      };
    } finally {
      running = false;
    }
  };
  const amount = z
    .number()
    .finite()
    .min(0.01)
    .max(100)
    .describe("User-specified WETH amount; not a fetched wallet balance");
  const target = z
    .number()
    .finite()
    .min(1)
    .max(500000)
    .describe("User-specified cash requirement in USDC");
  const shock = z
    .number()
    .finite()
    .min(0)
    .max(70)
    .describe("Hypothetical price decline percent, not a prediction");
  server.registerTool(
    "get_liquidity_evidence",
    {
      description:
        "Read fresh Ethereum WETH/USDC liquidity and seven-day history from The Graph. Reject stale or unverified data. No Exit Drill account, app API, or wallet required.",
      inputSchema: {},
      annotations,
    },
    async () =>
      guarded(async () => ({
        ...(await getEvidence("graph")),
        usage: "Liquidity evidence for planning; not a trade quote",
      })),
  );
  server.registerTool(
    "assess_treasury_exit",
    {
      description:
        "Use live Graph liquidity to execute competing route stress scenarios with official Uniswap v3 bytecode locally. Return a structured cash-coverage brief with provenance, route advantage, shortfall and explicit modeling assumptions.",
      inputSchema: {
        amountWeth: amount,
        cashTargetUsdc: target,
        priceShockPercent: shock,
      },
      annotations,
    },
    async ({ amountWeth, cashTargetUsdc, priceShockPercent }) =>
      guarded(async () => {
        const evidence = await getEvidence("graph");
        const result = await rehearse(
          {
            amountEth: amountWeth,
            payrollUsdc: cashTargetUsdc,
            shockPercent: priceShockPercent,
            slippageBps: 100,
          },
          evidence,
        );
        return createExitBrief(evidence, result);
      }),
  );
  server.registerTool(
    "compare_price_shocks",
    {
      description:
        "Compare up to three user-chosen price shocks against ONE live Graph snapshot. Rank cash shortfalls and identify the first tested shock that misses the cash target. Does not interpolate a liquidation threshold or submit trades.",
      inputSchema: {
        amountWeth: amount,
        cashTargetUsdc: target,
        priceShocks: z.array(shock).min(1).max(3),
      },
      annotations,
    },
    async ({ amountWeth, cashTargetUsdc, priceShocks }) =>
      guarded(async () => {
        const evidence = await getEvidence("graph");
        const briefs = [];
        for (const priceShock of [...new Set(priceShocks)].sort(
          (a, b) => a - b,
        )) {
          const result = await rehearse(
            {
              amountEth: amountWeth,
              payrollUsdc: cashTargetUsdc,
              shockPercent: priceShock,
              slippageBps: 100,
            },
            evidence,
          );
          briefs.push(createExitBrief(evidence, result));
        }
        return {
          sourceBlock: evidence.block,
          firstTestedUncoveredShock:
            briefs.find((b) => !b.decision.targetCovered)?.inputs
              .priceShockPercent ?? null,
          briefs,
        };
      }),
  );
  return server;
}
