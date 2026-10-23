import { describe, it, expect } from "vitest";
import { identifyProvider } from "@/lib/research/providerIdentifier";
import { resolveProviderWebsite } from "@/lib/research/providerWebsite";
import { runLiveInvestigation } from "@/lib/research/agentOrchestrator";
import { InMemoryGuideStore } from "@/lib/persistence/guideStore";
import { buildEvidenceGroundedGuide } from "@/lib/research/modelProvider";
import { PageExtractor } from "@/lib/research/sourceExtractor";
import { WebSearchProvider } from "@/lib/research/webSearch";

describe("Unknown app names do not become name.com", () => {
  it("keeps a typed name unresolved until search, and keeps an address the user typed", () => {
    const named = identifyProvider({ query: "Lantern" });
    expect(named.status).toBe("identified_new_provider");
    expect(named.providerName).toBe("Lantern");
    expect(named.canonicalDomain).toBeUndefined();

    const addressed = identifyProvider({ query: "lantern.md" });
    expect(addressed.canonicalDomain).toBe("https://lantern.md/");
  });

  it("asks when search results name two different websites, and ignores directories", () => {
    const resolution = resolveProviderWebsite("Lantern", [
      { title: "Lantern", url: "https://lantern.com", snippet: "Lantern homepage." },
      { title: "Lantern AI", url: "https://www.lantern.md", snippet: "AI hiring manager." },
      { title: "Lantern AI", url: "https://www.ycombinator.com/companies/lantern-ai", snippet: "Y Combinator company." },
      { title: "Lantern", url: "https://en.wikipedia.org/wiki/Lantern", snippet: "A lantern is a lamp." },
    ]);
    expect(resolution.status).toBe("ambiguous");
    expect(resolution.candidates?.map((c) => c.domain).sort()).toEqual(["lantern.com", "lantern.md"]);
    expect(resolution.detail).not.toContain("lantern.com was");
  });

  it("asks even when one Lantern has more pages than the other", () => {
    const resolution = resolveProviderWebsite("Lantern", [
      { title: "Lantern", url: "https://lantern.is/", snippet: "Lantern helps brands rank in AI search." },
      { title: "Lantern docs", url: "https://docs.lantern.is/start", snippet: "Lantern documentation." },
      { title: "Lantern blog", url: "https://lantern.is/blog", snippet: "Lantern product updates." },
      { title: "Lantern AI", url: "https://lantern.md/", snippet: "Lantern is an AI hiring manager." },
    ]);
    expect(resolution.status).toBe("ambiguous");
    expect(resolution.candidates?.map((c) => c.domain).sort()).toEqual(["lantern.is", "lantern.md"]);
  });

  it("reads the company website out of a Y Combinator page instead of treating that page as the company", () => {
    const resolution = resolveProviderWebsite("Lantern", [
      { title: "Lantern", url: "https://lantern.is/", snippet: "Where your products rank in AI search." },
      {
        title: "Lantern AI: Turn Your Taste Into Hires",
        url: "https://www.ycombinator.com/companies/lantern-ai",
        snippet: "Lantern AI is a hiring startup. Official website: https://lantern.md",
      },
    ]);
    expect(resolution.status).toBe("ambiguous");
    expect(resolution.candidates?.map((c) => c.domain).sort()).toEqual(["lantern.is", "lantern.md"]);
  });

  it("accepts one website from the results and does not invent a second", () => {
    const resolution = resolveProviderWebsite("Dropbox", [
      { title: "Dropbox for Developers", url: "https://www.dropbox.com/developers", snippet: "Dropbox API documentation." },
      { title: "Dropbox", url: "https://en.wikipedia.org/wiki/Dropbox", snippet: "Dropbox company article." },
      { title: "dropbox-sdk", url: "https://github.com/dropbox/dropbox-sdk-js", snippet: "Dropbox JavaScript SDK." },
    ]);
    expect(resolution.status).toBe("confirmed");
    expect(resolution.canonicalDomain).toBe("https://dropbox.com");
  });

  it("reports no website when every result is a directory", () => {
    const resolution = resolveProviderWebsite("Lantern", [
      { title: "Lantern", url: "https://en.wikipedia.org/wiki/Lantern", snippet: "A lamp." },
    ]);
    expect(resolution.status).toBe("unconfirmed");
    expect(resolution.canonicalDomain).toBeUndefined();
  });

  it("treats funding profiles and an app-store page as the same company, not extra startups", () => {
    const resolution = resolveProviderWebsite("Tensorfuse", [
      {
        title: "Tensorfuse",
        url: "https://tensorfuse.io",
        snippet: "Runs serverless GPUs on your own cloud. Y Combinator W24.",
      },
      {
        title: "Tensorfuse 2026 Company Profile",
        url: "https://pitchbook.com/profiles/company/593044-57",
        snippet: "PitchBook profile.",
      },
      {
        title: "Tensorfuse - Tracxn",
        url: "https://tracxn.com/d/companies/tensorfuse",
        snippet: "Tracxn profile.",
      },
      {
        title: "Tensorfuse — Company Profile",
        url: "https://indexed.vc/companies/tensorfuse",
        snippet: "Funding profile.",
      },
    ]);
    expect(resolution.status).toBe("confirmed");
    expect(resolution.canonicalDomain).toBe("https://tensorfuse.io");
  });

  it("keeps two real products and drops the directory and the app store", () => {
    const resolution = resolveProviderWebsite("Slashy", [
      {
        title: "Slashy",
        url: "https://slashy.com",
        snippet: "Y Combinator S25 AI email client.",
      },
      {
        title: "Slashy",
        url: "https://slashy.app",
        snippet: "Free Notion slash-command extension from 2022.",
      },
      {
        title: "Slashy: Funding, Team & Investors",
        url: "https://startupintros.com/orgs/slashy",
        snippet: "Startup Intros profile.",
      },
      {
        title: "Slashy Mail",
        url: "https://apps.apple.com/app/slashy-mail/id123",
        snippet: "App Store listing.",
      },
    ]);
    expect(resolution.status).toBe("ambiguous");
    expect(resolution.candidates?.map((c) => c.domain).sort()).toEqual(["slashy.app", "slashy.com"]);
    expect(resolution.candidates?.find((c) => c.domain === "slashy.com")?.description).toContain(
      "Y Combinator S25"
    );
  });

  it("returns every distinct startup the list contains, not only four", () => {
    const resolution = resolveProviderWebsite(
      "Atlas",
      ["one", "two", "three", "four", "five"].map((label) => ({
        title: `Atlas ${label}`,
        url: `https://atlas-${label}.example`,
        snippet: `Atlas ${label} is its own product.`,
      }))
    );
    expect(resolution.status).toBe("ambiguous");
    expect(resolution.candidates).toHaveLength(5);
  });
});

