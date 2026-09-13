import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import s from "../site.module.css";

export const metadata: Metadata = {
  title: "User guide — Exit Drill",
  description:
    "Run a treasury stress drill, understand your cash shortfall, set exit limits, and save a settlement receipt.",
};
const sections = [
  ["quickstart", "Your first drill"],
  ["market-data", "Choose market data"],
  ["results", "Understand your results"],
  ["limits", "Review exit limits"],
  ["wallet", "Try a testnet exit"],
  ["receipts", "Save your receipts"],
  ["troubleshooting", "Questions & help"],
];
export default function DocsPage() {
  return (
    <div className={s.site}>
      <SiteHeader />
      <main className={s.docsLayout}>
        <aside className={s.docsAside}>
          <span>EXIT DRILL / USER GUIDE</span>
          {sections.map(([id, title]) => (
            <a key={id} href={`#${id}`}>
              {title}
            </a>
          ))}
        </aside>
        <article className={s.docsArticle}>
          <span className={s.eyebrow}>THE TREASURY READINESS HANDBOOK</span>
          <h1>
            Your next exit.
            <br />
            Already rehearsed.
          </h1>
          <p className={s.docsIntro}>
            Find out how much cash your treasury could release under pressure,
            check it against an obligation, and practice an exit with clear
            limits.
          </p>
          <div className={s.docsNote}>
            <strong>Your first drill needs no wallet.</strong>
            <p>
              Rehearsals use virtual funds and leave your wallet untouched.
              Wallet transactions run separately on the Sepolia test network
              with valueless test assets.
            </p>
          </div>
          <section id="quickstart">
            <h2>Run your first drill</h2>
            <ol>
              <li>
                Open the stress lab. Enter the <strong>WETH amount</strong> you
                want to sell and your <strong>USDC payroll obligation</strong>.
                These are scenario inputs, not an imported wallet balance.
              </li>
              <li>
                Choose a <strong>price shock</strong>: the decline you want to
                prepare for. Start with 25% to model a sharp sell-off.
              </li>
              <li>
                Select <strong>Run stress test</strong>. Allow several seconds
                for the two routes to be compared.
              </li>
              <li>
                Read <strong>Stressed cash out</strong>,{" "}
                <strong>Payroll coverage</strong>, and the shortfall. Compare
                the route outputs.
              </li>
              <li>
                Select <strong>Review exit policy</strong>, check the amount and
                minimum received, then <strong>Approve rehearsal limits</strong>
                .
              </li>
              <li>
                Try <strong>Test bad recipient</strong> to see an unauthorized
                destination blocked. Select <strong>Complete rehearsal</strong>{" "}
                to settle the practice exit, then <strong>Open receipt</strong>.
              </li>
            </ol>
            <Link className={s.primary} href="/app">
              Run a drill <ArrowUpRight size={18} />
            </Link>
          </section>
          <section id="market-data">
            <h2>Choose your market data</h2>
            <h3>Market snapshot</h3>
            <p>
              Recent Ethereum WETH/USDC prices and liquidity inform your
              rehearsal. The snapshot has a timestamp and block number. Use{" "}
              <strong>Refresh market data</strong> before starting a new drill;
              snapshots expire after ten minutes.
            </p>
            <h3>Example scenario</h3>
            <p>
              For a repeatable introduction, open the market data selector and
              choose <strong>Try example</strong>. It starts at $2,500 per WETH
              with fixed liquidity. With 30 WETH, a $60,000 obligation and a 25%
              shock, the example produces about $54,896—roughly 91.5% coverage.
            </p>
            <div className={s.docsNote}>
              <strong>A rehearsal is an estimate.</strong>
              <p>
                The model builds simplified liquidity pools from the selected
                data. It does not reproduce every live liquidity position,
                competing trade, network fee or market condition. Results are
                not guaranteed real-world fills.
              </p>
            </div>
            <p>
              Changing the source clears your result and approval. If current
              data cannot be verified, Exit Drill asks you to refresh; it never
              silently replaces it with example data.
            </p>
          </section>
          <section id="results">
            <h2>Understand your results</h2>
            <ul>
              <li>
                <strong>Stressed cash out:</strong> simulated USDC proceeds
                after the chosen price shock and your sale.
              </li>
              <li>
                <strong>Payroll coverage:</strong> proceeds divided by your
                obligation. Below 100% means a shortfall.
              </li>
              <li>
                <strong>Shortfall:</strong> additional USDC needed to meet the
                obligation. Try a different amount or shock to compare outcomes.
              </li>
              <li>
                <strong>Price impact:</strong> the effect of your trade on the
                modeled pool price. A larger pool can sometimes offset a higher
                trading fee.
              </li>
              <li>
                <strong>Selected route:</strong> better token output across the
                0.05% and 0.30% fee tiers. Network fees are not deducted.
              </li>
            </ul>
            <p>
              Run several scenarios instead of relying on a single forecast.
              Changing an input clears the previous approval.
            </p>
          </section>
          <section id="limits">
            <h2>Review your exit limits</h2>
            <p>
              Check the amount sold, expected proceeds, and{" "}
              <strong>minimum received</strong>. If settlement cannot meet your
              minimum, the swap fails.
            </p>
            <p>
              A 1% slippage tolerance sets the minimum to 99% of the quote. It
              does not mean you will lose exactly 1%. Widening the tolerance
              permits a worse price.
            </p>
            <ul>
              <li>Proceeds must return to the calling treasury wallet.</li>
              <li>A single exit is capped at 100 WETH.</li>
              <li>Plans expire and cannot be reused after execution.</li>
              <li>The token pair and exit contract are fixed.</li>
            </ul>
            <p>
              Rehearsal approval lasts ten minutes and authorizes only the
              practice workflow. It does not sign a wallet transaction. Your
              testnet treasury has an additional signing policy that restricts
              available actions.
            </p>
          </section>
          <section id="wallet">
            <h2>Try a testnet exit</h2>
            <p>
              This workflow uses <strong>Sepolia</strong>, a test network, with
              freely created test WETH and test USDC. These tokens have no
              monetary value. Never send mainnet assets to use this demo.
            </p>
            <ol>
              <li>
                Select <strong>Connect wallet</strong> and sign in with email or
                a wallet. Open <strong>Treasury wallet</strong> and choose{" "}
                <strong>Create treasury wallet</strong>.
              </li>
              <li>
                Copy your new treasury address and send a small amount of{" "}
                <strong>Sepolia ETH</strong> to it for network fees. This
                address can differ from the wallet you used to sign in.
              </li>
              <li>
                Enter a small amount, such as <strong>0.01 WETH</strong>. Choose{" "}
                <strong>Get test tokens</strong> and wait for confirmation.
              </li>
              <li>
                Select <strong>Allow this amount</strong> to authorize the exit
                contract to use that amount of test WETH. Wait for confirmation.
              </li>
              <li>
                Select <strong>Preview exit</strong>. Review the fresh testnet
                quote and minimum received, then{" "}
                <strong>Confirm testnet exit</strong>.
              </li>
              <li>
                Wait for settlement. Your receipt appears under{" "}
                <strong>Receipts</strong> with a public transaction link.
              </li>
            </ol>
            <p>
              Testnet quotes come from current test pools. They do not reuse
              rehearsal results or Ethereum prices. Other visitors can change
              the pools by trading.
            </p>
            <p>
              <strong>Check transfer protection</strong> attempts an action
              outside the signing limits. Rejection is the expected result.
            </p>
          </section>
          <section id="receipts">
            <h2>Save your receipts</h2>
            <p>
              A receipt records the amount sold, USDC received, minimum
              approved, and transaction identifier. It also records whether
              settlement matched observed token movements.
            </p>
            <p>
              <strong>Rehearsal receipts</strong> belong to a temporary
              simulation and have no public explorer link.{" "}
              <strong>Sepolia receipts</strong> can be checked on the public
              testnet explorer.
            </p>
            <p>
              The latest 20 receipts are saved in this browser. They do not sync
              across devices or accounts. Use <strong>Export JSON</strong>{" "}
              before clearing browser storage. The checksum detects accidental
              edits; it is not a digital signature.
            </p>
          </section>
          <section id="troubleshooting">
            <h2>Questions & help</h2>
            <h3>My snapshot expired.</h3>
            <p>
              Refresh market data, run a new drill, and review its limits again.
            </p>
            <h3>A transaction is still pending.</h3>
            <p>
              Follow its explorer link and wait for confirmation before
              retrying. If your exit confirms but the receipt is missing, reopen
              your treasury wallet and select <strong>Recover receipt</strong>.
            </p>
            <h3>I can’t preview or execute an exit.</h3>
            <p>
              Check your treasury address has Sepolia ETH for fees and enough
              test WETH. Allow the chosen amount, then request a fresh preview.
              Changing the amount invalidates the quote. A moving price may
              require a new preview.
            </p>
            <h3>The rehearsal engine is busy.</h3>
            <p>
              Wait a minute and retry. The service limits simultaneous runs.
            </p>
            <h3>Will a drill move my actual funds?</h3>
            <p>
              No. Rehearsals use virtual funds. The wallet workflow uses test
              assets on Sepolia. Exit Drill does not offer mainnet trading.
            </p>
            <h3>Where is my information stored?</h3>
            <p>
              Scenario inputs are sent to the service to run your drill.
              Receipts stay in this browser; public testnet transactions remain
              onchain. Sign-in uses Privy. Never enter a seed phrase or private
              key into Exit Drill.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
