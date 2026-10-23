import { Guide } from "@/lib/schema/guideSchema";
import { CURATED_GUIDES } from "@/data/curated";
import { validateExternalUrl } from "./urlValidator";

export interface ProviderIdentificationInput {
  query: string;
  integrationGoal?: string;
  intendedAudience?:
    | "single_workspace_internal"
    | "multi_workspace_external"
    | "personal_or_prototype"
    | "unknown";
}

export interface AmbiguityCandidate {
  id: string;
  name: string;
  domain: string;
  description: string;
}

export interface ProviderIdentificationResult {
  status:
    | "matched_existing_guide"
    | "matched_existing_guide_different_goal"
    | "identified_new_provider"
    | "ambiguous_provider"
    | "invalid_input"
    | "unsafe_url";
  normalizedQuery: string;
  providerName?: string;
  canonicalDomain?: string;
  suppliedUrl?: string;
  matchedGuide?: Guide;
  goalDiffersMaterially?: boolean;
  goalDifferenceReason?: string;
  ambiguityCandidates?: AmbiguityCandidate[];
  clarifyingQuestion?: string;
  errorMessage?: string;
}

const KNOWN_AMBIGUOUS_APPS: Record<
  string,
  { question: string; candidates: AmbiguityCandidate[] }
> = {
  mercury: {
    question:
      '"Mercury" refers to multiple distinct products with different APIs and authentication models. Which Mercury product are you integrating?',
    candidates: [
      {
        id: "mercury-banking",
        name: "Mercury (B2B Banking & Financial API)",
        domain: "mercury.com",
        description:
          "Fintech banking platform for startups (mercury.com/developers) using OAuth2 / API tokens.",
      },
      {
        id: "mercury-coder",
        name: "Inception Labs Mercury (Diffusion LLM API)",
        domain: "inceptionlabs.ai",
        description:
          "Mercury Coder diffusion language model API using Bearer API keys.",
      },
      {
        id: "mercury-parser",
        name: "Postlight Mercury Parser",
        domain: "github.com/postlight/parser",
        description:
          "Open-source web article extraction library (no OAuth required).",
      },
    ],
  },
  atlas: {
    question:
      '"Atlas" is used by several developer products. Please specify the domain or full product name:',
    candidates: [
      {
        id: "mongodb-atlas",
        name: "MongoDB Atlas",
        domain: "mongodb.com",
        description: "Managed cloud database platform by MongoDB.",
      },
      {
        id: "stripe-atlas",
        name: "Stripe Atlas",
        domain: "stripe.com/atlas",
        description: "Company incorporation platform by Stripe.",
      },
      {
        id: "atlassian-atlas",
        name: "Atlassian Atlas",
        domain: "atlassian.com/software/atlas",
        description: "Teamwork directory and goal-tracking tool by Atlassian.",
      },
    ],
  },
  front: {
    question:
      'Did you mean Front (front.com customer operations platform) or another "Front" product?',
    candidates: [
      {
        id: "front-app",
        name: "Front (Customer Operations & Shared Inbox)",
        domain: "front.com",
        description: "Shared inbox and customer support platform at dev.frontapp.com.",
      },
      {
        id: "front-finance",
        name: "Front Finance / Mesh",
        domain: "meshconnect.com",
        description: "Financial account aggregation API.",
      },
    ],
  },
};

const KNOWN_UNFAMILIAR_PROVIDERS: Record<
  string,
  { name: string; domain: string; docsHint?: string }
> = {
  linear: {
    name: "Linear",
    domain: "https://linear.app",
    docsHint: "https://linear.app/developers/oauth-2-0-authentication",
  },
  "linear.app": {
    name: "Linear",
    domain: "https://linear.app",
    docsHint: "https://linear.app/developers/oauth-2-0-authentication",
  },
  bgmi: {
    name: "Battlegrounds Mobile India (BGMI)",
    domain: "https://www.battlegroundsmobileindia.com",
  },
  "battlegrounds mobile india": {
    name: "Battlegrounds Mobile India (BGMI)",
    domain: "https://www.battlegroundsmobileindia.com",
  },
  hubspot: {
    name: "HubSpot",
    domain: "https://www.hubspot.com",
    docsHint: "https://developers.hubspot.com/docs/api/working-with-oauth",
  },
  airtable: {
    name: "Airtable",
    domain: "https://airtable.com",
    docsHint: "https://airtable.com/developers/web/api/oauth-reference",
  },
};

