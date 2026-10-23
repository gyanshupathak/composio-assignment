# Provider Dossier: GitHub

**Provider:** GitHub (`https://github.com`)  
**Developer Docs:** `https://docs.github.com/en/apps`  
**Composio Toolkit Slug:** `GITHUB` (Version `20261014_00`, 899 tools, 46 triggers)  
**Last Researched:** 2026-10-23

---

## 1. Intended Use Case & Integration Scenarios

Developers connecting GitHub to an AI agent or SaaS product typically fall into one of three scenarios:
1. **Scenario A — Read/Triage Issues & PRs (Public or Private Repos):** The agent reads repository metadata, issues, pull requests, and comments, or posts review comments and labels.
2. **Scenario B — Code & Branch Automation (Read/Write Contents):** The agent reads private source files, creates branches, commits code, and opens pull requests on behalf of a user or team.
3. **Scenario C — Prototype / Internal Developer Workflow:** A developer wants their agent to act on their own GitHub repositories immediately without registering an app.

---

## 2. Authentication Options & Architectural Trade-Offs

GitHub offers three distinct authentication mechanisms that use or intersect with OAuth 2.0 (`SRC-GH-01`, `SRC-GH-02`, `SRC-GH-04`):

| Dimension | GitHub App (Recommended for Production) | OAuth App (Legacy / Broad Scope) | Composio Managed OAuth (`GITHUB`) |
| :--- | :--- | :--- | :--- |
| **Permission Granularity** | **Fine-grained** (e.g., `issues: read`, `pull_requests: write`, `contents: read` configured per resource). | **Coarse scopes** (`repo` grants full read/write to all private code, webhooks, deployments, and org projects). | Uses Composio's pre-registered OAuth app and default scopes (`OAUTH2`). |
| **Repository Scope** | User or Org Admin selects **All repositories** or **Only select repositories** during installation. | Accesses **every repository** the authorizing user can access (`SRC-GH-02`). | Accesses repositories visible to the authorizing user's grant. |
| **Token Lifespan** | User access tokens expire in **8 hours** by default (with 6-month rotating refresh tokens). Installation tokens expire in **1 hour** (`SRC-GH-19`). | Long-lived by default unless "Expire user access tokens" (8h/6m) is enabled (`SRC-GH-01`, `SRC-GH-13`). | Managed and refreshed automatically by Composio under `user_id` (`SRC-COMP-07`). |
| **Rate Limits** | User tokens: 5,000 req/hr per user. Installation tokens: scales from 5,000 up to **12,500 req/hr** based on org users and repos (`SRC-GH-20`). | **5,000 req/hr** per authenticated user, shared across all OAuth apps and PATs owned by that user (`SRC-GH-20`). | Shares rate-limit quota on Composio's managed app or user token quota (`SRC-COMP-03`). |
| **Organizational Persistence** | Remains installed even if the person who installed it leaves the organization (`SRC-GH-02`). | Breaks immediately if the authorizing user leaves the organization or loses repo access (`SRC-GH-02`). | Tied to the connected `user_id` account. |

### The Composio Managed vs. Custom Decision for GitHub
- **Composio Managed OAuth Status:** **Available** (`OAUTH2` supported on `GITHUB` toolkit, `SRC-COMP-01`, `SRC-COMP-02`).
- **When to use Composio Managed OAuth:** Prototyping, internal agent workflows, or early development where showing "Composio" on the GitHub authorization screen and using default OAuth scopes is acceptable (`SRC-COMP-03`).
- **When to use a Custom GitHub App (or Custom OAuth App):**
  1. Production apps where enterprise customers will reject the monolithic `repo` scope (`PP-GH-01`) or require your brand name on the consent screen (`SRC-COMP-03`).
  2. When you need fine-grained permissions (e.g., read/write issues without write access to source code).
  3. **Critical Composio + GitHub App Caveat (`SRC-COMP-02`):** While Composio allows you to supply a GitHub App's `client_id` and `client_secret` in a custom auth config, **Composio does not currently provide the GitHub App installation link automatically during the OAuth flow**. Your application must separately direct the user to `https://github.com/apps/<your-app-slug>/installations/new` so they install the app on their account/organization and select repositories before tool calls will succeed.

---

## 3. Provider-Specific Setup Requirements

