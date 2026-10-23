import { describe, it, expect } from "vitest";
import {
  normalizeAnalysis,
  normalizePlan,
  selectFollowUpLinks,
} from "@/lib/research/deepResearch";
import {
  extractPageLinks,
  extractPageTitle,
  mainContentOf,
} from "@/lib/research/sourceExtractor";
import {
  buildEvidenceGroundedGuide,
  completionLimits,
  isReasoningModel,
  ModelGenerationInput,
  OpenAICompatibleModelProvider,
} from "@/lib/research/modelProvider";
import { mergeGroundedSections } from "@/lib/research/groundedWriter";
import { deduplicateAndCatalogSources } from "@/lib/research/canonicalSources";
import { LiveComposioAuthChecker } from "@/lib/research/composioCheck";
import { validateGuide } from "@/lib/schema/guideSchema";
import { cleanText } from "@/lib/ui/glossary";

describe("Page parsing helpers", () => {
  it("extracts absolute links from HTML anchors and markdown links", () => {
    const body = `<a href="/docs/oauth">OAuth <b>guide</b></a> <a href="#top">Top</a>
      [Scopes](https://developers.acme.com/docs/scopes) <a href="mailto:x@acme.com">mail</a>`;
    const links = extractPageLinks(body, "https://developers.acme.com/docs/start");
    expect(links).toEqual([
      { url: "https://developers.acme.com/docs/oauth", text: "OAuth guide" },
      { url: "https://developers.acme.com/docs/scopes", text: "Scopes" },
    ]);
  });

  it("reads the HTML title, falling back to a markdown heading", () => {
    expect(extractPageTitle("<title>OAuth &amp; Scopes</title>")).toBe("OAuth & Scopes");
    expect(extractPageTitle("# Getting started\nbody")).toBe("Getting started");
    expect(extractPageTitle("no title here")).toBeUndefined();
  });

  it("drops navigation chrome and prefers a substantial <main> region", () => {
    const article = "Real documentation text. ".repeat(80);
    const body = `<nav>Products Pricing</nav><header>Logo</header><main>${article}</main><footer>Legal</footer>`;
    const out = mainContentOf(body);
    expect(out).toContain("Real documentation text.");
    expect(out).not.toContain("Products Pricing");
    expect(out).not.toContain("Legal");
  });
});

describe("Display text cleanup", () => {
  it("removes inline source IDs in square or round brackets without leaving empty brackets", () => {
    expect(
      cleanText("Only organizations can apply [SRC-SPOTIFY-04, SRC-SPOTIFY-07]. Tokens last 1 hour (SRC-SPOTIFY-02).")
    ).toBe("Only organizations can apply. Tokens last 1 hour.");
  });
});

describe("Docs link following", () => {
  it("keeps same-site https auth links, skips known, off-site, asset and blog links", () => {
    const pages = [
      {
        url: "https://developers.acme.com/docs",
        links: [
          { url: "https://developers.acme.com/docs/oauth/scopes", text: "Permissions and scopes" },
          { url: "https://developers.acme.com/docs/app-review", text: "App Review" },
          { url: "https://developers.acme.com/docs/already-read", text: "OAuth" },
          { url: "https://other.com/oauth", text: "OAuth elsewhere" },
          { url: "https://developers.acme.com/blog/oauth-news", text: "OAuth news" },
          { url: "https://developers.acme.com/img/oauth.png", text: "OAuth diagram" },
          { url: "http://developers.acme.com/docs/token", text: "Tokens" },
          { url: "https://developers.acme.com/docs/colors", text: "Brand colors" },
        ],
      },
    ];
    const picked = selectFollowUpLinks(
      pages,
      new Set(["https://developers.acme.com/docs/already-read"]),
      5
    );
    expect(picked.sort()).toEqual([
      "https://developers.acme.com/docs/app-review",
      "https://developers.acme.com/docs/oauth/scopes",
    ]);
  });
});

