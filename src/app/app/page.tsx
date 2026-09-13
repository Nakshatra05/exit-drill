import type { Metadata } from "next";
import Dashboard from "@/components/dashboard";
export const metadata: Metadata = { title: "Stress lab — Exit Drill" };
export default function AppPage() {
  return (
    <Dashboard
      defaultEvidenceMode={
        process.env.GRAPH_API_KEY && process.env.GRAPH_SUBGRAPH_ID
          ? "graph"
          : "reference"
      }
    />
  );
}
