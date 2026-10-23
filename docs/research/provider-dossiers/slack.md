# Provider Dossier: Slack

**Provider:** Slack (`https://slack.com`, `https://api.slack.com/apps`)  
**Developer Docs:** `https://api.slack.com/authentication/oauth-v2`, `https://api.slack.com/start/distributing/guidelines`  
**Composio Toolkit Slugs:** `SLACK` (user-centric workspace actions, 171 tools, 9 triggers) and `SLACKBOT` (bot-centric messaging & commands) — Version `20261020_00`  
**Last Researched:** 2026-10-23

---

## 1. Intended Use Case & Integration Scenarios

Slack integrations require two upfront product decisions—**Identity Type (Bot vs. User)** and **Distribution Scope (Single Workspace vs. Multi-Workspace Direct vs. Slack Marketplace)**:
1. **Scenario A — In-Channel Bot / AI Assistant (`xoxb-` Bot Token / Composio `SLACKBOT`):** Responds to `@mentions`, slash commands, or posts notifications in channels.
2. **Scenario B — User-Delegated Workspace Search & Actions (`xoxp-` User Token / Composio `SLACK`):** Searches messages across the workspace (`search:read`), manages user stars/reminders, or posts messages attributed directly to the human user (`as_user=true`).
3. **Scenario C — Internal Single-Workspace Automation:** Installed only in the developer's own Slack workspace.

---

## 2. Authentication Options & Composio Managed-Auth Assessment

- **Provider Support:** Slack OAuth v2 (`https://slack.com/oauth/v2/authorize` and `https://slack.com/api/oauth.v2.access`), plus a dedicated user-centric RFC-compliant flow (`https://slack.com/oauth/v2_user/authorize` and `oauth.v2.user.access`, `SRC-SLACK-01`).
- **Composio Managed OAuth Status:** **Available** for both `SLACK` and `SLACKBOT` toolkits (`OAUTH2`, `SRC-COMP-01`, `SRC-COMP-04`).
- **Critical Composio Managed-Auth Caveat (`SRC-COMP-04`):**
  - Composio's managed Slack app is **currently undergoing Slack Marketplace review** (as of October 2026).
  - Consequently, when users in external workspaces connect via Composio's managed Slack app, Slack displays a **non-Marketplace app warning**, and workspaces with `Require apps from Slack Marketplace` or `Require approved apps` enabled (`Settings → Apps & Workflows → App Management Settings`) will block installation until a Workspace Owner/Admin approves the request (`SRC-COMP-04`).
  - Furthermore, for custom OAuth apps, **creating your own Slack OAuth app is strongly recommended** for production B2B deployments so customers see your brand and can approve your dedicated app ID in their workspace settings (`SRC-COMP-03`, `SRC-COMP-04`).

---

## 3. Distribution Paths: Direct Public Distribution vs. Slack Marketplace

One of the most consequential findings in our research is the distinction between **Activating Public Distribution** and **Listing in the Slack Marketplace** (`SRC-SLACK-01`, `SRC-SLACK-03`):

