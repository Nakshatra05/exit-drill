import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Exit Drill — Treasury readiness', description: 'Rehearse stressed liquidity. Authorize a bounded exit. Reconcile every result.', icons: { icon: '/favicon.svg' } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
