"use client";
import { useState } from "react";
import { useDialog } from "./use-dialog";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import { createPublicClient, http, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { Wallet, X, ExternalLink, LoaderCircle } from "lucide-react";
import type { Receipt } from "@/lib/types";
type TreasuryWallet = { id: string; address: string; policyId: string };
function WalletControl({ onReceipt }: { onReceipt: (r: Receipt) => void }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
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
    [hash, setHash] = useState("");
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
    try {
      setWallet(await api("/api/privy/wallet", {}));
      setMessage(
        "Policy-bound treasury created. Fund this address with Sepolia ETH for gas.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const act = async (action: string) => {
    if (!wallet) return;
    setBusy(action);
    setMessage("");
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
        setMessage("Transaction submitted. Waiting for Sepolia confirmation…");
        const rpc = createPublicClient({
          chain: sepolia,
          transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
        });
        const confirmed = await rpc.waitForTransactionReceipt({
          hash: r.hash as Hex,
          timeout: 60000,
        });
        if (confirmed.status !== "success")
          throw new Error("Transaction reverted on Sepolia.");
        setMessage("Sepolia transaction confirmed.");
        if (action === "execute") {
          const receipt = await api("/api/reconcile", { hash: r.hash });
          onReceipt(receipt);
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
              <span className="eyebrow">PRIVY · SEPOLIA ONLY</span>
              <button
                className="icon-button"
                aria-label="Close wallet"
                onClick={() => setOpen(false)}
              >
                <X />
              </button>
            </div>
            <h2 id="live-title">A treasury with enforced limits.</h2>
            <p>
              This is a separate public-testnet workflow. Reference rehearsal
              quotes are never used for Sepolia execution. Use only test assets.
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
                Create policy-bound treasury
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
                    <dt>Privy policy</dt>
                    <dd style={{ fontSize: 10 }}>{wallet.policyId}</dd>
                  </div>
                </dl>
                <label>
                  Test WETH to exit{" "}
                  <input
                    aria-label="Sepolia WETH amount"
                    type="number"
                    min=".001"
                    max="100"
                    step=".01"
                    value={amount}
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
                      disabled={!!busy}
                      onClick={() => void act(action)}
                    >
                      {busy === action ? (
                        <LoaderCircle className="spin" size={14} />
                      ) : null}
                      {action === "mint"
                        ? "1. Mint test WETH"
                        : action === "approve"
                          ? "2. Approve executor"
                          : action === "quote"
                            ? "3. Get live quote"
                            : "Test Privy rejection"}
                    </button>
                  ))}
                </div>
                {quote && (
                  <button
                    className="button dark full-width"
                    disabled={!!busy}
                    onClick={() => void act("execute")}
                  >
                    Approve & execute · minimum{" "}
                    {(
                      Number((BigInt(quote.amountOut) * 99n) / 100n) / 1e6
                    ).toFixed(4)}{" "}
                    USDC
                  </button>
                )}
              </>
            )}
            {!process.env.NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS && (
              <p style={{ marginTop: 20 }}>
                The Sepolia executor has not been configured. The sandbox
                remains fully available.
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
            <button
              className="button light compact"
              style={{ marginTop: 20, display: "flex" }}
              onClick={() => {
                setOpen(false);
                setWallet(null);
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
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
      }}
    >
      <WalletControl onReceipt={onReceipt} />
    </PrivyProvider>
  );
}
