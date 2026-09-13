# Exit Drill

**Know what you can exit. Set the limits. Prove the outcome.**

A treasury stress lab for ETHOnline 2026. A token balance is not a cash guarantee: compare executable USDC under market shocks, approve explicit limits, execute through a bounded contract, and reconcile the outcome.

## Demo

Visit [the landing page](https://exit-drill.vercel.app), [the stress lab](https://exit-drill.vercel.app/app), or [the documentation](https://exit-drill.vercel.app/docs).

1. Select **Try example** in the market data selector. Keep the example scenario at **30 WETH / $60,000 payroll / 25% shock**.
2. **Run stress test**. Actual Uniswap v3 routes execute in an isolated EVM. The deeper 0.30% route returns about **54,896 USDC**, leaving a **5,104 USDC shortfall**.
3. **Review exit policy** and approve the minimum output.
4. **Test bad recipient**. Solidity rejects recipient substitution.
5. **Complete rehearsal**, open the receipt, and export JSON. Settlement matches the ERC20 balance delta.

The sandbox works without accounts, API keys, wallets or real funds. It uses official Uniswap factory, pool and SwapRouter bytecode on Ganache, not mocked swap responses. Every request creates an ephemeral chain; its hashes cannot be looked up on public explorers. Reference liquidity and market history are synthetic. JSON receipts are service evidence, not independently verifiable public-chain proof; checksums detect accidental edits, not malicious forgery.

## Development

Node.js 24 and npm 11.6.0 (the lockfile is generated with npm 11):

```sh
npm ci
npm run contracts:compile
npm test
npm run test:contracts
npm run dev
```

Open http://localhost:3000. `npm run build` includes TypeScript checking. Generated ABI/bytecode artifacts are committed; CI verifies reproducible compilation.

Live demo: **https://exit-drill.vercel.app**. Run `npm run test:smoke -- https://exit-drill.vercel.app` to verify its complete API flow, contract rejection, exact balance reconciliation, checksum and input/authentication rejection.

## Architecture

- **Evidence:** `src/lib/graph.ts` queries a Uniswap v3 subgraph server-side and rejects stale/missing metadata or indexing errors. Current Ethereum data is the default when configured; the repeatable example fixture is explicitly labeled. Historical timestamps are verified against the exact Ethereum block when Graph Node omits them.
- **Stress engine:** `src/lib/sandbox.ts` deploys full-range liquidity pools, applies competing sells targeting a marginal price decline, and uses snapshots/reverts to compare exits through real Uniswap bytecode.
- **Authorization:** the user reviews minimum output and approves the sandbox plan. In the configured public testnet path, Privy verifies user JWTs and creates an app-managed testnet wallet with a signing policy restricted to Sepolia and fixed contract methods.
- **Execution:** `contracts/ExitExecutor.sol` fixes router and tokens; enforces caller-only recipient, 100 WETH cap, fee allowlist, positive minimum output, short expiry, consumed nonce and reentrancy protection. Router allowance is cleared after execution.
- **Reconciliation:** sandbox receipts check balance snapshots; `/api/reconcile` checks public testnet transaction success, owner, executor event and matching token-transfer logs. These accounting bases are explicitly distinguished. Receipts persist in the browser and export as JSON.
- **Frontend:** React/Next.js with a responsive neobrutalist dashboard, scenarios, route comparison, policy review, rejection demo and receipt inspection.

## Configuration

Copy `.env.example` to `.env.local`. Keep secrets out of git and chat. Reference mode needs **no environment variables**.

### The Graph

Set `GRAPH_API_KEY` and `GRAPH_SUBGRAPH_ID` to an Ethereum Uniswap v3 deployment supporting `_meta.block.timestamp`, pools and poolDayData. The dashboard opens with a market snapshot when configured. Choose **Use market snapshot** in the market data selector. Both 0.05% and 0.30% WETH/USDC pools must exist.

Live TVL and price calibrate synthetic full-range pools. This is **not a mainnet fork**, does not reconstruct concentrated ticks, and does not predict actual mainnet fills. Live evidence, both route simulations, and receipt settlement have been verified against this source: 5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV.

### Privy and Sepolia

Set `PRIVY_APP_ID`, `PRIVY_APP_SECRET`, and matching `NEXT_PUBLIC_PRIVY_APP_ID`. Add localhost and the production origin to the Privy app's allowed domains. Rebuild after changing public variables. The app uses `@privy-io/react-auth` and `@privy-io/node`. The backend verifies the authenticated user’s JWT, derives a stable treasury external ID, and verifies that exact mapping on every action. Wallets and policies are app-managed; the app secret authorizes Privy requests, while Privy enforces the attached chain/contract/method policy. This is a managed testnet demo, not self-custody. Privy is never simulated in reference mode.

For public testnet contracts, set a test-only `DEPLOYER_PRIVATE_KEY` and `SEPOLIA_RPC_URL` locally:

```sh
node --env-file=.env.local --import tsx scripts/deploy-sepolia.ts
node --env-file=.env.local --import tsx scripts/deploy-sepolia.ts --broadcast
```

The first command prints the deployment scope. Broadcast deploys independent Uniswap v3 test pools and freely mintable test tokens, using official v3 bytecode. These are not canonical Uniswap deployments or real WETH/USDC. The script refuses non-Sepolia networks. It requires Sepolia gas and multiple confirmations. If interrupted, inspect `.local/sepolia-deployment.json` and confirmed transactions before retrying; this is not a resumable migration.

Set the emitted `NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS` and `NEXT_PUBLIC_TEST_TOKEN_ADDRESS` in Vercel and rebuild. Never put the deployer key in Vercel; the app does not need it.

Connect with Privy, provision the treasury wallet, fund its address with Sepolia ETH, mint test WETH, approve the executor and request a fresh quote. Review and execute the quote; reconciliation reads the public chain. This is a new testnet quote, not a promise that sandbox stressed output will match. Public test pools persist and change as visitors trade. Deployed addresses and seeded pools are recorded in deployments/sepolia.json.

## Vercel

Import `Nakshatra05/exit-drill`, select Next.js, and deploy `main` using Node 22 or 24. The default demo needs no credentials. Ganache stays server-only and external; EVM routes use Node with a 60-second duration. Git pushes trigger deployment after import.

## Validation and boundaries

The managed Privy workflow has been exercised end to end on Sepolia: the signing policy rejected an out-of-policy transfer, then allowed mint, bounded approval and execution. A 0.01 test-WETH exit settled for 24.924378 test USDC and reconciled against transfer logs. [Confirmed transaction](https://sepolia.etherscan.io/tx/0x3c1184ccc8ef0b631321c01a6cb35b93fff22a3f64168c739414c0ed9e7fe71e).

To check the deployed contracts independently, run `node --env-file=.env.local --import tsx scripts/test-sepolia.ts --broadcast`. This spends testnet gas and uses a local test wallet; it does not claim to validate Privy signing. The managed-wallet API was tested separately with a real sign-in token.

Tests cover actual Uniswap execution, stress, route selection, receipt reconciliation, substituted recipient, oversized input, zero minimum, expired/unbounded deadlines, forbidden fee, insufficient output, replay and cleared router allowance. Domain tests reject malformed, unapproved and arbitrary-calldata requests. GitHub Actions runs tests and the production build.

This is a hackathon MVP, **not an audited custody system**. Dashboard calculations use JavaScript numbers; contracts use integer token units. No price oracle, gas-aware optimization, durable database, distributed limiter or mainnet signing is included. Per-instance rate limiting provides basic backpressure, not global abuse protection. Ganache and wallet SDK transitive dependencies have known audit advisories: review and isolate/replace the sandbox before handling production assets. Test tokens allow public minting. Privy wallets and policies are app-managed. Protect the server app secret; it controls these resources. Users have no direct policy-edit endpoint. Sandbox approval is UI consent, not a cryptographic signature or server-held spending mandate.

No LLM integration is represented as complete. Confirm sponsor eligibility against current rules before submitting to an AI-specific prize.

## Attribution

Implemented with Codex assistance directed by the project owner during ETHOnline 2026. Third-party dependencies are locked in package-lock.json.

- [Uniswap v3 core](https://github.com/Uniswap/v3-core) and [periphery](https://github.com/Uniswap/v3-periphery): official package artifacts; upstream licenses apply.
- [The Graph documentation](https://thegraph.com/docs/)
- [Privy documentation](https://docs.privy.io/)

Our Solidity files carry MIT SPDX identifiers. This does not relicense third-party bytecode.