export function identifyProvider(
  input: ProviderIdentificationInput,
  allGuides: Guide[] = CURATED_GUIDES
): ProviderIdentificationResult {
  const rawQuery = (input.query ?? "").trim();

  if (!rawQuery) {
    return {
      status: "invalid_input",
      normalizedQuery: "",
      errorMessage:
        "Please enter an application name (e.g., GitHub, Linear) or developer documentation URL.",
    };
  }

  if (rawQuery.length > 300) {
    return {
      status: "invalid_input",
      normalizedQuery: rawQuery.slice(0, 300),
      errorMessage:
        "Search query exceeds the maximum length of 300 characters.",
    };
  }

  // 1. Check if input looks like a URL or scheme-prefixed string
  const looksLikeUrl =
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawQuery) ||
    /^https?:\/\//i.test(rawQuery) ||
    rawQuery.startsWith("//") ||
    /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|0\.0\.0\.0|\[::1\])/i.test(
      rawQuery
    );

  let extractedHostname: string | undefined;
  let validatedUrl: string | undefined;

  if (looksLikeUrl) {
    const urlToValidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(rawQuery)
      ? rawQuery
      : `http://${rawQuery}`;
    const urlCheck = validateExternalUrl(urlToValidate);
    if (!urlCheck.valid) {
      return {
        status: "unsafe_url",
        normalizedQuery: rawQuery.toLowerCase(),
        errorMessage: urlCheck.reason ?? "Rejected unsafe or private URL.",
      };
    }
    validatedUrl = urlCheck.normalizedUrl;
    extractedHostname = urlCheck.hostname?.replace(/^www\./, "");
  } else if (
    /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(rawQuery) &&
    !rawQuery.includes(" ")
  ) {
    const urlCheck = validateExternalUrl(`https://${rawQuery}`);
    if (!urlCheck.valid) {
      return {
        status: "unsafe_url",
        normalizedQuery: rawQuery.toLowerCase(),
        errorMessage: urlCheck.reason ?? "Rejected unsafe or private host.",
      };
    }
    validatedUrl = urlCheck.normalizedUrl;
    extractedHostname = urlCheck.hostname?.replace(/^www\./, "");
  }

  const normalized = rawQuery.toLowerCase().trim();
  const hostCore = extractedHostname
    ? extractedHostname.split(".")[0]
    : undefined;

  // 2. Check existing guides (curated + saved generated) by slug, name, alias, or domain
  for (const guide of allGuides) {
    const guideDomain = (() => {
      try {
        return new URL(guide.canonicalWebsite).hostname
          .toLowerCase()
          .replace(/^www\./, "");
      } catch {
        return "";
      }
    })();

    const isExactMatch =
      guide.slug.toLowerCase() === normalized ||
      guide.applicationName.toLowerCase() === normalized ||
      guide.aliases.some((a) => a.toLowerCase() === normalized) ||
      (extractedHostname &&
        (extractedHostname === guideDomain ||
          extractedHostname.endsWith(`.${guideDomain}`))) ||
      (hostCore &&
        (guide.slug.toLowerCase() === hostCore ||
          guide.aliases.some((a) => a.toLowerCase() === hostCore)));

    if (isExactMatch) {
      const goalCheck = checkIfGoalDiffersMaterially(
        guide,
        input.integrationGoal,
        input.intendedAudience
      );
      return {
        status: goalCheck.differs
          ? "matched_existing_guide_different_goal"
          : "matched_existing_guide",
        normalizedQuery: normalized,
        providerName: guide.applicationName,
        canonicalDomain: guide.canonicalWebsite,
        suppliedUrl: validatedUrl,
        matchedGuide: guide,
        goalDiffersMaterially: goalCheck.differs,
        goalDifferenceReason: goalCheck.reason,
      };
    }
  }

  // 3. Check for ambiguous application names (when no domain was supplied)
  if (!extractedHostname && KNOWN_AMBIGUOUS_APPS[normalized]) {
    const amb = KNOWN_AMBIGUOUS_APPS[normalized];
    return {
      status: "ambiguous_provider",
      normalizedQuery: normalized,
      clarifyingQuestion: amb.question,
      ambiguityCandidates: amb.candidates,
    };
  }

  // 4. Identify known unfamiliar providers or derive from query/domain
  const knownLookup =
    KNOWN_UNFAMILIAR_PROVIDERS[normalized] ||
    (extractedHostname
      ? KNOWN_UNFAMILIAR_PROVIDERS[extractedHostname]
      : undefined) ||
    (hostCore ? KNOWN_UNFAMILIAR_PROVIDERS[hostCore] : undefined);

  if (knownLookup) {
    return {
      status: "identified_new_provider",
      normalizedQuery: normalized,
      providerName: knownLookup.name,
      canonicalDomain: knownLookup.domain,
      suppliedUrl: validatedUrl,
    };
  }

  const displayTitle = extractedHostname
    ? extractedHostname
        .split(".")[0]
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    : rawQuery.replace(/\b\w/g, (c) => c.toUpperCase());

  // A typed name is not a website. The address is kept only when the user entered one.
  return {
    status: "identified_new_provider",
    normalizedQuery: normalized,
    providerName: displayTitle,
    canonicalDomain: validatedUrl,
    suppliedUrl: validatedUrl,
  };
}

