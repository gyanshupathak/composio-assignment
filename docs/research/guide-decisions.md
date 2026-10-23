# Guide Product Decisions (`guide-decisions.md`)

**Last Updated:** 2026-10-23  
**Purpose:** Record how multi-source research findings were translated into concrete product recommendations, effort estimates, scope choices, and guide structures for the four curated applications.

---

## 1. Cross-Provider Product Decisions

### 1.1 Separating Three Questions Developers Conflate
Every AuthPath guide separates three distinct assessments in its data model and UI:
1. **Provider Support:** Does the external application publicly document OAuth 2.0, another auth scheme (e.g., API key / internal token), or no discoverable public OAuth path?
2. **Composio Managed-Auth Status:** Does Composio provide a managed OAuth app for this specific toolkit and auth scheme (`composio_managed_auth_schemes`)?
3. **Recommended Path for the Developer's Scenario:** Should *this* developer use Composio Managed Auth, register a Custom OAuth App, or use an alternative auth method (like a GitHub App or Notion Internal Token)?

**Why this matters:** Composio provides managed OAuth2 for all four curated apps (`GITHUB`, `GMAIL`, `SLACK`, `NOTION`, `SRC-COMP-01`). A naive tool would simply say *"Use Composio Managed Auth for all four!"* Our research proved why that advice fails in production:
- **GitHub:** Managed OAuth uses a traditional OAuth App with coarse scopes; production apps accessing private repositories should use a **Custom GitHub App** for fine-grained permissions (`PP-GH-01`).
- **Gmail:** Managed OAuth is the best way to **start immediately** (bypassing the 7-day Testing token expiry and multi-week CASA audit during prototyping), but production apps needing custom branding, dedicated quota, or extra scopes (`gmail.settings.basic`) must register and verify a **Custom Google OAuth App** (`PP-GMAIL-01`, `PP-GMAIL-02`, `PP-GMAIL-04`).
- **Slack:** Composio's managed Slack app is not yet listed in the Slack Marketplace (`SRC-COMP-04`), triggering warnings or admin blocks in strict workspaces. Production B2B apps should register a **Custom Slack App with Direct Public Distribution enabled** (`PP-SLACK-03`, `PP-SLACK-04`).
- **Notion:** Single-workspace teams should not use OAuth at all (**Internal Connection `API_KEY`** is faster and simpler). Multi-workspace production apps should register a **Custom Notion Public Connection** because Notion attributes edits to the integration name ("Composio") and invalidates older refresh tokens when the same user reconnects to the same shared OAuth app (`PP-NOTION-04`, `SRC-COMP-06`).

---

## 2. Decisions by Curated Provider

### 2.1 GitHub (`github`)
- **Recommended Route by Scenario:**
  - *Prototyping / Internal Dev:* Composio Managed OAuth (`GITHUB`).
  - *Production / Private Repos / Org Customers:* Custom **GitHub App** (with User-to-Server OAuth enabled) — or Custom OAuth App only if restricted to public repos/user identity or Enterprise object administration.
- **Scope / Permission Choices:**
  - For GitHub Apps: Request fine-grained permissions (`Contents: Read-only` or `Read & write`, `Issues: Read & write`, `Pull requests: Read & write`, `Metadata: Read-only`). Do **not** pass `scope=repo` in the authorize URL (`PP-GH-02`).
  - For OAuth Apps: Use `read:user user:email` for identity, `public_repo` for public repos, and `repo` only when private repo access is unavoidable (`PP-GH-01`).
- **Effort Estimate Assumptions:**
  - *Active Hands-On Setup:* **15–30 minutes** (Managed Auth: ~5 mins; Custom GitHub App + callback + installation flow: 20–30 mins).
  - *External Provider Approval Wait:* **0 days** (GitHub does not gate OAuth or GitHub App usage on provider review unless listing a paid app in the GitHub Marketplace).
  - *Customer Org Admin Wait:* **Conditional (Hours to Days)** if the target customer organization enforces SAML SSO or Third-Party OAuth App restrictions (`PP-GH-04`).
- **Human-Only Actions:** Registering the GitHub App/OAuth App in GitHub Developer Settings, generating the client secret/private key, installing the GitHub App on target repositories, and approving SAML/Org access.

### 2.2 Gmail / Google OAuth (`gmail`)
- **Recommended Route by Scenario:**
  - *Prototyping / Fast Launch with Default Scopes:* Composio Managed OAuth (`GMAIL`) to avoid the 7-day `Testing` refresh token expiry while building.
  - *Internal Google Workspace Tool:* Custom Google OAuth Client with User Type = `Internal` (0 days review, no 7-day expiry).
  - *Production External App (Send-Only):* Custom Google OAuth Client with `gmail.send` (Sensitive Scope Verification: 3–5 business days).
  - *Production External App (Read/Modify Inbox):* Custom Google OAuth Client with `gmail.readonly` or `gmail.modify` (Restricted Scope Verification + Annual CASA Security Assessment: several weeks).