describe("Model output normalisation", () => {
  it("dedupes follow-up searches and coerces unknown channels to web", () => {
    const plan = normalizePlan({
      keyFacts: ["Tokens expire after 60 days"],
      followUps: [
        { channel: "stackoverflow", query: "acme invalid_grant", why: "error" },
        { channel: "stackoverflow", query: "ACME invalid_grant", why: "dup" },
        { channel: "myspace", query: "acme oauth", why: "odd channel" },
        { channel: "github", query: "", why: "empty" },
      ],
    });
    expect(plan.followUps).toEqual([
      { channel: "stackoverflow", query: "acme invalid_grant", why: "error" },
      { channel: "web", query: "acme oauth", why: "odd channel" },
    ]);
    expect(plan.keyFacts).toEqual(["Tokens expire after 60 days"]);
  });

  it("drops analyst pain points and notes that cite unknown sources", () => {
    const known = new Set(["SRC-ACME-01"]);
    const analysis = normalizeAnalysis(
      {
        sourceNotes: [
          { id: "SRC-ACME-01", relevant: true, isOfficial: true, summary: "OAuth docs", published: "2026-03-01" },
          { id: "SRC-MADE-UP", relevant: true, summary: "invented" },
        ],
        painPoints: [
          { title: "Refresh fails", symptom: "invalid_grant", sourceIds: ["SRC-ACME-01"], causeConfidence: "certain", independentReports: 0 },
          { title: "Invented", symptom: "x", sourceIds: ["SRC-MADE-UP"] },
        ],
      },
      known
    );
    expect(analysis.sourceNotes.map((n) => n.id)).toEqual(["SRC-ACME-01"]);
    expect(analysis.painPoints).toHaveLength(1);
    expect(analysis.painPoints[0].causeConfidence).toBe("hypothesis");
    expect(analysis.painPoints[0].independentReports).toBe(1);
  });

  it("sends reasoning parameters only to reasoning models", () => {
    expect(isReasoningModel("gpt-5.5")).toBe(true);
    expect(isReasoningModel("o3-mini")).toBe(true);
    expect(isReasoningModel("gpt-4.1")).toBe(false);
    expect(completionLimits("gpt-5.5", 8000, "medium")).toEqual({
      max_completion_tokens: 8000,
      reasoning_effort: "medium",
    });
    expect(completionLimits("gpt-4.1", 20000, "low")).toEqual({
      temperature: 0.1,
      max_tokens: 16000,
    });
  });

  it("retries a model call once when the connection drops, and names the cause if it drops again", async () => {
    const dropped = () =>
      Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
    const ok = new Response(
      JSON.stringify({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }),
      { status: 200 }
    );
    let calls = 0;
    const flaky = new OpenAICompatibleModelProvider({
      apiKey: "test-key",
      fetchImpl: (async () => {
        calls++;
        if (calls === 1) throw dropped();
        return ok;
      }) as typeof fetch,
    });
    const chat = (p: OpenAICompatibleModelProvider) =>
      (p as unknown as { chatJson: (s: string, u: string, m: number, t: number) => Promise<unknown> })
        .chatJson("system", "user", 100, 5000);
    await expect(chat(flaky)).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);

    const down = new OpenAICompatibleModelProvider({
      apiKey: "test-key",
      fetchImpl: (async () => {
        throw dropped();
      }) as typeof fetch,
    });
    await expect(chat(down)).rejects.toThrow("Model API connection failed (fetch failed: ECONNRESET)");
  }, 15000);
});

describe("Composio managed-auth check only trusts statements about this toolkit", () => {
  const catalog = {
    title: "Composio — Managed OAuth Apps Catalog",
    url: "https://docs.composio.dev/toolkits/managed-auth",
    snippet: "Catalog of toolkits supporting Composio-managed OAuth2.",
    extractedContent:
      "Composio-managed OAuth available: Linear (LINEAR), GitHub (GITHUB). Bring your own OAuth app: Spotify (SPOTIFY).",
    retrievalStatus: "retrieved_200" as const,
  };
  const forumSummary = {
    title: "BGMI toolkit question",
    url: "https://forums.composio.dev/t/bgmi-toolkit",
    snippet: "Composio-managed OAuth available for every toolkit, including BGMI.",
    extractedContent: "Composio-managed OAuth available for every toolkit, including BGMI.",
    retrievalStatus: "retrieved_200" as const,
  };
  const check = (provider: string) =>
    new LiveComposioAuthChecker({ apiKey: "" }).checkManagedAuth(
      provider,
      deduplicateAndCatalogSources([catalog, forumSummary], "probe")
    );

  it("does not mark an unlisted app as available because of a generic catalog page or a forum post", async () => {
    const result = await check("Battlegrounds Mobile India (BGMI)");
    expect(result.status).toBe("unknown");
    expect(result.toolkitExamined).toBe("BATTLEGROUNDS_MOBILE_INDIA_BGMI");
  });

  it("uses the catalog when it names the toolkit", async () => {
    expect((await check("Linear")).status).toBe("available");
    expect((await check("Spotify")).status).toBe("unavailable");
  });
});

