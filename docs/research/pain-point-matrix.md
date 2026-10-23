# Developer Pain-Point Matrix

**Last Updated:** 2026-10-23  
**Purpose:** Structured synthesis of verified developer failure modes, root causes, evidence classifications, and concrete guide interventions across the four curated providers (GitHub, Gmail / Google OAuth, Slack, Notion).

---

## 1. Summary of Examined Product Hypotheses

Before synthesizing provider-specific pain points, we evaluated the seven initial product hypotheses against our multi-source evidence corpus:

| # | Hypothesis | Research Verdict | Nuance Established by Evidence |
| :--- | :--- | :--- | :--- |
| **H1** | Developers create custom OAuth apps unnecessarily when managed auth exists. | **Confirmed with conditions** | Composio provides managed OAuth2 for GitHub, Gmail, Slack, and Notion (`SRC-COMP-01`). However, managed auth is only appropriate for prototyping, internal tools, or default scopes. Production customer-facing apps almost always require custom OAuth apps due to consent-screen branding ("Composio wants to access..."), shared rate-limit quotas (`SRC-COMP-05`), Slack Marketplace warnings (`SRC-COMP-04`), and Notion's token-invalidation behavior on shared apps (`SRC-COMP-06`). |
| **H2** | Developers confuse registering an OAuth app with obtaining production distribution approval. | **Confirmed (High Impact)** | Strongly corroborated in Gmail (Testing mode 100-user cap + 7-day refresh token expiry vs. Published/Verified status, `SRC-GMAIL-02`, `SRC-GMAIL-06`) and Slack (single-workspace development mode vs. activating public distribution vs. 10-workspace Slack Marketplace review, `SRC-SLACK-01`, `SRC-SLACK-03`, `SRC-SLACK-13`). |
| **H3** | Developers request broader permissions than their integration needs. | **Confirmed (Structural & Behavioral)** | In Gmail, copying tutorial scopes like `https://mail.google.com/` or `gmail.readonly` triggers Restricted Scope Verification and CASA security assessments when `gmail.send` (Sensitive) or `gmail.labels` (Non-sensitive) might suffice (`SRC-GMAIL-03`, `SRC-GMAIL-05`). In GitHub, however, over-scoping is often **forced by OAuth App architecture**: reading private repository issues via an OAuth App requires the monolithic `repo` scope (full code read/write), whereas switching to a GitHub App allows fine-grained `issues: read` (`SRC-GH-02`, `SRC-GH-03`). |
| **H4** | Developers discover testing restrictions or verification requirements too late. | **Confirmed (Critical Launch Blocker)** | Corroborated across Gmail (multi-week CASA assessment for server-side restricted scopes, `SRC-GMAIL-05`) and Slack (10 active workspaces requirement + 7–20 week Marketplace review backlog reported in 2025–2026, `SRC-SLACK-03`, `SRC-SLACK-13`, `SRC-SLACK-14`). |
| **H5** | Developers struggle to translate documentation language into precise developer-console configuration. | **Confirmed** | Examples include Notion's capability toggles vs. OAuth scopes (`SRC-NOTION-03`), Slack's `scope` (bot) vs. `user_scope` (user) split (`SRC-SLACK-01`), and GitHub's August 2026 wildcard callback toggle change (`SRC-GH-08`). |
| **H6** | Developers struggle to distinguish provider requirements from SDK bugs or unsafe community workarounds. | **Confirmed** | Prominent examples: Reddit threads recommending Google Service Accounts to bypass the 7-day Testing token expiry—which fails completely on personal `@gmail.com` accounts (`SRC-GMAIL-07`, `SRC-GMAIL-09`); Slack developers disabling `stateVerification` instead of using Bolt's `/slack/install` route (`SRC-SLACK-05`, `SRC-SLACK-06`); and developers passing `scope=repo` to a GitHub App OAuth flow expecting OAuth scopes (`SRC-GH-07`). |
| **H7** | Developers do not know which steps are immediate vs. blocked on another organization. | **Confirmed** | Beyond provider review (Google Trust & Safety, Slack Marketplace), enterprise customer adoption frequently blocks on customer-side admin gates: GitHub SAML SSO active-session enforcement (`SRC-GH-06`, `SRC-GH-09`), Slack "Require approved apps" workspace settings (`SRC-COMP-04`), and Google Workspace Admin API Controls (`SRC-GMAIL-02`). |

---

## 2. GitHub Pain Points

### `PP-GH-01`: Monolithic `repo` Scope in OAuth Apps vs. Fine-Grained GitHub App Permissions
- **Scenario:** Developer building an integration or AI agent that needs to read private repository issues, PRs, or code.
- **User Goal:** Request least-privilege access so security-conscious users and enterprise organizations approve the integration.
- **Observed Symptom:** Users and organization admins reject the OAuth consent prompt because the app asks for `repo` scope, which grants full read/write access to all private code, webhooks, deployments, and organization projects (`r/github`, `SRC-GH-14`).
- **Conditions:** Occurs whenever an **OAuth App** needs any access to private repository code, issues, or pull requests.
- **Likely Root Cause:** Documented architectural limitation of GitHub OAuth Apps (`Grade A`, `SRC-GH-02`, `SRC-GH-03`). OAuth Apps cannot scope repository contents or issues to read-only. Only **GitHub Apps** support fine-grained permissions (e.g., `issues: read`, `pull_requests: write`, `contents: read`) and per-repository selection.
- **Problem Classification:** Permission/scope decision & authentication-path architecture.
- **Supporting Sources:** `SRC-GH-01`, `SRC-GH-02`, `SRC-GH-03`, `SRC-GH-04`, `SRC-GH-14`, `SRC-COMP-02`.
- **Independent Reports / Corroboration:** Primary official documentation (`Grade A`) + corroborated community discussions (`Grade C`).
- **Severity:** **High** (causes enterprise customer rejection and security review failure).
- **Confidence:** High (officially documented).
- **Prevention / Resolution:** Choose a **GitHub App** (with user-to-server OAuth enabled) instead of a legacy OAuth App whenever accessing private repositories or targeting organization accounts. Note: If using Composio with a custom GitHub App, the developer must manually surface the GitHub App installation link to the user because Composio does not yet auto-prompt the installation step (`SRC-COMP-02`).
- **Guide Intervention:** Featured in **Section 1 (The Verdict)** and **Section 2 (Choose the Authentication Path)** with an explicit decision matrix between Composio Managed OAuth, Custom OAuth App, and Custom GitHub App.

