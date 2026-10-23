import { describe, it, expect } from "vitest";
import { identifyProvider } from "@/lib/research/providerIdentifier";
import { resolveProviderWebsite } from "@/lib/research/providerWebsite";
import { runLiveInvestigation } from "@/lib/research/agentOrchestrator";
import { InMemoryGuideStore } from "@/lib/persistence/guideStore";
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
    expect(provider.calls).toHaveLength(1);
    expect(provider.calls[0]).toContain("official website");
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
});
