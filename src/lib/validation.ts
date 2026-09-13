import { z } from "zod";
export const drillSchema = z
  .object({
    amountEth: z.number().finite().min(0.01).max(100),
    payrollUsdc: z.number().finite().min(1).max(500000),
    shockPercent: z.number().finite().min(0).max(70),
    slippageBps: z.number().int().min(10).max(500),
  })
  .strict();
export const requestSchema = z
  .object({
    input: drillSchema,
    evidenceMode: z.enum(["reference", "graph"]).default("reference"),
    evidenceBlock: z.number().int().nonnegative().default(0),
  })
  .strict();
export const executeSchema = requestSchema
  .extend({
    feeTier: z.union([z.literal(500), z.literal(3000)]),
    minimumOutUsdc: z.number().finite().positive().max(500000),
    approved: z.literal(true),
    testViolation: z.boolean().default(false),
  })
  .strict();
