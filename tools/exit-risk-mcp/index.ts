import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createRiskServer } from "./server";
await createRiskServer().connect(new StdioServerTransport());
