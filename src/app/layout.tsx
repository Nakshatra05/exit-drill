import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Exit Drill — Treasury readiness",
  description:
    "From treasury risk to verified settlement. Live market evidence, bounded Sepolia exits, and independently verifiable receipts.",
  metadataBase: new URL("https://exit-drill.vercel.app"),
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
