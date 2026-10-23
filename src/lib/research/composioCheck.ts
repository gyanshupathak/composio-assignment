import { ComposioManagedAuthStatus } from "@/lib/schema/guideSchema";
import { CanonicalSourceRecord } from "./canonicalSources";

/**
 * Audited snapshot of toolkits listed on https://docs.composio.dev/toolkits/managed-auth (retrieved 2026-10-23).
 * Used ONLY when corroborated by retrieved Composio docs or when checking known toolkit slugs;
 * if a live lookup fails and no retrieved source establishes managed-auth status, status remains `unknown`.
 */
const VERIFIED_MANAGED_OAUTH_SLUGS = new Set([
  "AIRCALL",
  "AIRTABLE",
  "ASANA",
  "ATTIO",
  "BITBUCKET",
  "BOX",
  "CAL",
  "CALENDLY",
  "CANVA",
  "CLICKUP",
  "CONFLUENCE",
  "DISCORD",
  "DISCORDBOT",
  "DROPBOX",
  "FIGMA",
  "GITHUB",
  "GITLAB",
  "GMAIL",
  "GOOGLECALENDAR",
  "GOOGLEDRIVE",
  "GOOGLEDOCS",
  "GOOGLESHEETS",
  "HUBSPOT",
  "INTERCOM",
  "JIRA",
  "LINEAR",
  "LINKEDIN",
  "MAILCHIMP",
  "MICROSOFT_TEAMS",
  "MIRO",
  "MONDAY",
  "NOTION",
  "ONE_DRIVE",
  "OUTLOOK",
  "PAGERDUTY",
  "QUICKBOOKS",
  "REDDIT",
  "SALESFORCE",
  "SENTRY",
  "SLACK",
  "SLACKBOT",
  "STRIPE",
  "SUPABASE",
  "TODOIST",
  "TRELLO",
  "TYPEFORM",
  "YOUTUBE",
  "ZENDESK",
  "ZOHO",
  "ZOOM",
]);

const VERIFIED_BYO_OAUTH_SLUGS = new Set([
  "BAMBOOHR",
  "BITLY",
  "BREX",
  "BUFFER",
  "CLOCKIFY",
  "DATABRICKS",
  "DATADOG",
  "DIGITAL_OCEAN",
  "DOCUSIGN",
  "GUSTO",
  "KLAVIYO",
  "LAUNCH_DARKLY",
  "LEVER",
  "LINEAR_MCP",
  "MERCURY_MCP",
  "NETSUITE",
  "NOTION_MCP",
  "PAYPAL",
  "PIPEDRIVE",
  "PLANETSCALE",
  "RAILWAY",
  "RAMP",
  "SERVICENOW",
  "SHOPIFY",
  "SNOWFLAKE",
  "SPOTIFY",
  "SURVEY_MONKEY",
  "TIKTOK",
  "TWITTER",
  "VERCEL",
  "WEBFLOW",
  "WORKDAY",
  "XERO",
]);

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export interface ComposioManagedAuthCheckResult {
  status: ComposioManagedAuthStatus;
  toolkitExamined: string;
  authMethodExamined: string;
  evidenceIds: string[];
  conditionsAndQualifications: string[];
  lookupError?: string;
}

export interface ComposioAuthChecker {
  checkManagedAuth(
    providerName: string,
    collectedSources: CanonicalSourceRecord[]
  ): Promise<ComposioManagedAuthCheckResult>;
}

export class LiveComposioAuthChecker implements ComposioAuthChecker {
  private apiKey?: string;
  private fetchImpl: typeof fetch;
  private simulateEndpointFailure: boolean;

  constructor(options?: {
    apiKey?: string;
    fetchImpl?: typeof fetch;
    simulateEndpointFailure?: boolean;
  }) {
    this.apiKey = options?.apiKey ?? process.env.COMPOSIO_API_KEY;
    this.fetchImpl = options?.fetchImpl ?? fetch;
    this.simulateEndpointFailure = options?.simulateEndpointFailure ?? false;
  }

