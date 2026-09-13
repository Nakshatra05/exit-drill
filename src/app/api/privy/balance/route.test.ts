import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  read: vi.fn(),
  balance: vi.fn(),
}));
vi.mock("@/lib/privy", () => ({
  authorizeWallet: mocks.authorize,
  liveConfig: () => ({
    executor: "0x1111111111111111111111111111111111111111",
    token: "0x2222222222222222222222222222222222222222",
  }),
}));
vi.mock(
  "@/lib/wallet-errors",
  async () => await import("../../../../lib/wallet-errors"),
);
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => ({
    readContract: mocks.read,
    getBalance: mocks.balance,
  }),
}));
import { POST } from "./route";
const address = "0x3333333333333333333333333333333333333333";
const request = () =>
  new Request("https://exit-drill.test/api/privy/balance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletId: "treasury" }),
  });
beforeEach(() => vi.resetAllMocks());
it("does not read balances before treasury ownership is authorized", async () => {
  mocks.authorize.mockRejectedValue(
    new Error("This wallet does not belong to the authenticated user"),
  );
  expect((await POST(request())).status).toBe(403);
  expect(mocks.read).not.toHaveBeenCalled();
  expect(mocks.balance).not.toHaveBeenCalled();
});
it("formats balances without rounding away token units", async () => {
  mocks.authorize.mockResolvedValue({ wallet: { address } });
  mocks.balance.mockResolvedValue(1234567890123456n);
  mocks.read
    .mockResolvedValueOnce("0x4444444444444444444444444444444444444444")
    .mockResolvedValueOnce(10000000000000001n)
    .mockResolvedValueOnce(24923964n)
    .mockResolvedValueOnce(10000000000000000n);
  const response = await POST(request());
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    address,
    eth: "0.001234567890123456",
    weth: "0.010000000000000001",
    usdc: "24.923964",
    allowance: "0.01",
  });
});
it("reports an unavailable RPC instead of inventing zero balances", async () => {
  mocks.authorize.mockResolvedValue({ wallet: { address } });
  mocks.read.mockRejectedValue(new Error("RPC unavailable"));
  const response = await POST(request());
  expect(response.status).toBe(503);
  expect(await response.json()).not.toHaveProperty("weth");
});