| Distribution Route | External Review Wait | Prerequisites | Who Can Install |
| :--- | :--- | :--- | :--- |
| **1. Single-Workspace (Default)** | **0 minutes** | Create Slack app + click "Install to Workspace". | Only members/admins of the single Development Workspace (`SRC-SLACK-01`). |
| **2. Direct Public Distribution (`Manage Distribution`)** | **0 minutes (Self-serve)** | Configure HTTPS Redirect URL + remove hardcoded tokens + check confirmation box in `Manage Distribution` (`SRC-SLACK-01`). | **Any Slack workspace worldwide** via your OAuth link (shows non-Marketplace notice; strict workspaces require workspace admin approval). |
| **3. Slack Marketplace Listing** | **7 to 20+ weeks (2–5 months)** (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`) | **Must already be installed on ≥10 active workspaces with ≥10 weekly active users** (`SRC-SLACK-03`); must have in-Slack UI (not just an MCP server or data exporter); must not train LLMs on Slack data (`SRC-SLACK-03`). | Any Slack workspace, plus discoverable in the Slack Marketplace without unapproved-app warnings. |

**Product Decision Impact:** Developers **cannot** submit a brand-new Slack app to the Slack Marketplace before launching. They **must** launch with **Direct Public Distribution** first until they reach at least 10 active customer workspaces (`SRC-SLACK-03`).

---

## 4. Most Important Developer Pain Points

1. **`PP-SLACK-01` — Bot Scopes (`scope` / `xoxb-`) vs. User Scopes (`user_scope` / `xoxp-`) & SIWS Conflict:** Passing a user-only scope like `search:read` in `scope` instead of `user_scope` fails; looking for a user token at `response.access_token` instead of `response.authed_user.access_token` fails; and combining Sign in with Slack (`openid`, `profile`, `email`) with workspace scopes in the same OAuth URL fails with a scope conflict (`SRC-SLACK-01`, `SRC-SLACK-02`, `SRC-COMP-04`).
2. **`PP-SLACK-02` — `not_in_channel` After OAuth Succeeds:** Installing a bot with `channels:history` or `chat:write` does not add the bot to channels. Calling `conversations.history` immediately returns `{"ok": false, "error": "not_in_channel"}` unless the bot is invited (`/invite @bot`), calls `conversations.join` (requiring `channels:join`), or uses `chat:write.public` for posting (`SRC-SLACK-02`, `SRC-SLACK-07`).
3. **`PP-SLACK-03` — Single-Workspace Lock & Bolt `slack_oauth_missing_state`:** Forgetting to activate `Manage Distribution` blocks all external workspaces (`SRC-SLACK-01`). When using `@slack/bolt`, linking users to the raw `slack.com/oauth/v2/authorize` URL instead of Bolt's `/slack/install` route skips state cookie generation and fails on callback with `slack_oauth_missing_state` (`SRC-SLACK-05`, `SRC-SLACK-06`, `SRC-SLACK-09`).
4. **`PP-SLACK-04` — Misunderstanding the 10-Workspace Gate & Multi-Month Slack Marketplace Queue:** Teams promise a Marketplace-listed launch date without knowing Slack requires 10 active customer workspaces upfront (`SRC-SLACK-03`) and that 2025–2026 review queues take 7–20+ weeks (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`).
5. **`PP-SLACK-05` — Irreversible Token Rotation (`xoxe.`):** Once turned on in the Slack console, token rotation **cannot be turned off** (`SRC-SLACK-04`). Access tokens expire every 12 hours (`43,200` seconds), refresh tokens are single-use, and failing to persist rotated tokens in a database `InstallationStore` breaks all installations after 12 hours (`SRC-SLACK-04`, `SRC-SLACK-08`, `SRC-SLACK-10`, `SRC-SLACK-11`).

---

## 5. What the Sources Establish vs. What Remains Uncertain

- **Established (`Grade A/B/C`):** OAuth v2 endpoints, `scope` vs `user_scope` response payloads, `team` parameter silent drop behavior when a user's browser session is logged into a different workspace (`SRC-SLACK-01`), irreversible 12-hour token rotation (`SRC-SLACK-04`), Marketplace eligibility rules (≥10 active workspaces, LLM training prohibition, MCP-only prohibition, `SRC-SLACK-03`), and Composio's `SLACK` vs `SLACKBOT` split (`SRC-COMP-04`).
- **Remains Uncertain / Conditional:**
  - Exact current Marketplace review duration for a new submission today (official docs state up to 10 weeks for functional review after 1–2 weeks preliminary review, while corroborated 2025–2026 developer reports span 7 weeks to 5 months depending on scope scrutiny and queue backlog, `SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-16`).

---

## 6. How This Research Changed the Slack Guide

1. **Two-Phase Launch Strategy:** The guide explicitly advises launching via **Direct Public Distribution** (`Manage Distribution`, 0 days external wait) to acquire the first 10+ active workspaces before attempting Slack Marketplace submission.
2. **Post-Auth Channel Membership Step:** Step-by-step setup includes an explicit step for handling channel membership (`chat:write.public`, `channels:join`, or `/invite @bot`) so developers don't hit `not_in_channel` on their first API call.
3. **`team.id` Verification Check:** Based on `SRC-SLACK-01`, the pre-launch checklist instructs developers to inspect `response.team.id` (or `enterprise.id`) returned by `oauth.v2.access` because Slack silently drops the `team` hint parameter if the user is signed into a different workspace.
