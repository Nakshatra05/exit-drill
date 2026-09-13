# Exit Drill

Treasury stress rehearsals with live Graph evidence, bounded authorization, Uniswap execution and verifiable reconciliation.

Under active development for ETHOnline 2026. Integration status is explicit in the application: reference scenario data and simulated transactions must never be presented as live partner execution.

## Development

Node 22+, `npm install`, `npm run dev`. Copy `.env.example` to `.env.local` and configure partner credentials. Never commit secrets.

## Scope

One treasury, WETH/USDC, concentrated-liquidity stress scenarios, approval constraints and reconciliation receipts. Live mainnet data is read-only; all wallet execution is Sepolia testnet only.

## Attribution

Implemented with Codex assistance directed by the project owner. Project-specific code begins during ETHOnline 2026. Third-party libraries are listed in package.json and locked in package-lock.json.
