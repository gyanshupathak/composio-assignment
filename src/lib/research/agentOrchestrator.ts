import { Guide } from "@/lib/schema/guideSchema";
import {
  createCollisionResistantSlug,
  createSlug,
  getGuideStore,
  GuideStore,
} from "@/lib/persistence/guideStore";
import {
  AmbiguityCandidate,
  identifyProvider,
} from "./providerIdentifier";
import { organizationHost, resolveProviderWebsite } from "./providerWebsite";
import {
  buildResearchQueryPlan,
  TavilyWebSearchProvider,
  WebSearchProvider,
} from "./webSearch";
import {
  LiveSafePageExtractor,
  PageExtractor,
  sanitizeUntrustedContent,
} from "./sourceExtractor";
import {
  deduplicateAndCatalogSources,
  RawDiscoveredSource,
} from "./canonicalSources";
import {
  ComposioAuthChecker,
  LiveComposioAuthChecker,
} from "./composioCheck";
import { synthesizePainPointsFromSources } from "./painPointAnalyzer";
import {
  ModelProvider,
  OpenAICompatibleModelProvider,
} from "./modelProvider";
import {
  AuthDecision,
  EvidenceAnalysis,
  ResearchPlan,
  selectFollowUpLinks,
} from "./deepResearch";

export type ResearchStageId =
  | "identifying_provider"
  | "retrieving_official_docs"
  | "investigating_developer_problems"
  | "cross_checking_findings"
  | "assessing_auth_and_approvals"
  | "generating_and_validating_guide"
  | "saving_result";

export interface ResearchStageEvent {
  stage: ResearchStageId;
  label: string;
  status: "in_progress" | "completed" | "skipped" | "failed";
  detail: string;
  timestamp: string;
}

export interface InvestigateRequest {
  query: string;
  integrationGoal?: string;
  intendedAudience?:
    | "single_workspace_internal"
    | "multi_workspace_external"
    | "personal_or_prototype"
    | "unknown";
  forceFreshResearch?: boolean;
  maxSearchQueries?: number;
}

export interface InvestigateResult {
  status:
    | "existing_guide_matched"
    | "generated_guide_saved"
    | "partial_guide_saved"
    | "ambiguous_clarification_needed"
    | "unconfigured_runtime"
    | "unsafe_url_rejected"
    | "invalid_input"
    | "daily_limit_reached"
    | "research_failed";
  guide?: Guide;
  shareUrl?: string;
  goalDiffersMaterially?: boolean;
  goalDifferenceReason?: string;
  clarifyingQuestion?: string;
  ambiguityCandidates?: AmbiguityCandidate[];
  stages: ResearchStageEvent[];
  runtimeConfigStatus: {
    searchConfigured: boolean;
    modelConfigured: boolean;
    composioApiKeyConfigured: boolean;
    persistenceType: string;
  };
  errorMessage?: string;
}

export interface ResearchRuntimeDeps {
  searchProvider?: WebSearchProvider;
  pageExtractor?: PageExtractor;
  composioChecker?: ComposioAuthChecker;
  modelProvider?: ModelProvider;
  guideStore?: GuideStore;
  /** Asked once, right before new web research starts; existing-guide matches never count. */
  reserveLiveResearch?: () => Promise<{ allowed: boolean; message?: string }>;
  /** Called whenever a stage starts or finishes, so callers can stream real progress. */
  onStage?: (event: ResearchStageEvent) => void;
}

export function getRuntimeConfigStatus(deps?: ResearchRuntimeDeps) {
  const searchProvider = deps?.searchProvider ?? new TavilyWebSearchProvider();
  const modelProvider =
    deps?.modelProvider ?? new OpenAICompatibleModelProvider();
  const composioKey = process.env.COMPOSIO_API_KEY;

  return {
    searchConfigured: searchProvider.isConfigured(),
    modelConfigured: modelProvider.isConfigured(),
    composioApiKeyConfigured: Boolean(
      composioKey &&
        composioKey.trim().length > 0 &&
        composioKey !== "your_composio_api_key_here"
    ),
    persistenceType: process.env.AUTHPATH_STORAGE_PROVIDER ?? "file",
  };
}

