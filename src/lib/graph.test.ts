import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getEvidence } from "./graph";
const pools = [500, 3000].map((fee) => ({
  id: String(fee),
  feeTier: String(fee),
  totalValueLockedUSD: "1000000",
  liquidity: "100",
  sqrtPrice: "1",
  tick: "0",
  token0: { symbol: "USDC", decimals: "6" },
  token1: { symbol: "WETH", decimals: "18" },
  poolDayData: [],
}));
function setup(age = 0, errors = false) {
  vi.stubEnv("GRAPH_API_KEY", "test");
  vi.stubEnv("GRAPH_SUBGRAPH_ID", "deployment");
  const fetchMock = vi.fn().mockResolvedValue(
    Response.json({
      data: {
        _meta: {
          block: {
            number: 25000000,
            timestamp: Math.floor(Date.now() / 1000) - age,
          },
          deployment: "test",
          hasIndexingErrors: errors,
        },
        pools,
      },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("Graph evidence boundary", () => {
  it("runs reference mode without network access", async () => {
    const fetch = setup();
    expect((await getEvidence("reference")).mode).toBe("reference");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("pins source and metadata to the reviewed block", async () => {
    const fetch = setup();
    expect((await getEvidence("graph", 25000000)).block).toBe(25000000);
    const query = JSON.parse(fetch.mock.calls[0][1].body).query;
    expect(query).toContain("_meta(block: {number: 25000000})");
    expect(query).toContain("pools(block: {number: 25000000}");
  });
  it("rejects stale evidence instead of falling back to a fixture", async () => {
    setup(700);
    await expect(getEvidence("graph")).rejects.toThrow("expired");
  });
  it("verifies a historical snapshot timestamp using the exact Ethereum block", async () => {
    const fetch = setup();
    fetch
      .mockReset()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            _meta: {
              block: { number: 25000000, timestamp: null },
              hasIndexingErrors: false,
            },
            pools,
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          result: {
            number: "0x17d7840",
            timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
          },
        }),
      );
    const evidence = await getEvidence("graph", 25000000);
    expect(evidence.block).toBe(25000000);
    expect(JSON.parse(fetch.mock.calls[1][1].body).params).toEqual([
      "0x17d7840",
      false,
    ]);
  });
  it("rejects a mismatched historical block", async () => {
    const fetch = setup();
    fetch
      .mockReset()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            _meta: {
              block: { number: 25000000, timestamp: null },
              hasIndexingErrors: false,
            },
            pools,
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          result: {
            number: "0x1",
            timestamp: `0x${Math.floor(Date.now() / 1000).toString(16)}`,
          },
        }),
      );
    await expect(getEvidence("graph", 25000000)).rejects.toThrow(
      "could not be verified",
    );
  });
  it("rejects indexing errors", async () => {
    setup(0, true);
    await expect(getEvidence("graph")).rejects.toThrow("could not be verified");
  });
  it("fails closed when credentials are absent", async () => {
    vi.stubEnv("GRAPH_API_KEY", "");
    await expect(getEvidence("graph")).rejects.toThrow("unavailable");
  });
});
