# Three-minute demo script

Record at 1080p with your own voice. ETHGlobal requires 2–4 minutes and prohibits AI voiceover and speeding up the recording. Cut ordinary confirmation waits rather than accelerating footage. Do not put secrets, Privy dashboard credentials, email inboxes, or `.env.local` on screen.

## Before recording

- Open `/app` in the authenticated browser, `/verify` in another tab, and your MCP host with Exit Risk configured.
- Fund your managed treasury with enough Sepolia ETH for request, approval and swap. Request a small WETH amount that you choose. These are real testnet transactions, not fake UI balances.
- Use a cash target near the current modeled baseline so a selected shock crosses it. Read the current result first; do not claim a fixed output.
- Keep a previously confirmed receipt available if network confirmation is slow. Label it as an earlier confirmed transaction if used; do not pretend it is the transaction just submitted.

## 0:00–0:20 — problem and product

“A token balance does not tell a finance team whether it can meet its cash commitments after a market move. Exit Drill connects the exit decision, the spending controls, and proof of settlement.”

Show the actual treasury balance, then choose the amount from available WETH. Explain that this release executes on Sepolia.

## 0:20–0:55 — the risk decision

Open optional risk analysis, enter a cash target and shock, and run it. Show the fresh source block and cash shortfall or coverage. Export the risk brief.

“The Graph supplies current Ethereum liquidity. We execute route scenarios through real Uniswap bytecode in a model calibrated to that data. It is a full-range approximation, not an Ethereum fork or a promise of a future fill.”

## 0:55–1:20 — reusable AI tooling

In the configured MCP host ask: “Compare my chosen amount and target at 0% and 25% decline. Show the source block and the first tested scenario that misses the target. Do not trade.”

Show the tool call and structured comparison, not a made-up chat response. “Other treasury agents can reuse this server without our app or a wallet. The tools cannot sign transactions. The human decides whether to act.”

If you have not connected a real AI host, demonstrate the protocol client and explicitly call it an MCP integration test. Do not label a test runner as AI reasoning.

## 1:20–2:10 — bounded execution

Return to the app. Review the exit, approve only the chosen amount if required, request the fresh Sepolia quote and point to the minimum received, recipient and expiry. Confirm.

“Privy maps my authenticated account to this managed treasury and enforces a signing policy. The contract fixes the router and tokens, bounds the trade, and rejects substituted recipients and replay. This is an actual testnet swap, with an independently checkable hash.”

## 2:10–2:40 — the proof

Open the confirmed receipt and its Etherscan link. Copy the transaction hash into `/verify` and verify it without signing in.

“The verifier rebuilds the onchain plan hash from the transaction and checks the actual token movements. A successful API response is not our proof; the public settlement is.”

## 2:40–3:00 — close

“One path from live evidence to a human-reviewed exit and a verifiable receipt. The toolkit is reusable, the controls are enforced, and the Sepolia product works end to end.”

Mention the public repo and the live app. Keep the closing focused on the customer outcome, not prize logos.

## Questions to prepare

- Why not just a swap UI? The source-backed cash-coverage brief, reusable scenario tooling and independently reconstructed settlement connect planning with accountable execution.
- Is the forecast accurate? It is a disclosed full-range model; real tick reconstruction and gas-aware optimization are future work.
- Is Privy self-custodial here? No. These are app-managed testnet treasuries with policy enforcement.
- What is AI doing? An external MCP host can use deterministic, live-data tools. No embedded LLM or autonomous signing is claimed.
- Can the MCP agent move funds? No transaction tool exists; execution is in the separately authenticated human-reviewed flow.
- What did the team do? Explain your actual product decisions, testing and revisions; disclose the extensive Codex-assisted implementation.
