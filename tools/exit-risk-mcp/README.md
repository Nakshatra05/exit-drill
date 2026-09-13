# Exit Risk MCP

Reusable, read-only treasury risk tools for MCP-compatible AI hosts. The server queries The Graph directly and runs the local Uniswap v3 analysis engine. It does not call the Exit Drill website and needs no Privy account, wallet, private key, or LLM API key. The connected AI host provides any language-model reasoning.

## Run

From the repository root, install with `npm ci`. Provide `GRAPH_API_KEY` and `GRAPH_SUBGRAPH_ID` in the environment. The subgraph must use the Ethereum Uniswap v3 schema and include WETH/USDC pools at fees 500 and 3000. The production subgraph ID is documented in the root README.

```sh
npm run --silent mcp
```

For this repository's ignored local configuration:

```sh
node --conditions=react-server --env-file=.env.local --import tsx tools/exit-risk-mcp/index.ts
```

The `react-server` condition resolves the `server-only` guard in the shared Graph adapter. The server writes MCP JSON-RPC to stdout; dependency diagnostics go to stderr. It serves the stable MCP protocol supported by SDK 1.30.0.

Configure an MCP host with `command: "npm"` (`npm.cmd` on Windows) and arguments `['--silent', '--prefix', '/absolute/path/to/exit-drill', 'run', 'mcp']`. Set the two Graph variables through the host's private environment configuration. Do not publish your key in a client config or commit it.

## Tools

- `get_liquidity_evidence`: fresh block provenance, two live pool records and seven-day history. Rejects stale data and indexer errors.
- `assess_treasury_exit`: user-provided WETH amount, cash target and shock → local Uniswap bytecode execution → portable `exit-risk-brief/v1` with cash shortfall and route comparison.
- `compare_price_shocks`: evaluates one to three shocks against a single Graph snapshot. Returns the first **tested** shock that misses the target; this is not an interpolated failure threshold.

Example host prompt: “Use Exit Risk to compare 0% and 25% price declines for a 0.01 WETH position and a 22 USDC cash target. State the source block, explain which tested scenario misses the target, and explain why this is not a Sepolia execution quote. Do not trade.” These amounts are explicit example inputs, never default balances or live market claims.

## Reuse and trust boundary

The Next.js application and any MCP host consume the same analysis and brief schema. Other treasury tools can use these tools without deploying the UI or integrating our wallet service. Current scope is Ethereum WETH/USDC with the Uniswap v3 schema; other assets and chains require an adapter, not a configuration claim.

No signing or transaction tool is registered. Inputs are bounded, concurrent requests are rejected, and failure returns an error rather than fixture data. The local full-range pools are a model calibrated to live TVL and price, not an Ethereum fork or an actual tick-liquidity reconstruction. The Graph source is live; computed scenario outputs remain estimates.

## Verify

```sh
npm run test:mcp
node --conditions=react-server --env-file=.env.local --import tsx scripts/test-mcp.ts --live
```

The live test asserts that both scenarios use the same source block and that a larger shock reduces estimated output. It spends no public-chain gas. See [the server](server.ts), [Graph adapter](../../src/lib/graph.ts), [engine](../../src/lib/sandbox.ts), and [brief schema](../../src/lib/exit-brief.ts).