function checkIfGoalDiffersMaterially(
  guide: Guide,
  suppliedGoal?: string,
  intendedAudience?: string
): { differs: boolean; reason?: string } {
  if (!suppliedGoal && !intendedAudience) {
    return { differs: false };
  }
  const goalLower = (suppliedGoal ?? "").toLowerCase();

  if (guide.slug === "gmail") {
    if (
      goalLower.includes("send only") ||
      goalLower.includes("send-only") ||
      (goalLower.includes("send") && !goalLower.includes("read") && !goalLower.includes("search"))
    ) {
      return {
        differs: true,
        reason:
          "Your goal is Send-Only (`gmail.send`), which is a Sensitive scope (3–5 days review, no CASA audit), whereas the default Gmail scenario includes inbox reading (`gmail.readonly`, Restricted scope requiring CASA).",
      };
    }
    if (
      intendedAudience === "single_workspace_internal" ||
      goalLower.includes("internal workspace")
    ) {
      return {
        differs: true,
        reason:
          "Your goal targets a single internal Google Workspace domain, where setting User Type to `Internal` avoids Google verification and the 7-day Testing token expiry entirely.",
      };
    }
  }

  if (guide.slug === "notion") {
    if (
      intendedAudience === "single_workspace_internal" ||
      goalLower.includes("internal") ||
      goalLower.includes("single workspace") ||
      goalLower.includes("my workspace")
    ) {
      return {
        differs: true,
        reason:
          "Your goal targets a single Notion workspace, where a static Notion Internal Connection (`ntn_...` API token) is recommended instead of building a Public OAuth 2.0 flow.",
      };
    }
  }

  if (guide.slug === "github") {
    if (
      goalLower.includes("enterprise license") ||
      goalLower.includes("public repo only") ||
      goalLower.includes("sign in only")
    ) {
      return {
        differs: true,
        reason:
          "Your goal only requires public repositories, user sign-in, or Enterprise object administration, where a classic OAuth App can be used instead of a GitHub App installation flow.",
      };
    }
  }

  if (guide.slug === "slack") {
    if (
      goalLower.includes("search") ||
      goalLower.includes("as user") ||
      goalLower.includes("user token")
    ) {
      return {
        differs: true,
        reason:
          "Your goal requires cross-workspace search (`search:read`) or user-attributed actions, which require a Slack User Token (`user_scope` / `xoxp-` / Composio `SLACK` toolkit) rather than a Bot Token (`scope` / `xoxb-` / `SLACKBOT`).",
      };
    }
  }

  return { differs: false };
}

export interface LibrarySearchOutcome {
  query: string;
  normalizedQuery: string;
  matches: Guide[];
  identification: ProviderIdentificationResult;
}

export function searchGuidesLibrary(
  query: string,
  allGuides: Guide[] = CURATED_GUIDES,
  integrationGoal?: string,
  intendedAudience?:
    | "single_workspace_internal"
    | "multi_workspace_external"
    | "personal_or_prototype"
    | "unknown"
): LibrarySearchOutcome {
  const trimmed = (query ?? "").trim();
  const identification = identifyProvider(
    { query: trimmed, integrationGoal, intendedAudience },
    allGuides
  );

  if (!trimmed) {
    return {
      query: "",
      normalizedQuery: "",
      matches: allGuides,
      identification,
    };
  }

  if (identification.status === "unsafe_url") {
    return {
      query: trimmed,
      normalizedQuery: identification.normalizedQuery,
      matches: [],
      identification,
    };
  }

  if (identification.matchedGuide) {
    return {
      query: trimmed,
      normalizedQuery: identification.normalizedQuery,
      matches: [identification.matchedGuide],
      identification,
    };
  }

  const tokens = trimmed
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 1);

  const scored = allGuides
    .map((guide) => {
      let score = 0;
      const slug = guide.slug.toLowerCase();
      const name = guide.applicationName.toLowerCase();
      const aliases = guide.aliases.map((a) => a.toLowerCase());
      const summary = guide.shortSummary.toLowerCase();
      const category = guide.category.toLowerCase();

      for (const token of tokens) {
        if (slug === token || name === token || aliases.includes(token)) {
          score += 50;
        } else if (
          slug.includes(token) ||
          name.includes(token) ||
          aliases.some((a) => a.includes(token))
        ) {
          score += 25;
        } else if (category.includes(token) || summary.includes(token)) {
          score += 10;
        }
      }
      return { guide, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.guide);

  return {
    query: trimmed,
    normalizedQuery: identification.normalizedQuery,
    matches: scored,
    identification,
  };
}
