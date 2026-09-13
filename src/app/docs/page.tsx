import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import s from "../site.module.css";
export const metadata: Metadata = {
  title: "Documentation — Exit Drill",
  description:
    "Run your first treasury stress drill, understand settlement safeguards, and configure The Graph, Privy, and Sepolia.",
};
const sections = [
  ["quickstart", "Run your first drill"],
  ["architecture", "How it works"],
  ["integrations", "Integration status"],
  ["configuration", "Live setup"],
  ["contracts", "Contract safeguards"],
  ["receipts", "Read a receipt"],
  ["development", "Local development"],
  ["api", "API reference"],
  ["troubleshooting", "Troubleshooting"],
];
export default function DocsPage() {
  return (
    <div className={s.site}>
      <SiteHeader />
      <main className={s.docsLayout}>
        <aside className={s.docsAside}>
          <span>EXIT DRILL / DOCUMENTATION</span>
          {sections.map(([id, title]) => (
            <a key={id} href={`#${id}`}>
              {title}
            </a>
          ))}
        </aside>
        <article className={s.docsArticle}>
          <span className={s.eyebrow}>THE TREASURY READINESS HANDBOOK</span>
          <h1>
            From first drill
            <br />
            to verified exit.
          </h1>
          <p className={s.docsIntro}>
            Understand what you’re testing, what the contract enforces, and what
            your receipt actually proves.
          </p>
          <div className={s.docsNote}>
            <strong>Start without credentials.</strong>
            <p>
              The public demo runs real Uniswap v3 bytecode in an isolated EVM,
              using reference liquidity and valueless tokens. No wallet or API
              key is required.
            </p>
          </div>
          <section id="quickstart">
            <h2>Run your first drill</h2>
            <ol>
              <li>
                Open the stress lab. Keep <strong>30 WETH</strong>, a{" "}
                <strong>60,000 USDC obligation</strong>, and a{" "}
                <strong>25% price shock</strong>.
              </li>
              <li>
                Select <strong>Run stress test</strong>. The deeper 0.30% pool
                produces about 54,896 USDC, covering 91.5% of payroll. The
                shortfall is about 5,104 USDC.
              </li>
              <li>
                Select <strong>Review exit policy</strong>. Check minimum
                received and the permitted recipient, then approve.
              </li>
              <li>
                Try <strong>Test bad recipient</strong>. The contract rejects
                the substituted address.
              </li>
              <li>
                Select <strong>Execute sandbox exit</strong>, then{" "}
                <strong>Open receipt</strong>. Inspect the balance delta and
                export JSON.
              </li>
            </ol>
            <Link className={s.primary} href="/app">
              Open the stress lab <ArrowUpRight size={18} />
            </Link>
            <p>
              Changing a scenario clears its approval. Sandbox approval expires
              after ten minutes and is local UI consent, not a Privy signature.
            </p>
          </section>
          <section id="architecture">
            <h2>How it works</h2>
            <h3>1. Establish the evidence</h3>
            <p>
              Reference mode supplies two synthetic WETH/USDC pools. Live mode
              queries Ethereum pool data through The Graph, including TVL, price
              and daily history. Rehearsal and execution query the reviewed
              block. Evidence older than ten minutes, or with missing metadata
              or indexing errors, is rejected.
            </p>
            <h3>2. Rehearse a stressed exit</h3>
            <p>
              An isolated EVM deploys the official Uniswap v3 factory, pools and
              SwapRouter bytecode. Competing WETH sells target the selected
              marginal price decline, then the treasury sale executes. Snapshots
              let each route be compared from the same starting scenario.
            </p>
            <p>
              The selected route maximizes token output across 0.05% and 0.30%
              fee tiers. This comparison does not subtract gas costs.
            </p>
            <h3>3. Authorize, execute, reconcile</h3>
            <p>
              The dashboard reviews a bounded plan. ExitExecutor enforces that
              plan during the swap, then the service checks token movements and
              produces a receipt. The configured Sepolia path adds a Privy
              signing policy and a fresh public-testnet quote.
            </p>
            <div className={s.docsNote}>
              <strong>A calibrated rehearsal, not a mainnet fork.</strong>
              <p>
                Live Graph TVL and price calibrate synthetic full-range pools.
                The engine does not reconstruct actual concentrated-liquidity
                ticks, MEV or mainnet execution conditions. Results are scenario
                outcomes, not fill guarantees.
              </p>
            </div>
          </section>
          <section id="integrations">
            <h2>Integration status</h2>
            <div className={s.integrationGrid}>
              <div>
                <b>Uniswap v3</b>
                <span>WORKING IN THE SANDBOX</span>
              </div>
              <div>
                <b>The Graph</b>
                <span>LIVE MODE REQUIRES CREDENTIALS</span>
              </div>
              <div>
                <b>Privy</b>
                <span>LIVE SIGNING REQUIRES SETUP</span>
              </div>
            </div>
            <p>
              The app’s <strong>Integration status</strong> panel reports the
              deployment’s configuration. A configured credential is not a
              provider health check. Live Graph and Privy behavior still needs
              end-to-end validation with an actual app and provider access.
            </p>
            <p>
              Public Sepolia contracts are separate from ephemeral sandbox
              contracts. No public contract address or live signing is implied
              by a successful reference drill.
            </p>
          </section>
          <section id="configuration">
            <h2>Configure live integrations</h2>
            <p>
              Copy <code>.env.example</code> to <code>.env.local</code> for
              local development. For the hosted app, add runtime secrets in the
              Vercel project’s environment settings. Rebuild when changing{" "}
              <code>NEXT_PUBLIC_*</code> values.
            </p>
            <h3>The Graph</h3>
            <ol>
              <li>
                Create an API key in{" "}
                <a
                  href="https://thegraph.com/studio/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Subgraph Studio
                </a>
                . See the{" "}
                <a
                  href="https://thegraph.com/docs/en/subgraphs/providers/subgraph-studio/managing-api-keys/"
                  target="_blank"
                  rel="noreferrer"
                >
                  official key-management guide
                </a>
                .
              </li>
              <li>
                Choose an Ethereum Uniswap v3 subgraph in{" "}
                <a
                  href="https://thegraph.com/explorer"
                  target="_blank"
                  rel="noreferrer"
                >
                  Graph Explorer
                </a>{" "}
                and copy its subgraph ID.
              </li>
              <li>
                Set the two server variables below, then select{" "}
                <strong>Use live Graph data</strong> in the app.
              </li>
            </ol>
            <pre>
              <code>
                {
                  "GRAPH_API_KEY=<your-query-key>\nGRAPH_SUBGRAPH_ID=<ethereum-uniswap-v3-subgraph-id>"
                }
              </code>
            </pre>
            <p>
              The deployment must expose the Uniswap v3 schema, including{" "}
              <code>_meta.block.timestamp</code> and <code>poolDayData</code>,
              with both required WETH/USDC fee tiers. API keys are
              account-specific; documentation examples are not production
              credentials.
            </p>
            <h3>Privy</h3>
            <p>
              Create or open your own application in the{" "}
              <a
                href="https://dashboard.privy.io/"
                target="_blank"
                rel="noreferrer"
              >
                Privy dashboard
              </a>
              . Use its app ID and secret, and allow your localhost and
              production origins. See{" "}
              <a
                href="https://docs.privy.io/basics/get-started/dashboard/create-new-app"
                target="_blank"
                rel="noreferrer"
              >
                Privy’s documentation
              </a>{" "}
              for account setup.
            </p>
            <pre>
              <code>
                {
                  "PRIVY_APP_ID=<your-app-id>\nPRIVY_APP_SECRET=<server-only-secret>\nNEXT_PUBLIC_PRIVY_APP_ID=<same-app-id>"
                }
              </code>
            </pre>
            <p>
              The app authenticates the user’s JWT and provisions a user-owned
              treasury wallet with a policy. Signing requests are limited to
              Sepolia, the configured executor, bounded test-token approvals and
              test-token minting. Unmatched transaction methods are not
              authorized by this policy.
            </p>
            <h3>Deploy public Sepolia test contracts</h3>
            <p>
              Use a test-only local deployer key with Sepolia ETH for gas. The
              script checks the chain ID, deploys independent Uniswap v3 test
              pools plus freely mintable tokens, and seeds two fee tiers. These
              tokens are not canonical WETH or USDC.
            </p>
            <pre>
              <code>
                {
                  "SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com\nDEPLOYER_PRIVATE_KEY=<local-test-only-key>\n\n# Describe the deployment without broadcasting\nnode --env-file=.env.local --import tsx scripts/deploy-sepolia.ts\n\n# Deploy using Sepolia test gas\nnode --env-file=.env.local --import tsx scripts/deploy-sepolia.ts --broadcast"
                }
              </code>
            </pre>
            <p>
              Set the emitted addresses as{" "}
              <code>NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS</code> and{" "}
              <code>NEXT_PUBLIC_TEST_TOKEN_ADDRESS</code>, then rebuild. The
              deployer key stays local; the hosted app does not need it.
              Addresses are recorded in ignored{" "}
              <code>.local/sepolia-deployment.json</code>. If interrupted,
              inspect confirmed transactions before retrying: deployment is not
              resumable.
            </p>
            <p>
              In the app: connect with Privy, provision the treasury, fund its
              address with Sepolia ETH, mint test WETH, approve the executor,
              and request a fresh quote. Review and execute that quote. Public
              test pools persist and change as visitors trade; sandbox results
              are never reused as live quotes.
            </p>
          </section>
          <section id="contracts">
            <h2>Contract safeguards</h2>
            <ul>
              <li>
                <strong>Fixed destination:</strong> the recipient must equal the
                calling treasury.
              </li>
              <li>
                <strong>Bounded input:</strong> positive input, capped at 100
                WETH for this deployment.
              </li>
              <li>
                <strong>Minimum received:</strong> positive minimum output,
                verified against the recipient’s token balance delta.
              </li>
              <li>
                <strong>Expiry:</strong> the deadline must be current and no
                more than 15 minutes ahead; generated plans use ten minutes.
              </li>
              <li>
                <strong>No replay:</strong> a nonce is consumed once for each
                caller.
              </li>
              <li>
                <strong>Fixed execution surface:</strong> immutable router and
                token pair, approved fee tiers, a reentrancy lock, and cleared
                router allowance after execution.
              </li>
            </ul>
            <p>
              Source:{" "}
              <a
                href="https://github.com/Nakshatra05/exit-drill/blob/main/contracts/ExitExecutor.sol"
                target="_blank"
                rel="noreferrer"
              >
                ExitExecutor.sol
              </a>
              . These safeguards do not attest the correctness of a simulation.
              Privy policies are user-owned and can be changed by that owner.
              This MVP is not an audited custody system or ready for mainnet
              funds.
            </p>
          </section>
          <section id="receipts">
            <h2>Read a receipt</h2>
            <p>
              <code>amountOutUsdc</code> is the settled token output.{" "}
              <code>minimumOutUsdc</code> is the approved threshold.{" "}
              <code>planHash</code> identifies the emitted plan digest, while
              the transaction hash and block identify its execution.
            </p>
            <p>
              Sandbox receipts reconcile before/after balances using integer
              token units. Sepolia receipts reconcile net token-transfer logs;{" "}
              <code>balances.basis</code> explicitly identifies that accounting
              method. Displayed amounts are in USDC units, while raw balance
              strings are in six-decimal token units.
            </p>
            <p>
              Receipts are saved in this browser, up to 20 records. Export JSON
              before clearing browser data. A SHA-256 checksum detects
              accidental edits; it is not a digital signature. Sandbox chains
              disappear after each request, so their receipts cannot be
              independently checked on a public explorer.
            </p>
          </section>
          <section id="development">
            <h2>Local development</h2>
            <p>Use Node.js 24 and npm 11.6.0, matching the CI toolchain.</p>
            <pre>
              <code>
                {
                  "git clone https://github.com/Nakshatra05/exit-drill.git\ncd exit-drill\nnpm ci\nnpm run contracts:compile\nnpm test\nnpm run test:contracts\nnpm run dev"
                }
              </code>
            </pre>
            <p>
              Open <code>http://localhost:3000</code> for the landing page,{" "}
              <code>/app</code> for the stress lab and <code>/docs</code> for
              this guide. Run <code>npm run build</code> for the production
              build and type checks. GitHub CI also verifies committed contract
              artifacts match recompilation.
            </p>
            <pre>
              <code>
                {
                  "# Check the deployed API flow\nnpm run test:smoke -- https://exit-drill.vercel.app"
                }
              </code>
            </pre>
            <p>
              The sandbox uses Ganache on the server. Its dependency tree
              contains known audit advisories; isolate or replace the runtime
              and review dependencies before production use. The API has
              per-instance backpressure, not a distributed rate limiter. No
              durable database, price oracle, LLM or mainnet signing is
              included.
            </p>
          </section>
          <section id="api">
            <h2>API reference</h2>
            <p>
              Requests use JSON. Live wallet routes require a Privy bearer
              token. The sandbox accepts bounded inputs, never arbitrary
              calldata or a caller-selected RPC URL.
            </p>
            <div className={s.apiList}>
              {[
                [
                  "GET /api/evidence?mode=reference",
                  "Get labeled reference evidence. Use mode=graph only after configuring provider access.",
                ],
                [
                  "GET /api/status",
                  "Read configuration flags without exposing secrets.",
                ],
                [
                  "POST /api/drill",
                  "Rehearse input {amountEth, payrollUsdc, shockPercent, slippageBps} with evidenceMode and evidenceBlock.",
                ],
                [
                  "POST /api/execute",
                  "Execute a sandbox plan with the same input and evidence, feeTier, minimumOutUsdc, and approved: true. testViolation: true tests recipient rejection.",
                ],
                [
                  "POST /api/privy/wallet",
                  "Authenticate and provision or retrieve the policy-bound treasury wallet.",
                ],
                [
                  "POST /api/privy/action",
                  "Perform a bounded mint, approve, quote, execute or test-policy action for the authenticated wallet.",
                ],
                [
                  "POST /api/reconcile",
                  "Verify a confirmed Sepolia transaction by hash and return its settlement receipt.",
                ],
              ].map(([route, description]) => (
                <div key={route}>
                  <code>{route}</code>
                  <p>{description}</p>
                </div>
              ))}
            </div>
            <p>
              Domain limits: 0.01–100 WETH in the sandbox, 1–500,000 USDC
              obligation, 0–70% shock, and 10–500 basis points slippage. Live
              wallet actions use a 0.001 WETH minimum. Errors return an{" "}
              <code>error</code> string; invalid sandbox input returns HTTP 400.
            </p>
          </section>
          <section id="troubleshooting">
            <h2>Troubleshooting</h2>
            <h3>“Graph source is stale”</h3>
            <p>
              Refresh evidence and run a new drill. Check that the selected
              subgraph is current, has metadata, and is indexing Ethereum. The
              app does not silently substitute reference data when live mode
              fails.
            </p>
            <h3>Wallet controls are unavailable</h3>
            <p>
              Check all three Privy variables, allowed origins, and both
              test-contract addresses. Public environment changes need a
              redeploy. Use the integration panel to distinguish missing
              configuration from a provider error.
            </p>
            <h3>A Sepolia transaction will not execute</h3>
            <p>
              Confirm the wallet has test ETH for gas, minted test WETH, and
              sufficient executor allowance. Request a new quote after changing
              the amount or when a plan expires. A changed pool price can cause
              the minimum-output check to revert.
            </p>
            <h3>The rehearsal engine is busy</h3>
            <p>
              Wait a minute and retry. Each API instance allows at most two
              concurrent sandbox runs and limits repeated requests. Rehearsals
              use compute resources and may take several seconds.
            </p>
            <h3>I can’t find a sandbox hash on Etherscan</h3>
            <p>
              That is expected: the sandbox is an isolated chain, not Sepolia.
              Only public-testnet receipts have a public-chain transaction to
              inspect.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
