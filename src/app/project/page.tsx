import Link from "next/link";
import { ArrowUpRight, ShieldCheck, FileCheck2, Activity } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import s from "../site.module.css";
export const metadata = {
  title: "Project walkthrough — Exit Drill",
  description:
    "Live treasury evidence, reusable MCP risk tools, policy-controlled Sepolia execution, and independent settlement verification.",
};
const tx = "0x2f7ba493d3b9812f10f4449ea7b6578cdd4535962af7bcd91c0ae22edfd6d136";
export default function ProjectPage() {
  return (
    <div className={s.site}>
      <SiteHeader />
      <main className="project-page">
        <span className="eyebrow">ETHONLINE 2026 / PROJECT WALKTHROUGH</span>
        <h1>
          A balance becomes a decision.
          <br />A decision becomes proof.
        </h1>
        <p className="project-intro">
          Exit Drill connects treasury cash-coverage planning with bounded
          execution and independently verifiable settlement. The product trades
          on Sepolia; its optional risk tools use current Ethereum liquidity.
        </p>
        <div className="project-actions">
          <Link href="/app" className={s.primary}>
            Open the product <ArrowUpRight size={18} />
          </Link>
          <a
            href="https://github.com/Nakshatra05/exit-drill"
            className={s.textLink}
          >
            Inspect the source <ArrowUpRight size={16} />
          </a>
        </div>
        <section className="project-story">
          <h2>The finance team's question</h2>
          <p>
            “Can this WETH position cover our cash commitments if liquidity
            moves against us—and can we prove what the exit delivered?” A swap
            alone answers only part of that question.
          </p>
        </section>
        <div className="project-pillars">
          <article>
            <Activity />
            <span className="eyebrow">EVIDENCE & DECISION</span>
            <h2>Reason from a known block.</h2>
            <p>
              The Graph provides fresh liquidity evidence. Export a risk brief
              containing the source block, scenario inputs, compared routes and
              cash shortfall. A reusable MCP server lets other treasury tools
              compare shocks against the same snapshot.
            </p>
            <a href="https://github.com/Nakshatra05/exit-drill/tree/main/tools/exit-risk-mcp">
              Explore the MCP toolkit ↗
            </a>
          </article>
          <article>
            <ShieldCheck />
            <span className="eyebrow">HUMAN CONTROL</span>
            <h2>Give every trade a boundary.</h2>
            <p>
              Privy authenticates the account and controls a managed treasury
              under a signing policy. The Uniswap exit contract enforces
              recipient, amount, minimum received, expiry and nonce. MCP tools
              cannot sign or submit transactions.
            </p>
            <Link href="/docs#limits">Read the trade limits ↗</Link>
          </article>
          <article>
            <FileCheck2 />
            <span className="eyebrow">SETTLEMENT EVIDENCE</span>
            <h2>Check the public result.</h2>
            <p>
              The verifier reconstructs the plan hash from calldata and
              reconciles the event against USDC token movements. It requires no
              account or wallet connection.
            </p>
            <Link href={`/verify?hash=${tx}`}>
              Verify a recorded Sepolia exit ↗
            </Link>
          </article>
        </div>
        <section className="project-story">
          <h2>Try the complete path</h2>
          <ol>
            <li>
              Sign in and fund the displayed treasury address with Sepolia ETH.
              Request the test WETH amount you choose.
            </li>
            <li>
              Choose available WETH. Optionally enter a cash target and price
              shock, then export the risk brief.
            </li>
            <li>
              Review the exit, approve the bounded amount, request a fresh
              Sepolia quote and confirm.
            </li>
            <li>
              Open the receipt and independently verify its transaction hash.
            </li>
          </ol>
        </section>
        <section className="project-boundaries">
          <h2>Clear boundaries, inspectable code.</h2>
          <p>
            The model infers full-range liquidity from live TVL and price; it
            does not reconstruct concentrated ticks or predict future fills.
            Sepolia swaps use independent Uniswap v3 test pools and valueless
            assets. Wallets are app-managed. The product is a testnet MVP, not
            an audited mainnet custody system.
          </p>
          <p>
            The AI integration is reusable MCP tooling for an external AI host.
            No embedded LLM, autonomous trader, or fabricated chat response is
            claimed.
          </p>
          <a href="https://github.com/Nakshatra05/exit-drill/blob/main/submission/READINESS.md">
            Submission evidence and outstanding requirements ↗
          </a>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