export async function runLiveInvestigation(
  request: InvestigateRequest,
  deps: ResearchRuntimeDeps = {}
): Promise<InvestigateResult> {
  const searchProvider = deps.searchProvider ?? new TavilyWebSearchProvider();
  const pageExtractor = deps.pageExtractor ?? new LiveSafePageExtractor();
  const composioChecker = deps.composioChecker ?? new LiveComposioAuthChecker();
  const modelProvider =
    deps.modelProvider ?? new OpenAICompatibleModelProvider();
  const guideStore = deps.guideStore ?? getGuideStore();

  const runtimeConfigStatus = getRuntimeConfigStatus({
    searchProvider,
    modelProvider,
  });

  const stages: ResearchStageEvent[] = [];
  const pushStage = (
    stage: ResearchStageId,
    label: string,
    status: ResearchStageEvent["status"],
    detail: string
  ) => {
    const existingIdx = stages.findIndex((s) => s.stage === stage);
    const event: ResearchStageEvent = {
      stage,
      label,
      status,
      detail,
      timestamp: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      stages[existingIdx] = event;
    } else {
      stages.push(event);
    }
    deps.onStage?.(event);
  };

  // Stage 1: Identifying the provider
  pushStage(
    "identifying_provider",
    "1. Identifying the provider",
    "in_progress",
    `Validating and normalizing input "${request.query}".`
  );

  const allGuides = await guideStore.getAllGuides();
  const identification = identifyProvider(
    {
      query: request.query,
      integrationGoal: request.integrationGoal,
      intendedAudience: request.intendedAudience,
    },
    allGuides
  );

  if (identification.status === "invalid_input") {
    pushStage(
      "identifying_provider",
      "1. Identifying the provider",
      "failed",
      identification.errorMessage ?? "Invalid input."
    );
    return {
      status: "invalid_input",
      stages,
      runtimeConfigStatus,
      errorMessage: identification.errorMessage,
    };
  }

  if (identification.status === "unsafe_url") {
    pushStage(
      "identifying_provider",
      "1. Identifying the provider",
      "failed",
      identification.errorMessage ?? "Unsafe URL rejected by SSRF guard."
    );
    return {
      status: "unsafe_url_rejected",
      stages,
      runtimeConfigStatus,
      errorMessage: identification.errorMessage,
    };
  }

  if (identification.status === "ambiguous_provider") {
    pushStage(
      "identifying_provider",
      "1. Identifying the provider",
      "completed",
      `Detected ambiguous application name "${request.query}" with ${
        identification.ambiguityCandidates?.length ?? 0
      } distinct product candidates.`
    );
    return {
      status: "ambiguous_clarification_needed",
      clarifyingQuestion: identification.clarifyingQuestion,
      ambiguityCandidates: identification.ambiguityCandidates,
      stages,
      runtimeConfigStatus,
    };
  }

  // Existing guide check (unless forceFreshResearch is set)
  if (
    (identification.status === "matched_existing_guide" ||
      identification.status === "matched_existing_guide_different_goal") &&
    identification.matchedGuide &&
    !request.forceFreshResearch
  ) {
    pushStage(
      "identifying_provider",
      "1. Identifying the provider",
      "completed",
      `Matched existing guide "${identification.matchedGuide.applicationName}" (/guides/${identification.matchedGuide.slug}).`
    );
    return {
      status: "existing_guide_matched",
      guide: identification.matchedGuide,
      shareUrl: `/guides/${identification.matchedGuide.slug}`,
      goalDiffersMaterially: identification.goalDiffersMaterially,
      goalDifferenceReason: identification.goalDifferenceReason,
      stages,
      runtimeConfigStatus,
    };
  }

  const providerName = identification.providerName ?? request.query.trim();
  let canonicalDomain = identification.canonicalDomain ?? "";
  const slug = request.forceFreshResearch
    ? createCollisionResistantSlug(providerName, request.integrationGoal)
    : createSlug(providerName);
  const identityResults: RawDiscoveredSource[] = [];

  // Check if search provider is configured before claiming search work
  if (!searchProvider.isConfigured()) {
    pushStage(
      "identifying_provider",
      "1. Identifying the provider",
      "completed",
      canonicalDomain
        ? `Identified target provider "${providerName}" (${canonicalDomain}).`
        : `Identified "${providerName}". Its website was not looked up because live search is off.`
    );
    pushStage(
      "retrieving_official_docs",
      "2. Retrieving official documentation",
      "skipped",
      "Live web search is unconfigured (TAVILY_API_KEY is not set in environment)."
    );
    return {
      status: "unconfigured_runtime",
      stages,
      runtimeConfigStatus,
      errorMessage:
        "Live web research requires TAVILY_API_KEY (and optional AI_API_KEY for LLM refinement) in .env.local. Curated guides remain fully functional without API keys.",
    };
  }

  let websiteDetail = canonicalDomain
    ? `Identified target provider "${providerName}" (${canonicalDomain}).`
    : "";

  if (!canonicalDomain) {
    pushStage(
      "identifying_provider",
      "1. Identifying the provider",
      "in_progress",
      `Checking which startups are named "${providerName}".`
    );
    // A live model decides the list. Search results are only a fallback when that model is off,
    // so a funding profile cannot show up as if it were a second company.
    const modelDecides = modelProvider.supportsLiveResearch?.() === true;
    const injectedNaming =
      modelProvider.supportsLiveResearch === undefined &&
      Boolean(modelProvider.findProductsWithThisName);
    try {
      let found: RawDiscoveredSource[] = [];
      let resolution = resolveProviderWebsite(providerName, []);
      if ((modelDecides || injectedNaming) && modelProvider.findProductsWithThisName) {
        const fromModel = await modelProvider.findProductsWithThisName(providerName);
        found = fromModel.map((item) => ({
          ...item,
          retrievalStatus: "search_indexed_verified" as const,
        }));
        resolution = resolveProviderWebsite(providerName, found);
        if (!modelDecides && resolution.status === "unconfirmed") {
          found = [];
          resolution = resolveProviderWebsite(providerName, []);
        }
      }
      if (!modelDecides && resolution.status === "unconfirmed") {
        const safeName = providerName.replace(/"/g, "");
        const [official, company] = await Promise.all([
          searchProvider.search(`"${safeName}" official website`, 8),
          searchProvider.search(`${safeName} company`, 6),
        ]);
        found = [
          ...(official.ok ? official.results : []),
          ...(company.ok ? company.results : []),
        ];
        resolution = resolveProviderWebsite(providerName, found);
      }
      if (resolution.status === "ambiguous") {
        pushStage(
          "identifying_provider",
          "1. Identifying the provider",
          "completed",
          resolution.detail
        );
        return {
          status: "ambiguous_clarification_needed",
          clarifyingQuestion: resolution.clarifyingQuestion,
          ambiguityCandidates: resolution.candidates,
          stages,
          runtimeConfigStatus,
        };
      }
      if (resolution.status === "confirmed" && resolution.canonicalDomain) {
        canonicalDomain = resolution.canonicalDomain;
        const chosen = organizationHost(new URL(canonicalDomain).hostname);
        for (const result of found) {
          try {
            if (organizationHost(new URL(result.url).hostname) === chosen) {
              identityResults.push({
                ...result,
                retrievalStatus: result.retrievalStatus ?? "search_indexed_verified",
              });
            }
          } catch {
            // Skip a result whose address cannot be read.
          }
        }
      }
      websiteDetail = resolution.detail;
    } catch {
      websiteDetail = `The startup check for "${providerName}" did not finish, so research did not start and no guide was saved.`;
    }

    if (!canonicalDomain) {
      pushStage(
        "identifying_provider",
        "1. Identifying the provider",
        "failed",
        websiteDetail
      );
      return {
        status: "research_failed",
        stages,
        runtimeConfigStatus,
        errorMessage: websiteDetail,
      };
    }
  }

  pushStage(
    "identifying_provider",
    "1. Identifying the provider",
    "completed",
    websiteDetail
  );

  if (deps.reserveLiveResearch) {
    const slot = await deps.reserveLiveResearch();
    if (!slot.allowed) {
      const message = slot.message ?? "Today's live research limit has been reached.";
      pushStage(
        "retrieving_official_docs",
        "2. Retrieving official documentation",
        "skipped",
        message
      );
      return {
        status: "daily_limit_reached",
        stages,
        runtimeConfigStatus,
        errorMessage: message,
      };
    }
  }

  const queryPlan = buildResearchQueryPlan(
    providerName,
    canonicalDomain || undefined,
    request.integrationGoal
  );
  const totalPlannedQueries =
    queryPlan.officialQueries.length +
    queryPlan.composioQueries.length +
    queryPlan.painPointQueries.length;
  const maxQueries = request.maxSearchQueries ?? totalPlannedQueries;
  let searchesExecuted = 0;
  let sourcesFailedCount = 0;
  const normalizedQueries: string[] = [];
  const rawDiscovered: RawDiscoveredSource[] = [...identityResults];
  const deepResearch = Boolean(modelProvider.supportsLiveResearch?.());
  let researchPlan: ResearchPlan | null = null;

  // If the user supplied a validated URL directly, extract it first
  if (identification.suppliedUrl) {
    const directExtract = await pageExtractor.extractPage(
      identification.suppliedUrl
    );
    if (directExtract.retrievalStatus === "blocked_ssrf") {
      pushStage(
        "retrieving_official_docs",
        "2. Retrieving official documentation",
        "failed",
        directExtract.errorReason ?? "Redirect target blocked by SSRF guard."
      );
      return {
        status: "unsafe_url_rejected",
        stages,
        runtimeConfigStatus,
        errorMessage:
          directExtract.errorReason ?? "Redirect target blocked by SSRF guard.",
      };
    }

    if (directExtract.retrievalStatus === "retrieved_200") {
      rawDiscovered.push({
        title: `${providerName} — Supplied Documentation Page`,
        url: directExtract.finalUrl,
        snippet: directExtract.extractedText.slice(0, 320),
        extractedContent: directExtract.extractedText,
        retrievalStatus: "retrieved_200",
      });
    } else {
      sourcesFailedCount++;
      rawDiscovered.push({
        title: `${providerName} — Unreachable Supplied URL`,
        url: identification.suppliedUrl,
        snippet: directExtract.errorReason ?? "Could not retrieve URL.",
        extractedContent: "",
        retrievalStatus: directExtract.retrievalStatus,
      });
    }
  }

  // Stage 2: Retrieving official documentation
  pushStage(
    "retrieving_official_docs",
    "2. Retrieving official documentation",
    "in_progress",
    `Executing ${queryPlan.officialQueries.length} official documentation queries for ${providerName}.`
  );

  let searchErrorCount = 0;
  for (const q of [
    ...queryPlan.officialQueries,
    ...queryPlan.composioQueries,
  ]) {
    if (searchesExecuted >= maxQueries) break;
    searchesExecuted++;
    normalizedQueries.push(q);
    const batch = await searchProvider.search(q, 5);
    if (!batch.ok) {
      searchErrorCount++;
      sourcesFailedCount++;
    } else {
      rawDiscovered.push(...batch.results);
    }
  }

  // Find the official developer docs with a real web-search tool (or, without one, model
  // suggestions), then keep only pages that load through the SSRF-safe extractor and mention the provider.
  let verifiedSuggestedDocs = 0;
  const pagesWithLinks: { url: string; links?: { url: string; text: string }[] }[] = [];
  if (modelProvider.isConfigured()) {
    let suggestions: { url: string; label: string }[] = [];
    if (deepResearch && modelProvider.searchWeb) {
      const officialTopics = [
        `registering an app and authenticating third-party apps (OAuth, access tokens) with the ${providerName} API${
          request.integrationGoal ? ` to ${request.integrationGoal}` : ""
        }`,
        `${providerName} API permissions/scopes, app review or business verification, token expiry and rate limits`,
      ];
      searchesExecuted += officialTopics.length;
      normalizedQueries.push(...officialTopics.map((t) => `[web search: official docs] ${t}`));
      const found = await Promise.all(
        officialTopics.map((t) => modelProvider.searchWeb!("official", providerName, t))
      );
      suggestions = found.flat().map((f) => ({ url: f.url, label: f.title }));
    } else if (modelProvider.suggestOfficialDocUrls) {
      suggestions = await modelProvider.suggestOfficialDocUrls(
        providerName,
        request.integrationGoal ?? ""
      );
    }
    const knownUrls = new Set(rawDiscovered.map((r) => r.url));
    const uniqueSuggestions = suggestions.filter(
      (s, i) => !knownUrls.has(s.url) && suggestions.findIndex((o) => o.url === s.url) === i
    );
    const checks = await Promise.all(
      uniqueSuggestions
        .slice(0, 8)
        .map(async (s) => ({ s, page: await pageExtractor.extractPage(s.url) }))
    );
    for (const { s, page } of checks) {
      if (
        page.retrievalStatus === "retrieved_200" &&
        mentionsProvider(page.extractedText, providerName, slug)
      ) {
        verifiedSuggestedDocs++;
        const finalUrl = page.finalUrl || s.url;
        const redirected =
          new URL(finalUrl).pathname.replace(/\/$/, "") !==
          new URL(s.url).pathname.replace(/\/$/, "");
        pagesWithLinks.push({ url: finalUrl, links: page.links });
        rawDiscovered.unshift({
          // A redirect means the suggested page moved, so its label no longer describes the content.
          title:
            page.pageTitle ??
            (redirected
              ? `${providerName} official docs: ${
                  new URL(finalUrl).pathname
                    .split("/")
                    .filter(Boolean)
                    .pop()
                    ?.replace(/\.\w+$/, "")
                    .replace(/[-_]+/g, " ") ?? "overview"
                }`
              : s.label),
          url: finalUrl,
          snippet: page.extractedText.slice(0, 320),
          extractedContent: page.extractedText,
          retrievalStatus: "retrieved_200",
        });
      }
    }
  }

  const officialRelevant = filterRelevantSources(
    rawDiscovered,
    providerName,
    slug,
    canonicalDomain
  );
  rawDiscovered.length = 0;
  rawDiscovered.push(...officialRelevant);

  const topPages = await extractTopPages(
    rawDiscovered,
    pageExtractor,
    canonicalDomain,
    6
  );
  sourcesFailedCount += topPages.failed;
  pagesWithLinks.push(...topPages.pages);

  // Follow links inside the official docs to the pages they point to (permissions, review, tokens…).
  let followedLinks = 0;
  if (pagesWithLinks.length > 0) {
    const known = new Set(rawDiscovered.map((r) => r.url.replace(/\/$/, "")));
    const linkTargets = selectFollowUpLinks(pagesWithLinks, known, 6);
    const linked = await Promise.all(
      linkTargets.map(async (url) => ({ url, page: await pageExtractor.extractPage(url) }))
    );
    for (const { url, page } of linked) {
      if (page.retrievalStatus === "retrieved_200" && page.extractedText.length > 500) {
        followedLinks++;
        rawDiscovered.push({
          title: page.pageTitle ?? `${providerName} docs: ${new URL(url).pathname}`,
          url: page.finalUrl || url,
          snippet: page.extractedText.slice(0, 320),
          extractedContent: page.extractedText,
          retrievalStatus: "retrieved_200",
        });
      } else if (page.retrievalStatus !== "retrieved_200") {
        sourcesFailedCount++;
      }
    }
  }

  pushStage(
    "retrieving_official_docs",
    "2. Retrieving official documentation",
    "completed",
    `Executed ${searchesExecuted} official/Composio searches${
      verifiedSuggestedDocs > 0
        ? `, opened ${verifiedSuggestedDocs} official docs page(s) found by web search`
        : ""
    }${followedLinks > 0 ? ` and followed ${followedLinks} link(s) inside the docs` : ""} (${rawDiscovered.length} relevant sources so far).`
  );

  // Stage 3: Investigating real-world developer problems
  const budgetReachedBeforePainPoints =
    request.maxSearchQueries !== undefined && searchesExecuted >= maxQueries;
  if (!budgetReachedBeforePainPoints) {
    pushStage(
      "investigating_developer_problems",
      "3. Investigating real-world developer problems",
      "in_progress",
      `Searching GitHub issues, Stack Overflow, and developer communities for ${providerName} OAuth failure modes.`
    );

    for (const q of queryPlan.painPointQueries) {
      if (searchesExecuted >= maxQueries) break;
      searchesExecuted++;
      normalizedQueries.push(q);
      const batch = await searchProvider.search(q, 5);
      if (!batch.ok) {
        searchErrorCount++;
        sourcesFailedCount++;
      } else {
        rawDiscovered.push(
          ...filterRelevantSources(
            batch.results,
            providerName,
            slug,
            canonicalDomain
          )
        );
      }
    }

    // Deep pass: plan follow-up searches from what the official docs actually say, then run them
    // across Stack Overflow, GitHub issues, Reddit, developer forums and the wider web.
    if (deepResearch && modelProvider.planResearch) {
      const preliminary = catalog(rawDiscovered, slug, canonicalDomain);
      researchPlan = await modelProvider.planResearch({
        providerName,
        canonicalDomain,
        integrationGoal: request.integrationGoal || `Integrate ${providerName} with our product`,
        intendedAudience: request.intendedAudience ?? "multi_workspace_external",
        sources: preliminary,
      });
      const followUps = (researchPlan?.followUps ?? []).slice(
        0,
        request.maxSearchQueries !== undefined ? Math.max(0, maxQueries - searchesExecuted) : 10
      );
      if (followUps.length > 0) {
        pushStage(
          "investigating_developer_problems",
          "3. Investigating real-world developer problems",
          "in_progress",
          `Running ${followUps.length} follow-up searches planned from the official docs (${Array.from(
            new Set(followUps.map((f) => f.channel))
          ).join(", ")}).`
        );
      }
      const batches = await Promise.all(
        followUps.map(async (f) => {
          searchesExecuted++;
          normalizedQueries.push(`[${f.channel}] ${f.query}`);
          if ((f.channel === "stackoverflow" || f.channel === "github") && searchProvider.searchCommunity) {
            const batch = await searchProvider.searchCommunity(f.channel, f.query, 4);
            return batch.ok ? batch.results : [];
          }
          if (!modelProvider.searchWeb) return [];
          const found = await modelProvider.searchWeb(f.channel, providerName, f.query);
          return found.map<RawDiscoveredSource>((r) => ({
            title: r.title,
            url: r.url,
            snippet: r.summary,
            extractedContent: r.summary,
            retrievalStatus: "search_indexed_verified",
            note: "Found by the web-search tool; the description is the search tool's summary of the page.",
          }));
        })
      );
      const found = filterRelevantSources(batches.flat(), providerName, slug, canonicalDomain);
      // Open forum threads and articles directly so their full text (not just a summary) is used.
      const toOpen = found
        .filter((r) => r.note && !/reddit\.com/i.test(r.url))
        .slice(0, 6);
      await Promise.all(
        toOpen.map(async (r) => {
          const page = await pageExtractor.extractPage(r.url);
          if (page.retrievalStatus === "retrieved_200" && page.extractedText.length > 400) {
            r.extractedContent = page.extractedText;
            r.retrievalStatus = "retrieved_200";
            r.note = undefined;
            if (page.pageTitle) r.title = page.pageTitle;
          }
        })
      );
      for (const r of found) {
        if (r.note && /reddit\.com/i.test(r.url)) {
          r.note =
            "Reddit blocks automated page reads, so this thread was read through the web-search tool's summary only.";
        }
      }
      rawDiscovered.push(...found);
    }

    const communityCount = rawDiscovered.filter((r) =>
      /stackoverflow\.com|github\.com\/[^/]+\/[^/]+\/(issues|pull|discussions)|reddit\.com|community\.|forum|discuss/i.test(r.url)
    ).length;
    pushStage(
      "investigating_developer_problems",
      "3. Investigating real-world developer problems",
      "completed",
      `Completed developer problem research: ${searchesExecuted} total searches, ${communityCount} developer report(s) collected.`
    );
  } else {
    pushStage(
      "investigating_developer_problems",
      "3. Investigating real-world developer problems",
      "skipped",
      `Stopped before community search pass due to query budget limit (${maxQueries}).`
    );
  }

  // If every single search failed and we have 0 usable sources, report runtime search failure honestly
  const usableRawCount = rawDiscovered.filter(
    (r) =>
      r.retrievalStatus === "retrieved_200" ||
      r.retrievalStatus === "search_indexed_verified"
  ).length;

  if (usableRawCount === 0 && searchErrorCount > 0) {
    pushStage(
      "cross_checking_findings",
      "4. Cross-checking findings",
      "failed",
      "All search and source retrieval requests failed or timed out."
    );
    return {
      status: "research_failed",
      stages,
      runtimeConfigStatus,
      errorMessage:
        "Research failed because search and page retrieval requests timed out or returned errors. No guide was fabricated.",
    };
  }

  // Stage 4: Cross-checking findings & deduplicating sources
  pushStage(
    "cross_checking_findings",
    "4. Cross-checking findings",
    "in_progress",
    "Deduplicating URLs, sanitizing untrusted web content, and synthesizing pain-point evidence."
  );

  if (!canonicalDomain) {
    const later = resolveProviderWebsite(providerName, rawDiscovered, {
      askWhenClose: false,
    });
    if (later.status === "ambiguous") {
      pushStage(
        "identifying_provider",
        "1. Identifying the provider",
        "completed",
        later.detail
      );
      return {
        status: "ambiguous_clarification_needed",
        clarifyingQuestion: later.clarifyingQuestion,
        ambiguityCandidates: later.candidates,
        stages,
        runtimeConfigStatus,
      };
    }
    if (later.status === "confirmed" && later.canonicalDomain) {
      canonicalDomain = later.canonicalDomain;
    }
  }

  if (!canonicalDomain) {
    pushStage(
      "cross_checking_findings",
      "4. Cross-checking findings",
      "failed",
      `No public website for "${providerName}" was found, so no guide was saved.`
    );
    return {
      status: "research_failed",
      stages,
      runtimeConfigStatus,
      errorMessage: `No public website for ${providerName} was found, so no guide was saved.`,
    };
  }

  const canonicalSources = catalog(rawDiscovered, slug, canonicalDomain);

  const painPointMatrix = synthesizePainPointsFromSources(
    slug,
    canonicalSources
  );

  const researchContext = {
    providerName,
    canonicalDomain,
    integrationGoal: request.integrationGoal || `Integrate ${providerName} with our product`,
    intendedAudience: request.intendedAudience ?? "multi_workspace_external",
    sources: canonicalSources,
  };
  let analysis: EvidenceAnalysis | null = null;
  if (deepResearch && modelProvider.analyzeEvidence) {
    pushStage(
      "cross_checking_findings",
      "4. Cross-checking findings",
      "in_progress",
      `Reading all ${canonicalSources.length} sources side by side: merging duplicate reports, checking dates and fixes, and building the problem list.`
    );
    analysis = await modelProvider.analyzeEvidence(researchContext);
  }

  pushStage(
    "cross_checking_findings",
    "4. Cross-checking findings",
    "completed",
    analysis
      ? `Cross-checked ${canonicalSources.length} distinct source(s): ${analysis.sourceNotes.filter((n) => !n.relevant).length} set aside as off-topic, ${analysis.painPoints.length} evidence-backed problem(s) kept, ${analysis.rejectedFindings.length} unverified finding(s) set aside.`
      : `Cataloged ${canonicalSources.length} distinct source(s) and ${painPointMatrix.painPoints.length} corroborated/isolated pain point(s).`
  );

  // Stage 5: Assessing authentication path and approval dependencies
  pushStage(
    "assessing_auth_and_approvals",
    "5. Assessing authentication path and approval dependencies",
    "in_progress",
    `Checking Composio managed-auth availability and provider OAuth support for ${providerName}.`
  );

  const composioResult = await composioChecker.checkManagedAuth(
    providerName,
    canonicalSources
  );

  let decision: AuthDecision | null = null;
  if (deepResearch && modelProvider.decideAuthPath) {
    decision = await modelProvider.decideAuthPath({
      ...researchContext,
      composioResult,
      analysis,
    });
  }

  pushStage(
    "assessing_auth_and_approvals",
    "5. Assessing authentication path and approval dependencies",
    "completed",
    `Composio managed-auth status: ${composioResult.status}.${
      decision
        ? ` Recommended path: ${decision.recommendedPath.replace(/_/g, " ")}${
            decision.approvalGates.length > 0
              ? `; approval gates found: ${decision.approvalGates.length}`
              : ""
          }.`
        : ""
    }`
  );

  // Stage 6: Generating and validating the guide
  pushStage(
    "generating_and_validating_guide",
    "6. Generating and validating the guide",
    "in_progress",
    deepResearch
      ? "Writing the guide in two parts from the cross-checked evidence, then checking every citation, link and honesty rule."
      : "Synthesizing guide and validating against shared Zod GuideSchema and evidence reference integrity."
  );

  const budgetReached = budgetReachedBeforePainPoints;
  const genOutcome = await modelProvider.generateAndValidateGuide({
    providerName,
    slug,
    canonicalDomain,
    integrationGoal:
      request.integrationGoal || `Integrate ${providerName} with our product`,
    intendedAudience: request.intendedAudience ?? "multi_workspace_external",
    sources: canonicalSources,
    composioResult,
    painPointMatrix,
    normalizedQueries,
    searchesExecuted,
    sourcesFailedCount,
    budgetReached,
    deep: deepResearch ? { analysis, decision, plan: researchPlan } : undefined,
  });

  if (!genOutcome.ok || !genOutcome.guide) {
    pushStage(
      "generating_and_validating_guide",
      "6. Generating and validating the guide",
      "failed",
      genOutcome.errorReason ?? "Guide validation failed."
    );
    return {
      status: "research_failed",
      stages,
      runtimeConfigStatus,
      errorMessage:
        genOutcome.errorReason ??
        "Generated guide failed schema or evidence validation.",
    };
  }

  pushStage(
    "generating_and_validating_guide",
    "6. Generating and validating the guide",
    "completed",
    `Validated guide "${genOutcome.guide.applicationName}" (status: ${genOutcome.guide.outcome.guideStatus}, repair attempts: ${genOutcome.repairAttempts}).`
  );

  // Stage 7: Saving the result
  pushStage(
    "saving_result",
    "7. Saving the result",
    "in_progress",
    `Persisting guide and evidence ledger to store at /guides/${genOutcome.guide.slug}.`
  );

  try {
    const saved = await guideStore.saveGeneratedGuide(genOutcome.guide);
    pushStage(
      "saving_result",
      "7. Saving the result",
      "completed",
      `Saved shareable guide at ${saved.shareUrl}.`
    );

    const isPartial =
      saved.saved.outcome.guideStatus === "partial_evidence" ||
      saved.saved.outcome.guideStatus === "inconclusive" ||
      saved.saved.outcome.guideStatus === "no_public_oauth_found";

    return {
      status: isPartial ? "partial_guide_saved" : "generated_guide_saved",
      guide: saved.saved,
      shareUrl: saved.shareUrl,
      stages,
      runtimeConfigStatus,
    };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to persist generated guide";
    pushStage("saving_result", "7. Saving the result", "failed", msg);
    return {
      status: "research_failed",
      guide: genOutcome.guide,
      stages,
      runtimeConfigStatus,
      errorMessage: `Research succeeded, but saving to persistence failed: ${msg}`,
    };
  }
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function providerNameVariants(providerName: string, slug: string): string[] {
  const lower = providerName.toLowerCase().trim();
  const variants = new Set<string>([lower]);
  const withoutParens = lower.replace(/\(.*?\)/g, "").trim();
  if (withoutParens.length >= 3) variants.add(withoutParens);
  for (const m of Array.from(lower.matchAll(/\(([^)]+)\)/g))) {
    if (m[1].trim().length >= 3) variants.add(m[1].trim());
  }
  const slugWords = slug.replace(/-/g, " ").trim();
  if (slugWords.length >= 3) variants.add(slugWords);
  return Array.from(variants);
}

export function mentionsProvider(
  text: string,
  providerName: string,
  slug: string
): boolean {
  const lower = text.toLowerCase();
  const compactText = lower.replace(/[^a-z0-9]/g, "");
  return providerNameVariants(providerName, slug).some((v) => {
    if (lower.includes(v)) return true;
    const compact = v.replace(/[^a-z0-9]/g, "");
    return compact.length >= 4 && compactText.includes(compact);
  });
}

/**
 * Drops search results that are not about the target provider (e.g. generic
 * OAuth explainers), which otherwise pollute the evidence ledger.
 */
export function filterRelevantSources(
  items: RawDiscoveredSource[],
  providerName: string,
  slug: string,
  canonicalDomain: string
): RawDiscoveredSource[] {
  const providerHost = hostnameOf(canonicalDomain);
  return items.filter((item) => {
    const host = hostnameOf(item.url);
    if (providerHost && (host === providerHost || host.endsWith(`.${providerHost}`))) {
      return true;
    }
    if (host.endsWith("composio.dev")) return true;
    return mentionsProvider(
      `${item.title} ${item.url} ${item.snippet} ${item.extractedContent ?? ""}`,
      providerName,
      slug
    );
  });
}

/**
 * Reads the full text of the most useful documentation pages (provider and docs
 * domains first). Community results already carry their question/issue body.
 * Returns the number of pages that failed to load.
 */
function catalog(
  raw: RawDiscoveredSource[],
  slug: string,
  canonicalDomain: string
) {
  return deduplicateAndCatalogSources(raw, slug, canonicalDomain, (text) => {
    const s = sanitizeUntrustedContent(text);
    return {
      sanitizedText: s.sanitizedText,
      injectionDetected: s.injectionDetected,
    };
  });
}

async function extractTopPages(
  items: RawDiscoveredSource[],
  pageExtractor: PageExtractor,
  canonicalDomain: string,
  maxPages: number
): Promise<{ failed: number; pages: { url: string; links?: { url: string; text: string }[] }[] }> {
  const providerHost = hostnameOf(canonicalDomain);
  const score = (item: RawDiscoveredSource): number => {
    const host = hostnameOf(item.url);
    if (providerHost && (host === providerHost || host.endsWith(`.${providerHost}`))) return 4;
    if (/^(docs|developers?|dev|api)\./.test(host)) return 3;
    if (host.endsWith("composio.dev")) return 1;
    if (host === "github.com" || host.endsWith("stackoverflow.com")) return -1;
    return 0;
  };

  const candidates = items
    .filter(
      (item) =>
        (!item.extractedContent || item.extractedContent.length < 300) &&
        item.retrievalStatus !== "http_error" &&
        score(item) >= 0
    )
    .sort((a, b) => score(b) - score(a))
    .slice(0, maxPages);

  const results = await Promise.all(
    candidates.map(async (item) => ({
      item,
      page: await pageExtractor.extractPage(item.url),
    }))
  );

  let failed = 0;
  const pages: { url: string; links?: { url: string; text: string }[] }[] = [];
  for (const { item, page } of results) {
    if (page.retrievalStatus === "retrieved_200") {
      item.extractedContent = page.extractedText;
      item.retrievalStatus = "retrieved_200";
      pages.push({ url: page.finalUrl || item.url, links: page.links });
    } else if (!item.snippet) {
      item.retrievalStatus = page.retrievalStatus;
      failed++;
    }
  }
  return { failed, pages };
}