describe("Live research uses the looked-up website", () => {
  const extractor: PageExtractor = {
    async extractPage(url: string) {
      return {
        url,
        finalUrl: url,
        retrievalStatus: "retrieved_200",
        httpStatus: 200,
        extractedText: "Lantern developer page. No OAuth setup is documented here.",
        injectionDetected: false,
      };
    },
  };

  function search(results: { title: string; url: string; snippet: string }[]): WebSearchProvider & { calls: string[] } {
    const calls: string[] = [];
    return {
      calls,
      isConfigured: () => true,
      async search(query: string) {
        calls.push(query);
        return { query, ok: true, results, retriedCount: 0 };
      },
    };
  }

  it("asks when the model finds a second Lantern that web search alone missed", async () => {
    const provider = search([
      { title: "Lantern", url: "https://lantern.is/", snippet: "Lantern ranks products in AI search." },
    ]);
    const res = await runLiveInvestigation(
      { query: "Lantern" },
      {
        searchProvider: provider,
        pageExtractor: extractor,
        guideStore: new InMemoryGuideStore(),
        modelProvider: {
          isConfigured: () => true,
          async generateAndValidateGuide() {
            throw new Error("should have asked before writing a guide");
          },
          async findProductsWithThisName() {
            return [
              { title: "Lantern", url: "https://lantern.is/", snippet: "AI search for products." },
              { title: "Lantern AI", url: "https://lantern.md/", snippet: "AI hiring manager." },
            ];
          },
        },
      }
    );
    expect(res.status).toBe("ambiguous_clarification_needed");
    expect(res.ambiguityCandidates?.map((c) => c.domain).sort()).toEqual([
      "lantern.is",
      "lantern.md",
    ]);
  });

  it("stops and asks which Lantern before researching either website", async () => {
    const store = new InMemoryGuideStore();
    const provider = search([
      { title: "Lantern", url: "https://lantern.com", snippet: "Lantern homepage." },
      { title: "Lantern AI", url: "https://lantern.md", snippet: "AI hiring manager." },
    ]);
    const res = await runLiveInvestigation(
      { query: "Lantern" },
      { searchProvider: provider, pageExtractor: extractor, guideStore: store }
    );
    expect(res.status).toBe("ambiguous_clarification_needed");
    expect(res.ambiguityCandidates?.map((c) => c.domain).sort()).toEqual(["lantern.com", "lantern.md"]);
    expect(provider.calls.some((q) => q.includes("official website"))).toBe(true);
    expect(await store.getGuideBySlug("lantern")).toBeNull();
  });

  it("researches the website search found, not a guessed .com", async () => {
    const provider = search([
      { title: "Lantern AI", url: "https://lantern.md", snippet: "Lantern AI official site." },
    ]);
    const res = await runLiveInvestigation(
      { query: "Lantern", maxSearchQueries: 0 },
      { searchProvider: provider, pageExtractor: extractor, guideStore: new InMemoryGuideStore() }
    );
    expect(res.status === "generated_guide_saved" || res.status === "partial_guide_saved").toBe(true);
    expect(res.guide?.canonicalWebsite).toBe("https://lantern.md");
    expect(res.stages.find((s) => s.stage === "identifying_provider")?.detail).toContain("https://lantern.md");
    expect(res.stages.find((s) => s.stage === "identifying_provider")?.detail).not.toContain("lantern.com");
  });

  it("asks for every startup the model names, and does not start doc research", async () => {
    const provider = search([]);
    const res = await runLiveInvestigation(
      { query: "Lantern" },
      {
        searchProvider: provider,
        pageExtractor: extractor,
        guideStore: new InMemoryGuideStore(),
        modelProvider: {
          isConfigured: () => true,
          supportsLiveResearch: () => true,
          async generateAndValidateGuide() {
            throw new Error("should have asked before writing a guide");
          },
          async findProductsWithThisName() {
            return ["one", "two", "three", "four", "five"].map((label) => ({
              title: `Lantern ${label}`,
              url: `https://lantern-${label}.com`,
              snippet: `Lantern ${label} is its own product.`,
            }));
          },
        },
      }
    );
    expect(res.status).toBe("ambiguous_clarification_needed");
    expect(res.ambiguityCandidates).toHaveLength(5);
    expect(res.ambiguityCandidates?.[0]?.description).toContain("its own product");
    expect(provider.calls).toEqual([]);
    expect(res.guide).toBeUndefined();
  });

  it("stops before doc research when the model finds no startup", async () => {
    const store = new InMemoryGuideStore();
    const provider = search([
      { title: "Pubgggg", url: "https://example.com/pubgggg", snippet: "A page that mentions the word." },
    ]);
    const res = await runLiveInvestigation(
      { query: "Pubgggg" },
      {
        searchProvider: provider,
        pageExtractor: extractor,
        guideStore: store,
        modelProvider: {
          isConfigured: () => true,
          supportsLiveResearch: () => true,
          async generateAndValidateGuide() {
            throw new Error("should have stopped before writing a guide");
          },
          async findProductsWithThisName() {
            return [];
          },
        },
      }
    );
    expect(res.status).toBe("research_failed");
    expect(res.errorMessage).toContain("did not start");
    expect(provider.calls).toEqual([]);
    expect(await store.getGuideBySlug("pubgggg")).toBeNull();
  });

  it("researches the one real website and ignores funding profiles", async () => {
    const provider = search([]);
    const res = await runLiveInvestigation(
      { query: "Tensorfuse", maxSearchQueries: 0 },
      {
        searchProvider: provider,
        pageExtractor: extractor,
        guideStore: new InMemoryGuideStore(),
        composioChecker: {
          async checkManagedAuth() {
            return {
              status: "unknown" as const,
              toolkitExamined: "TENSORFUSE",
              authMethodExamined: "unknown",
              evidenceIds: [],
              conditionsAndQualifications: [],
            };
          },
        },
        modelProvider: {
          isConfigured: () => true,
          supportsLiveResearch: () => true,
          async findProductsWithThisName() {
            return [
              {
                title: "Tensorfuse",
                url: "https://tensorfuse.io",
                snippet: "Runs serverless GPUs on your own cloud. Y Combinator W24.",
              },
              {
                title: "Tensorfuse profile",
                url: "https://pitchbook.com/profiles/company/593044-57",
                snippet: "PitchBook profile.",
              },
              {
                title: "Tensorfuse profile",
                url: "https://tracxn.com/d/companies/tensorfuse",
                snippet: "Tracxn profile.",
              },
            ];
          },
          async generateAndValidateGuide(input) {
            return { ok: true, guide: buildEvidenceGroundedGuide(input), repairAttempts: 0 };
          },
        },
      }
    );
    expect(res.status === "generated_guide_saved" || res.status === "partial_guide_saved").toBe(true);
    expect(res.guide?.canonicalWebsite).toBe("https://tensorfuse.io");
    expect(provider.calls).toEqual([]);
  });

  it("researches a typed website without asking the model which startup", async () => {
    const provider = search([]);
    const res = await runLiveInvestigation(
      { query: "tensorfuse.io", maxSearchQueries: 0 },
      {
        searchProvider: provider,
        pageExtractor: extractor,
        guideStore: new InMemoryGuideStore(),
        modelProvider: {
          isConfigured: () => false,
          async findProductsWithThisName() {
            throw new Error("a typed website does not need a startup list");
          },
          async generateAndValidateGuide(input) {
            return { ok: true, guide: buildEvidenceGroundedGuide(input), repairAttempts: 0 };
          },
        },
      }
    );
    expect(res.status === "generated_guide_saved" || res.status === "partial_guide_saved").toBe(true);
    expect(res.guide?.canonicalWebsite).toBe("https://tensorfuse.io/");
    expect(provider.calls).toEqual([]);
  });
});
