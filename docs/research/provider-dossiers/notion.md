# Provider Dossier: Notion

**Provider:** Notion (`https://www.notion.so`, `https://www.notion.so/profile/integrations`)  
**Developer Docs:** `https://developers.notion.com/docs/authorization`, `https://developers.notion.com/reference/intro`  
**Composio Toolkit Slug:** `NOTION` (Version `20261018_00`, 60 tools, 8 triggers; supports `OAUTH2` and `API_KEY`)  
**Last Researched:** 2026-10-23

---

## 1. Intended Use Case & Integration Scenarios

Notion's authentication model depends entirely on **who owns the target workspace**:
1. **Scenario A — Single-Workspace Internal Automation:** A team connects their own company Notion workspace to an internal agent, dashboard, or sync job. **Best Path: Internal Connection (`API_KEY` / `ntn_...` static bearer token) — no OAuth needed (`SRC-NOTION-01`, `SRC-NOTION-13`).**
2. **Scenario B — Multi-Workspace SaaS / AI Agent Product:** External users across different Notion workspaces connect their Notion accounts to your app. **Best Path: Public Connection (OAuth 2.0) — either via a Custom Notion Public Connection (recommended for production) or Composio Managed OAuth (`SRC-NOTION-01`, `SRC-NOTION-14`, `SRC-COMP-06`).**
3. **Scenario C — Personal Script / CLI / Worker Acting as One User:** **Best Path: Personal Access Token (PAT)** (`SRC-NOTION-01`).

---

## 2. Authentication Options & Composio Managed-Auth Assessment

- **Provider Support:**
  1. **Public Connections (OAuth 2.0):** `GET https://api.notion.com/v1/oauth/authorize` and `POST https://api.notion.com/v1/oauth/token` (`SRC-NOTION-01`).
  2. **Internal Connections (Static Bearer Token):** Issued immediately in the Notion Developer Portal (`ntn_...` or legacy `secret_...`, `SRC-NOTION-01`, `SRC-NOTION-13`).
  3. **Personal Access Tokens (PAT):** User-scoped static token (`SRC-NOTION-01`).
- **Composio Managed OAuth Status:** **Available** (`OAUTH2` and `API_KEY` supported on `NOTION` toolkit, `SRC-COMP-01`, `SRC-COMP-06`).
- **Critical Reason to Use a Custom Notion OAuth App in Production (`SRC-COMP-06`):**
  - Composio's official Notion documentation explicitly warns: *"When a Notion user connects to a Notion app, Notion issues a new `access_token` and `refresh_token` pair for that connection. If the same user connects to the same Notion app again, whether it is Composio-managed or custom, Notion can issue a new token pair and invalidate the older `refresh_token`... For production Notion integrations, we strongly recommend using your own Notion app so your users' tokens are isolated to your product."* (`SRC-COMP-06`).
  - Additionally, Notion attributes all page edits and comments to the **integration's name and icon** (not the individual user's name), so using Composio Managed Auth causes edits in the customer's Notion workspace to say **"Composio"** instead of your product's name (`SRC-COMP-06`).

---

## 3. Provider-Specific Technical Quirks

1. **No OAuth Scopes — Capabilities Are Portal-Configured (`SRC-NOTION-03`, `SRC-COMP-06`):**
   - Notion ignores OAuth `scope` query parameters.
   - Instead, you toggle **Content Capabilities** (`Read content`, `Update content`, `Insert content`), **Comment Capabilities** (`Read comments`, `Insert comments`), and **User Capabilities** (`No user information`, `User information without email addresses`, `User information with email addresses`) in the Notion Developer Portal.
   - If you change capabilities later, existing connected users **must re-authenticate** for the new capabilities to take effect (`SRC-NOTION-03`).
2. **Irreversible Installation Scope at Creation (`SRC-NOTION-01`, `SRC-NOTION-14`):**
   - When creating a Public Connection, you must choose `Any workspace` (Marketplace-eligible) or `Selected workspaces only`. **This cannot be changed after creation.**
3. **HTTP Basic Auth + JSON Body Required for Token Exchange (`SRC-NOTION-01`, `SRC-NOTION-09`):**
   - Unlike standard OAuth providers that accept `client_id` and `client_secret` in an `application/x-www-form-urlencoded` body, `POST https://api.notion.com/v1/oauth/token` requires:
     - `Authorization: Basic <base64(CLIENT_ID:CLIENT_SECRET)>`
     - `Content-Type: application/json`
     - JSON body: `{"grant_type": "authorization_code", "code": "...", "redirect_uri": "..."}`
