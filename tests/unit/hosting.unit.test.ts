import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { UpstashGuideStore, InMemoryGuideStore } from "@/lib/persistence/guideStore";
import {
  readDailyLimit,
  reserveLiveResearchSlot,
  resetDailyLimitMemoryForTests,
} from "@/lib/persistence/dailyLimit";
import { readUpstashConfig } from "@/lib/persistence/upstash";
import { runLiveInvestigation } from "@/lib/research/agentOrchestrator";
import {
  DeterministicFixturePageExtractor,
  DeterministicFixtureSearchProvider,
} from "@/lib/research/evalFixtures";
import { CURATED_GUIDES } from "@/data/curated";

const CONFIG = { url: "https://fake-redis.upstash.io", token: "test-token" };

/** Stands in for the Upstash REST endpoint with an in-memory Redis subset. */
function installFakeRedis() {
  const hashes = new Map<string, Map<string, string>>();
  const lists = new Map<string, string[]>();
  const counters = new Map<string, number>();
  const commands: string[][] = [];

  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-token" });
    const [cmd, key, ...args] = JSON.parse(String(init.body)) as string[];
    commands.push([cmd, key, ...args]);
    let result: unknown = null;
    if (cmd === "HSET") {
      const h = hashes.get(key) ?? new Map();
      h.set(args[0], args[1]);
      hashes.set(key, h);
      result = 1;
    } else if (cmd === "HGET") {
      result = hashes.get(key)?.get(args[0]) ?? null;
    } else if (cmd === "HGETALL") {
      result = Array.from(hashes.get(key)?.entries() ?? []).flat();
    } else if (cmd === "RPUSH") {
      const l = lists.get(key) ?? [];
      l.push(args[0]);
      lists.set(key, l);
      result = l.length;
    } else if (cmd === "INCR") {
      result = (counters.get(key) ?? 0) + 1;
      counters.set(key, result as number);
    } else if (cmd === "EXPIRE") {
      result = 1;
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { hashes, lists, commands };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Upstash guide store (hosted persistence)", () => {
  it("ignores placeholder or missing connection settings", () => {
    expect(readUpstashConfig({})).toBeNull();
    expect(
      readUpstashConfig({
        UPSTASH_REDIS_REST_URL: "your_upstash_url_here",
        UPSTASH_REDIS_REST_TOKEN: "x",
      })
    ).toBeNull();
    expect(
      readUpstashConfig({
        UPSTASH_REDIS_REST_URL: "https://a.upstash.io/",
        UPSTASH_REDIS_REST_TOKEN: "t",
      })
    ).toEqual({ url: "https://a.upstash.io", token: "t" });
  });

  it("saves, reads back and lists generated guides alongside samples, and stores feedback", async () => {
    const redis = installFakeRedis();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "authpath-upstash-"));
    const sample = structuredClone(CURATED_GUIDES[0]);
    sample.slug = "sample-app";
    sample.guideOrigin = "generated";
    const samplePath = path.join(dir, "samples.json");
    await fs.writeFile(samplePath, JSON.stringify({ [sample.slug]: sample }), "utf-8");

    const store = new UpstashGuideStore(CONFIG, samplePath);
    expect((await store.getGuideBySlug("sample-app"))?.applicationName).toBe(sample.applicationName);

    const generated = structuredClone(CURATED_GUIDES[1]);
    generated.slug = "new-app";
    generated.guideOrigin = "generated";
    const { shareUrl } = await store.saveGeneratedGuide(generated);
    expect(shareUrl).toBe("/guides/new-app");
    expect(redis.hashes.get("authpath:guides")?.has("new-app")).toBe(true);

    expect((await store.getGuideBySlug("NEW-APP"))?.slug).toBe("new-app");
    const all = await store.getAllGuides();
    expect(all.filter((g) => g.slug === "new-app")).toHaveLength(1);
    expect(all.filter((g) => g.slug === "sample-app")).toHaveLength(1);
    expect(all.length).toBe(CURATED_GUIDES.length + 2);

    redis.hashes.get("authpath:guides")?.set("broken", "{not json");
    expect(await store.getGuideBySlug("broken")).toBeNull();
    expect((await store.getAllGuides()).length).toBe(CURATED_GUIDES.length + 2);

    const report = await store.saveFeedbackReport({
      guideSlug: "new-app",
      issueType: "other",
      description: "Step 3 moved",
    });
    expect(report.id).toMatch(/^fb-/);
    expect(JSON.parse(redis.lists.get("authpath:feedback")![0]).guideSlug).toBe("new-app");

    await fs.rm(dir, { recursive: true, force: true });
  });

  it("rejects invalid guides before writing anything", async () => {
    const redis = installFakeRedis();
    const store = new UpstashGuideStore(CONFIG);
    const invalid = { ...structuredClone(CURATED_GUIDES[0]), slug: "" };
    await expect(store.saveGeneratedGuide(invalid)).rejects.toThrow(/Cannot persist invalid guide/);
    expect(redis.commands).toHaveLength(0);
  });
});

