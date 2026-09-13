"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useDialog } from "./use-dialog";
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
  defaultEvidenceMode = "reference",
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
    [policyOpen, setPolicyOpen] = useState(false),
    [settingsOpen, setSettingsOpen] = useState(false),
    [approved, setApproved] = useState(false),
    [rejected, setRejected] = useState(false),
    [mobileNav, setMobileNav] = useState(false);
  useDialog(policyOpen || settingsOpen, () => {
    setPolicyOpen(false);
    setSettingsOpen(false);
  });
  useEffect(() => {
    if (!approved) return;
    const timer = setTimeout(() => {
      setApproved(false);
      setNotice("Approval expired. Review a fresh exit policy.");
    }, 600000);
    return () => clearTimeout(timer);
  }, [approved]);
  const refresh = async (nextMode = mode) => {
    if (busy) return;
    setBusy("evidence");
    setError("");
    try {
      const data = await request<Evidence>(`/api/evidence?mode=${nextMode}`);
      setEvidence(data);
      setMode(nextMode);
      setResult(null);
      setApproved(false);
      setRejected(false);
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
                [31337, 11155111].includes(r.chainId),
            )
            .slice(0, 20),
        );
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const update = (key: keyof DrillInput, value: number) => {
    if (busy) return;
    setInput((v) => ({ ...v, [key]: value }));
    setResult(null);
    setApproved(false);
    setReceipt(null);
    setRejected(false);
  };
  const run = async () => {
    if (busy) return;
    setBusy("simulation");
    setError("");
    setResult(null);
    setReceipt(null);
    setApproved(false);
    setRejected(false);
    try {
      const data = await request<DrillResult>("/api/drill", {
        input,
        evidenceMode: mode,
        evidenceBlock: evidence?.block ?? 0,
      });
      setResult(data);
      setNotice(
        "Rehearsal complete. Compare routes, then review your exit policy.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const execute = async (violation = false) => {
    if (!result || busy || !approved) return;
    setBusy(violation ? "attack" : "execution");
    setError("");
    try {
      const r = await request<Receipt>("/api/execute", {
        input,
        evidenceMode: mode,
        evidenceBlock: result.evidenceBlock,
        feeTier: result.selectedFee,
        minimumOutUsdc: result.amountOutUsdc * (1 - input.slippageBps / 10000),
        approved: true,
        testViolation: violation,
      });
      if (!violation) {
        setReceipt(r);
        const next = [r, ...receipts.filter((old) => old.id !== r.id)].slice(
          0,
          20,
        );
        setReceipts(next);
        try {
          localStorage.setItem("exit-drill-receipts-v1", JSON.stringify(next));
        } catch {}
        setNotice(
          "Rehearsal settled. Your receipt matches the tokens received.",
        );
      }
    } catch (e) {
      if (violation && (e as Error).message.includes("WrongRecipient")) {
        setRejected(true);
        setNotice("Recipient change blocked. No tokens moved.");
      } else setError((e as Error).message);
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
  const currentStage = receipt
    ? 4
    : approved
      ? 3
      : result
        ? 2
        : evidence
          ? 1
          : 0;
  const nav = [
    { label: "Overview", icon: LayoutDashboard },
    { label: "Stress lab", icon: FlaskConical },
    { label: "Policy controls", icon: ShieldCheck },
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
                <span className="nav-count">{receipts.length}</span>
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
            <span className="tiny-label">PRACTICE WITH CONFIDENCE</span>
            <strong>
              <span className="status-dot" />
              Rehearsal mode
            </strong>
            <small>Virtual funds. No wallet transfers.</small>
            <button onClick={() => setSettingsOpen(true)}>
              Market data <ArrowUpRight size={14} />
            </button>
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
            <button className="mode-pill" onClick={() => setSettingsOpen(true)}>
              <span className="status-dot" />
              {mode === "graph" ? "Market snapshot" : "Example scenario"}
              <ChevronDown size={13} />
            </button>
            {process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (
              <LiveWallet
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
                  setView("Receipts");
                }}
              />
            ) : (
              <button
                className="button dark compact"
                onClick={() => setSettingsOpen(true)}
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
                    : view === "Policy controls"
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
          <div className="context-strip">
            <span>
              <FlaskConical size={16} />
              <strong>
                {mode === "graph" ? "MARKET REHEARSAL" : "EXAMPLE REHEARSAL"}
              </strong>
            </span>
            <p>
              {mode === "graph"
                ? "Current prices inform this model. Results are estimates, not guaranteed market fills."
                : "Practice an exit with a repeatable scenario. Your wallet balance stays untouched."}
            </p>
            <button onClick={() => setSettingsOpen(true)}>
              Change data <ArrowRight size={15} />
            </button>
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
          {view !== "Receipts" && view !== "Policy controls" && (
            <>
              <section className="metrics" aria-label="Treasury metrics">
                <article className="metric">
                  <div className="metric-label">
                    TREASURY POSITION <Wallet size={17} />
                  </div>
                  <div className="metric-number">
                    {input.amountEth.toFixed(2)} <span>WETH</span>
                  </div>
                  <div className="metric-foot">
                    <span className="mini-chip">01 ASSET</span>Ready to rehearse
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
                    STRESSED CASH OUT <Activity size={18} />
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
                      ? "Running EVM rehearsal…"
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
                      ? `${mode === "graph" ? `Block ${evidence.block.toLocaleString()}` : "Deterministic fixture"} · ${money(totalTvl)} total TVL`
                      : "Loading source evidence…"}
                  </span>
                  <span>
                    {mode === "graph"
                      ? "Ethereum data · isolated execution"
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
                      ? "Exit settled. Evidence preserved."
                      : approved
                        ? "Your policy is armed."
                        : "A good exit starts with good limits."}
                  </h3>
                  <p>
                    {receipt
                      ? `Rehearsal transaction ${short(receipt.transactionHash)}`
                      : approved
                        ? "The executor enforces recipient, amount, expiry and minimum output."
                        : "Review the amount, minimum received, and permitted destination before execution."}
                  </p>
                </div>
                <div className="execution-actions">
                  {approved && !receipt && (
                    <>
                      <button
                        className="button light"
                        onClick={() => void execute(true)}
                        disabled={!!busy}
                      >
                        {busy === "attack" ? (
                          <LoaderCircle className="spin" size={16} />
                        ) : (
                          <ShieldCheck size={16} />
                        )}{" "}
                        {rejected ? "Attack blocked" : "Test bad recipient"}
                      </button>
                      <button
                        className="button lime-button"
                        onClick={() => void execute()}
                        disabled={!!busy}
                      >
                        {busy === "execution" ? (
                          <LoaderCircle className="spin" size={17} />
                        ) : (
                          <Zap size={17} />
                        )}
                        Complete rehearsal
                      </button>
                    </>
                  )}
                  {!approved && (
                    <button
                      className="button light"
                      disabled={!result || !!busy}
                      onClick={() => setPolicyOpen(true)}
                    >
                      Review exit policy <ArrowRight size={17} />
                    </button>
                  )}
                  {receipt && (
                    <button
                      className="button lime-button"
                      onClick={() => {
                        setView("Receipts");
                      }}
                    >
                      Open receipt <ArrowRight size={17} />
                    </button>
                  )}
                </div>
              </section>
            </>
          )}
          {view === "Policy controls" && (
            <section className="panel policy-page">
              <div className="panel-heading">
                <div>
                  <span className="section-index">AUTHORIZATION BOUNDARY</span>
                  <h2>Every exit has boundaries.</h2>
                </div>
                <ShieldCheck size={26} />
              </div>
              <p className="panel-description">
                Every rehearsal checks the recipient, amount and minimum
                received. Your testnet wallet adds signing limits before a
                transaction is sent.
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
                Start with a rehearsal <ArrowRight size={17} />
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
                    <span className="count-label">{receipts.length}</span>
                  </h2>
                </div>
                <FileCheck2 size={25} />
              </div>
              <p className="panel-description">
                Saved in this browser. Export JSON for a portable audit record.
                Rehearsal receipts record practice exits. Sepolia receipts link
                to public testnet transactions.
              </p>
              {receipts.length === 0 ? (
                <div className="empty-receipts">
                  <FileCheck2 size={45} />
                  <h3>Your first receipt starts with a drill.</h3>
                  <p>
                    Run a stress test, approve its limits, and complete a
                    rehearsal.
                  </p>
                  <button
                    className="button dark"
                    onClick={() => setView("Stress lab")}
                  >
                    Run your first drill <ArrowRight size={17} />
                  </button>
                </div>
              ) : (
                receipts.map((r) => (
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
              <button onClick={() => setSettingsOpen(true)}>
                Market data <ArrowUpRight size={13} />
              </button>
            </span>
          </footer>
        </main>
      </div>
      {policyOpen && result && (
        <div className="modal-backdrop" onClick={() => setPolicyOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <span className="eyebrow">APPROVE A BOUNDED EXIT</span>
              <button
                className="icon-button"
                aria-label="Close policy review"
                onClick={() => setPolicyOpen(false)}
              >
                <X />
              </button>
            </div>
            <h2 id="policy-title">Make the limits explicit.</h2>
            <p>
              Approval applies to this rehearsal only. Changing any scenario
              input clears approval.
            </p>
            <dl className="policy-details">
              <div>
                <dt>Maximum input</dt>
                <dd>{input.amountEth} WETH</dd>
              </div>
              <div>
                <dt>Expected output</dt>
                <dd>{money(result.amountOutUsdc, 2)} USDC</dd>
              </div>
              <div>
                <dt>Slippage tolerance</dt>
                <dd>
                  <select
                    aria-label="Slippage tolerance"
                    value={input.slippageBps}
                    onChange={(e) => {
                      setInput({
                        ...input,
                        slippageBps: Number(e.target.value),
                      });
                      setApproved(false);
                    }}
                  >
                    <option value={50}>0.50%</option>
                    <option value={100}>1.00%</option>
                    <option value={200}>2.00%</option>
                  </select>
                </dd>
              </div>
              <div>
                <dt>Minimum received</dt>
                <dd>
                  {money(
                    result.amountOutUsdc * (1 - input.slippageBps / 10000),
                    2,
                  )}{" "}
                  USDC
                </dd>
              </div>
              <div>
                <dt>Permitted recipient</dt>
                <dd>Calling treasury only</dd>
              </div>
              <div>
                <dt>Expiry / replay</dt>
                <dd>10 minutes / single use</dd>
              </div>
            </dl>
            {result.shortfallUsdc > 0 && (
              <div className="alert warning">
                <AlertTriangle size={18} />
                This exit leaves a {money(result.shortfallUsdc)} payroll
                shortfall.
              </div>
            )}
            <div className="modal-note">
              <FlaskConical size={17} />
              Rehearsal approval only. This does not authorize a wallet
              transaction.
            </div>
            <button
              className="button dark full-width"
              onClick={() => {
                setApproved(true);
                setPolicyOpen(false);
                setNotice(
                  "Rehearsal limits approved. Test a rejection or complete your exit.",
                );
              }}
            >
              <ShieldCheck size={18} />
              Approve rehearsal limits
            </button>
          </section>
        </div>
      )}
      {settingsOpen && (
        <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <section
            className="modal wide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-heading">
              <span className="eyebrow">YOUR SCENARIO</span>
              <button
                className="icon-button"
                aria-label="Close market data choices"
                onClick={() => setSettingsOpen(false)}
              >
                <X />
              </button>
            </div>
            <h2 id="setup-title">Choose your market data.</h2>
            <p>
              Both choices run a rehearsal with virtual funds. Changing data
              clears your current result and approval.
            </p>
            <div className="policy-rule">
              <Database />
              <div>
                <strong>Current market snapshot</strong>
                <p>
                  Use recent Ethereum WETH/USDC prices and liquidity to
                  calibrate your scenario. Refresh after ten minutes.
                </p>
              </div>
            </div>
            <div className="policy-rule">
              <FlaskConical />
              <div>
                <strong>Example scenario</strong>
                <p>
                  Start at $2,500 per WETH with fixed liquidity. Useful for
                  learning the workflow and comparing repeatable drills.
                </p>
              </div>
            </div>
            <div className="mode-buttons">
              <button
                className="button dark"
                disabled={!!busy}
                onClick={() => {
                  setSettingsOpen(false);
                  void refresh("graph");
                }}
              >
                Use market snapshot <ArrowUpRight size={16} />
              </button>
              <button
                className="button light"
                disabled={!!busy}
                onClick={() => {
                  setSettingsOpen(false);
                  void refresh("reference");
                }}
              >
                Try example
              </button>
            </div>
            <a className="docs-link" href="/docs#market-data">
              Understanding market data <ArrowRight size={14} />
            </a>
          </section>
        </div>
      )}
    </div>
  );
}
