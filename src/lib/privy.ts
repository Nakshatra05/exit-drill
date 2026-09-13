import "server-only";
import { PrivyClient } from "@privy-io/node";
import { createHash } from "node:crypto";
import { isAddress, parseAbi, type Address } from "viem";
import Executor from "../generated/ExitExecutor.json";
export function privyClient() {
  const appId = process.env.PRIVY_APP_ID,
    appSecret = process.env.PRIVY_APP_SECRET;
  if (!appId || !appSecret)
    throw new Error("Privy credentials are not configured.");
  return new PrivyClient({ appId, appSecret });
}
export function liveConfig() {
  const executor = process.env.NEXT_PUBLIC_EXIT_EXECUTOR_ADDRESS,
    token = process.env.NEXT_PUBLIC_TEST_TOKEN_ADDRESS;
  if (!executor || !token || !isAddress(executor) || !isAddress(token))
    throw new Error(
      "Deploy and configure the Sepolia ExitExecutor and test token first.",
    );
  return { executor: executor as Address, token: token as Address };
}
export async function authenticate(request: Request) {
  const jwt = request.headers.get("Authorization")?.replace(/^Bearer /, "");
  if (!jwt) throw new Error("Authentication required.");
  const client = privyClient();
  const claims = await client.utils().auth().verifyAccessToken(jwt);
  return { client, jwt, userId: claims.user_id };
}
export async function provisionWallet(request: Request) {
  const { client, userId } = await authenticate(request);
  const { executor, token } = liveConfig();
  const idempotencyKey = createHash("sha256")
    .update(`exit-drill-v1:${userId}:${executor}`)
    .digest("hex");
  const approveAbi = parseAbi([
    "function approve(address spender,uint256 amount) returns(bool)",
  ]);
  const mintAbi = parseAbi(["function mint(address to,uint256 amount)"]);
  const policy = await client.policies().create({
    name: "Exit Drill Sepolia treasury",
    version: "1.0",
    chain_type: "ethereum",
    owner: { user_id: userId },
    idempotency_key: `policy-${idempotencyKey}`,
    rules: [
      {
        name: "Execute only through the guarded treasury contract",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "chain_id",
            operator: "eq",
            value: "11155111",
          },
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: executor,
          },
          {
            field_source: "ethereum_transaction",
            field: "value",
            operator: "eq",
            value: "0",
          },
          {
            field_source: "ethereum_calldata",
            field: "function_name",
            operator: "eq",
            value: "execute",
            abi: parseAbi(["function execute((uint256 amountIn,uint256 minOut,uint24 fee,address recipient,uint256 deadline,uint256 nonce) p) returns (uint256)"]),
          },
        ],
      },
      {
        name: "Approve only the fixed executor with a bounded test-token allowance",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "chain_id",
            operator: "eq",
            value: "11155111",
          },
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: token,
          },
          {
            field_source: "ethereum_transaction",
            field: "value",
            operator: "eq",
            value: "0",
          },
          {
            field_source: "ethereum_calldata",
            field: "function_name",
            operator: "eq",
            value: "approve",
            abi: approveAbi,
          },
          {
            field_source: "ethereum_calldata",
            field: "approve.spender",
            operator: "eq",
            value: executor,
            abi: approveAbi,
          },
          {
            field_source: "ethereum_calldata",
            field: "approve.amount",
            operator: "lte",
            value: "100000000000000000000",
            abi: approveAbi,
          },
        ],
      },
      {
        name: "Mint valueless test tokens",
        method: "eth_sendTransaction",
        action: "ALLOW",
        conditions: [
          {
            field_source: "ethereum_transaction",
            field: "chain_id",
            operator: "eq",
            value: "11155111",
          },
          {
            field_source: "ethereum_transaction",
            field: "to",
            operator: "eq",
            value: token,
          },
          {
            field_source: "ethereum_transaction",
            field: "value",
            operator: "eq",
            value: "0",
          },
          {
            field_source: "ethereum_calldata",
            field: "function_name",
            operator: "eq",
            value: "mint",
            abi: mintAbi,
          },
          {
            field_source: "ethereum_calldata",
            field: "mint.amount",
            operator: "lte",
            value: "100000000000000000000",
            abi: mintAbi,
          },
        ],
      },
    ],
  });
  const wallet = await client
    .wallets()
    .create({
      chain_type: "ethereum",
      owner: { user_id: userId },
      policy_ids: [policy.id],
      idempotency_key: `wallet-${idempotencyKey}`,
    });
  return {
    id: wallet.id,
    address: wallet.address,
    policyId: policy.id,
    chainId: 11155111,
  };
}
export async function authorizeWallet(request: Request, walletId: string) {
  const auth = await authenticate(request);
  const wallets = await auth.client
    .wallets()
    .list({ user_id: auth.userId, chain_type: "ethereum" });
  const wallet = wallets.data.find((w) => w.id === walletId);
  if (!wallet)
    throw new Error("Wallet does not belong to this authenticated user.");
  if (!wallet.policy_ids?.length)
    throw new Error("Wallet has no enforced Privy policy.");
  return { ...auth, wallet };
}

