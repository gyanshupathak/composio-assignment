import { PageExtractor, ExtractedPageResult, sanitizeUntrustedContent } from "./sourceExtractor";
import { SearchBatchResult, WebSearchProvider } from "./webSearch";
import { RawDiscoveredSource } from "./canonicalSources";

/**
 * Audited Evidence Fixtures for Deterministic Evals (`npm run evals`), Integration Tests,
 * and Explicitly-Labeled Offline Demo Mode when `TAVILY_API_KEY` is not set.
 *
 * All Linear sources below are real URLs and real technical findings retrieved on 2026-10-23
 * (recorded in `docs/research/source-ledger.csv` as `SRC-LINEAR-01` through `SRC-LINEAR-04`).
 */
export const REAL_AUDITED_LINEAR_SOURCES: RawDiscoveredSource[] = [
  {
    title: "Linear Developers — OAuth 2.0 Authentication",
    url: "https://linear.app/developers/oauth-2-0-authentication",
    snippet:
      "Linear supports OAuth2 authentication via GET https://linear.app/oauth/authorize and POST https://api.linear.app/oauth/token. All OAuth2 applications were migrated to the new refresh token system on April 1, 2026. Scopes: read, write, issues:create, comments:create, timeSchedule:write, admin. Supports actor=user and actor=app.",
    extractedContent:
      "Linear supports OAuth2 authentication. All OAuth2 applications were migrated to the new refresh token system on April 1, 2026. Authorize endpoint: GET https://linear.app/oauth/authorize with client_id, redirect_uri, response_type=code, scope (read, write, issues:create, comments:create, timeSchedule:write, admin), state, prompt=consent, and actor (user or app). Token endpoint: POST https://api.linear.app/oauth/token with grant_type=authorization_code or grant_type=refresh_token.",
    publishedDate: "2026-04-01",
    retrievalStatus: "retrieved_200",
  },
  {
    title: "Linear Developers — OAuth Actor Authorization (actor=app)",
    url: "https://linear.app/developers/oauth-actor-authorization",
    snippet:
      "Add actor=app parameter to your OAuth authorization URL to install the app at workspace scope so actions come from the app/agent rather than an individual user. Note: actor=application was deprecated in favor of actor=app.",
    extractedContent:
      "Linear supports OAuth Actor Authorization with actor=app on https://linear.app/oauth/authorize. When authenticating with actor=app, the user authorizes installing the app within the workspace and mutations (creating issues, comments, status changes) come from the app itself. Can pass createAsUser and displayIconUrl in issueCreate/commentCreate. Note: actor=application was deprecated in favor of actor=app.",
    publishedDate: "2026-04-01",
    retrievalStatus: "retrieved_200",
  },
  {
    title: "Composio — Managed OAuth apps (Linear Toolkit)",
    url: "https://docs.composio.dev/toolkits/managed-auth",
    snippet:
      "Composio-managed OAuth available (124 toolkits): includes Linear (slug: LINEAR) with OAUTH2 managed authentication.",
    extractedContent:
      "Composio can provide the OAuth app that your users authorize when they connect a toolkit. Composio-managed OAuth available: Linear (LINEAR), GitHub (GITHUB), Gmail (GMAIL), Slack (SLACK), Notion (NOTION).",
    publishedDate: "2026-10-20",
    retrievalStatus: "retrieved_200",
  },
  {
    title: "Nango Engineering — Linear OAuth refresh token invalid_grant: What it means & how to fix it",
    url: "https://nango.dev/blog/linear-oauth-refresh-token-invalid-grant/",
    snippet:
      "Linear access tokens expire in 24 hours and refresh tokens rotate on every exchange at https://api.linear.app/oauth/token. Reusing a stale refresh token or running concurrent refreshes across multiple worker processes without a mutex lock causes 400 invalid_grant.",
    extractedContent:
      "Linear returns HTTP 400 invalid_grant ('Token has been expired or revoked') when refreshing with a stale token. Linear rotates refresh tokens on every exchange: the previous access and refresh tokens are invalidated and new tokens are returned. Running token refreshes in multiple processes without proper locking overwrites the new refresh token with a stale one, breaking the integration.",
    publishedDate: "2026-04-01",
    retrievalStatus: "search_indexed_verified",
  },
  {
    title: "Vectle — Linear OAuth failed: redirect_uri not whitelisted error",
    url: "https://vectle.com/skills/skl_h2b9FqyVcI_kGhm8maj0eA",
    snippet:
      "Linear applies redirect_uri matching strictly against the registered callback list. Mismatches in trailing slash, http vs https behind a TLS-terminating reverse proxy, or query strings cause redirect_uri not whitelisted errors.",
    extractedContent:
      "Linear compares the redirect_uri sent at runtime strictly against the registered callback URLs in the OAuth2 Application settings. A trailing slash difference, http vs https mismatch behind a reverse proxy, or query parameters in the redirect_uri triggers a redirect_uri not whitelisted error.",
    publishedDate: "2026-03-01",
    retrievalStatus: "search_indexed_verified",
  },
];

