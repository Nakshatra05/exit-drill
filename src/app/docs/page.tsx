import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import s from "../site.module.css";
export const metadata: Metadata = {
  title: "User guide — Exit Drill",
  description:
    "Connect your treasury, analyze liquidity, review an exit quote, and verify settlement.",
};
const sections = [
  ["quickstart", "Your first exit"],
  ["wallet", "Your treasury"],
  ["market-data", "Market analysis"],
  ["limits", "Quotes & limits"],
  ["receipts", "Settlement receipts"],
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
          <span className={s.eyebrow}>YOUR TREASURY WORKFLOW</span>
          <h1>
            From insight
            <br />
            to settled funds.
          </h1>
          <p className={s.docsIntro}>
            Understand your liquidity, review the trade, and keep a receipt for
            every confirmed exit.
          </p>
          <div className={s.docsNote}>
            <strong>Current network: Sepolia.</strong>
            <p>
              This release uses Sepolia ETH and test WETH/USDC. The transactions
              and balances are onchain, but the assets have no monetary value.
              Never deposit mainnet assets.
            </p>
          </div>
          <section id="quickstart">
            <h2>Your first exit</h2>
            <ol>
              <li>
                Open your treasury and select <strong>Sign in</strong>. Use
                email or an Ethereum wallet to identify your account.
              </li>
              <li>
                Open <strong>Treasury</strong> to see your address and balances.
                Follow the funding step: send Sepolia ETH to this address for
                network fees (0.003 ETH is a suggested starting amount). The
                treasury is separate from your sign-in wallet. Balances refresh
                automatically while the treasury is open.
              </li>
              <li>
                Enter how much WETH you want to use and select{" "}
                <strong>Request test WETH</strong>. Wait for its onchain
                confirmation, then select{" "}
                <strong>Continue to exit planner</strong>. Amounts are never
                prefilled for you. If you already hold WETH, choose{" "}
                <strong>Use available WETH</strong> or enter a smaller amount.
              </li>
              <li>
                Choose the WETH amount to sell from your available balance and
                select <strong>Review exit</strong>. You can optionally expand
                the risk analysis section to enter a cash target and price
                shock. Risk analysis is not required to trade.
              </li>
              <li>
                If needed, select <strong>Approve WETH</strong> to set a bounded
                spending limit. Then select <strong>Get exit quote</strong>.
              </li>
              <li>
                Check the expected output, minimum received, destination and
                expiry. Select <strong>Confirm exit</strong>.
              </li>
              <li>
                After confirmation, open <strong>Receipts</strong>. The receipt
                matches settlement to the observed token movements.
              </li>
            </ol>
            <Link className={s.primary} href="/app">
              Open your treasury <ArrowUpRight size={18} />
            </Link>
          </section>
          <section id="wallet">
            <h2>Your treasury</h2>
            <p>
              Exit Drill manages a separate treasury wallet for your account
              through Privy. Email or wallet sign-in identifies you; the service
              submits only the treasury actions you request. A signing policy
              restricts the chain, token contracts and available methods. This
              is a managed wallet, not self-custody.
            </p>
            <p>
              The address shown in <strong>Treasury</strong> is where you
              deposit Sepolia ETH. It can differ from the MetaMask address you
              used to sign in. Wallet sign-in alone never approves token
              spending or transfers assets from your connected wallet.
            </p>
            <h3>Add funds</h3>
            <p>
              Copy your treasury address and send Sepolia ETH to cover network
              fees. When your WETH balance is too low, the treasury shows a
              button to request the selected amount of test WETH. Use{" "}
              <strong>Add funds</strong> to top up later. The faucet request is
              an onchain transaction and also uses network fees.
            </p>
            <p>
              Balances are read from Sepolia. Use{" "}
              <strong>Refresh balances</strong> after an incoming transfer.
              Missing data appears as a dash, not a fabricated zero.
            </p>
          </section>
          <section id="market-data">
            <h2>Understand the market analysis</h2>
            <p>
              After analyzing an exit, select <strong>Export risk brief</strong>
              to save the source block, your inputs, route comparison and cash
              coverage as a portable JSON record. The brief preserves the
              assumptions behind your decision; it does not authorize a trade.
            </p>
            <p>
              The market snapshot uses recent Ethereum WETH/USDC prices,
              liquidity and history. Refresh it before a new analysis; data
              older than ten minutes cannot be used for planning.
            </p>
            <p>
              Your entered amount is a scenario input. It is separate from the
              actual wallet balances shown at the top of the workspace.
            </p>
            <ul>
              <li>
                <strong>Estimated stressed output:</strong> modeled USDC
                proceeds after the selected market shock and sale.
              </li>
              <li>
                <strong>Payroll coverage:</strong> estimated proceeds divided by
                your obligation. Below 100% indicates a shortfall.
              </li>
              <li>
                <strong>Selected route:</strong> the better modeled token output
                across the 0.05% and 0.30% pools. The comparison excludes
                network fees.
              </li>
            </ul>
            <p>
              The stress model uses simplified liquidity pools. It does not
              reproduce every live position, competing trade, or network
              condition. Its output is an estimate, not a fill guarantee.
            </p>
            <div className={s.docsNote}>
              <strong>Analysis and execution have separate prices.</strong>
              <p>
                Analysis uses Ethereum market data. The actual trade uses a
                fresh quote from this release’s Sepolia pools. Review that quote
                before confirming; the service never treats the stressed
                estimate as a settlement quote.
              </p>
            </div>
          </section>
          <section id="limits">
            <h2>Quotes and exit limits</h2>
            <p>
              Your spending approval is limited to the selected WETH amount and
              the fixed exit contract. Approval does not itself execute a swap.
              After it confirms, request a quote and review the trade.
            </p>
            <ul>
              <li>Proceeds return to your treasury.</li>
              <li>A single exit is capped at 100 WETH.</li>
              <li>
                The minimum received is 99% of the quoted output: a 1% slippage
                tolerance.
              </li>
              <li>
                Quotes expire after ten minutes. Refresh an expired quote before
                confirming.
              </li>
              <li>A completed plan cannot be replayed.</li>
            </ul>
            <p>
              If the pool moves beyond your minimum received, the swap reverts.
              A reverted transaction can still consume network fees. Changing
              the amount or fee tier clears the quote and requires a new review.
            </p>
          </section>
          <section id="receipts">
            <h2>Settlement receipts</h2>
            <p>
              Select <strong>Verify independently</strong> on a receipt, or
              paste its transaction hash into the{" "}
              <Link href="/verify">settlement verifier</Link>. Anyone can check
              the confirmed trade without signing in. Verification checks the
              transaction and token movements against the exit contract.
            </p>
            <p>
              The receipts view contains confirmed Sepolia exits. Each record
              includes the input amount, settled output, approved minimum,
              transaction hash, block and reconciliation result. Follow the
              explorer link to inspect the transaction independently.
            </p>
            <p>
              The latest 20 receipts are saved in this browser, not synchronized
              across devices. Use <strong>Export JSON</strong> to keep a
              portable copy. The checksum detects accidental edits; it is not a
              digital signature.
            </p>
            <p>
              If confirmation takes longer than expected, open your treasury and
              choose <strong>Check confirmation / recover receipt</strong>.
              Recovery checks the existing transaction and does not submit the
              trade again.
            </p>
          </section>
          <section id="troubleshooting">
            <h2>Questions & help</h2>
            <h3>Why does wallet sign-in request a signature?</h3>
            <p>
              The sign-in message proves that you control your account. It
              should describe signing in to this site, not a token approval or
              transfer. Exit Drill does not require a network switch in MetaMask
              just to sign in.
            </p>
            <h3>I cannot get a quote.</h3>
            <p>
              Check your treasury’s WETH balance, spending allowance and Sepolia
              ETH for fees. If you changed the amount, allow the new amount and
              request another quote.
            </p>
            <h3>A transaction is pending.</h3>
            <p>
              Open the explorer link and wait for confirmation. Use the recovery
              action before starting another transaction. A network delay should
              not lead you to submit the same exit twice.
            </p>
            <h3>Market data expired or the service is busy.</h3>
            <p>
              Refresh market data and run the analysis again. If the engine is
              busy, wait a minute before retrying.
            </p>
            <h3>Where is my information stored?</h3>
            <p>
              Sign-in uses Privy, scenario inputs are sent to the analysis
              service, and receipts stay in this browser. Sepolia transactions
              remain public onchain. Exit Drill never asks you to enter a
              private key or recovery phrase.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