describe("Grounded writer merge enforces honesty rules", () => {
  const officialText =
    "Acme OAuth 2.0 lets third-party apps request access. Register an app in the Acme developer console, set the redirect URI, request scopes, and exchange the authorization code for a token. ".repeat(6);
  const sources = deduplicateAndCatalogSources(
    [
      {
        title: "Acme OAuth documentation",
        url: "https://developers.acme.com/docs/oauth",
        snippet: "Acme OAuth 2.0 authorization code flow",
        extractedContent: officialText,
        retrievalStatus: "retrieved_200",
      },
      {
        title: "Acme refresh token invalid_grant",
        url: "https://stackoverflow.com/questions/123/acme-refresh-token-invalid-grant",
        snippet: "Acme OAuth refresh returns invalid_grant",
        extractedContent: "QUESTION: Acme OAuth refresh returns invalid_grant after a day.",
        retrievalStatus: "retrieved_200",
      },
    ],
    "acme",
    "acme.com"
  );
  const official = sources.find((s) => s.sourceType === "official_docs")!;
  const community = sources.find((s) => s.sourceType !== "official_docs")!;

  const input: ModelGenerationInput = {
    providerName: "Acme",
    slug: "acme",
    canonicalDomain: "https://acme.com",
    integrationGoal: "Read Acme projects for my users",
    intendedAudience: "multi_workspace_external",
    sources,
    composioResult: {
      status: "unknown",
      toolkitExamined: "ACME",
      authMethodExamined: "OAUTH2",
      evidenceIds: [],
      conditionsAndQualifications: ["Composio lookup did not confirm managed auth."],
    },
    painPointMatrix: {
      painPoints: [],
      conflictingEvidenceNotes: [],
      resolvedHistoricalNotes: [],
      isolatedReportCount: 0,
      corroboratedPatternCount: 0,
    },
    normalizedQueries: ["acme oauth"],
    searchesExecuted: 1,
    sourcesFailedCount: 0,
  };

  const merged = mergeGroundedSections(
    buildEvidenceGroundedGuide(input),
    {
      authMethod: "oauth2",
      recommendedPath: "use_composio_managed_oauth",
      verdictHeadline: "Use Composio. See https://evil.example.com/phish for details.",
      setupSteps: [
        {
          title: "Register the app",
          instructions: "Create an OAuth app in the Acme developer console and copy the client ID.",
          url: "https://evil.example.com/console",
          sourceIds: [official.id],
        },
        {
          title: "Exchange the code",
          instructions:
            "Exchange the authorization code for an access token at https://accounts.acme.com/api/token on your server.",
          url: "https://developers.acme.com/docs/oauth",
          sourceIds: ["SRC-NOT-REAL"],
        },
      ],
      painPoints: [
        {
          title: "Refresh token rejected",
          symptom: "invalid_grant on refresh",
          causeConfidence: "maintainer_confirmed",
          independentReports: 9,
          sourceIds: [community.id],
        },
      ],
    },
    input
  );

  it("never recommends Composio-managed OAuth when the Composio check is not 'available'", () => {
    expect(merged.authenticationAssessment.recommendedPath).toBe("register_custom_oauth_app");
    expect(merged.authenticationAssessment.composioManagedAuth.status).toBe("unknown");
  });

  it("removes URLs that were not in the retrieved evidence", () => {
    expect(JSON.stringify(merged)).not.toContain("evil.example.com");
    expect(merged.setupSteps[0].consoleOrDocUrl).toBeUndefined();
    expect(merged.setupSteps[1].consoleOrDocUrl).toBe("https://developers.acme.com/docs/oauth");
  });

  it("keeps endpoints on the provider's own domain even if that subdomain was not retrieved", () => {
    expect(merged.setupSteps[1].instructions).toContain("https://accounts.acme.com/api/token");
  });

  it("replaces unknown citations and downgrades unsupported confidence and counts", () => {
    expect(merged.setupSteps[1].evidenceIds).not.toContain("SRC-NOT-REAL");
    const pain = merged.painPoints[0];
    expect(pain.causeConfidence).toBe("hypothesis");
    expect(pain.independentReportCount).toBe(1);
  });

  it("still produces a schema-valid guide", () => {
    expect(validateGuide(merged)).toMatchObject({ success: true });
  });

  it("labels a guide written without an AI key as a low-confidence outline on real requests", async () => {
    const outcome = await new OpenAICompatibleModelProvider({
      apiKey: "",
      labelUnwrittenOutline: true,
    }).generateAndValidateGuide(input);
    expect(outcome.ok).toBe(true);
    expect(outcome.guide?.outcome.guideStatus).not.toBe("complete_verified");
    expect(outcome.guide?.outcome.confidence).toBe("low");
    expect(outcome.guide?.outcome.limitations[0]).toContain("AI_API_KEY is not set");
  });
});