export const REAL_AUDITED_BGMI_SOURCES: RawDiscoveredSource[] = [
  {
    title: "Battlegrounds Mobile India (BGMI) Official Website — Krafton India",
    url: "https://www.battlegroundsmobileindia.com",
    snippet:
      "Official consumer website for Battlegrounds Mobile India (BGMI) by Krafton. Contains game news, esports announcements, and support links. No public developer portal or OAuth 2.0 specification is published.",
    extractedContent:
      "Battlegrounds Mobile India official website. Provides APK/App Store links, patch notes, and player support. Does not document any public OAuth 2.0 endpoints or third-party developer API.",
    publishedDate: "2026-09-01",
    retrievalStatus: "retrieved_200",
  },
];

export const REAL_AUDITED_APIKEY_ONLY_SOURCES: RawDiscoveredSource[] = [
  {
    title: "Resend Developer Documentation — API Keys & Authentication",
    url: "https://resend.com/docs/api-reference/introduction",
    snippet:
      "Authenticate requests to the Resend API by including your secret API key (re_123...) in the Authorization: Bearer header. Resend uses API Key authentication and does not use end-user OAuth 2.0 redirect flows.",
    extractedContent:
      "Resend API Reference: All API requests must be made over HTTPS and authenticated using an API Key in the header Authorization: Bearer re_123456789. Generate API keys in the Resend Dashboard with Sending access or Full access.",
    publishedDate: "2026-05-01",
    retrievalStatus: "retrieved_200",
  },
];

export class DeterministicFixtureSearchProvider implements WebSearchProvider {
  async search(query: string): Promise<SearchBatchResult> {
    const qLower = query.toLowerCase();

    if (qLower.includes("linear")) {
      return {
        query,
        ok: true,
        results: REAL_AUDITED_LINEAR_SOURCES,
        retriedCount: 0,
      };
    }

    if (
      qLower.includes("bgmi") ||
      qLower.includes("battlegrounds mobile india") ||
      qLower.includes("pubg")
    ) {
      return {
        query,
        ok: true,
        results: REAL_AUDITED_BGMI_SOURCES,
        retriedCount: 0,
      };
    }

    if (qLower.includes("resend")) {
      return {
        query,
        ok: true,
        results: REAL_AUDITED_APIKEY_ONLY_SOURCES,
        retriedCount: 0,
      };
    }

    return {
      query,
      ok: true,
      results: [],
      retriedCount: 0,
    };
  }

  isConfigured(): boolean {
    return true;
  }
}

export class DeterministicFixturePageExtractor implements PageExtractor {
  async extractPage(url: string): Promise<ExtractedPageResult> {
    const all = [
      ...REAL_AUDITED_LINEAR_SOURCES,
      ...REAL_AUDITED_BGMI_SOURCES,
      ...REAL_AUDITED_APIKEY_ONLY_SOURCES,
    ];
    const match = all.find((s) => url.startsWith(s.url) || s.url.startsWith(url));
    if (match) {
      const sanitized = sanitizeUntrustedContent(
        match.extractedContent || match.snippet
      );
      return {
        url,
        finalUrl: match.url,
        retrievalStatus: "retrieved_200",
        httpStatus: 200,
        extractedText: sanitized.sanitizedText,
        injectionDetected: sanitized.injectionDetected,
      };
    }
    return {
      url,
      finalUrl: url,
      retrievalStatus: "http_error",
      httpStatus: 404,
      extractedText: "",
      injectionDetected: false,
      errorReason: "HTTP 404 in fixture extractor",
    };
  }
}
