export type ExitRequest = {
  id: number;
  amount: number;
  fee: 500 | 3000;
  intent?: "fund" | "trade";
};
export type WalletSnapshot = {
  address: string;
  eth: string;
  weth: string;
  usdc: string;
  allowance: string;
};