4. **Reverse Webhook Verification Flow for Custom Notion Apps on Composio (`SRC-COMP-06`):**
   - When configuring Notion webhooks with a custom OAuth app on Composio, you create the ingress endpoint via `POST https://backend.composio.dev/api/v3.1/webhook_endpoints`, paste `webhook_url` into Notion, read `data.webhook_signing_secret` from `GET /api/v3.1/webhook_endpoints/<ID>`, and paste that verification token back into Notion (`SRC-COMP-06`).

---

## 4. Most Important Developer Pain Points

1. **`PP-NOTION-01` — Empty `/v1/search` and `404 object_not_found` Because Zero Pages Are Shared by Default:** Completing OAuth or creating an Internal Token grants access to **zero pages** until pages are explicitly shared (`SRC-NOTION-01`, `SRC-NOTION-05`, `SRC-NOTION-09`). For Internal Connections, users must click `••• (top right) → Add connections` on the page (older docs/tutorials say "Share → Invite", which no longer works, `SRC-NOTION-05`). For Public OAuth Connections, users must select pages in the OAuth Page Picker—which **only shows pages where the user has `Full Access`** (`SRC-NOTION-01`, `SRC-NOTION-04`). Furthermore, sharing a parent page does **not** automatically share a linked database whose source lives elsewhere (`SRC-NOTION-06`).
2. **`PP-NOTION-02` — `401 invalid_client` on Token Exchange:** Sending `client_id` and `client_secret` in the POST body instead of the `Authorization: Basic base64(id:secret)` header causes immediate `401 invalid_client` errors (`SRC-NOTION-01`, `SRC-NOTION-09`).
3. **`PP-NOTION-03` — Passing OAuth Scopes or Missing User Emails:** Passing `scope=...` in the authorize URL has no effect (`SRC-COMP-06`), and `GET /v1/users` omits email addresses unless `User information with email addresses` is enabled in the portal (`SRC-NOTION-03`, `SRC-NOTION-09`).
4. **`PP-NOTION-04` — Re-Authentication Invalidates Previous `refresh_token`:** If the same Notion user connects again to the same Notion OAuth app (or if another app on Composio's shared managed Notion client re-authenticates that user), Notion issues a new token pair and invalidates the previous `refresh_token` (`SRC-COMP-06`, `SRC-NOTION-07`).
5. **`PP-NOTION-05` — API Version `2025-09-03` / `2026-03-11` (`data_sources` vs `databases`) and Shared Workspace Rate Limits (`429`):** Every request requires the `Notion-Version` header (`2026-03-11`), database queries now use `POST /v1/data_sources/{data_source_id}/query` (`SRC-NOTION-02`, `SRC-NOTION-10`), and rate limits (180 req/min standard, 600 req/min Business/Enterprise) include a **shared workspace budget** (`public_api_space_request_rate_limit`) that can return `429` or `529` with a `Retry-After` header (`SRC-NOTION-12`).

---

## 5. What the Sources Establish vs. What Remains Uncertain

- **Established (`Grade A/B/C`):** Internal vs. Public vs. PAT architecture, HTTP Basic Auth token exchange, page sharing mechanics (`Add connections` vs Page Picker `Full Access` rule), token invalidation on repeat connection (`SRC-COMP-06`), `2025-09-03` / `2026-03-11` `data_sources` migration, and per-connection vs. per-workspace rate limits (`SRC-NOTION-12`).
- **Remains Uncertain / Conditional:**
  - Public Notion Integrations work immediately across external workspaces via OAuth without waiting for Marketplace approval (note: `The Authorization URL field populates after a public connection is configured/submitted`, `SRC-NOTION-01`), whereas optional listing in the public Notion Integrations Gallery/Marketplace has no published SLA in Notion's docs.
  - Notion's hosted remote MCP server (`mcp.notion.com`) had an isolated beta report (`SRC-NOTION-08`, `Grade D`) of not returning `refresh_token`, which does not affect standard `api.notion.com/v1/oauth/token` integrations.

---

## 6. How This Research Changed the Notion Guide

1. **Scenario Split (Single Workspace vs. Multi-Workspace):** Section 2 immediately saves single-workspace developers from building OAuth at all by directing them to **Internal Connections (`API_KEY`)**, while steering multi-workspace SaaS builders to a **Custom Public OAuth Connection** (to avoid shared-app refresh token invalidation and "Composio" edit attribution).
2. **Post-OAuth "Zero Pages Shared" Verification Step:** Step 5 and the Test Before Launch checklist mandate calling `POST /v1/search` immediately after OAuth and showing a "Select pages in Notion" recovery prompt if `results` is empty.
