"use client";
import { useEffect, useState } from "react";
import { Check, ExternalLink, LoaderCircle, Search } from "lucide-react";
import type { SettlementProof } from "@/lib/verify-settlement";
export default function SettlementVerifier() {
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("hash");
    if (value && /^0x[0-9a-fA-F]{64}$/.test(value)) setHash(value);
  }, []);
  const [hash, setHash] = useState(""),
    [proof, setProof] = useState<SettlementProof | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setProof(null);
          try {
            const r = await fetch(
              `/api/verify?hash=${encodeURIComponent(hash.trim())}`,
            );
            const j = await r.json();
            if (!r.ok) throw new Error(j.error);
            setProof(j);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="exit-amount-label">
          Sepolia transaction hash
          <input
            className="verification-input"
            value={hash}
            disabled={busy}
            onChange={(e) => {
              setHash(e.target.value);
              setProof(null);
              setError("");
            }}
            placeholder="0x…"
            required
            pattern="0x[0-9a-fA-F]{64}"
            spellCheck={false}
          />
        </label>
        <button
          className="button dark"
          disabled={busy}
          style={{ marginTop: 16 }}
        >
          {busy ? (
            <LoaderCircle className="spin" size={16} />
          ) : (
            <Search size={16} />
          )}{" "}
          {busy ? "Checking Sepolia…" : "Verify settlement"}
        </button>
      </form>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      {proof && (
        <article className="verification-result" aria-live="polite">
          <span className="eyebrow">VERIFIED ON SEPOLIA</span>
          <h2>
            {proof.amountInWeth} WETH → {proof.amountOutUsdc} USDC
          </h2>
          <p>
            Minimum received: {proof.minimumOutUsdc} USDC · Block{" "}
            {proof.blockNumber}
          </p>
          <p className="hash-text">Treasury: {proof.treasury}</p>
          <ul>
            {proof.checks.map((c) => (
              <li key={c}>
                <Check size={16} />
                {c}
              </li>
            ))}
          </ul>
          <a
            className="button light"
            href={`https://sepolia.etherscan.io/tx/${proof.transactionHash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction <ExternalLink size={15} />
          </a>
          <p className="wallet-disclosure">{proof.scope}</p>
        </article>
      )}
    </div>
  );
}
