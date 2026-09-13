import { beforeEach, expect, it, vi } from "vitest";
import {
  encodeFunctionData,
  encodeAbiParameters,
  keccak256,
  parseAbi,
  encodeEventTopics,
} from "viem";
vi.mock("server-only", () => ({}));
vi.mock("./privy", () => ({
  liveConfig: () => ({
    executor: "0x1111111111111111111111111111111111111111",
  }),
}));
const mocks = vi.hoisted(() => ({
  receipt: vi.fn(),
  transaction: vi.fn(),
  read: vi.fn(),
  block: vi.fn(),
}));
vi.mock("viem", async (original) => ({
  ...(await original<typeof import("viem")>()),
  createPublicClient: () => ({
    getTransactionReceipt: mocks.receipt,
    getTransaction: mocks.transaction,
    readContract: mocks.read,
    getBlock: mocks.block,
  }),
}));
import { verifySettlement } from "./verify-settlement";
const executor = "0x1111111111111111111111111111111111111111",
  owner = "0x2222222222222222222222222222222222222222",
  token = "0x3333333333333333333333333333333333333333";
const plan = {
  amountIn: 10000000000000000n,
  minOut: 24000000n,
  fee: 500,
  recipient: owner,
  deadline: 2000000000n,
  nonce: 1n,
} as const;
const abi = parseAbi([
  "function execute((uint256 amountIn,uint256 minOut,uint24 fee,address recipient,uint256 deadline,uint256 nonce) p) returns(uint256)",
  "event ExitSettled(address indexed owner,bytes32 indexed planHash,address indexed recipient,uint256 amountIn,uint256 amountOut,uint24 fee,uint256 nonce)",
]);
const transfer = parseAbi([
  "event Transfer(address indexed from,address indexed to,uint256 value)",
]);
const hash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
let receipt: any;
beforeEach(() => {
  vi.resetAllMocks();
  const digest = keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        {
          type: "tuple",
          components: [
            { name: "amountIn", type: "uint256" },
            { name: "minOut", type: "uint256" },
            { name: "fee", type: "uint24" },
            { name: "recipient", type: "address" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
          ],
        },
      ],
      [11155111n, executor, owner, plan],
    ),
  );
  receipt = {
    status: "success",
    to: executor,
    blockNumber: 10n,
    logs: [
      {
        address: executor,
        topics: encodeEventTopics({
          abi,
          eventName: "ExitSettled",
          args: { owner, recipient: owner, planHash: digest },
        }),
        data: encodeAbiParameters(
          [
            { type: "uint256" },
            { type: "uint256" },
            { type: "uint24" },
            { type: "uint256" },
          ],
          [plan.amountIn, 25000000n, 500, 1n],
        ),
      },
      {
        address: token,
        topics: encodeEventTopics({
          abi: transfer,
          eventName: "Transfer",
          args: { from: executor, to: owner },
        }),
        data: encodeAbiParameters([{ type: "uint256" }], [25000000n]),
      },
    ],
  };
  mocks.receipt.mockImplementation(async () => receipt);
  mocks.transaction.mockResolvedValue({
    from: owner,
    input: encodeFunctionData({ abi, functionName: "execute", args: [plan] }),
  });
  mocks.read.mockResolvedValue(token);
  mocks.block.mockResolvedValue({ timestamp: 1789290000n });
});
it("independently reproduces the onchain plan hash and exact output", async () => {
  const proof = await verifySettlement(hash);
  expect(proof.amountOutUsdc).toBe("25");
  expect(proof.amountInWeth).toBe("0.01");
  expect(proof.verified).toBe(true);
});
it("rejects a different executor and a failed transaction", async () => {
  receipt.to = owner;
  await expect(verifySettlement(hash)).rejects.toThrow();
  receipt.to = executor;
  receipt.status = "reverted";
  await expect(verifySettlement(hash)).rejects.toThrow();
});
it("rejects an altered transaction sender", async () => {
  mocks.transaction.mockResolvedValue({
    from: token,
    input: encodeFunctionData({ abi, functionName: "execute", args: [plan] }),
  });
  await expect(verifySettlement(hash)).rejects.toThrow("disagree");
});
it("rejects an event without matching token inflow", async () => {
  receipt.logs[1].data = encodeAbiParameters(
    [{ type: "uint256" }],
    [24000000n],
  );
  await expect(verifySettlement(hash)).rejects.toThrow("reconcile");
});