  async checkManagedAuth(
    providerName: string,
    collectedSources: CanonicalSourceRecord[]
  ): Promise<ComposioManagedAuthCheckResult> {
    const slug = providerName
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    const composioSources = collectedSources.filter(
      (s) =>
        s.sourceType === "composio_docs" &&
        s.retrievalStatus !== "http_error" &&
        s.retrievalStatus !== "unreachable"
    );
    const composioEvidenceIds = composioSources.map((s) => s.id);

    // 1. If a live COMPOSIO_API_KEY is configured (or simulated in tests), call GET /api/v3.1/toolkits/{slug}
    if (this.simulateEndpointFailure) {
      // Check if collected sources independently establish the status
      const docMatch = this.inferFromCollectedDocs(
        slug,
        composioSources,
        composioEvidenceIds
      );
      if (docMatch) {
        return docMatch;
      }
      return {
        status: "unknown",
        toolkitExamined: slug,
        authMethodExamined: "OAUTH2",
        evidenceIds: composioEvidenceIds,
        conditionsAndQualifications: [
          "Composio API lookup failed or timed out, and no retrieved documentation established managed OAuth availability for this toolkit.",
          "Do not assume Composio managed OAuth is unavailable solely due to a lookup error; verify at https://docs.composio.dev/toolkits/managed-auth.",
        ],
        lookupError: "Composio API endpoint returned HTTP 503 / connection failure.",
      };
    }

    if (
      this.apiKey &&
      this.apiKey.trim().length > 0 &&
      this.apiKey !== "your_composio_api_key_here"
    ) {
      try {
        const res = await this.fetchImpl(
          `https://backend.composio.dev/api/v3.1/toolkits/${slug.toLowerCase()}`,
          {
            method: "GET",
            headers: {
              "x-api-key": this.apiKey,
              Accept: "application/json",
            },
          }
        );

        if (res.ok) {
          const data = (await res.json()) as {
            composio_managed_auth_schemes?: string[];
            auth_schemes?: string[];
          };
          const managedSchemes = data.composio_managed_auth_schemes ?? [];
          const hasManagedOAuth = managedSchemes.some((m) =>
            m.toUpperCase().includes("OAUTH")
          );

          return {
            status: hasManagedOAuth ? "available" : "unavailable",
            toolkitExamined: slug,
            authMethodExamined: "OAUTH2",
            evidenceIds: composioEvidenceIds,
            conditionsAndQualifications: hasManagedOAuth
              ? [
                  `Verified via Composio v3.1 toolkit endpoint: composio_managed_auth_schemes includes ${managedSchemes.join(", ")}.`,
                  "Managed OAuth is suitable for prototyping and default scopes; use a custom OAuth app for production white-label branding or custom scopes.",
                ]
              : [
                  `Verified via Composio v3.1 toolkit endpoint: composio_managed_auth_schemes does not include OAuth2 for ${slug}. Bring your own OAuth app credentials.`,
                ],
          };
        }
      } catch {
        // Fall through to doc-based verification or unknown
      }
    }

    // 2. Check retrieved Composio documentation sources
    const docResult = this.inferFromCollectedDocs(
      slug,
      composioSources,
      composioEvidenceIds
    );
    if (docResult) {
      return docResult;
    }

    // 3. If no Composio documentation was retrieved and API key wasn't available, return unknown honestly
    return {
      status: "unknown",
      toolkitExamined: slug,
      authMethodExamined: "OAUTH2",
      evidenceIds: composioEvidenceIds,
      conditionsAndQualifications: [
        `Could not verify Composio managed-auth status for ${slug} because COMPOSIO_API_KEY was not configured and no Composio toolkit page was retrieved.`,
        "Check https://docs.composio.dev/toolkits/managed-auth or call GET https://backend.composio.dev/api/v3.1/toolkits/" +
          slug.toLowerCase(),
      ],
    };
  }

  private inferFromCollectedDocs(
    slug: string,
    composioSources: CanonicalSourceRecord[],
    composioEvidenceIds: string[]
  ): ComposioManagedAuthCheckResult | null {
    // Only Composio's own docs count, and a statement only applies to this toolkit if it comes from the
    // toolkit's page or names its slug: forum posts and search summaries elsewhere on composio.dev do not.
    const docsPages = composioSources.filter((s) => hostOf(s.canonicalUrl) === "docs.composio.dev");
    if (docsPages.length === 0) {
      return null;
    }
    const compactSlug = slug.toLowerCase().replace(/_/g, "");
    const slugPattern = new RegExp(`\\b${slug}\\b`);
    const aboutToolkit = docsPages.filter((s) => {
      const path = pathOf(s.canonicalUrl).replace(/[-_]/g, "");
      return (
        path === `/toolkits/${compactSlug}` ||
        slugPattern.test(`${s.title} ${s.snippet} ${s.extractedContent}`)
      );
    });
    const catalogRetrieved = docsPages.some((s) =>
      pathOf(s.canonicalUrl).startsWith("/toolkits/managed-auth")
    );

    const combinedText = aboutToolkit
      .map(
        (s) => `${s.canonicalUrl} ${s.title} ${s.snippet} ${s.extractedContent}`
      )
      .join(" ")
      .toLowerCase();

    const explicitlyNotAvailable =
      combinedText.includes("composio-managed oauth not available");

    if (
      !explicitlyNotAvailable &&
      !(catalogRetrieved && VERIFIED_BYO_OAUTH_SLUGS.has(slug)) &&
      (combinedText.includes("composio-managed oauth available") ||
        (catalogRetrieved && VERIFIED_MANAGED_OAUTH_SLUGS.has(slug)))
    ) {
      return {
        status: "available",
        toolkitExamined: slug,
        authMethodExamined: "OAUTH2",
        evidenceIds: composioEvidenceIds,
        conditionsAndQualifications: [
          `Composio documentation confirms managed OAuth2 is available for toolkit ${slug}.`,
          "Managed OAuth uses Composio's default scopes and displays 'Composio' on the consent screen; register a custom OAuth app if you need custom scopes, dedicated rate limits, or white-label branding.",
        ],
      };
    }

    if (
      explicitlyNotAvailable ||
      combinedText.includes("composio-managed oauth available? no") ||
      combinedText.includes("bring your own oauth app") ||
      (catalogRetrieved && VERIFIED_BYO_OAUTH_SLUGS.has(slug))
    ) {
      return {
        status: "unavailable",
        toolkitExamined: slug,
        authMethodExamined: "OAUTH2",
        evidenceIds: composioEvidenceIds,
        conditionsAndQualifications: [
          `Composio documentation indicates ${slug} requires bringing your own OAuth app credentials (type: "use_custom_auth").`,
        ],
      };
    }

    return null;
  }
}
