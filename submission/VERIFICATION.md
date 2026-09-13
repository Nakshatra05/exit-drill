# Recorded verification evidence

These are observations from September 13, 2026, not current quotes or guaranteed outcomes.

## Actual Sepolia settlement

- Transaction: [0x2f7b…d136](https://sepolia.etherscan.io/tx/0x2f7ba493d3b9812f10f4449ea7b6578cdd4535962af7bcd91c0ae22edfd6d136)
- Block: 11695057; timestamp: 2026-09-13T09:35:00Z.
- Input: 0.01 test WETH; output: 24.984094 test USDC; minimum: 24.734253.
- Public verification independently reproduced the plan hash from calldata, matched the treasury sender and recipient, and reconciled output transfers against the executor event.
- Plan hash: `0x457cb3ef982725cce57f6043f8aab174f4aaab338fe505e6d5ba816f7190c4dc`.
- This verifies settlement, not historical Privy policy configuration or model accuracy.

## Live Graph-backed MCP comparison

Run: `node --conditions=react-server --env-file=.env.local --import tsx scripts/test-mcp.ts --live`.

At Ethereum evidence block 25967714, both assessments used the same live Graph snapshot, 0.01 WETH input, and a 22 USDC cash target:

- Zero shock: approximately 24.8072 modeled USDC; target covered.
- 25% shock: approximately 18.6054 modeled USDC; approximately 3.3946 shortfall.
- The first tested uncovered shock was 25%; this is not an interpolated threshold.

These are full-range liquidity model results, not Ethereum fills, Sepolia quotes or forecasts. MCP protocol checks cover discovery and malformed input rejection; a separate real stdio client verifies host startup. No signing tools are exposed.

## Reproducible checks

`npm test` passes 27 tests, including proof substitution, incorrect token movements, malformed inputs and source provenance. `npm run test:mcp` checks both protocol and stdio transport. `npm run test:contracts` exercises Uniswap execution and executor rejection cases. `npm run build` checks the production build. CI runs the same checks on pushes.