1. **Registration Location:** `GitHub Settings → Developer settings → GitHub Apps` (or `OAuth Apps`) (`SRC-GH-01`).
2. **Callback URL Configuration:**
   - Up to 10 callback URLs can be registered (`SRC-GH-01`).
   - For Composio Custom Auth, set the callback URL to: `https://backend.composio.dev/api/v3/toolkits/auth/callback` (`SRC-COMP-08`).
   - **August 3, 2026 Wildcard Rule Change (`SRC-GH-08`):** Apps created before August 3, 2026 with a single callback URL had wildcard matching enabled by default. New apps have wildcard matching disabled by default—meaning scheme, host, port, and path must match **exactly**.
3. **Endpoints:**
   - Authorization: `GET https://github.com/login/oauth/authorize`
   - Token Exchange: `POST https://github.com/login/oauth/access_token` (Send header `Accept: application/json` to receive JSON instead of form-encoded text).

---

## 4. Most Important Developer Pain Points

1. **`PP-GH-01` — Monolithic `repo` Scope Backlash:** OAuth Apps cannot request read-only access to private repository code or issues-only access to private repos; requesting `repo` grants full read/write over all private code and org projects (`SRC-GH-02`, `SRC-GH-03`, `SRC-GH-14`).
2. **`PP-GH-02` — Empty `scope: ""` and Private Repo `404 Not Found` on GitHub Apps:** Passing `scope=repo` to a GitHub App OAuth flow is silently ignored (returning `scope: ""`), and API calls to private repos return `404 Not Found` (not `403`) if the GitHub App hasn't been installed on that specific repository (`SRC-GH-03`, `SRC-GH-07`, `SRC-GH-12`).
3. **`PP-GH-03` — `redirect_uri_mismatch` After August 3, 2026 Wildcard Policy Change:** Subdirectory or dynamic preview URLs fail with `redirect_uri_mismatch` unless explicitly registered (up to 10 URLs) (`SRC-GH-05`, `SRC-GH-08`).
4. **`PP-GH-04` — SAML SSO Enforcement & Org Approval Blocks:** In organizations with SAML SSO, authorizing an app without an active SAML session causes API calls to fail with `403 Resource protected by organization SAML enforcement` or silently omit org repositories (`SRC-GH-06`, `SRC-GH-09`, `SRC-GH-15`).
5. **`PP-GH-05` — `bad_verification_code` with `200 OK` Status:** GitHub returns HTTP `200 OK` even when token exchange fails with `bad_verification_code` (caused by double-firing callback handlers or codes older than 10 minutes) (`SRC-GH-05`).

---

## 5. Technical & Approval Risks

- **Provider Review Gate:** **None for standard OAuth / GitHub App usage.** Unlike Google or Slack, GitHub does not require a provider verification review just to let external users authorize your OAuth App or install your public GitHub App. Review is only required if you choose to list a paid/featured app in the public GitHub Marketplace.
- **Customer-Side Organization Approval Gate:** High likelihood in B2B settings. Organization owners must approve restricted OAuth Apps (`Settings → Third-party access`) or approve GitHub App installations requesting organization-level permissions (`SRC-GH-02`, `SRC-GH-18`).

---

## 6. What the Sources Establish vs. What Remains Uncertain

- **Established (`Grade A/B/C`):** Exact scope behavior, GitHub App vs. OAuth App capability matrix, August 3, 2026 callback wildcard policy, 8h/6m expiring token durations, 5,000 req/hr user rate limit vs. 12,500 req/hr scaled installation rate limit, SAML SSO active-session requirement, and Composio's manual GitHub App installation link requirement.
- **Remains Uncertain / Conditional:**
  - Customer-specific GitHub Organization approval turnaround times (depends entirely on the target customer's IT/Org Owner responsiveness).
  - Exact timeline for when Composio will ship built-in automatic GitHub App installation link handling (`SRC-COMP-02` states *"Built-in installation-link handling is being worked on"* without a release date).

---

## 7. How This Research Changed the GitHub Guide

1. **Verdict & Path Selection:** Instead of defaulting to "Create a GitHub OAuth App," the guide explicitly distinguishes Prototyping (Composio Managed Auth), Simple Public/Identity Auth (OAuth App with `read:user` / `public_repo`), and Production Private Repo Integration (**GitHub App** with fine-grained permissions).
2. **Composio Two-Step Warning:** When a developer uses a custom GitHub App with Composio, Step 4 explicitly instructs them to send users through the GitHub App installation URL in addition to the Composio OAuth Connect Link.
3. **Diagnostic Checklists:** The pre-launch checklist tests for HTTP `200 OK` masked OAuth errors (`body.error`), private repo `404` vs `200` visibility, and SAML SSO authorization headers.
