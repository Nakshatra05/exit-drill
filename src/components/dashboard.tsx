"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { ExitRequest, WalletSnapshot } from "@/lib/wallet-types";
import { balanceDeltaUsdc } from "@/lib/receipt-math";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Check,
  CheckCheck,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  Code2,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Play,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  X,
  Zap,
  AlertTriangle,
  CircleHelp,
  Database,
  Menu,
} from "lucide-react";
import type { DrillInput, DrillResult, Evidence, Receipt } from "@/lib/types";
const LiveWallet = dynamic(() => import("./live-wallet"), {
  ssr: false,
  loading: () => <span>Loading wallet…</span>,
});
const money = (v: number, d = 0) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: d,
  }).format(v);
const short = (s: string) => `${s.slice(0, 8)}…${s.slice(-6)}`;
const initialInput: DrillInput = {
  amountEth: 30,
  payrollUsdc: 60000,
  shockPercent: 25,
  slippageBps: 100,
};
const stages = [
  "Evidence",
  "Stress test",
  "Authorization",
  "Execution",
  "Receipt",
];
async function request<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Request failed. Please retry.");
  return j;
}
export default function Dashboard({
  defaultEvidenceMode = "graph",
}: {
  defaultEvidenceMode?: "reference" | "graph";
}) {
  const [view, setView] = useState("Overview"),
    [input, setInput] = useState(initialInput),
    [evidence, setEvidence] = useState<Evidence | null>(null),
    [mode, setMode] = useState<"reference" | "graph">(defaultEvidenceMode),
    [result, setResult] = useState<DrillResult | null>(null),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [receipts, setReceipts] = useState<Receipt[]>([]),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [walletRequest, setWalletRequest] = useState<ExitRequest | null>(null),
    [walletSnapshot, setWalletSnapshot] = useState<WalletSnapshot | null>(null),
    [mobileNav, setMobileNav] = useState(false);
  const refresh = async (nextMode = mode) => {
    if (busy) return;
    setBusy("evidence");
    setError("");
    try {
      const data = await request<Evidence>(`/api/evidence?mode=${nextMode}`);
      setEvidence(data);
      setMode(nextMode);
      setResult(null);
      setReceipt(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    void refresh(defaultEvidenceMode);
    try {
      const saved = JSON.parse(
        localStorage.getItem("exit-drill-receipts-v1") ?? "[]",
      );
      if (Array.isArray(saved))
        setReceipts(
          saved
            .filter(
              (r) =>
                r &&
                typeof r.id === "string" &&
                r.status === "confirmed" &&
                r.chainId === 11155111 &&
                r.mode === "sepolia",
            )
            .slice(0, 20),
        );
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (key: keyof DrillInput, value: number) => {
    if (busy) return;
    setInput((v) => ({ ...v, [key]: value }));
    setResult(null);
    setReceipt(null);
  };
  const run = async () => {
    if (busy) return;
    setBusy("simulation");
    setError("");
    setResult(null);
    setReceipt(null);
    try {
      const data = await request<DrillResult>("/api/drill", {
        input,
        evidenceMode: mode,
        evidenceBlock: evidence?.block ?? 0,
      });
      setResult(data);
      setNotice(
        "Analysis complete. Compare routes, then review a fresh wallet quote.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const download = (r: Receipt) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(r, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `exit-drill-${r.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const totalTvl = evidence?.pools.reduce((a, p) => a + p.tvlUsd, 0) ?? 0;
  const coverage = result?.coveragePercent;
  const currentStage = receipt ? 4 : result ? 2 : evidence ? 1 : 0;
  const visibleReceipts = receipts.filter(
    (r) =>
      walletSnapshot &&
      r.recipient?.toLowerCase() === walletSnapshot.address.toLowerCase(),
  );
  const nav = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Stress lab", icon: FlaskConical },
    { label: "Exit limits", icon: ShieldCheck },
    { label: "Receipts", icon: FileCheck2 },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "mobile-open" : ""}`}>
        <a href="/" className="brand">
          <span className="brand-mark">
            <ArrowUpRight size={28} strokeWidth={3} />
          </span>
          <span>
            EXIT<span className="brand-light">DRILL</span>
            <small>TREASURY RESILIENCE</small>
          </span>
        </a>
        <div className="workspace">
          <span className="workspace-avatar">↗</span>
          <span>
            My treasury<small>Personal workspace</small>
          </span>
          <ChevronDown size={16} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {nav.map(({ label, icon: Icon }) => (
            <button
              className={view === label ? "nav-item active" : "nav-item"}
              key={label}
              onClick={() => {
                setView(label);
                setMobileNav(false);
              }}
            >
              <Icon size={19} />
              {label}
              {label === "Receipts" && (
                <span className="nav-count">{visibleReceipts.length}</span>
              )}
              {view === label && label !== "Receipts" && (
                <ArrowUpRight className="nav-arrow" size={17} />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a className="source-link" href="/docs">
            <FileCheck2 size={17} />
            Documentation <ArrowUpRight size={13} />
          </a>
          <div className="network-card">
            <span className="tiny-label">CONNECTED WORKFLOW</span>
            <strong>Analyze. Review. Settle.</strong>
            <small>Every exit returns to your treasury.</small>
            <a className="docs-link" href="/docs#limits">
              Your exit limits <ArrowUpRight size={14} />
            </a>
          </div>
          <a
            className="source-link"
            href="https://github.com/Nakshatra05/exit-drill"
            target="_blank"
            rel="noreferrer"
          >
            <Code2 size={17} />
            Open source <ExternalLink size={13} />
          </a>
          <div className="profile">
            <span className="profile-icon">ED</span>
            <span>
              Your workspace<small>Saved on this browser</small>
            </span>
            <span className="demo-tag">BETA</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              <Menu />
            </button>
            <span>Workspace</span>
            <span>/</span>
            <strong>{view}</strong>
          </div>
          <div className="header-actions">
            <span className="mode-pill">
              <span className="status-dot" />
              Sepolia <span className="subtle">testnet</span>
            </span>
            {process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (
              <LiveWallet
                exitRequest={walletRequest}
                onSnapshot={setWalletSnapshot}
                onReceipt={(r) => {
                  const next = [
                    r,
                    ...receipts.filter((old) => old.id !== r.id),
                  ].slice(0, 20);
                  setReceipts(next);
                  try {
                    localStorage.setItem(
                      "exit-drill-receipts-v1",
                      JSON.stringify(next),
                    );
                  } catch {}
                  setReceipt(r);
                  setView("Receipts");
                }}
              />
            ) : (
              <button
                className="button dark compact"
                onClick={() =>
                  setError(
                    "Wallet sign-in is temporarily unavailable. Please try again shortly.",
                  )
                }
              >
                <Wallet size={16} />
                Connect wallet
                <ArrowUpRight size={14} />
              </button>
            )}
          </div>
        </header>
        <main>
          <section className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                TREASURY COMMAND CENTER
              </div>
              <h1>
                {view === "Overview"
                  ? "Ready for the unexpected."
                  : view === "Stress lab"
                    ? "Pressure-test your exit."
                    : view === "Exit limits"
                      ? "Your limits. Enforced."
                      : "Every exit. Accounted for."}
              </h1>
              <p>
                {view === "Receipts"
                  ? "Inspect settlements, policy checks, and reconciled balances."
                  : "Know what you can exit. Set the limits. Prove the outcome."}
              </p>
            </div>
            <button
              className="button light"
              onClick={() => void refresh()}
              disabled={!!busy}
            >
              <RefreshCw
                size={16}
                className={busy === "evidence" ? "spin" : ""}
              />
              Refresh market data
            </button>
          </section>
          <div className="account-strip">
            <div>
              <span className="tiny-label">TREASURY WALLET</span>
              <strong>
                {walletSnapshot
                  ? short(walletSnapshot.address)
                  : "Sign in to view your balances"}
              </strong>
            </div>
            <div>
              <span className="tiny-label">WETH BALANCE</span>
              <strong>
                {walletSnapshot
                  ? Number(walletSnapshot.weth).toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })
                  : "—"}
              </strong>
            </div>
            <div>
              <span className="tiny-label">USDC BALANCE</span>
              <strong>
                {walletSnapshot ? money(Number(walletSnapshot.usdc), 2) : "—"}
              </strong>
            </div>
            <div>
              <span className="tiny-label">NETWORK FEES</span>
              <strong>
                {walletSnapshot
                  ? Number(walletSnapshot.eth).toFixed(5) + " ETH"
                  : "—"}
              </strong>
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              <AlertTriangle size={18} />
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert notice" role="status">
              <Check size={17} />
              {notice}
              <button aria-label="Dismiss notice" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {view !== "Receipts" && view !== "Exit limits" && (
            <>
              <section className="metrics" aria-label="Treasury metrics">
                <article className="metric">
                  <div className="metric-label">
                    AMOUNT TO ANALYZE <Wallet size={17} />
                  </div>
                  <div className="metric-number">
                    {input.amountEth.toFixed(2)} <span>WETH</span>
                  </div>
                  <div className="metric-foot">
                    <span className="mini-chip">01 ASSET</span>Scenario input
                  </div>
                </article>
                <article className="metric">
                  <div className="metric-label">
                    PAYROLL OBLIGATION <ArrowDownLeft size={18} />
                  </div>
                  <div className="metric-number">
                    {money(input.payrollUsdc)}
                  </div>
                  <div className="metric-foot">
                    <span className="muted-square" />
                    Denominated in USDC
                  </div>
                </article>
                <article className="metric lime">
                  <div className="metric-label">
                    ESTIMATED STRESSED OUTPUT <Activity size={18} />
                  </div>
                  <div className="metric-number">
                    {result ? money(result.amountOutUsdc) : "—"}
                    <span className="metric-unit">{result ? " USDC" : ""}</span>
                  </div>
                  <div className="metric-foot">
                    {result ? (
                      <>
                        <span className="status-dot" />
                        After {input.shockPercent}% price shock
                      </>
                    ) : (
                      <>
                        Run a drill to calculate <ArrowRight size={14} />
                      </>
                    )}
                  </div>
                </article>
                <article className="metric">
                  <div className="metric-label">
                    PAYROLL COVERAGE <ShieldCheck size={18} />
                  </div>
                  <div
                    className={`metric-number ${coverage !== undefined && coverage < 100 ? "negative" : ""}`}
                  >
                    {coverage === undefined ? "—" : `${coverage.toFixed(1)}%`}
                  </div>
                  <div className="metric-foot">
                    {coverage === undefined ? (
                      "Awaiting stress test"
                    ) : coverage >= 100 ? (
                      <>
                        <span className="status-dot" />
                        Obligation covered
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} />
                        {money(result!.shortfallUsdc)} shortfall
                      </>
                    )}
                  </div>
                </article>
              </section>
              <section className="workflow">
                <span className="tiny-label">THE EXIT PATH</span>
                <div className="steps">
                  {stages.map((s, i) => (
                    <div
                      key={s}
                      className={`step ${i < currentStage ? "complete" : ""} ${i === currentStage ? "current" : ""}`}
                    >
                      <span>
                        {i < currentStage ? (
                          <Check size={13} />
                        ) : (
                          String(i + 1).padStart(2, "0")
                        )}
                      </span>
                      {s}
                      {i < 4 && <ArrowRight size={14} />}
                    </div>
                  ))}
                </div>
              </section>
              <div className="dashboard-grid">
                <section className="panel stress-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="section-index">01 / REHEARSE</span>
                      <h2>How much can you get out?</h2>
                    </div>
                    <FlaskConical size={22} />
                  </div>
                  <div className="form-grid">
                    <label>
                      Position to exit{" "}
                      <span className="input-wrap">
                        <input
                          aria-label="Position to exit"
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.1"
                          value={input.amountEth}
                          onChange={(e) =>
                            update("amountEth", Number(e.target.value))
                          }
                        />
                        <b>WETH</b>
                      </span>
                    </label>
                    <label>
                      Cash obligation{" "}
                      <span className="input-wrap">
                        <input
                          aria-label="Cash obligation"
                          type="number"
                          min="1"
                          max="500000"
                          step="1000"
                          value={input.payrollUsdc}
                          onChange={(e) =>
                            update("payrollUsdc", Number(e.target.value))
                          }
                        />
                        <b>USDC</b>
                      </span>
                    </label>
                  </div>
                  <div className="scenario-label">
                    <label htmlFor="shock">Market price shock</label>
                    <span className="shock-value">−{input.shockPercent}%</span>
                  </div>
                  <input
                    id="shock"
                    className="range"
                    type="range"
                    min="0"
                    max="70"
                    step="5"
                    value={input.shockPercent}
                    onChange={(e) =>
                      update("shockPercent", Number(e.target.value))
                    }
                  />
                  <div className="range-labels">
                    <span>0% · Normal</span>
                    <span>35% · Severe</span>
                    <span>70% · Extreme</span>
                  </div>
                  <div className="presets">
                    {[
                      { n: "Market wobble", v: 10 },
                      { n: "Liquidity crunch", v: 25 },
                      { n: "Black swan", v: 50 },
                    ].map((p) => (
                      <button
                        key={p.n}
                        className={input.shockPercent === p.v ? "selected" : ""}
                        onClick={() => update("shockPercent", p.v)}
                      >
                        {p.n}
                      </button>
                    ))}
                  </div>
                  <div className="simulation-note">
                    <Zap size={17} />
                    <span>
                      Competing sells move the pool price. Your exit runs after
                      the shock against actual Uniswap v3 contracts.
                    </span>
                  </div>
                  <button
                    className="button dark run-button"
                    disabled={
                      !!busy ||
                      !evidence ||
                      input.amountEth <= 0 ||
                      input.payrollUsdc <= 0
                    }
                    onClick={() => void run()}
                  >
                    {busy === "simulation" ? (
                      <LoaderCircle className="spin" size={18} />
                    ) : (
                      <Play size={17} />
                    )}{" "}
                    {busy === "simulation"
                      ? "Calculating stressed output…"
                      : "Run stress test"}
                    <span>{busy === "simulation" ? "Please wait" : "↗"}</span>
                  </button>
                </section>
                <section className="panel outcome-panel">
                  <div className="panel-heading">
                    <div>
                      <span className="section-index">02 / COMPARE</span>
                      <h2>Your exit, under pressure.</h2>
                    </div>
                    <span className="outline-tag">USDC</span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i className="legend-baseline" />
                      Normal conditions
                    </span>
                    <span>
                      <i className="legend-stress" />
                      After shock
                    </span>
                    <span>
                      <i className="legend-target" />
                      Cash target
                    </span>
                  </div>
                  <div
                    className="cash-chart"
                    role="img"
                    aria-label={
                      result
                        ? `Baseline ${money(result.baselineUsdc)}, stressed ${money(result.amountOutUsdc)}, obligation ${money(input.payrollUsdc)}`
                        : "Run a stress test to compare executable cash"
                    }
                  >
                    <div className="chart-grid">
                      <span>
                        {money(
                          Math.max(
                            result?.baselineUsdc ?? input.amountEth * 2500,
                            input.payrollUsdc,
                          ) * 1.2,
                        )}
                      </span>
                      <span>
                        {money(
                          Math.max(
                            result?.baselineUsdc ?? input.amountEth * 2500,
                            input.payrollUsdc,
                          ) * 0.8,
                        )}
                      </span>
                      <span>
                        {money(
                          Math.max(
                            result?.baselineUsdc ?? input.amountEth * 2500,
                            input.payrollUsdc,
                          ) * 0.4,
                        )}
                      </span>
                      <span>$0</span>
                    </div>
                    <div className="bars">
                      <div className="bar-column">
                        <strong>
                          {result
                            ? money(result.baselineUsdc)
                            : "Awaiting drill"}
                        </strong>
                        <div
                          className="bar baseline"
                          style={{
                            height: result
                              ? `${Math.min(95, (result.baselineUsdc / Math.max(result?.baselineUsdc ?? input.amountEth * 2500, input.payrollUsdc) / 1.2) * 100)}%`
                              : "4%",
                          }}
                        />
                        <span>Before shock</span>
                      </div>
                      <div className="bar-column">
                        <strong>
                          {result
                            ? money(result.amountOutUsdc)
                            : "Awaiting drill"}
                        </strong>
                        <div
                          className="bar stressed"
                          style={{
                            height: result
                              ? `${Math.min(95, (result.amountOutUsdc / Math.max(result?.baselineUsdc ?? input.amountEth * 2500, input.payrollUsdc) / 1.2) * 100)}%`
                              : "4%",
                          }}
                        />
                        <span>After shock</span>
                      </div>
                      <div
                        className="target-line"
                        style={{
                          bottom: `${Math.min(90, (input.payrollUsdc / Math.max(result?.baselineUsdc ?? input.amountEth * 2500, input.payrollUsdc) / 1.2) * 100)}%`,
                        }}
                      >
                        <span>Cash target</span>
                      </div>
                    </div>
                  </div>
                  <div className="outcome-summary">
                    <span
                      className={`summary-icon ${result && result.shortfallUsdc > 0 ? "amber" : ""}`}
                    >
                      {result ? (
                        result.shortfallUsdc > 0 ? (
                          <AlertTriangle size={20} />
                        ) : (
                          <ShieldCheck size={20} />
                        )
                      ) : (
                        <Activity size={20} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {result
                          ? result.shortfallUsdc > 0
                            ? "A balance is not a cash guarantee."
                            : "Your cash target survives this scenario."
                          : "Get a result you can act on."}
                      </strong>
                      <p>
                        {result
                          ? `${money(result.shortfallUsdc)} shortfall · ${(result.selectedFee / 10000).toFixed(2)}% fee tier selected`
                          : "Compare executable cash with your obligation."}
                      </p>
                    </div>
                  </div>
                </section>
              </div>
              <section className="panel liquidity-panel">
                <div className="panel-heading">
                  <div>
                    <span className="section-index">SOURCE INTELLIGENCE</span>
                    <h2>Two routes. One informed exit.</h2>
                  </div>
                  <span className="data-badge">
                    <Database size={14} />
                    {mode === "graph" ? "THE GRAPH" : "REFERENCE POOLS"}
                  </span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>POOL / VENUE</th>
                        <th>FEE TIER</th>
                        <th>LIQUIDITY (TVL)</th>
                        <th>24H VOLUME</th>
                        <th>STRESSED OUTPUT</th>
                        <th>ROUTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(evidence?.pools ?? []).slice(0, 4).map((p) => {
                        const route = result?.routes.find(
                          (r) => r.feeTier === p.feeTier,
                        );
                        return (
                          <tr key={p.id}>
                            <td>
                              <div className="token-pair">
                                <span className="eth-token">Ξ</span>
                                <span className="usdc-token">$</span>
                                <span>
                                  <strong>WETH / USDC</strong>
                                  <small>Uniswap v3</small>
                                </span>
                              </div>
                            </td>
                            <td>
                              <span className="fee-tag">
                                {(p.feeTier / 10000).toFixed(2)}%
                              </span>
                            </td>
                            <td>{money(p.tvlUsd)}</td>
                            <td>{money(p.volume24h)}</td>
                            <td className="table-output">
                              {route ? money(route.stressedUsdc, 2) : "—"}
                            </td>
                            <td>
                              {result?.selectedFee === p.feeTier ? (
                                <span className="best-route">
                                  <Check size={13} />
                                  BEST EXIT
                                </span>
                              ) : (
                                <span className="subtle">
                                  {route ? "Compared" : "Not tested"}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="table-footer">
                  <span>
                    <span className="status-dot" />
                    {evidence
                      ? `${mode === "graph" ? `Block ${evidence.block.toLocaleString()}` : "Market snapshot"} · ${money(totalTvl)} total TVL`
                      : "Loading source evidence…"}
                  </span>
                  <span>
                    {mode === "graph"
                      ? "Ethereum market data · modeled output"
                      : "No real funds at risk"}
                  </span>
                </div>
              </section>
              <section className="execution-strip">
                <div className="execution-icon">
                  <LockKeyhole size={24} />
                </div>
                <div>
                  <h3>
                    {receipt
                      ? "Exit settled. Receipt verified."
                      : "Turn your analysis into an exit."}
                  </h3>
                  <p>
                    Review a fresh Sepolia quote for this amount and route.
                    Stress estimates are never used as settlement quotes.
                  </p>
                </div>
                <div className="execution-actions">
                  <button
                    className="button lime-button"
                    disabled={!result || !!busy}
                    onClick={() =>
                      result &&
                      setWalletRequest({
                        id: Date.now(),
                        amount: input.amountEth,
                        fee: result.selectedFee as 500 | 3000,
                      })
                    }
                  >
                    Review exit <ArrowRight size={17} />
                  </button>
                </div>
              </section>
            </>
          )}
          {view === "Exit limits" && (
            <section className="panel policy-page">
              <div className="panel-heading">
                <div>
                  <span className="section-index">AUTHORIZATION BOUNDARY</span>
                  <h2>Every exit has boundaries.</h2>
                </div>
                <ShieldCheck size={26} />
              </div>
              <p className="panel-description">
                Your wallet restricts signing to approved actions. The exit
                contract enforces the amount, destination and minimum received
                at settlement.
              </p>
              <div className="policy-rule">
                <LockKeyhole />
                <div>
                  <strong>Fixed recipient</strong>
                  <p>Output must return to the calling treasury wallet.</p>
                </div>
                <span className="best-route">ENFORCED</span>
              </div>
              <div className="policy-rule">
                <Wallet />
                <div>
                  <strong>100 WETH maximum input</strong>
                  <p>No arbitrary amounts, routers or external calls.</p>
                </div>
                <span className="best-route">ENFORCED</span>
              </div>
              <div className="policy-rule">
                <Activity />
                <div>
                  <strong>Minimum output & expiry</strong>
                  <p>
                    Balance deltas are checked. Plans expire within 15 minutes
                    and cannot replay.
                  </p>
                </div>
                <span className="best-route">ENFORCED</span>
              </div>
              <div className="policy-rule">
                <ShieldCheck />
                <div>
                  <strong>Restricted wallet actions</strong>
                  <p>
                    Your testnet treasury can request test tokens, authorize the
                    fixed exit contract, and execute a bounded swap. Other
                    transfers are blocked by its signing policy.
                  </p>
                </div>
                <span className="outline-tag">TESTNET WALLET</span>
              </div>
              <button
                className="button dark"
                onClick={() => setView("Stress lab")}
              >
                Analyze an exit <ArrowRight size={17} />
              </button>
            </section>
          )}
          {view === "Receipts" && (
            <section className="panel receipts-panel">
              <div className="panel-heading">
                <div>
                  <span className="section-index">RECONCILIATION</span>
                  <h2>
                    Settlement receipts{" "}
                    <span className="count-label">
                      {visibleReceipts.length}
                    </span>
                  </h2>
                </div>
                <FileCheck2 size={25} />
              </div>
              <p className="panel-description">
                Saved in this browser. Export JSON for a portable audit record.
                Every receipt links to a confirmed Sepolia transaction.
              </p>
              {visibleReceipts.length === 0 ? (
                <div className="empty-receipts">
                  <FileCheck2 size={45} />
                  <h3>Your confirmed exits appear here.</h3>
                  <p>
                    Analyze an amount, review a live quote, and confirm your
                    exit.
                  </p>
                  <button
                    className="button dark"
                    onClick={() => setView("Stress lab")}
                  >
                    Analyze your first exit <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                visibleReceipts.map((r) => (
                  <article className="receipt-card" key={r.id}>
                    <div className="receipt-top">
                      <span className="best-route">
                        <CheckCheck size={14} />
                        CONFIRMED ·{" "}
                        {r.mode === "sandbox" ? "REHEARSAL" : "SEPOLIA TESTNET"}
                      </span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="receipt-amount">
                      {r.amountInEth} WETH <ArrowRight />{" "}
                      {money(r.amountOutUsdc, 2)} <small>USDC</small>
                    </div>
                    <dl>
                      <div>
                        <dt>Transaction</dt>
                        <dd>{short(r.transactionHash)}</dd>
                      </div>
                      <div>
                        <dt>Minimum output</dt>
                        <dd>{money(r.minimumOutUsdc, 2)} USDC</dd>
                      </div>
                      <div>
                        <dt>Network / block</dt>
                        <dd>
                          {r.chainId} / {r.blockNumber}
                        </dd>
                      </div>
                      <div>
                        <dt>Gas used</dt>
                        <dd>{Number(r.gasUsed).toLocaleString()}</dd>
                      </div>
                      <div>
                        <dt>Policy enforcement</dt>
                        <dd>
                          {r.policy.engine === "contract"
                            ? "Rehearsal limits"
                            : "Wallet + exit limits"}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          {r.balances.basis === "transaction-logs"
                            ? "Transaction token inflow"
                            : "Balance delta"}
                        </dt>
                        <dd>
                          {money(
                            balanceDeltaUsdc(
                              r.balances.beforeUsdc,
                              r.balances.afterUsdc,
                            ),
                            2,
                          )}{" "}
                          USDC
                        </dd>
                      </div>
                    </dl>
                    <div className="receipt-actions">
                      <button
                        className="button light compact"
                        onClick={() => download(r)}
                      >
                        <Download size={15} />
                        Export JSON
                      </button>
                      <button
                        className="button light compact"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(r.transactionHash)
                            .then(() => setNotice("Transaction hash copied."))
                            .catch(() =>
                              setError(
                                "Clipboard unavailable. Export the receipt instead.",
                              ),
                            )
                        }
                      >
                        <Copy size={15} />
                        Copy hash
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
          <footer className="footer">
            <span>
              <span className="brand-footer">↗</span> EXIT DRILL{" "}
              <span className="subtle">/ Built for the moment it matters.</span>
            </span>
            <span>
              ETHOnline 2026 <span className="footer-divider">·</span>
              <a href="/docs">
                User guide <ArrowUpRight size={13} />
              </a>
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
