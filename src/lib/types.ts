export type DataMode = "reference" | "graph";
export type PoolEvidence = {
  id: string;
  feeTier: number;
  label: string;
  tvlUsd: number;
  volume24h: number;
  liquidity: string;
  sqrtPrice: string;
  tick: number;
  token0: { symbol: string; decimals: string };
  token1: { symbol: string; decimals: string };
  history: { date: number; tvlUSD: string; volumeUSD: string }[];
};
export type Evidence = {
  mode: DataMode;
  source: string;
  chain: string;
  block: number;
  timestamp: string;
  fetchedAt: string;
  pools: PoolEvidence[];
  warning?: string;
  deployment?: string;
};
export type DrillInput = {
  amountEth: number;
  payrollUsdc: number;
  shockPercent: number;
  slippageBps: number;
};
export type RouteResult = {
  feeTier: number;
  baselineUsdc: number;
  stressedUsdc: number;
  priceImpactPercent: number;
  gasUsed: string;
  pool: string;
};
export type DrillResult = {
  id: string;
  input: DrillInput;
  routes: RouteResult[];
  selectedFee: number;
  amountOutUsdc: number;
  coveragePercent: number;
  shortfallUsdc: number;
  baselineUsdc: number;
  executedAt: string;
  engine: "uniswap-v3-evm";
  chainId: 31337;
  evidenceMode: DataMode;
  evidenceBlock: number;
  scenarioDescription: string;
  caveat: string;
};
export type Receipt = {
  id: string;
  chainId: number;
  mode: "sandbox" | "sepolia";
  transactionHash: string;
  blockNumber: number;
  executor: string;
  recipient: string;
  amountInEth: number;
  amountOutUsdc: number;
  minimumOutUsdc: number;
  gasUsed: string;
  feeTier: number;
  status: "confirmed";
  createdAt: string;
  planHash: string;
  evidenceBlock: number;
  policy: { engine: "contract" | "privy-and-contract"; checks: string[] };
  balances: {
    beforeUsdc: string;
    afterUsdc: string;
    basis?: "transaction-logs";
  };
  checksum?: string;
};
export type IntegrationStatus = {
  graph: boolean;
  privy: boolean;
  executor: boolean;
  rpc: boolean;
};
