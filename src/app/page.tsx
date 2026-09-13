import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ShieldCheck,
  Activity,
  FileCheck2,
  LockKeyhole,
  Check,
  Code2,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import s from "./site.module.css";
export default function Page() {
  return (
    <div className={s.site}>
      <SiteHeader />
      <main className={s.main}>
        <section className={s.hero}>
          <div className={s.heroCopy}>
            <span className={s.eyebrow}>
              <span className={s.dot} /> BUILT FOR TREASURY TEAMS
            </span>
            <h1>
              Your balance
              <br />
              isn’t your
              <br />
              <span>exit plan.</span>
            </h1>
            <p>
              Markets move. Payroll doesn’t. Pressure-test your treasury, set
              the limits, and know what actually settles.
            </p>
            <div className={s.actions}>
              <Link className={s.primary} href="/app">
                Run your first drill <ArrowUpRight size={21} />
              </Link>
              <Link className={s.textLink} href="/docs">
                Read the guide <ArrowRight size={17} />
              </Link>
            </div>
            <div className={s.heroNote}>
              <Check size={15} /> No wallet required <span>·</span> No real
              funds at risk
            </div>
          </div>
          <div
            className={s.heroVisual}
            aria-label="Reference scenario: 30 WETH, 25 percent price shock, 54,896 dollars executable cash and 5,104 dollars payroll shortfall"
          >
            <div className={s.visualTop}>
              <span>
                <Activity size={17} /> EXIT READINESS / 001
              </span>
              <span className={s.sampleTag}>REFERENCE SCENARIO</span>
            </div>
            <div className={s.visualPosition}>
              <div>
                <small>TREASURY POSITION</small>
                <strong>
                  30.00 <span>WETH</span>
                </strong>
              </div>
              <span className={s.shock}>
                −25%<small>PRICE SHOCK</small>
              </span>
            </div>
            <div className={s.chart}>
              <div className={s.chartGuide}>
                <span>$75k</span>
                <span>$50k</span>
                <span>$25k</span>
              </div>
              <div className={s.barGroup}>
                <div className={s.barOne}>
                  <strong>$72,957</strong>
                </div>
                <small>Normal conditions</small>
              </div>
              <div className={s.barGroup}>
                <div className={s.barTwo}>
                  <strong>$54,896</strong>
                </div>
                <small>After shock</small>
              </div>
              <div className={s.payrollLine}>
                <span>$60k PAYROLL</span>
              </div>
            </div>
            <div className={s.visualBottom}>
              <div>
                <small>PAYROLL SHORTFALL</small>
                <strong>$5,104</strong>
              </div>
              <span>
                Find the gap.
                <br />
                <b>Before it finds you.</b>
              </span>
            </div>
            <div className={s.proofStamp}>
              <ShieldCheck size={22} />
              <span>
                REAL UNISWAP V3
                <br />
                <b>Isolated EVM execution</b>
              </span>
            </div>
          </div>
        </section>
        <div className={s.protocolStrip}>
          <span>ONE CONNECTED EXIT PATH</span>
          <div>
            The Graph <small>Evidence</small>
          </div>
          <ArrowRight />
          <div>
            Privy <small>Authorization</small>
          </div>
          <ArrowRight />
          <div>
            Uniswap <small>Execution</small>
          </div>
          <Link href="/docs#market-data">
            How it works <ArrowUpRight size={16} />
          </Link>
        </div>
        <section className={s.section} id="how-it-works">
          <div className={s.sectionHeading}>
            <span className={s.eyebrow}>01 / FROM BALANCE TO READINESS</span>
            <h2>
              Rehearse the bad day.
              <br />
              Make a better decision.
            </h2>
            <p>
              A repeatable workflow for the question a portfolio dashboard can’t
              answer: how much cash can we actually get out?
            </p>
          </div>
          <div className={s.featureGrid}>
            {[
              {
                n: "01",
                icon: Activity,
                title: "Put liquidity under pressure.",
                text: "Apply a market shock and compare two Uniswap v3 routes. See executable cash, price impact, and the gap to your obligation.",
              },
              {
                n: "02",
                icon: LockKeyhole,
                title: "Give every exit a boundary.",
                text: "Review the minimum received and permitted recipient. The executor enforces amount limits, expiry and replay protection.",
              },
              {
                n: "03",
                icon: FileCheck2,
                title: "Close the loop with proof.",
                text: "Reconcile settlement against token movements. Keep a receipt with the transaction, policy checks, and exact output.",
              },
            ].map(({ n, icon: Icon, title, text }) => (
              <article key={n} className={s.feature}>
                <div>
                  <span>{n}</span>
                  <Icon size={27} />
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className={s.boundarySection}>
          <div>
            <span className={s.eyebrow}>02 / LIMITS THAT HOLD</span>
            <h2>
              Don’t just test the exit.
              <br />
              Test what gets blocked.
            </h2>
            <p>
              Try swapping the recipient in the demo. The contract rejects it.
              Your exit plan has rules that survive execution.
            </p>
            <Link className={s.primary} href="/app">
              Try the rejection drill <ArrowUpRight size={20} />
            </Link>
          </div>
          <div className={s.policyCard}>
            <div>
              <ShieldCheck />
              <b>EXIT POLICY</b>
              <span>ENFORCED</span>
            </div>
            <dl>
              {[
                ["Recipient", "Calling treasury only"],
                ["Input ceiling", "100 WETH"],
                ["Minimum output", "Checked at settlement"],
                ["Validity", "Short expiry · single-use nonce"],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>
                    <Check size={14} />
                    {v}
                  </dd>
                </div>
              ))}
            </dl>
            <p>
              <span />
              WrongRecipient{" "}
              <small>Transaction rejected. No tokens moved.</small>
            </p>
          </div>
        </section>
        <section className={s.section} id="built-in-the-open">
          <div className={s.honesty}>
            <div>
              <Code2 size={30} />
              <h2>
                Open code.
                <br />
                Clear boundaries.
              </h2>
            </div>
            <div>
              <p>
                Rehearse with current Ethereum market data or start with a
                repeatable example. Compare stressed outcomes without moving
                your wallet’s funds.
              </p>
              <p>
                Ready to try a wallet transaction? Use the Sepolia test network
                with valueless test tokens, review a fresh quote, and keep a
                verified receipt. Rehearsal results are estimates, never
                guaranteed mainnet fills.
              </p>
              <Link className={s.textLink} href="/docs#market-data">
                Find the right workflow for you <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
        <section className={s.finalCta}>
          <span className={s.eyebrow}>READY WHEN THE MARKET ISN’T.</span>
          <h2>
            Make your next exit
            <br />a rehearsed one.
          </h2>
          <Link className={s.darkButton} href="/app">
            Open the stress lab <ArrowUpRight size={22} />
          </Link>
          <span className={s.ctaFoot}>
            30 WETH. One price shock. A result you can act on.
          </span>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