- **Scope / Permission Choices:**
  - Strictly match scopes to capability: `gmail.labels` (Non-sensitive), `gmail.send` (Sensitive), `gmail.readonly` (Restricted, read/search), `gmail.modify` (Restricted, read/send/label/trash). Avoid `https://mail.google.com/` unless permanent bypass-trash deletion is required (`SRC-GMAIL-04`). Never combine `gmail.metadata` with `gmail.readonly` or `gmail.modify` (`PP-GMAIL-04`).
- **Effort Estimate Assumptions:**
  - *Active Hands-On Setup:* **25–45 minutes** (GCP project creation, enabling Gmail API, configuring OAuth consent screen, creating Web Client ID, registering exact redirect URI).
  - *Verification Preparation Work:* **2–6 hours** (verifying domain in Google Search Console, hosting privacy policy with Limited Use disclosure on same domain, recording unlisted YouTube demo video showing client ID in URL bar, completing CASA self-assessment/remediation if restricted).
  - *External Provider Approval Wait:* **2–3 business days** (Brand verification) + **3–5 business days** (Sensitive scopes like `gmail.send`) OR **several weeks (typically 3–8 weeks)** for Restricted scopes (`gmail.readonly`/`gmail.modify`) requiring third-party CASA assessment (`SRC-GMAIL-03`, `SRC-GMAIL-05`).
- **Human-Only Actions:** Enabling Gmail API in GCP Console, verifying domain ownership via DNS in Google Search Console, recording and uploading the YouTube demo video, and completing the third-party CASA security assessment.

### 2.3 Slack (`slack`)
- **Recommended Route by Scenario:**
  - *Prototyping / Permissive Workspaces:* Composio Managed OAuth (`SLACKBOT` for bot actions, `SLACK` for user actions).
  - *Production Multi-Workspace SaaS:* Custom Slack App with **Direct Public Distribution** activated (`Manage Distribution`) — and optional Slack Marketplace submission only after reaching ≥10 active customer workspaces (`PP-SLACK-04`).
- **Scope / Permission Choices:**
  - Bot scopes (`scope`): `chat:write`, `chat:write.public` (to post in public channels without `/invite`), `channels:read`, `channels:history`, `channels:join`, `app_mentions:read`, `commands`.
  - User scopes (`user_scope`): `search:read` (only available as a user scope, warning: scrutinized heavily in Marketplace review, `SRC-SLACK-03`).
  - Never mix `openid`/`profile`/`email` (Sign in with Slack) with workspace scopes in the same OAuth flow (`PP-SLACK-01`).
- **Effort Estimate Assumptions:**
  - *Active Hands-On Setup:* **20–40 minutes** (creating Slack app, configuring Bot/User scopes, setting HTTPS Redirect URL, activating `Manage Distribution`).
  - *Marketplace Submission Prep (Optional / Post-Traction):* **4–8 hours** (achieving 10 active workspaces & 10 WAUs, creating 1600×1000 screenshots, landing page, privacy policy, App Home onboarding, scope justifications).
  - *External Provider Approval Wait:* **0 days** for Direct Public Distribution via OAuth link. **7 to 20+ weeks (2–5 months)** if submitting to the Slack Marketplace (`SRC-SLACK-03`, `SRC-SLACK-13`, `SRC-SLACK-14`).
- **Human-Only Actions:** Creating the Slack App at `api.slack.com/apps`, activating `Manage Distribution`, inviting the bot to private channels (`/invite @bot`), and workspace admin approval in restricted customer workspaces.

### 2.4 Notion (`notion`)
- **Recommended Route by Scenario:**
  - *Single Workspace (Internal Team Automation):* **Notion Internal Connection (`API_KEY` / `ntn_...`)** — no OAuth needed (`SRC-NOTION-01`, `SRC-NOTION-13`).
  - *Prototyping Multi-Workspace OAuth:* Composio Managed OAuth (`NOTION`).
  - *Production Multi-Workspace SaaS:* **Custom Notion Public Connection (OAuth 2.0)** with Installation Scope set to `Any workspace` at creation time (`SRC-NOTION-14`), preventing cross-app refresh token invalidation and "Composio" author attribution (`SRC-COMP-06`).
- **Capability Choices:**
  - Toggle `Read content`, `Update content`, `Insert content` as needed in the Notion Developer Portal. Leave `User information` set to `without email addresses` unless your product genuinely needs user emails (`PP-NOTION-03`). Do not pass OAuth `scope` query strings.
- **Effort Estimate Assumptions:**
  - *Active Hands-On Setup:* **10–15 minutes** for an Internal Connection; **25–40 minutes** for a Custom Public OAuth Connection (including HTTP Basic Auth token exchange and post-OAuth empty-search verification).
  - *External Provider Approval Wait:* **0 days** for Internal Connections and direct OAuth installation of Public Connections (`Any workspace`). Optional public Notion Marketplace listing review has no published SLA in Notion's docs.
- **Human-Only Actions:** Creating the integration in `notion.so/profile/integrations`, choosing `Any workspace` installation scope at creation, sharing pages via `••• → Add connections` (or selecting pages with `Full Access` in the OAuth Page Picker), and pasting the reverse webhook verification token if using custom webhooks.