### `PP-GH-02`: Empty `scope: ""` and `404 Not Found` When Passing `scope` to a GitHub App OAuth Flow
- **Scenario:** Developer registers a GitHub App (following GitHub's recommendation) but follows an OAuth App tutorial that passes `?scope=repo` to `https://github.com/login/oauth/authorize`.
- **User Goal:** Obtain a user access token that can read private repositories.
- **Observed Symptom:** Token exchange succeeds (`200 OK`), but the returned JSON has `"scope": ""` (blank), and subsequent API calls to private repositories return `404 Not Found` (`SRC-GH-07`).
- **Conditions:** Calling `/login/oauth/authorize` with a GitHub App `client_id` (`Iv1....`) while expecting OAuth `scope` parameters to grant permissions, or without the GitHub App being installed on the target repository.
- **Likely Root Cause:** Maintainer- and doc-confirmed (`Grade A/B`, `SRC-GH-03`, `SRC-GH-11`, `SRC-GH-12`): GitHub Apps do not use OAuth scopes (the only accepted `scope` value for a GitHub App is `offline_access` to opt into token expiration). A GitHub App user access token derives its permissions from the intersection of (a) the user's permissions and (b) the **GitHub App's installation permissions** on that account/org. Furthermore, GitHub intentionally returns `404 Not Found` instead of `403 Forbidden` on unauthorized private resources to prevent leaking repository existence.
- **Problem Classification:** Authorization-flow misunderstanding & error message ambiguity.
- **Supporting Sources:** `SRC-GH-03`, `SRC-GH-07`, `SRC-GH-11`, `SRC-GH-12`, `SRC-COMP-02`.
- **Severity:** **High** (blocks initial setup and wastes hours debugging why `scope=repo` is ignored).
- **Confidence:** High.
- **Prevention / Resolution:** Do not pass `scope=repo` when authorizing a GitHub App. Ensure the GitHub App is configured with the required Repository Permissions in Developer Settings and is **installed** on the target user/organization account covering the target repositories. Inspect the `X-OAuth-Scopes` header (for OAuth Apps) or check `GET /user/installations` (for GitHub Apps).
- **Guide Intervention:** Added as a critical pitfall in **Section 6 (Where Developers Get Stuck)** and as a diagnostic check in **Section 7 (Test Before Launch)**.

### `PP-GH-03`: Callback URL Matching Failures (`redirect_uri_mismatch`) and the August 3, 2026 Wildcard Policy Change
- **Scenario:** Registering callback URLs for local development, preview deployments, or multi-tenant subdomains.
- **User Goal:** Redirect users back to the application after GitHub authorization.
- **Observed Symptom:** GitHub redirects to the callback with `error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match+the+registered+callback+URL+for+this+application`.
- **Conditions:** Passing a `redirect_uri` whose scheme (`http` vs `https`), port (`:3000` vs `:8080`), or path does not match the registered callback URL—or relying on legacy subdirectory/subdomain wildcard matching on an app created or modified after **August 3, 2026**.
- **Likely Root Cause:** Officially documented (`Grade A`, `SRC-GH-05`, `SRC-GH-08`): Apps with a single callback URL prior to August 3, 2026 had wildcard matching enabled by default (allowing subdirectories and subdomains). For newer apps or apps with wildcard matching disabled, `redirect_uri` must **exactly match** one of up to 10 registered callback URLs.
- **Problem Classification:** Developer-console configuration issue & documentation/policy change.
- **Supporting Sources:** `SRC-GH-01`, `SRC-GH-05`, `SRC-GH-08`, `SRC-GH-10`.
- **Severity:** **High** (blocks authorization handshake).
- **Confidence:** High.
- **Prevention / Resolution:** Register each exact callback URL (up to 10 allowed) in the GitHub App/OAuth App settings rather than enabling wildcard matching (which GitHub warns exposes authorization codes to subdomain takeover risks). If using Composio Custom Auth, register `https://backend.composio.dev/api/v3/toolkits/auth/callback` (`SRC-COMP-03`).
- **Guide Intervention:** Highlighted in **Section 3 (Before You Begin)** and **Section 4 (Step-by-Step Setup)** with the exact August 3, 2026 rule change noted.

### `PP-GH-04`: Organization Third-Party Access Restrictions and SAML SSO Silent/403 Failures
- **Scenario:** A user belongs to a corporate GitHub Organization with SAML Single Sign-On (SSO) or OAuth App access restrictions enabled.
- **User Goal:** List or access private repositories inside the user's organization after completing OAuth login.
- **Observed Symptom:** Personal repositories appear, but organization repositories are missing from list responses, or direct API calls fail with `403 Forbidden: Resource protected by organization SAML enforcement. You must grant your OAuth token access to this organization` (`SRC-GH-09`, `SRC-GH-15`).
- **Conditions:** (1) The organization restricts third-party OAuth Apps and an Org Owner has not approved the app (`SRC-GH-06`); or (2) the organization enforces SAML SSO and the user did not have an active SAML session when authorizing the app (`SRC-GH-06`, `SRC-GH-09`, `SRC-GH-16`).
- **Likely Root Cause:** Documented GitHub Enterprise/Organization security boundary (`Grade A/B`, `SRC-GH-06`, `SRC-GH-09`, `SRC-GH-13`).
- **Problem Classification:** Account/organization restriction & external approval dependency.
- **Supporting Sources:** `SRC-GH-02`, `SRC-GH-06`, `SRC-GH-09`, `SRC-GH-13`, `SRC-GH-15`, `SRC-GH-16`.
- **Severity:** **High** (blocks production B2B/enterprise users).
- **Confidence:** High.
- **Prevention / Resolution:** Instruct users in SAML-enforced organizations to establish an active SAML session before authorizing, or click **Authorize** next to the SAML organization on the consent prompt. If an OAuth App was authorized before starting a SAML session, the user must revoke the app in `Settings → Applications → Authorized OAuth Apps`, authenticate via SAML, and reauthorize (`SRC-GH-06`, `SRC-GH-09`).
- **Guide Intervention:** Included in **Section 5 (Effort and Approval)** under organizational dependencies and **Section 6 (Where Developers Get Stuck)**.

### `PP-GH-05`: `bad_verification_code` Due to Duplicate Exchange or Expired 10-Minute Code
- **Scenario:** Exchanging the temporary `code` at `POST https://github.com/login/oauth/access_token`.
- **User Goal:** Obtain an access token after callback redirect.
- **Observed Symptom:** Token endpoint returns `200 OK` (with form-encoded or JSON body) containing `{"error": "bad_verification_code", "error_description": "The code passed is incorrect or expired."}` (`SRC-GH-05`).
- **Conditions:** Code is older than 10 minutes, or the frontend/backend triggered the callback twice (e.g., React StrictMode double-firing `useEffect` on the callback route, or browser prefetching).
- **Likely Root Cause:** GitHub authorization codes are single-use and expire after 10 minutes (`Grade A`, `SRC-GH-05`). Additionally, GitHub's token endpoint returns HTTP `200 OK` even on OAuth errors, and returns `application/x-www-form-urlencoded` unless `Accept: application/json` is explicitly sent (`SRC-GH-10`, `SRC-GH-13`).
- **Problem Classification:** Authorization-flow & SDK/implementation issue.
- **Supporting Sources:** `SRC-GH-05`, `SRC-GH-10`, `SRC-GH-13`.
- **Severity:** **Medium**.
- **Confidence:** High.
- **Prevention / Resolution:** Handle the code exchange on a server-side callback route (not inside a double-mounting client component), always pass `Accept: application/json`, check for `body.error` even when `res.status === 200`, and restart the OAuth flow if `bad_verification_code` occurs.
- **Guide Intervention:** Added to **Section 4 (Step-by-Step Setup)** and **Section 6 (Where Developers Get Stuck)**.

---

## 3. Gmail / Google OAuth Pain Points

### `PP-GMAIL-01`: 7-Day Refresh Token Expiration (`invalid_grant`) When OAuth Consent Screen Is in "Testing" Status
- **Scenario:** Developer configures a Google Cloud project with User Type `External` and leaves Publishing Status in `Testing` while running an agent or background integration.
- **User Goal:** Maintain a persistent connection to Gmail without weekly manual re-authentication.
- **Observed Symptom:** Exactly 7 days after authorization, token refresh fails with `400 Bad Request` / `{"error": "invalid_grant", "error_description": "Token has been expired or revoked."}` (`SRC-GMAIL-06`, `SRC-GMAIL-07`, `SRC-GMAIL-09`).
- **Conditions:** Google Cloud OAuth Consent Screen has User Type = `External`, Publishing Status = `Testing`, and requests any scope beyond basic OIDC (`openid`, `email`, `profile`).
- **Likely Root Cause:** Documented Google OAuth policy (`Grade A`, `SRC-GMAIL-02`, `SRC-GMAIL-06`) frequently missed by developers because it is buried below the primary bullet list of expiration reasons (`SRC-GMAIL-08`).
- **Unsafe Community Workaround Rejected:** Reddit comments (`SRC-GMAIL-09`) often advise switching to a Google Service Account to avoid the 7-day expiry. While that works for Google Sheets/Drive via file sharing, **Gmail API rejects Service Accounts for personal `@gmail.com` accounts**—Service Accounts only work with Gmail on Google Workspace domains via admin-configured Domain-Wide Delegation (`SRC-GMAIL-04`, `SRC-GMAIL-07`).
- **Problem Classification:** Provider policy gate + commonly attempted incorrect community workaround.
- **Supporting Sources:** `SRC-GMAIL-02`, `SRC-GMAIL-03`, `SRC-GMAIL-06`, `SRC-GMAIL-07`, `SRC-GMAIL-08`, `SRC-GMAIL-09`.
- **Severity:** **Critical** (breaks all background/agent workflows after 1 week).
- **Confidence:** High.
- **Prevention / Resolution:**
  1. For internal company tools on Google Workspace: set User Type to **Internal** (no verification needed, no 7-day expiry).
  2. For personal/small-team use (`<100` users) with `@gmail.com` accounts: click **Publish app** to move to `In production` and bypass the unverified-app warning screen on personal accounts (`SRC-GMAIL-02`, `SRC-GMAIL-07`), or use **Composio Managed Auth** (which uses Composio's verified production OAuth client for default scopes, `SRC-COMP-05`).
  3. For public multi-user production apps: complete Google's sensitive/restricted scope verification before launch.
- **Guide Intervention:** Featured prominently in **Section 1 (The Verdict)**, **Section 5 (Effort and Approval)**, and **Section 6 (Where Developers Get Stuck)** with an explicit warning against the Service Account myth for `@gmail.com`.

### `PP-GMAIL-02`: Restricted Scope Classification & Mandatory Annual CASA Security Assessment
- **Scenario:** Developer builds an AI agent that reads, searches, or modifies emails (`gmail.readonly`, `gmail.modify`, `gmail.metadata`, or `https://mail.google.com/`) and wants to launch to external Google users under their own brand.
- **User Goal:** Publish a custom Google OAuth app for external users without the "App is blocked" or "Google hasn't verified this app" screen.
- **Observed Symptom:** Submitting the OAuth consent screen triggers Restricted Scope Verification, requiring domain verification in Google Search Console, a YouTube demonstration video showing client ID in the URL bar, Limited Use policy compliance, and—if email data passes through or is stored on any server—a **Cloud Application Security Assessment (CASA)** by a Google-empanelled assessor taking **several weeks** and requiring annual recertification (`SRC-GMAIL-04`, `SRC-GMAIL-05`).
- **Conditions:** Any `External` production app requesting Restricted Gmail scopes (`gmail.readonly`, `gmail.modify`, `gmail.compose`, `gmail.metadata`, `gmail.insert`, `gmail.settings.basic`, `mail.google.com/`). By contrast, `gmail.send` (sending email only) is classified as **Sensitive** (3–5 business days review, no CASA audit required, `SRC-GMAIL-03`, `SRC-GMAIL-04`).
- **Likely Root Cause:** Official Google API Services User Data Policy & Restricted Scope Policy (`Grade A`, `SRC-GMAIL-03`, `SRC-GMAIL-04`, `SRC-GMAIL-05`).
- **Problem Classification:** Permission/scope decision & external approval gate.
- **Supporting Sources:** `SRC-GMAIL-03`, `SRC-GMAIL-04`, `SRC-GMAIL-05`, `SRC-GMAIL-12`, `SRC-COMP-05`.
- **Severity:** **Critical** (can delay production launch by 4–8+ weeks and incur security assessment costs if unplanned).
- **Confidence:** High.
- **Prevention / Resolution:**
  - **Scope minimization by goal:** If the agent only needs to send notifications/outbound emails, request **only** `https://www.googleapis.com/auth/gmail.send` (Sensitive scope: 3–5 business days verification, no CASA assessment).
  - If the agent must read/search inbox messages (`gmail.readonly` or `gmail.modify`), decide early whether to use **Composio Managed Auth** during early launch (accepting "Composio" on the consent screen and shared quota) while starting Google's Restricted Scope + CASA verification process weeks ahead of white-labeled GA.
- **Guide Intervention:** Drives the entire **Section 2 (Choose the Authentication Path)** and **Section 5 (Effort and Approval)** breakdown in the Gmail guide.

### `PP-GMAIL-03`: Missing `refresh_token` on Subsequent Authorizations (`access_type=offline` + `prompt=consent`)
- **Scenario:** Developer tests the OAuth flow once, loses or resets their database, and re-runs the OAuth flow with the same Google Account.
- **User Goal:** Receive both `access_token` and `refresh_token` from `https://oauth2.googleapis.com/token`.
- **Observed Symptom:** Token exchange returns a valid 1-hour `access_token`, but `refresh_token` is `undefined`. One hour later, API calls fail with `401 Unauthorized` (`SRC-GMAIL-10`, `SRC-GMAIL-12`, `SRC-GMAIL-13`).
- **Conditions:** (1) `access_type=offline` was omitted on the authorization URL; or (2) `access_type=offline` was included, but the user had previously authorized the client and `prompt=consent` was not passed.
- **Likely Root Cause:** Documented Google OAuth behavior (`Grade A/B`, `SRC-GMAIL-01`, `SRC-GMAIL-10`, `SRC-GMAIL-12`, `SRC-GMAIL-13`): Google only issues a `refresh_token` on the **first** consent screen approval unless `prompt=consent` forces re-consent. Also note: Google enforces a limit of **100 refresh tokens per Google Account per OAuth Client ID** (`SRC-GMAIL-06`, though Composio's FAQ notes `~50` in older contexts, `SRC-COMP-05`); minting `prompt=consent` on every login without reusing tokens will eventually silently invalidate the oldest refresh token.
- **Problem Classification:** Authorization-flow misunderstanding & token lifecycle management.
- **Supporting Sources:** `SRC-GMAIL-01`, `SRC-GMAIL-06`, `SRC-GMAIL-10`, `SRC-GMAIL-12`, `SRC-GMAIL-13`, `SRC-COMP-05`.
- **Severity:** **High**.
- **Confidence:** High.
- **Prevention / Resolution:** Always pass `access_type=offline` and include `prompt=consent` when onboarding or reconnecting a user whose `refresh_token` is missing, then persist the `refresh_token` durably and do not re-trigger `prompt=consent` on ordinary app sign-ins.
- **Guide Intervention:** Embedded in **Section 4 (Step-by-Step Setup)** and **Section 6 (Where Developers Get Stuck)**.

### `PP-GMAIL-04`: Scope Incompatibility Between `gmail.metadata` and `gmail.readonly`/`gmail.modify` + Unverified Scope Blocks
- **Scenario:** Developer configures custom scopes in Composio or Google OAuth and includes both `gmail.metadata` and `gmail.readonly`, or adds `gmail.settings.basic` to a Composio-managed Gmail config.
- **User Goal:** Fetch full email bodies or configure filters.
- **Observed Symptom:** Either (a) full message body calls fail because `gmail.metadata` restricts payload access when combined with content scopes, or (b) adding `gmail.settings.basic` to Composio's managed app triggers Google's `"App is blocked"` screen because that extra scope is not verified on Composio's managed client (`SRC-COMP-05`).
- **Conditions:** Requesting `gmail.metadata` alongside full-content scopes, or adding unverified scopes to a managed OAuth client.
- **Likely Root Cause:** Primary Composio & Google documentation (`Grade A`, `SRC-COMP-05`, `SRC-GMAIL-04`).
- **Problem Classification:** Composio-specific configuration issue & scope conflict.
- **Supporting Sources:** `SRC-COMP-05`, `SRC-GMAIL-04`.
- **Severity:** **Medium**.
- **Confidence:** High.
- **Prevention / Resolution:** Never combine `gmail.metadata` with `gmail.readonly` or `gmail.modify` if your agent reads email bodies. When using Composio Managed Auth for Gmail, stick to Composio's verified default scopes; if you need `gmail.settings.basic` or custom scopes, register and verify your own Google OAuth client.
- **Guide Intervention:** Added to **Section 2 (Choose the Authentication Path)** and **Section 6 (Where Developers Get Stuck)**.

### `PP-GMAIL-05`: `Error 400: redirect_uri_mismatch` and Console Propagation Delay
- **Scenario:** Registering or updating Authorized Redirect URIs in Google Cloud Console.
- **User Goal:** Complete the OAuth redirect back to the app or Composio callback.
- **Observed Symptom:** `Error 400: redirect_uri_mismatch` during sign-in (`SRC-GMAIL-11`, `SRC-GMAIL-12`, `SRC-GMAIL-14`).
- **Conditions:** Mismatched trailing slash (`/callback` vs `/callback/`), `http` vs `https` behind a reverse proxy, using `Authorized JavaScript origins` instead of `Authorized redirect URIs`, or testing immediately within 5 minutes of saving changes in Google Cloud Console (`SRC-GMAIL-12`).
- **Likely Root Cause:** Exact string matching enforcement + Google Cloud Console propagation latency (`Grade A/C`, `SRC-GMAIL-01`, `SRC-GMAIL-11`, `SRC-GMAIL-12`, `SRC-GMAIL-14`).
- **Problem Classification:** Developer-console configuration issue.
- **Supporting Sources:** `SRC-GMAIL-01`, `SRC-GMAIL-11`, `SRC-GMAIL-12`, `SRC-GMAIL-14`, `SRC-GMAIL-15`.
- **Severity:** **High**.
- **Confidence:** High.
- **Prevention / Resolution:** Put the exact callback URI (for Composio custom auth: `https://backend.composio.dev/api/v3/toolkits/auth/callback`) under **Authorized redirect URIs** (not JavaScript origins), verify trailing slashes and HTTPS scheme, and wait 5 minutes if an updated URI still fails.
- **Guide Intervention:** Included in **Section 4 (Step-by-Step Setup)** and **Section 7 (Test Before Launch)**.

---

## 4. Slack Pain Points

### `PP-SLACK-01`: Bot Token (`scope` / `xoxb-`) vs. User Token (`user_scope` / `xoxp-`) & Composio's `SLACK` vs. `SLACKBOT` Split
- **Scenario:** Developer wants an agent to either (a) post/respond as a bot in channels (`@agent`) or (b) search messages across the workspace (`search:read`) or post as the human user.
- **User Goal:** Request the right token type and call the matching API methods.
- **Observed Symptom:** Developer requests `scope=search:read` (which fails because `search:read` is a user-only scope), or looks for the user token at the top-level `access_token` field of `oauth.v2.access` instead of `authed_user.access_token` (`SRC-SLACK-01`, `SRC-SLACK-02`), or picks the wrong Composio toolkit (`SLACK` vs `SLACKBOT`, `SRC-COMP-04`).
- **Conditions:** Using Slack OAuth v2 (`https://slack.com/oauth/v2/authorize`) or Composio's Slack integrations.
- **Likely Root Cause:** Documented Slack OAuth v2 architecture (`Grade A`, `SRC-SLACK-01`, `SRC-SLACK-02`, `SRC-COMP-04`): Slack OAuth v2 separates bot scopes (`scope=...`, returning top-level `access_token: "xoxb-..."`) from user scopes (`user_scope=...`, returning `authed_user.access_token: "xoxp-..."`). Furthermore, Sign in with Slack (`openid`, `profile`, `email`) cannot be combined with workspace bot/user scopes in the same OAuth flow (`SRC-SLACK-01`).
- **Problem Classification:** Permission/scope decision & authorization-flow misunderstanding.
- **Supporting Sources:** `SRC-SLACK-01`, `SRC-SLACK-02`, `SRC-COMP-04`.
- **Severity:** **High**.
- **Confidence:** High.
- **Prevention / Resolution:** Decide upfront whether the agent acts as a **Bot** (`scope` / Composio `SLACKBOT` toolkit) or on behalf of a **User** (`user_scope` / Composio `SLACK` toolkit). Never mix Sign in with Slack (`openid`) scopes into the workspace installation URL.
- **Guide Intervention:** Featured in **Section 2 (Choose the Authentication Path)** and **Section 4 (Step-by-Step Setup)**.

### `PP-SLACK-02`: `not_in_channel` Errors After Successful Bot OAuth Installation
- **Scenario:** User authorizes the Slack app with `channels:history` and `chat:write` bot scopes, and the app immediately tries to read messages (`conversations.history`) or post (`chat.postMessage`) in a public channel.
- **User Goal:** Read or send messages in a channel after OAuth completes.
- **Observed Symptom:** Slack API returns `{"ok": false, "error": "not_in_channel"}` (`SRC-SLACK-07`).
- **Conditions:** Using a Bot token (`xoxb-`) on a channel where the bot user has not been explicitly added/invited.
- **Likely Root Cause:** Corroborated Slack permission model behavior (`Grade A/C`, `SRC-SLACK-02`, `SRC-SLACK-07`): Authorizing a bot in a workspace does **not** add the bot as a member of every channel. Reading channel history (`channels:history`) requires the bot to be a member of that channel.
- **Problem Classification:** Permission/scope & post-auth setup misunderstanding.
- **Supporting Sources:** `SRC-SLACK-02`, `SRC-SLACK-07`.
- **Severity:** **High** (causes immediate post-install API failure).
- **Confidence:** High.
- **Prevention / Resolution:**
  - If the bot only needs to **post** to public channels without joining them, request `chat:write.public` alongside `chat:write` (`SRC-SLACK-02`, `SRC-SLACK-07`).
  - If the bot needs to **read** public channel history (`channels:history`), either request `channels:join` and call `conversations.join` first, or instruct users to run `/invite @YourBotName` in the target channel (`SRC-SLACK-07`). For private channels (`groups:history`), a human member **must** `/invite` the bot.
- **Guide Intervention:** Highlighted in **Section 4 (Step-by-Step Setup)**, **Section 6 (Where Developers Get Stuck)**, and **Section 7 (Test Before Launch)**.

### `PP-SLACK-03`: Single-Workspace Lock Until "Manage Distribution" Is Activated & Bolt `slack_oauth_missing_state` Error
- **Scenario:** Developer tests the app in their dev workspace, then sends the OAuth link to a customer in another workspace—or clicks the raw `slack.com/oauth/v2/authorize` link from the Slack console when using `@slack/bolt`.
- **User Goal:** Install the Slack app into an external workspace.
- **Observed Symptom:** External users cannot install the app (locked to the owning workspace), or Bolt fails on callback with `slack_oauth_missing_state` / `OAuth:InstallProvider:0 Error: redirect url is missing state or code query parameters` (`SRC-SLACK-01`, `SRC-SLACK-05`, `SRC-SLACK-06`).
- **Conditions:** (1) Public distribution has not been activated under `Manage Distribution` in the Slack App console; or (2) the developer initiated OAuth from the raw `slack.com` URL instead of Bolt's `/slack/install` endpoint (`SRC-SLACK-05`, `SRC-SLACK-06`).
- **Likely Root Cause:** Documented Slack distribution gate (`Grade A`, `SRC-SLACK-01`) + Maintainer-confirmed Bolt OAuth state cookie check (`Grade B`, `SRC-SLACK-05`, `SRC-SLACK-06`, `SRC-SLACK-08`).
- **Problem Classification:** Developer-console configuration + SDK implementation issue.
- **Supporting Sources:** `SRC-SLACK-01`, `SRC-SLACK-05`, `SRC-SLACK-06`, `SRC-SLACK-08`, `SRC-SLACK-09`.
- **Severity:** **High**.
- **Confidence:** High.
- **Prevention / Resolution:** Complete the **Manage Distribution** checklist in the Slack console (add an HTTPS Redirect URL, check the security confirmation box, and click **Activate Public Distribution**) before testing with external workspaces. When using Bolt (`bolt-js` / `bolt-python`), always start installations via `https://<your-domain>/slack/install` (with `directInstall: true` if desired) rather than pasting the raw `slack.com/oauth/v2/authorize` URL, and replace `MemoryInstallationStore` / `FileInstallationStore` with a database-backed `InstallationStore` (`SRC-SLACK-09`, `SRC-SLACK-10`).
- **Guide Intervention:** Detailed in **Section 4 (Step-by-Step Setup)** and **Section 6 (Where Developers Get Stuck)**.

### `PP-SLACK-04`: Non-Marketplace App Warning, Workspace Admin Blocks, and 10-Workspace / Multi-Month Marketplace Review Gate
- **Scenario:** Launching a Slack integration to B2B customers or using Composio's managed Slack app across customer workspaces.
- **User Goal:** Allow users in customer workspaces to connect Slack without friction.
- **Observed Symptom:**
  1. Users on strict workspaces see `"This app isn't listed in the Slack Marketplace"` or are forced to submit an Admin Approval request (`SRC-COMP-04`).
  2. When the developer tries to submit their custom Slack app to the Slack Marketplace to remove the warning, they discover Slack **rejects submissions from apps installed on fewer than 10 active workspaces with <10 weekly active users** (`SRC-SLACK-03`), rejects apps that "use Slack data to train LLMs" or "provide only an MCP server without meaningful in-Slack functionality" (`SRC-SLACK-03`), and takes **7–20+ weeks (2 to 5 months)** for review based on 2025–2026 developer reports (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`).
- **Conditions:** Installing any non-Marketplace Slack app (including Composio's managed Slack app, which is currently pending Marketplace review, `SRC-COMP-04`) or submitting a new app to the Slack Marketplace.
- **Likely Root Cause:** Official Slack Marketplace submission policy (`Grade A`, `SRC-SLACK-03`, `SRC-COMP-04`) + Corroborated review queue backlog (`Grade C`, `SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`).
- **Problem Classification:** Provider policy / approval gate & distribution strategy.
- **Supporting Sources:** `SRC-SLACK-03`, `SRC-COMP-04`, `SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`.
- **Severity:** **Critical** (major launch timeline misconception).
- **Confidence:** High.
- **Prevention / Resolution:**
  - **Do not block your initial product launch on Slack Marketplace listing**—you literally cannot submit until you already have 10+ active workspaces using your app via direct public OAuth distribution (`SRC-SLACK-03`).
  - Launch using **Direct Public Distribution** (`Manage Distribution` activated, no Marketplace review needed) and provide a clear 1-click admin approval guide for enterprise workspaces that enforce `Require approved apps` (`SRC-COMP-04`).
- **Guide Intervention:** Highlighted in **Section 1 (The Verdict)** and **Section 5 (Effort and Approval)** so developers separate immediate OAuth distribution (0 days wait) from optional Slack Marketplace listing (requires 10 active workspaces + 2–5 months review).

### `PP-SLACK-05`: Irreversible Token Rotation (`xoxe.`) Breaking Static Token Stores
- **Scenario:** Developer toggles **Opt in to token rotation** in the Slack App console under OAuth & Permissions.
- **User Goal:** Use expiring 12-hour access tokens (`xoxe.xoxb-...`) and refresh tokens (`xoxe-1-...`).
- **Observed Symptom:** Token rotation **cannot be turned off once enabled** (`SRC-SLACK-04`). If the app is not persisting every rotated `refresh_token` returned by `oauth.v2.access` (or if it was installed via the console "Install to Workspace" button rather than the full OAuth redirect flow), all tokens expire after 12 hours and the integration breaks (`SRC-SLACK-04`, `SRC-SLACK-08`, `SRC-SLACK-11`).
- **Conditions:** Enabling token rotation without a persistent refresh-token store or without migrating existing long-lived tokens via `oauth.v2.exchange`.
- **Likely Root Cause:** Documented Slack token rotation behavior (`Grade A/B`, `SRC-SLACK-04`, `SRC-SLACK-08`, `SRC-SLACK-10`, `SRC-SLACK-11`).
- **Problem Classification:** Token expiration, refresh, and revocation trap.
- **Supporting Sources:** `SRC-SLACK-04`, `SRC-SLACK-08`, `SRC-SLACK-10`, `SRC-SLACK-11`.
- **Severity:** **High**.
- **Confidence:** High.
- **Prevention / Resolution:** Test token rotation in a separate development Slack App first (since the toggle is irreversible). Ensure your database atomically saves both `access_token` and the new `refresh_token` on every `grant_type=refresh_token` call.
- **Guide Intervention:** Included in **Section 4 (Step-by-Step Setup)** and **Section 6 (Where Developers Get Stuck)**.

---

## 5. Notion Pain Points

### `PP-NOTION-01`: Empty `/v1/search` Results and `404 object_not_found` Because Pages Must Be Explicitly Shared
- **Scenario:** Developer creates an Internal Integration (`ntn_...` / `secret_...`) or completes the Public OAuth 2.0 flow, then calls `POST /v1/search` or `GET /v1/pages/{page_id}`.
- **User Goal:** Read or update Notion pages and databases.
- **Observed Symptom:** `POST /v1/search` returns `{"results": []}` with `200 OK`, and fetching a known page ID returns `404 Not Found` (`"code": "object_not_found", "message": "Could not find page with ID... Make sure the relevant pages and databases are shared with your integration"`, `SRC-NOTION-05`, `SRC-NOTION-06`, `SRC-NOTION-09`).
- **Conditions:**
  1. **Internal Integration:** The workspace user created the token and enabled capabilities, but did not open the target Notion page and click `••• (top right) → Add connections → <Integration Name>` (`SRC-NOTION-01`, `SRC-NOTION-05`). (Note: Older tutorials tell users to click "Share → Invite", which no longer shows integrations in the Notion UI, `SRC-NOTION-05`!)
  2. **Public OAuth Integration:** The authorizing user did not select any pages in the OAuth Page Picker—or the page they wanted to select did not appear in the picker because the user only had `Can view` / `Can edit` rather than **`Full Access`** on that page (`SRC-NOTION-01`, `SRC-NOTION-04`).
- **Likely Root Cause:** Documented Notion page-level access architecture (`Grade A/C`, `SRC-NOTION-01`, `SRC-NOTION-02`, `SRC-NOTION-04`, `SRC-NOTION-05`, `SRC-NOTION-06`).
- **Problem Classification:** Workspace/page permission model + outdated UI terminology in older tutorials.
- **Supporting Sources:** `SRC-NOTION-01`, `SRC-NOTION-02`, `SRC-NOTION-04`, `SRC-NOTION-05`, `SRC-NOTION-06`, `SRC-NOTION-09`, `SRC-COMP-06`.
- **Severity:** **Critical** (the single most frequent cause of "Notion API doesn't work after auth" reports).
- **Confidence:** High.
- **Prevention / Resolution:**
  - For Internal Integrations: instruct the user to open the parent page or database in Notion, click the **`•••` menu in the top-right corner → `Add connections`**, and attach the integration (sharing a parent page automatically grants access to its child pages).
  - For Public OAuth Integrations: configure an optional **Notion Template URL** in the Developer Portal or instruct users to select a top-level parent page (requiring `Full Access`) in the OAuth Page Picker (`SRC-NOTION-01`, `SRC-NOTION-04`).
  - Run an immediate post-OAuth check calling `POST /v1/search` with `page_size: 1`; if `results.length === 0`, prompt the user in your UI that they completed login but selected zero pages!
- **Guide Intervention:** Featured in **Section 1 (The Verdict)**, **Section 4 (Step-by-Step Setup)**, **Section 6 (Where Developers Get Stuck)**, and **Section 7 (Test Before Launch)**.

### `PP-NOTION-02`: `401 invalid_client` During Token Exchange Because Notion Requires HTTP Basic Auth + JSON Body
- **Scenario:** Developer implements custom OAuth 2.0 code exchange against `POST https://api.notion.com/v1/oauth/token`.
- **User Goal:** Exchange the temporary `code` for an `access_token` and `refresh_token`.
- **Observed Symptom:** Token endpoint returns `401 Unauthorized` / `{"error": "invalid_client"}` or `400 invalid_grant` (`SRC-NOTION-09`).
- **Conditions:** Sending `client_id` and `client_secret` inside the request body (standard in many OAuth libraries) or encoding the body as `application/x-www-form-urlencoded` instead of `application/json` with an `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)` header (`SRC-NOTION-01`, `SRC-NOTION-09`).
- **Likely Root Cause:** Documented Notion OAuth token endpoint specification (`Grade A`, `SRC-NOTION-01`, `SRC-NOTION-09`).
- **Problem Classification:** Authorization-flow & protocol quirk.
- **Supporting Sources:** `SRC-NOTION-01`, `SRC-NOTION-09`.
- **Severity:** **High** (blocks custom OAuth handshake).
- **Confidence:** High.
- **Prevention / Resolution:** Format the `POST https://api.notion.com/v1/oauth/token` request with:
  - Header `Authorization: Basic <base64(client_id + ":" + client_secret)>`
  - Header `Content-Type: application/json`
  - Header `Notion-Version: 2026-03-11` (or `2025-09-03`)
  - Body `JSON.stringify({ grant_type: "authorization_code", code, redirect_uri })` (note: include `redirect_uri` if and only if it was passed in the authorize URL or multiple redirect URIs are registered, `SRC-NOTION-01`).
- **Guide Intervention:** Explicitly shown with exact header/body structure in **Section 4 (Step-by-Step Setup)** and **Section 6 (Where Developers Get Stuck)**.

### `PP-NOTION-03`: Capability Model vs. OAuth Scopes + Missing User Email Addresses
- **Scenario:** Developer passes `scope=read_content,update_content` in the OAuth URL or wonders why `GET /v1/users` returns user objects without `person.email`.
- **User Goal:** Control integration permissions and retrieve workspace user emails.
- **Observed Symptom:** OAuth `scope` query parameters have no effect; or `GET /v1/users` omits email addresses even after OAuth succeeds (`SRC-NOTION-03`, `SRC-NOTION-09`, `SRC-COMP-06`).
- **Conditions:** Expecting runtime OAuth scopes instead of configuring **Connection Capabilities** in the Notion Developer Portal, or selecting `User information without email addresses` in the portal (`SRC-NOTION-03`). Furthermore, changing capabilities in the portal **does not update existing user tokens**—users must re-authenticate (`SRC-NOTION-03`).
- **Likely Root Cause:** Documented Notion Capability architecture (`Grade A`, `SRC-NOTION-03`, `SRC-COMP-06`).
- **Problem Classification:** Permission/capability configuration misunderstanding.
- **Supporting Sources:** `SRC-NOTION-03`, `SRC-NOTION-09`, `SRC-COMP-06`.
- **Severity:** **Medium**.
- **Confidence:** High.
- **Prevention / Resolution:** Configure `Read content`, `Update content`, `Insert content`, and `User information with email addresses` (if needed) in the Notion Developer Portal **before** users authorize. Do not pass `scope` parameters when creating a Composio Notion auth config (`SRC-COMP-06`).
- **Guide Intervention:** Explained in **Section 3 (Before You Begin)** and **Section 4 (Step-by-Step Setup)**.

### `PP-NOTION-04`: Re-Authentication Invalidates Previous `refresh_token` Across Shared OAuth Apps
- **Scenario:** A Notion user connects their account through a Composio-managed Notion app (or reconnects a second time to the same custom Notion OAuth app).
- **User Goal:** Maintain a working connection without unexpected token expiration.
- **Observed Symptom:** An existing Notion connection continues working briefly (until its current `access_token` expires), then permanently fails to refresh (`invalid_grant`) because the user re-authenticated through the same Notion OAuth app in another session or product (`SRC-COMP-06`, `SRC-NOTION-07`, `SRC-NOTION-09`).
- **Conditions:** Multiple connections by the same Notion user against the same Notion OAuth `client_id`, or concurrent refresh requests without locking (`SRC-COMP-06`, `SRC-NOTION-07`).
- **Likely Root Cause:** Documented in Composio's Notion toolkit documentation and Notion's MCP OAuth cookbook (`Grade A/B`, `SRC-COMP-06`, `SRC-NOTION-07`): Notion rotates tokens and invalidates older refresh tokens when the same user re-connects to the same Notion app.
- **Problem Classification:** Token lifecycle & Composio managed-vs-custom architectural trade-off.
- **Supporting Sources:** `SRC-COMP-06`, `SRC-NOTION-07`, `SRC-NOTION-09`.
- **Severity:** **High** (causes silent production connection drops on shared OAuth apps).
- **Confidence:** High.
- **Prevention / Resolution:**
  1. Reuse one active Notion connection per user rather than prompting repeated re-logins.
  2. For production multi-user products, **register your own custom Notion public integration** rather than relying on Composio's shared managed Notion app, so another product using Composio's managed Notion app cannot invalidate your user's refresh token (`SRC-COMP-06`).
  3. Persist rotated `refresh_token` values atomically with a mutex lock (`SRC-NOTION-07`).
- **Guide Intervention:** Featured in **Section 2 (Choose the Authentication Path)** and **Section 6 (Where Developers Get Stuck)**.

### `PP-NOTION-05`: Breaking API Version `2025-09-03` / `2026-03-11` (`data_sources` vs `databases`) and Shared Workspace Rate Limits (`429`)
- **Scenario:** Developer follows pre-2025 Notion tutorials calling `POST /v1/databases/{database_id}/query` or omits the `Notion-Version` header, or hits `429 rate_limited` despite low request volume.
- **User Goal:** Query database rows reliably in 2026.
- **Observed Symptom:** Missing `Notion-Version` returns `400 Bad Request`; querying multi-source databases via legacy `/v1/databases/{id}/query` fails on `2025-09-03` / `2026-03-11` API versions; or requests fail with `429 rate_limited` (`public_api_space_request_rate_limit`) even when the integration sends fewer than 3 req/sec (`SRC-NOTION-10`, `SRC-NOTION-11`, `SRC-NOTION-12`).
- **Conditions:** Using current Notion API versions (`2025-09-03` or `2026-03-11`) where databases are containers of `data_sources` (`POST /v1/data_sources/{data_source_id}/query`), or operating in a workspace where other integrations exhaust the **shared per-workspace rate limit** (`SRC-NOTION-12`).
- **Likely Root Cause:** Official Notion API upgrade & rate-limit documentation (`Grade A`, `SRC-NOTION-02`, `SRC-NOTION-10`, `SRC-NOTION-11`, `SRC-NOTION-12`).
- **Problem Classification:** API version migration & rate-limit architecture.
- **Supporting Sources:** `SRC-NOTION-02`, `SRC-NOTION-09`, `SRC-NOTION-10`, `SRC-NOTION-11`, `SRC-NOTION-12`.
- **Severity:** **Medium**.
- **Confidence:** High.
- **Prevention / Resolution:** Always send `Notion-Version: 2026-03-11` (or use `@notionhq/client` v4+), query rows via `dataSources.query` (`/v1/data_sources/{data_source_id}/query`), and honor the integer `Retry-After` header on both `429` (`rate_limited`) and `529` (`service_overload`) responses (`SRC-NOTION-12`).
- **Guide Intervention:** Included in **Section 4 (Step-by-Step Setup)** and **Section 7 (Test Before Launch)**.

---

## 6. Investigated Issues That Were Unverified, Historical, or Isolated

In accordance with our execution rules, the following issues were investigated during research but were either **isolated**, **historical/resolved**, or **unverified**, and are therefore not overstated as universal provider requirements:

1. **Notion Remote MCP Beta Missing `refresh_token` (`claude-code-notion-plugin#22`, `SRC-NOTION-08`):**
   - *Finding:* A developer reported that Notion's hosted `https://mcp.notion.com/token` endpoint advertised `refresh_token` support in `.well-known/oauth-authorization-server` but did not return `refresh_token` or `expires_in` during beta OAuth exchange.
   - *Assessment:* **Grade D (Isolated / Beta-specific report)**. This applies specifically to Notion's hosted MCP server (`mcp.notion.com`), *not* to standard Notion Public OAuth integrations (`https://api.notion.com/v1/oauth/token`) or Composio's `NOTION` toolkit (`SRC-COMP-06`), both of which issue access and refresh tokens. We note this distinction rather than claiming Notion OAuth lacks refresh tokens.
2. **Legacy Slack OAuth v1 (`oauth.access`) Deprecation:**
   - *Finding:* Older Stack Overflow posts reference `https://slack.com/api/oauth.access` and legacy `bot` umbrella scopes.
   - *Assessment:* **Historical / Obsolete**. All modern Slack apps use OAuth v2 (`oauth.v2.access`) with granular scopes (`SRC-SLACK-01`). Mentioned only to warn developers against copying pre-2020 Stack Overflow snippets.
3. **Google Cloud Console Redirect URI Propagation Taking "Up to Several Hours" (`SRC-GMAIL-12`):**
   - *Finding:* Third-party skill documentation notes redirect URI changes can take "five minutes to a few hours," whereas Composio's FAQ notes "wait a few minutes" (`SRC-COMP-05`).
   - *Assessment:* **Conditional timing**. In practice, propagation typically completes within 1–5 minutes, though edge-case caching delays occur. We advise waiting 5 minutes before debugging a freshly saved URI rather than stating multi-hour delays as standard.
4. **Exact Current Duration of Composio's Slack Marketplace Review (`SRC-COMP-04`):**
   - *Finding:* Composio's Slack documentation states: *"Composio is working on Marketplace review for the managed Slack app. Until that review is complete, use the workspace's own Slack OAuth app or ask a workspace admin to approve the app if the warning blocks users."*
   - *Assessment:* **Unresolved External Timing**. We cannot know when Slack will approve Composio's managed app, so we record the current documented state and date (`2026-10-23`) without guessing a completion date.