describe("Daily live-research limit", () => {
  beforeEach(() => resetDailyLimitMemoryForTests());

  it("is off unless LIVE_RESEARCH_DAILY_LIMIT is a positive number", async () => {
    expect(readDailyLimit({})).toBeNull();
    expect(readDailyLimit({ LIVE_RESEARCH_DAILY_LIMIT: "0" })).toBeNull();
    expect(readDailyLimit({ LIVE_RESEARCH_DAILY_LIMIT: "abc" })).toBeNull();
    expect(readDailyLimit({ LIVE_RESEARCH_DAILY_LIMIT: "10" })).toBe(10);
    expect((await reserveLiveResearchSlot({ env: {} })).allowed).toBe(true);
  });

  it("allows up to the limit per UTC day, then refuses with a clear message", async () => {
    const env = { LIVE_RESEARCH_DAILY_LIMIT: "2" };
    const day1 = new Date("2026-10-23T10:00:00Z");
    expect((await reserveLiveResearchSlot({ env, now: day1 })).allowed).toBe(true);
    expect((await reserveLiveResearchSlot({ env, now: day1 })).allowed).toBe(true);
    const blocked = await reserveLiveResearchSlot({ env, now: day1 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.message).toContain("limit of 2 new live researches");

    const day2 = new Date("2026-10-24T00:00:01Z");
    expect((await reserveLiveResearchSlot({ env, now: day2 })).allowed).toBe(true);
  });

  it("keeps the count in the database when one is configured, so restarts do not reset it", async () => {
    const redis = installFakeRedis();
    const env = {
      LIVE_RESEARCH_DAILY_LIMIT: "1",
      UPSTASH_REDIS_REST_URL: CONFIG.url,
      UPSTASH_REDIS_REST_TOKEN: CONFIG.token,
    };
    const now = new Date("2026-10-23T10:00:00Z");
    expect((await reserveLiveResearchSlot({ env, now })).allowed).toBe(true);
    resetDailyLimitMemoryForTests();
    expect((await reserveLiveResearchSlot({ env, now })).allowed).toBe(false);
    expect(redis.commands.map((c) => c[0])).toEqual(["INCR", "EXPIRE", "INCR"]);
    expect(redis.commands[0][1]).toBe("authpath:live-research:2026-10-23");
  });
});

describe("Agent respects the daily limit", () => {
  it("stops before any web search when the limit is reached and saves nothing", async () => {
    const store = new InMemoryGuideStore();
    const search = new DeterministicFixtureSearchProvider();
    const searchSpy = vi.spyOn(search, "search");
    const res = await runLiveInvestigation(
      { query: "Linear" },
      {
        searchProvider: search,
        pageExtractor: new DeterministicFixturePageExtractor(),
        guideStore: store,
        reserveLiveResearch: async () => ({ allowed: false, message: "Limit reached for today." }),
      }
    );
    expect(res.status).toBe("daily_limit_reached");
    expect(res.errorMessage).toBe("Limit reached for today.");
    expect(searchSpy).not.toHaveBeenCalled();
    expect(await store.getGuideBySlug("linear")).toBeNull();
  });

  it("does not use up the limit when an existing guide answers the request", async () => {
    const reserve = vi.fn(async () => ({ allowed: false }));
    const res = await runLiveInvestigation(
      { query: "GitHub" },
      {
        searchProvider: new DeterministicFixtureSearchProvider(),
        guideStore: new InMemoryGuideStore(),
        reserveLiveResearch: reserve,
      }
    );
    expect(res.status).toBe("existing_guide_matched");
    expect(reserve).not.toHaveBeenCalled();
  });
});
