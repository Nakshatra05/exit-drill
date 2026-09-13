import solc from "solc";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const files = [
  "contracts/ExitExecutor.sol",
  "contracts/fixtures/TestToken.sol",
  "contracts/fixtures/LiquiditySeeder.sol",
];
const input = {
  language: "Solidity",
  sources: Object.fromEntries(
    files.map((f) => [f, { content: readFileSync(f, "utf8") }]),
  ),
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "shanghai",
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input)));
const errors = output.errors?.filter(
  (e: { severity: string }) => e.severity === "error",
);
if (errors?.length) throw new Error(JSON.stringify(errors));
mkdirSync("src/generated", { recursive: true });
for (const contracts of Object.values(output.contracts) as Record<
  string,
  { abi: unknown; evm: { bytecode: { object: string } } }
>[]) {
  for (const [name, data] of Object.entries(contracts)) {
    if (data.evm.bytecode.object)
      writeFileSync(
        `src/generated/${name}.json`,
        JSON.stringify({
          abi: data.abi,
          bytecode: `0x${data.evm.bytecode.object}`,
        }),
      );
  }
}
console.log(
  "Compiled ExitExecutor and test fixtures with solc",
  solc.version(),
);
