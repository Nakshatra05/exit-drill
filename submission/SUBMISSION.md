# Exit Drill — submission draft

## One sentence

Exit Drill turns treasury liquidity risk into a reviewable exit decision, then proves what actually settled.

## Short description

A treasury balance is not a cash guarantee. Exit Drill combines live Graph evidence, reusable AI risk tools, policy-controlled Privy wallets, guarded Uniswap exits, and independently verifiable Sepolia receipts. Humans retain trade approval.

## Project description

A team holding WETH can look solvent while a market move leaves its cash commitments uncovered. Ordinary swap screens answer “what can I receive now?” They do not preserve why a treasury chose an exit or make its settlement easy to verify.

Exit Drill connects that workflow. Users load their actual Sepolia treasury balances, choose an exit amount, and optionally assess cash coverage against a price shock using fresh Ethereum liquidity evidence. A portable risk brief records the inputs, source block, compared routes and modeling assumptions. The same engine is available as a reusable MCP server for AI hosts, with no transaction tools.

When a human chooses to trade, the app obtains a fresh Sepolia quote. Privy authenticates the user and controls a separate managed treasury with a restricted signing policy. A fixed-route Solidity executor enforces amount, recipient, minimum received, expiry and nonce constraints. After confirmation, the app reconciles the event against token transfer logs. Anyone can independently verify an exit's calldata, plan hash and settlement without logging in.

The core trading experience has blank inputs, actual balances, explicit funding steps, bounded approvals, pending-transaction recovery and exportable receipts. Risk analysis is optional. No fake balance, mocked partner interaction or AI-generated investment advice is presented as live output.

## How it is made

Next.js/React and viem provide the interface and server routes. The Graph adapter queries Ethereum WETH/USDC pools, rejects stale/indexing-error data and pins analyses to a verified block. The model runs official Uniswap v3 bytecode locally against full-range pools inferred from live TVL and price; it does not reconstruct real ticks. MCP tools reuse that engine directly and compare scenarios against the same snapshot.

Privy verifies access tokens, maps each account to a managed treasury and attaches fixed chain/contract/method policies. The exit contract restricts recipient substitution, oversized input, expired plans, unsupported fees and replay. Settlement verification reproduces the contract plan hash from calldata and reconciles USDC transfer events.

Ethereum modeling and Sepolia execution are separate, clearly labeled contexts. Sepolia pools use official Uniswap bytecode with custom test tokens; these are not canonical WETH/USDC contracts. Wallets are app-managed, not self-custodial. This is a testnet MVP, not an audited mainnet custody product.

## Three partner targets

1. **Privy — Best B2B financial product.** The functional business workflow is treasury conversion under a wallet signing policy, with authenticated ownership and settlement accounting. The same integration also supports consideration for Best financial flow; selecting Privy counts as one partner.
2. **Uniswap Foundation — Best Uniswap Stack Contribution.** Official v3 bytecode powers the actual swap and the risk engine. The reusable guarded executor, adversarial tests and independent verifier make the contribution inspectable. Include `FEEDBACK.md` and complete the required feedback form.
3. **The Graph — Best AI Tooling or AI Use Case, Start Fresh if your registration and history qualify.** Submit the standalone MCP toolkit and its live multi-scenario proof. It reasons over live Graph data, runs independently of the website, and is reusable by other MCP clients. This targets AI tooling, not the composable-products track. The host supplies the LLM; the app does not claim an embedded LLM or autonomous trading.

Prize selection and eligibility remain subject to the organizers' review. Confirm the registered track before submitting.

## Links

- Product: https://exit-drill.vercel.app/app
- User guide: https://exit-drill.vercel.app/docs
- Independent verifier: https://exit-drill.vercel.app/verify
- Judge walkthrough: https://exit-drill.vercel.app/project
- Repository: https://github.com/Nakshatra05/exit-drill
- MCP toolkit: https://github.com/Nakshatra05/exit-drill/tree/main/tools/exit-risk-mcp
- Observed browser settlement: https://sepolia.etherscan.io/tx/0x2f7ba493d3b9812f10f4449ea7b6578cdd4535962af7bcd91c0ae22edfd6d136

## Human-supplied fields still required

Team/member names, registered track, confirmation of any pre-event work, narrated video URL, and the author's final review of all statements. Do not invent these fields. The first repository commit is September 13, 2026; that history alone does not prove that no prior work existed.

Read [AI attribution](../AI_ATTRIBUTION.md) before submitting. The implementation was extensively AI-assisted; meaningful human involvement must be accurately represented.
