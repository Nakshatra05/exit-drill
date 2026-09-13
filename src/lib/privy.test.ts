import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  createWallet: vi.fn(),
  createPolicy: vi.fn(),
  verify: vi.fn(),
}));
vi.mock("@privy-io/node", () => ({
  PrivyClient: class {
    wallets() {
      return { list: mocks.list, create: mocks.createWallet };
    }
    policies() {
      return { create: mocks.createPolicy };
    }
    utils() {
      return { auth: () => ({ verifyAccessToken: mocks.verify }) };
    }
  },
}));
import { authorizeWallet, provisionWallet } from "./privy";
const executor = "0x1111111111111111111111111111111111111111";
const userId = "did:privy:owner";
const externalId = createHash("sha256")
  .update(`exit-drill-managed-v2:${userId}:${executor}`)
  .digest("hex");
const request = () =>
  new Request("https://exit-drill.test", {
    headers: { Authorization: "Bearer verified-test-token" },
  });
beforeEach(() => {
  vi.stubEnv("PRIVY_APP_ID", "test-app");
  vi.stubEnv("PRIVY_APP_SECRET", "test-secret");
  vi.stubEnv("NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS", executor);
  vi.stubEnv(
    "NEXT_PUBLIC_TEST_TOKEN_ADDRESS",
    "0x2222222222222222222222222222222222222222",
  );
  mocks.verify.mockResolvedValue({ user_id: userId });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
describe("managed treasury authorization", () => {
  it("requires authentication before wallet access", async () => {
    await expect(
      authorizeWallet(new Request("https://exit-drill.test"), "wallet"),
    ).rejects.toThrow("Authentication required");
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("rejects another user's treasury even if a provider returns its matching wallet ID", async () => {
    mocks.list.mockResolvedValue({
      data: [
        { id: "wallet", external_id: "different-user", policy_ids: ["policy"] },
      ],
    });
    await expect(authorizeWallet(request(), "wallet")).rejects.toThrow(
      "does not belong",
    );
  });
  it("refuses a treasury without a signing policy", async () => {
    mocks.list.mockResolvedValue({
      data: [{ id: "wallet", external_id: externalId, policy_ids: [] }],
    });
    await expect(authorizeWallet(request(), "wallet")).rejects.toThrow(
      "no enforced Privy policy",
    );
  });
  it("only accepts the exact signed-in user's managed treasury", async () => {
    mocks.list.mockResolvedValue({
      data: [{ id: "wallet", external_id: externalId, policy_ids: ["policy"] }],
    });
    expect((await authorizeWallet(request(), "wallet")).wallet.id).toBe(
      "wallet",
    );
    expect(mocks.list).toHaveBeenCalledWith({
      chain_type: "ethereum",
      external_id: externalId,
    });
  });
  it("attaches a restricted policy before exposing a new wallet", async () => {
    mocks.list.mockResolvedValue({ data: [] });
    mocks.createPolicy.mockResolvedValue({ id: "policy" });
    mocks.createWallet.mockResolvedValue({ id: "wallet", address: executor });
    await provisionWallet(request());
    const policy = mocks.createPolicy.mock.calls[0][0];
    expect(policy.owner).toBeUndefined();
    expect(policy.rules).toHaveLength(3);
    for (const rule of policy.rules) {
      expect(rule.name.length).toBeLessThan(50);
      expect(rule.method).toBe("eth_sendTransaction");
      expect(rule.conditions).toContainEqual({
        field_source: "ethereum_transaction",
        field: "chain_id",
        operator: "eq",
        value: "11155111",
      });
      expect(rule.conditions).toContainEqual({
        field_source: "ethereum_transaction",
        field: "value",
        operator: "eq",
        value: "0",
      });
    }
    expect(mocks.createWallet).toHaveBeenCalledWith(
      expect.objectContaining({
        external_id: externalId,
        policy_ids: ["policy"],
      }),
    );
  });
});
