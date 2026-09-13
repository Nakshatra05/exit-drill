# Uniswap developer feedback — Exit Drill

Project: https://exit-drill.vercel.app/

Source: https://github.com/Nakshatra05/exit-drill

## What we built

A Sepolia treasury exit product using official Uniswap v3 Factory, Pool and SwapRouter bytecode. `ExitExecutor` restricts tokens, router, fee tiers, input size, recipient, expiry and replay. It checks the recipient's actual USDC balance change and emits a plan hash. A separate model calibrates full-range pools from live Graph TVL and price for optional risk analysis and reusable MCP tooling.

The Sepolia deployment uses independent test pools and freely mintable test assets. It is not a canonical Uniswap deployment, does not use the Uniswap API, and does not claim to be v4 or Unichain.

## What worked

- Official npm artifacts let the stress engine and persistent testnet deployment exercise actual protocol bytecode rather than mock swap responses.
- `exactInputSingle` provides a narrow execution surface that fits an amount-limited treasury contract.
- Snapshot/revert made repeatable route comparisons possible without accidental state contamination.
- Combining the router's minimum output with a recipient balance-delta check creates a clear settlement invariant.

## Friction observed

- A v3 subgraph snapshot is not enough to reconstruct concentrated tick liquidity. We explicitly disclose the full-range approximation. A reference pipeline for reconstructing tick state at a pinned block would improve risk tooling.
- Sepolia liquidity and token addresses are different from Ethereum. It would help to have a documented, versioned fixture deployment with small-value swaps, faucet assets, and reproducible seeding instructions.
- Safe approval cleanup, replay protection and wrong-recipient tests are application responsibilities. A maintained treasury-executor example with adversarial tests would shorten this path.

## Verification map

- [Guarded execution](contracts/ExitExecutor.sol): `execute`, `exactInputSingle`, recipient balance delta, `ExitSettled`.
- [Official bytecode imports and stress comparisons](src/lib/sandbox.ts): `createSandbox`, `rehearse`.
- [Public testnet deployment](scripts/deploy-sepolia.ts) and [addresses](deployments/sepolia.json).
- [Contract adversarial tests](scripts/test-contracts.ts).
- [Independent settlement verifier](src/lib/verify-settlement.ts).

This feedback describes implemented behavior and observed development friction. Reproduce the execution and guard checks with `npm run test:contracts`.
