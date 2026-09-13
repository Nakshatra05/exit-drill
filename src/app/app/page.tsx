import type { Metadata } from "next";
import Dashboard from "@/components/dashboard";
export const metadata: Metadata = { title: "Stress lab — Exit Drill" };
export default function AppPage() {
  return <Dashboard defaultEvidenceMode="graph" />;
}
