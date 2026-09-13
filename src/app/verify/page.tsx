import { SiteHeader, SiteFooter } from "@/components/site-shell";
import SettlementVerifier from "@/components/settlement-verifier";
import s from "../site.module.css";
export const metadata = {
  title: "Verify a settlement — Exit Drill",
  description:
    "Check an Exit Drill settlement against public Sepolia transaction data without signing in.",
};
export default function VerifyPage() {
  return (
    <div className={s.site}>
      <SiteHeader />
      <main className="verification-page">
        <span className="eyebrow">INDEPENDENT SETTLEMENT CHECK</span>
        <h1>Verify what actually settled.</h1>
        <p>
          Paste a transaction hash to check its sender, limits, plan hash, and
          token movements against Sepolia. No account or wallet connection
          required.
        </p>
        <SettlementVerifier />
      </main>
      <SiteFooter />
    </div>
  );
}
