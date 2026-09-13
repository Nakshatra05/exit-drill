"use client";
import { useEffect, useRef, useState } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { createPublicClient, http, type Hex } from "viem";
import { sepolia } from "viem/chains";
import {
  Wallet,
  X,
  ExternalLink,
  LoaderCircle,
  Copy,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { useDialog } from "./use-dialog";
import type { Receipt } from "@/lib/types";
import type { ExitRequest, WalletSnapshot } from "@/lib/wallet-types";
type Props = {
  onAnalyze: (amount: number) => void;
  onReceipt: (receipt: Receipt) => void;
  onSnapshot: (snapshot: WalletSnapshot | null) => void;
  exitRequest: ExitRequest | null;
};
type Treasury = { id: string; address: string };
type Quote = { amountOut: string; nonce: string; deadline: number };
type Pending = { hash: Hex; action: string };
const rpc = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com", {
    timeout: 10000,
    retryCount: 1,
  }),
});
function WalletControl({
  onReceipt,
  onSnapshot,
  onAnalyze,
  exitRequest,
}: Props) {
  const { ready, authenticated, login, logout, getAccessToken, user } =
    usePrivy();
  const [open, setOpen] = useState(false),
    [wallet, setWallet] = useState<Treasury | null>(null),
    [snapshot, setSnapshot] = useState<WalletSnapshot | null>(null),
    [amount, setAmount] = useState(0),
    [fee, setFee] = useState<500 | 3000>(3000),
    [quote, setQuote] = useState<Quote | null>(null),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState<Pending | null>(null),
    [hash, setHash] = useState(""),
    [now, setNow] = useState(Date.now()),
    [funding, setFunding] = useState(false),
    [intent, setIntent] = useState<"fund" | "trade">("fund");
  const reopen = useRef(false),
    handled = useRef<number | null>(null),
    identity = useRef(user?.id);
  identity.current = user?.id;
  const pendingKey = `exit-drill-pending-v2-${user?.id ?? "anonymous"}`;
  useDialog(open, () => setOpen(false));
  useEffect(() => {
    setWallet(null);
    setSnapshot(null);
    onSnapshot(null);
    setQuote(null);
    setMessage("");
    setHash("");
    try {
      const stored = JSON.parse(localStorage.getItem(pendingKey) ?? "null");
      setPending(
        stored &&
          /^0x[0-9a-fA-F]{64}$/.test(stored.hash) &&
          ["mint", "approve", "execute"].includes(stored.action)
          ? stored
          : null,
      );
    } catch {
      setPending(null);
    }
  }, [pendingKey, onSnapshot]);
  useEffect(() => {
    if (exitRequest && handled.current !== exitRequest.id) {
      handled.current = exitRequest.id;
      setAmount(exitRequest.amount);
      setFee(exitRequest.fee);
      setIntent(exitRequest.intent ?? "trade");
      setQuote(null);
      setOpen(true);
    }
  }, [exitRequest]);
  useEffect(() => {
    if (authenticated && reopen.current) {
      reopen.current = false;
      setOpen(true);
    }
  }, [authenticated]);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [open]);
  const api = async (path: string, body: unknown) => {
    const token = await getAccessToken();
    if (!token) throw new Error("Please sign in again.");
    const r = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Please retry shortly.");
    return j;
  };
  const balances = async (t: Treasury) => {
    const owner = user?.id;
    try {
      const value: WalletSnapshot = await api("/api/privy/balance", {
        walletId: t.id,
      });
      if (identity.current !== owner) return;
      setSnapshot(value);
      onSnapshot(value);
    } catch {
      if (identity.current !== owner) return;
      setSnapshot(null);
      onSnapshot(null);
    }
  };
  const setup = async () => {
    const owner = user?.id;
    setBusy("setup");
    setMessage("");
    try {
      const t: Treasury = await api("/api/privy/wallet", {});
      if (identity.current !== owner) return;
      setWallet(t);
      await balances(t);
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  useEffect(() => {
    if (authenticated && !wallet && !busy) void setup();
  }, [open, authenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const persist = (p: Pending | null) => {
    setPending(p);
    try {
      if (p) localStorage.setItem(pendingKey, JSON.stringify(p));
      else localStorage.removeItem(pendingKey);
    } catch {}
  };
  const finish = async (p: Pending) => {
    const confirmed = await rpc.waitForTransactionReceipt({
      hash: p.hash,
      timeout: 60000,
    });
    if (confirmed.status !== "success") {
      persist(null);
      setQuote(null);
      throw new Error(
        "The transaction reverted. Refresh your balances and request a new quote.",
      );
    }
    if (p.action === "execute") {
      onReceipt(await api("/api/reconcile", { hash: p.hash }));
      setMessage("Exit confirmed. Your settlement receipt is ready.");
      setOpen(false);
    } else
      setMessage(
        p.action === "mint"
          ? "WETH received. You can now review your exit."
          : "Spending limit confirmed. Request a fresh quote.",
      );
    persist(null);
    if (wallet) await balances(wallet);
  };
  const invalid = !Number.isFinite(amount) || amount < 0.01 || amount > 100;
  const insufficient = !!snapshot && amount > Number(snapshot.weth);
  const needsTokens =
    !!snapshot && (Number(snapshot.weth) === 0 || insufficient);
  const needsAllowance = !!snapshot && amount > Number(snapshot.allowance);
  const expired = !!quote && now >= quote.deadline * 1000;
  const hasGas = !!snapshot && Number(snapshot.eth) > 0;
  const funded = !!snapshot && hasGas && !insufficient && !invalid;
  const act = async (action: string) => {
    if (!wallet || busy || pending || invalid) return;
    if (action === "execute" && (!quote || expired)) return;
    setBusy(action);
    setMessage("");
    setHash("");
    try {
      const r = await api("/api/privy/action", {
        walletId: wallet.id,
        action,
        amount,
        fee,
        ...(action === "execute" && quote
          ? {
              minimumOut: ((BigInt(quote.amountOut) * 99n) / 100n).toString(),
              nonce: quote.nonce,
              deadline: quote.deadline,
            }
          : {}),
      });
      if (action === "quote") {
        setQuote(r);
        setNow(Date.now());
      } else {
        setQuote(null);
        const p = { hash: r.hash as Hex, action };
        persist(p);
        setHash(r.hash);
        setMessage("Transaction submitted. Waiting for confirmation…");
        await finish(p);
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const refresh = async () => {
    if (!wallet || busy) return;
    setBusy("balance");
    await balances(wallet);
    setBusy("");
  };
  useEffect(() => {
    if (!open || !wallet || busy) return;
    const timer = setInterval(() => void balances(wallet), 15000);
    return () => clearInterval(timer);
  }, [open, wallet?.id, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <button
        className="button dark compact"
        disabled={!ready}
        onClick={() => {
          setIntent("fund");
          setQuote(null);
          setOpen(true);
        }}
      >
        <Wallet size={15} />
        {authenticated ? "Treasury" : "Sign in"}
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal wide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wallet-title"
          >
            <div className="modal-heading">
              <span className="eyebrow">TREASURY / SEPOLIA TESTNET</span>
              <button
                className="icon-button"
                aria-label="Close treasury"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <h2 id="wallet-title">
              {!authenticated
                ? "First, sign in."
                : !wallet
                  ? "Opening your treasury…"
                  : !snapshot
                    ? "Load your treasury balances."
                    : !hasGas
                      ? "1. Add ETH for network fees."
                      : needsTokens
                        ? "2. Get WETH to sell."
                        : intent === "fund"
                          ? "Your treasury is ready."
                          : quote
                            ? "4. Review and confirm."
                            : needsAllowance
                              ? "3. Approve your spending limit."
                              : "4. Get your exit quote."}
            </h2>
            <ol className="treasury-steps" aria-label="Exit progress">
              <li className={authenticated ? "done" : "active"}>Sign in</li>
              <li className={funded ? "done" : authenticated ? "active" : ""}>
                Fund
              </li>
              <li
                className={
                  funded && intent === "fund"
                    ? "active"
                    : intent === "trade"
                      ? "done"
                      : ""
                }
              >
                Choose amount
              </li>
              <li className={funded && intent === "trade" ? "active" : ""}>
                Review & settle
              </li>
            </ol>
            {message && (
              <div role="status" className="alert notice">
                {message}
              </div>
            )}
            {busy && (
              <p className="wallet-progress" role="status">
                <LoaderCircle className="spin" size={16} />
                {busy === "setup"
                  ? "Opening your treasury…"
                  : busy === "mint"
                    ? "Requesting WETH. Waiting for Sepolia confirmation…"
                    : busy === "approve"
                      ? "Approving your spending limit. Waiting for confirmation…"
                      : busy === "execute"
                        ? "Submitting your exit. Your receipt will open after confirmation…"
                        : busy === "balance"
                          ? "Refreshing balances…"
                          : busy === "recover"
                            ? "Checking your submitted transaction…"
                            : "Getting a fresh Sepolia quote…"}
              </p>
            )}
            {!authenticated ? (
              <>
                <p>
                  Sign in with email or your wallet. Wallet sign-in proves
                  account ownership; it does not approve tokens or transfer
                  funds from MetaMask.
                </p>
                <p className="wallet-disclosure">
                  Exit Drill manages a separate Sepolia treasury for your
                  account. If your wallet flags this site as unsafe, stop and
                  use its security review process.
                </p>
                <button
                  className="button dark full-width"
                  style={{ marginTop: 20 }}
                  disabled={!ready}
                  onClick={() => {
                    reopen.current = true;
                    setOpen(false);
                    login();
                  }}
                >
                  Continue to sign in <ArrowRight size={16} />
                </button>
              </>
            ) : (
              <>
                <p className="wallet-disclosure">
                  Managed by Exit Drill. This release settles on Sepolia using
                  test assets. Ethereum market analysis and Sepolia quotes use
                  different pools.
                </p>
                {!wallet ? (
                  <button
                    className="button dark full-width"
                    disabled={!!busy}
                    onClick={() => void setup()}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={16} />
                    ) : (
                      <Wallet size={16} />
                    )}
                    Open treasury
                  </button>
                ) : (
                  <>
                    <div className="wallet-address">
                      <span>{wallet.address}</span>
                      <button
                        className="icon-button"
                        aria-label="Copy treasury address"
                        onClick={() =>
                          void navigator.clipboard
                            .writeText(wallet.address)
                            .then(() => setMessage("Address copied."))
                            .catch(() =>
                              setMessage(
                                "Copy the displayed address manually.",
                              ),
                            )
                        }
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="wallet-balances">
                      <div>
                        <small>WETH</small>
                        <strong>
                          {snapshot
                            ? Number(snapshot.weth).toLocaleString(undefined, {
                                maximumFractionDigits: 4,
                              })
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <small>USDC</small>
                        <strong>
                          {snapshot
                            ? Number(snapshot.usdc).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : "—"}
                        </strong>
                      </div>
                      <div>
                        <small>ETH FOR FEES</small>
                        <strong>
                          {snapshot ? Number(snapshot.eth).toFixed(5) : "—"}
                        </strong>
                      </div>
                    </div>
                    <div className="wallet-tools">
                      <button
                        className="button light compact"
                        disabled={!!busy}
                        onClick={() => void refresh()}
                      >
                        <RefreshCw size={14} />
                        Refresh balances
                      </button>
                      <button
                        className="button light compact"
                        onClick={() => setFunding(!funding)}
                      >
                        Add funds
                      </button>
                    </div>
                    {(!snapshot || funding || !hasGas || needsTokens) && (
                      <div className="wallet-help">
                        <p>
                          {!snapshot
                            ? "Balances could not be loaded. Refresh before reviewing an exit."
                            : !hasGas
                              ? "Copy the treasury address above and send 0.003 Sepolia ETH to it from your wallet. This is a suggested starting amount for fees, not the WETH you sell. After sending, select Refresh balances."
                              : needsTokens
                                ? "Your treasury has ETH for fees. Enter the amount of test WETH you want below, then request it. After confirmation, continue to the exit planner."
                                : "To top up network fees, send Sepolia ETH to the treasury address above."}
                        </p>
                        {(funding || needsTokens) && hasGas && (
                          <>
                            <p>
                              The amount below can be requested as WETH from the
                              Sepolia faucet. This request is an onchain
                              transaction and uses network fees.
                            </p>
                            <button
                              className="button dark full-width"
                              disabled={
                                !!busy ||
                                !!pending ||
                                invalid ||
                                !snapshot ||
                                Number(snapshot.eth) === 0
                              }
                              onClick={() => void act("mint")}
                            >
                              {invalid
                                ? "Enter a WETH amount below"
                                : `Request ${amount} test WETH`}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                    <div className="wallet-form">
                      <label>
                        WETH to sell
                        <input
                          aria-label="WETH to sell"
                          type="number"
                          min=".01"
                          max="100"
                          step="any"
                          placeholder="Enter amount"
                          value={amount || ""}
                          disabled={!!busy || !!pending}
                          onChange={(e) => {
                            setAmount(Number(e.target.value));
                            setQuote(null);
                          }}
                        />
                      </label>
                      {intent === "trade" && (
                        <label>
                          Pool fee
                          <select
                            aria-label="Pool fee"
                            value={fee}
                            disabled={!!busy || !!pending}
                            onChange={(e) => {
                              setFee(Number(e.target.value) as 500 | 3000);
                              setQuote(null);
                            }}
                          >
                            <option value={500}>0.05%</option>
                            <option value={3000}>0.30%</option>
                          </select>
                        </label>
                      )}
                    </div>
                    {snapshot && Number(snapshot.weth) > 0 && (
                      <button
                        className="button light compact"
                        disabled={!!busy || !!pending}
                        onClick={() => {
                          setAmount(Math.min(100, Number(snapshot.weth)));
                          setQuote(null);
                        }}
                      >
                        Use available WETH
                      </button>
                    )}
                    {insufficient && !hasGas && (
                      <p className="wallet-validation">
                        Your treasury has {Number(snapshot!.weth).toFixed(4)}{" "}
                        WETH. Reduce the amount or add funds.
                      </p>
                    )}
                    {invalid && (
                      <p className="wallet-validation">
                        Enter an amount between 0.01 and 100 WETH.
                      </p>
                    )}
                    {funded && intent === "fund" && (
                      <button
                        className="button dark full-width"
                        disabled={!!busy || !!pending || invalid}
                        onClick={() => {
                          setOpen(false);
                          onAnalyze(amount);
                        }}
                      >
                        Continue to exit planner <ArrowRight size={16} />
                      </button>
                    )}
                    {funded &&
                      intent === "trade" &&
                      (!quote ? (
                        <button
                          className="button dark full-width"
                          disabled={
                            !!busy ||
                            !!pending ||
                            invalid ||
                            insufficient ||
                            !snapshot ||
                            Number(snapshot.eth) === 0
                          }
                          onClick={() =>
                            void act(needsAllowance ? "approve" : "quote")
                          }
                        >
                          {busy ? (
                            <LoaderCircle size={16} className="spin" />
                          ) : null}
                          {needsAllowance
                            ? `Approve ${invalid ? "" : amount} WETH`
                            : "Get exit quote"}
                        </button>
                      ) : (
                        <div className="quote-review">
                          <dl className="policy-details">
                            <div>
                              <dt>You sell</dt>
                              <dd>{amount} WETH</dd>
                            </div>
                            <div>
                              <dt>Expected received</dt>
                              <dd>
                                {(Number(quote.amountOut) / 1e6).toFixed(4)}{" "}
                                USDC
                              </dd>
                            </div>
                            <div>
                              <dt>Minimum received · 1% slippage</dt>
                              <dd>
                                {(
                                  Number(
                                    (BigInt(quote.amountOut) * 99n) / 100n,
                                  ) / 1e6
                                ).toFixed(4)}{" "}
                                USDC
                              </dd>
                            </div>
                            <div>
                              <dt>Destination</dt>
                              <dd>Your treasury</dd>
                            </div>
                            <div>
                              <dt>Quote expires</dt>
                              <dd>
                                {expired
                                  ? "Expired"
                                  : `${Math.max(0, Math.ceil((quote.deadline * 1000 - now) / 1000))} seconds`}
                              </dd>
                            </div>
                          </dl>
                          <button
                            className="button dark full-width"
                            disabled={!!busy || !!pending}
                            onClick={() =>
                              void act(expired ? "quote" : "execute")
                            }
                          >
                            {busy ? (
                              <LoaderCircle className="spin" size={16} />
                            ) : null}
                            {expired ? "Refresh quote" : "Confirm exit"}
                          </button>
                        </div>
                      ))}
                    {funded &&
                      intent === "trade" &&
                      needsAllowance &&
                      !quote && (
                        <p className="wallet-disclosure">
                          The spending limit applies only to this amount and the
                          fixed exit contract. You will review the quote before
                          the swap.
                        </p>
                      )}
                  </>
                )}
                {pending && (
                  <div className="wallet-help">
                    <p>
                      A submitted transaction is awaiting confirmation. Check it
                      before starting another action.
                    </p>
                    <a
                      className="docs-link"
                      href={`https://sepolia.etherscan.io/tx/${pending.hash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View transaction <ExternalLink size={14} />
                    </a>
                    <button
                      className="button light"
                      disabled={!!busy}
                      onClick={() => {
                        setBusy("recover");
                        void finish(pending)
                          .catch((e) => setMessage((e as Error).message))
                          .finally(() => setBusy(""));
                      }}
                    >
                      Check confirmation / recover receipt
                    </button>
                  </div>
                )}
                {hash && !pending && (
                  <a
                    className="docs-link"
                    href={`https://sepolia.etherscan.io/tx/${hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View transaction <ExternalLink size={14} />
                  </a>
                )}
                <div className="wallet-tools">
                  <a
                    className="docs-link"
                    href="/docs#wallet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Wallet guide <ExternalLink size={14} />
                  </a>
                  <button
                    className="button light compact"
                    disabled={!!busy}
                    onClick={() => {
                      setOpen(false);
                      setWallet(null);
                      setSnapshot(null);
                      onSnapshot(null);
                      reopen.current = false;
                      void logout();
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
export default function LiveWallet(props: Props) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#20221f",
          walletChainType: "ethereum-only",
        },
      }}
    >
      <WalletControl {...props} />
    </PrivyProvider>
  );
}
