import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import s from "@/app/site.module.css";
export function SiteHeader() {
  return (
    <header className={s.header}>
      <Link href="/" className={s.logo} aria-label="Exit Drill home">
        <span>
          <ArrowUpRight size={29} strokeWidth={3} />
        </span>
        EXIT<b>DRILL</b>
      </Link>
      <nav aria-label="Site navigation">
        <Link href="/#how-it-works">How it works</Link>
        <Link href="/docs">Docs</Link>
        <a
          href="https://github.com/Nakshatra05/exit-drill"
          target="_blank"
          rel="noreferrer"
        >
          GitHub <ArrowUpRight size={13} />
        </a>
      </nav>
      <Link href="/app" className={s.darkButton}>
        Launch app <ArrowUpRight size={17} />
      </Link>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className={s.siteFooter}>
      <div>
        <Link href="/" className={s.footerLogo}>
          ↗ EXIT DRILL
        </Link>
        <p>Treasury readiness. Before it matters.</p>
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/app">Stress lab</Link>
        <Link href="/docs">Documentation</Link>
        <a
          href="https://github.com/Nakshatra05/exit-drill"
          target="_blank"
          rel="noreferrer"
        >
          Source code ↗
        </a>
      </nav>
      <span>Built for ETHOnline 2026</span>
    </footer>
  );
}
