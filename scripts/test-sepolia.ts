/** Opt-in public testnet smoke test; never uses mainnet assets. */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseEther,
  formatUnits,
  type Hex,
  type Abi,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import Executor from "../src/generated/ExitExecutor.json";
if (!process.argv.includes("--broadcast")) {
  console.log(
    "Add --broadcast to test a 0.01 test-WETH swap on Sepolia using DEPLOYER_PRIVATE_KEY. Network fees use Sepolia ETH.",
  );
  process.exit(0);
}
const deployment = JSON.parse(readFileSync("deployments/sepolia.json", "utf8"));
const key = process.env.DEPLOYER_PRIVATE_KEY;
if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key))
  throw new Error("A local Sepolia test key is required.");
const account = privateKeyToAccount(key as Hex);
const transport = http(
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  { timeout: 15000 },
);
const rpc = createPublicClient({ chain: sepolia, transport });
if ((await rpc.getChainId()) !== 11155111) throw new Error("Sepolia only.");
const wallet = createWalletClient({ account, chain: sepolia, transport });
const tokenAbi = parseAbi([
  "function mint(address,uint256)",
  "function approve(address,uint256) returns(bool)",
  "function balanceOf(address) view returns(uint256)",
]);
const send = async (
  address: Address,
  abi: Abi,
  functionName: string,
  args: readonly unknown[],
) => {
  const simulated = await rpc.simulateContract({
    account,
    address,
    abi,
    functionName,
    args,
  });
  const hash = await wallet.writeContract(simulated.request);
  console.log(functionName, hash);
  const receipt = await rpc.waitForTransactionReceipt({
    hash,
    timeout: 180000,
  });
  if (receipt.status !== "success") throw new Error("Transaction reverted.");
  return receipt;
};
const amount = parseEther(".01");
await send(deployment.weth, tokenAbi, "mint", [account.address, amount]);
await send(deployment.weth, tokenAbi, "approve", [deployment.executor, amount]);
const plan = {
  amountIn: amount,
  minOut: 1n,
  fee: 3000,
  recipient: account.address,
  deadline: (await rpc.getBlock()).timestamp + 600n,
  nonce: BigInt(Date.now()),
};
let rejected = false;
try {
  await rpc.simulateContract({
    account,
    address: deployment.executor,
    abi: Executor.abi as Abi,
    functionName: "execute",
    args: [{ ...plan, recipient: deployment.usdc }],
  });
} catch (error) {
  if (String(error).includes("WrongRecipient")) rejected = true;
  else throw error;
}
if (!rejected) throw new Error("Recipient protection failed.");
const quote = await rpc.simulateContract({
  account,
  address: deployment.executor,
  abi: Executor.abi as Abi,
  functionName: "execute",
  args: [plan],
});
plan.minOut = (BigInt(String(quote.result)) * 99n) / 100n;
const before = await rpc.readContract({
  address: deployment.usdc,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [account.address],
});
const receipt = await send(
  deployment.executor,
  Executor.abi as Abi,
  "execute",
  [plan],
);
const after = await rpc.readContract({
  address: deployment.usdc,
  abi: tokenAbi,
  functionName: "balanceOf",
  args: [account.address],
});
if (after - before < plan.minOut)
  throw new Error("Balance reconciliation failed.");
const result = {
  chainId: 11155111,
  hash: receipt.transactionHash,
  amountInTestWeth: "0.01",
  amountOutTestUsdc: formatUnits(after - before, 6),
  recipientProtection: true,
  balanceReconciled: true,
  authorization: "Local test wallet; Privy signing tested separately",
};
mkdirSync(".local", { recursive: true });
writeFileSync(".local/sepolia-smoke.json", JSON.stringify(result, null, 2));
console.log(result);
