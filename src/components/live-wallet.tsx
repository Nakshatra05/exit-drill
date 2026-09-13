"use client";
import { useEffect, useState } from "react";
import { useDialog } from "./use-dialog";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { createPublicClient, http, type Hex } from "viem";
import { sepolia } from "viem/chains";
import {
  Wallet,
  X,
  ExternalLink,
  LoaderCircle,
  Copy,
  Check,
} from "lucide-react";
import type { Receipt } from "@/lib/types";
type TreasuryWallet = { id: string; address: string; policyId: string };
function WalletControl({ onReceipt }: { onReceipt: (r: Receipt) => void }) {
  const { ready, authenticated, login, logout, getAccessToken, user } =
    usePrivy();
  const [open, setOpen] = useState(false),
    [wallet, setWallet] = useState<TreasuryWallet | null>(null),
    [busy, setBusy] = useState(""),
    [message, setMessage] = useState(""),
    [amount, setAmount] = useState(0.01),
    [quote, setQuote] = useState<{
      amountOut: string;
      nonce: string;
      deadline: number;
    } | null>(null),
    [hash, setHash] = useState(""),
    [pendingExit, setPendingExit] = useState(""),
    [now, setNow] = useState(Date.now());
  const pendingKey = `exit-drill-pending-${user?.id ?? "anonymous"}`;
  useEffect(() => {
    setWallet(null);
    setQuote(null);
    setHash("");
    setMessage("");
    try {
      setPendingExit(localStorage.getItem(pendingKey) ?? "");
    } catch {}
  }, [pendingKey]);
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [open]);
  const quoteExpired = !!quote && now >= quote.deadline * 1000;
  const invalidAmount =
    !Number.isFinite(amount) || amount < 0.001 || amount > 100;
  useDialog(open, () => setOpen(false));
  const api = async (path: string, body: unknown) => {
    const token = await getAccessToken();
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error ?? "Operation failed");
    return json;
  };
  const setup = async () => {
    setBusy("setup");
    setMessage("");
    try {
      setWallet(await api("/api/privy/wallet", {}));
      setMessage(
        "Treasury ready. Send a little Sepolia ETH to this address for network fees, then get your test tokens.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const act = async (action: string) => {
    if (!wallet || busy || invalidAmount) return;
    if (action === "execute" && (!quote || quoteExpired)) {
      setMessage(
        "Your preview expired. Request a fresh preview before continuing.",
      );
      return;
    }
    setBusy(action);
    setMessage("");
    setHash("");
    if (action === "mint" || action === "approve") setQuote(null);
    try {
      const r = await api("/api/privy/action", {
        walletId: wallet.id,
        action,
        amount,
        fee: 3000,
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
        setMessage(
          `Fresh Sepolia quote: ${(Number(r.amountOut) / 1e6).toFixed(4)} test USDC. Minimum received is 99% of this quote.`,
        );
      } else {
        setHash(r.hash);
        if (action === "execute") {
          setPendingExit(r.hash);
          setQuote(null);
          try {
            localStorage.setItem(pendingKey, r.hash);
          } catch {}
        }
        setMessage("Transaction submitted. Waiting for Sepolia confirmation…");
        const rpc = createPublicClient({
          chain: sepolia,
          transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
        });
        const confirmed = await rpc.waitForTransactionReceipt({
          hash: r.hash as Hex,
          timeout: 60000,
        });
        if (confirmed.status !== "success") {
          if (action === "execute") {
            setPendingExit("");
            try {
              localStorage.removeItem(pendingKey);
            } catch {}
          }
          throw new Error("Transaction reverted on Sepolia.");
        }
        setMessage("Sepolia transaction confirmed.");
        if (action === "execute") {
          const receipt = await api("/api/reconcile", { hash: r.hash });
          onReceipt(receipt);
          setPendingExit("");
          try {
            localStorage.removeItem(pendingKey);
          } catch {}
          setQuote(null);
          setMessage(
            "Sepolia exit confirmed and reconciled. Find the record in Receipts.",
          );
        }
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const recover = async () => {
    if (!pendingExit || busy) return;
    setBusy("recover");
    setMessage("");
    try {
      const rpc = createPublicClient({
        chain: sepolia,
        transport: http("https://ethereum-sepolia-rpc.publicnode.com", {
          timeout: 10000,
          retryCount: 1,
        }),
      });
      const confirmed = await rpc.getTransactionReceipt({
        hash: pendingExit as Hex,
      });
      if (confirmed.status === "reverted") {
        setHash(pendingExit);
        setPendingExit("");
        setQuote(null);
        try {
          localStorage.removeItem(pendingKey);
        } catch {}
        setMessage(
          "This transaction reverted. Request a new preview before trying another exit.",
        );
        return;
      }
      onReceipt(await api("/api/reconcile", { hash: pendingExit }));
      setHash(pendingExit);
      setPendingExit("");
      try {
        localStorage.removeItem(pendingKey);
      } catch {}
      setMessage("Receipt recovered. Find the verified exit under Receipts.");
    } catch {
      setMessage(
        "This exit has not been reconciled yet. Check its transaction and retry after confirmation.",
      );
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <button
        className="button dark compact"
        disabled={!ready}
        onClick={() => (authenticated ? setOpen(true) : login())}
      >
        <Wallet size={15} />
        {authenticated ? "Treasury wallet" : "Connect wallet"}
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal wide-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="live-title"
          >
            <div className="modal-heading">
              <span className="eyebrow">YOUR TREASURY · SEPOLIA TESTNET</span>
              <button
                className="icon-button"
                aria-label="Close wallet"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <h2 id="live-title">Make your first test exit.</h2>
            <p>
              Practice with valueless test assets in a wallet managed by Exit
              Drill. Your sign-in authorizes the actions you request; a signing
              policy restricts what the wallet can do. Review a fresh testnet
              quote before confirming.
            </p>
            {!wallet ? (
              <button
                className="button dark full-width"
                style={{ marginTop: 20 }}
                disabled={
                  !!busy || !process.env.NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS
                }
                onClick={() => void setup()}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Wallet size={16} />
                )}
                Create treasury wallet
              </button>
            ) : (
              <>
                <dl className="policy-details">
                  <div>
                    <dt>Address</dt>
                    <dd style={{ wordBreak: "break-all", fontSize: 10 }}>
                      {wallet.address}
                    </dd>
                  </div>
                  <div>
                    <dt>Network</dt>
                    <dd>Sepolia · test assets only</dd>
                  </div>
                </dl>
                <div className="wallet-help">
                  <p>
                    Send Sepolia ETH to this treasury for network fees. Do not
                    send mainnet assets.
                  </p>
                  <button
                    className="button light compact"
                    disabled={!!busy}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(wallet.address)
                        .then(() => setMessage("Treasury address copied."))
                        .catch(() =>
                          setMessage("Copy the address above manually."),
                        )
                    }
                  >
                    <Copy size={14} />
                    Copy address
                  </button>
                </div>
                <label>
                  Test WETH to exit{" "}
                  <input
                    aria-label="Sepolia WETH amount"
                    type="number"
                    min=".001"
                    max="100"
                    step=".01"
                    value={amount}
                    disabled={!!busy || !!pendingExit}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      setQuote(null);
                    }}
                  />
                </label>
                <div
                  className="mode-buttons"
                  style={{ flexWrap: "wrap", margin: "20px 0" }}
                >
                  {["mint", "approve", "quote", "test-policy"].map((action) => (
                    <button
                      key={action}
                      className="button light"
                      disabled={!!busy || invalidAmount || !!pendingExit}
                      onClick={() => void act(action)}
                    >
                      {busy === action ? (
                        <LoaderCircle className="spin" size={14} />
                      ) : null}
                      {action === "mint"
                        ? "1. Get test tokens"
                        : action === "approve"
                          ? "2. Allow this amount"
                          : action === "quote"
                            ? "3. Preview exit"
                            : "Check transfer protection"}
                    </button>
                  ))}
                </div>
                {quote && (
                  <button
                    className="button dark full-width"
                    disabled={!!busy || quoteExpired || !!pendingExit}
                    onClick={() => void act("execute")}
                  >
                    {quoteExpired
                      ? "Preview expired — request a new one"
                      : "Confirm testnet exit · minimum"}{" "}
                    {(
                      Number((BigInt(quote.amountOut) * 99n) / 100n) / 1e6
                    ).toFixed(4)}{" "}
                    test USDC
                  </button>
                )}
              </>
            )}
            {!process.env.NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS && (
              <p style={{ marginTop: 20 }}>
                Testnet exits are temporarily unavailable. You can still run a
                rehearsal without a wallet.
              </p>
            )}
            {message && (
              <div
                role="status"
                className="alert notice"
                style={{ marginTop: 20 }}
              >
                {message}
              </div>
            )}
            {hash && (
              <a
                className="docs-link"
                href={`https://sepolia.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction <ExternalLink size={14} />
              </a>
            )}
            {pendingExit && (
              <div className="wallet-help">
                <p>
                  Your last exit is awaiting reconciliation. Check confirmation
                  before starting another exit.
                </p>
                <a
                  className="docs-link"
                  href={`https://sepolia.etherscan.io/tx/${pendingExit}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View pending exit <ExternalLink size={14} />
                </a>
                <button
                  className="button light"
                  disabled={!!busy}
                  onClick={() => void recover()}
                >
                  <Check size={15} />
                  Recover receipt
                </button>
              </div>
            )}
            <a
              className="docs-link"
              href="/docs#wallet"
              target="_blank"
              rel="noreferrer"
            >
              Read the wallet guide <ExternalLink size={14} />
            </a>
            <button
              className="button light compact"
              style={{ marginTop: 20, display: "flex" }}
              disabled={!!busy}
              onClick={() => {
                setOpen(false);
                setWallet(null);
                setQuote(null);
                setHash("");
                setMessage("");
                void logout();
              }}
            >
              Sign out
            </button>
          </section>
        </div>
      )}
    </>
  );
}
export default function LiveWallet({
  onReceipt,
}: {
  onReceipt: (r: Receipt) => void;
}) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ["email", "wallet"],
        appearance: { theme: "light", accentColor: "#20221f" },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      <WalletControl onReceipt={onReceipt} />
    </PrivyProvider>
  );
}
