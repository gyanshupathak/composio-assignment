# Provider Dossier: Gmail / Google OAuth

**Provider:** Google / Gmail API (`https://mail.google.com`, `https://console.cloud.google.com`)  
**Developer Docs:** `https://developers.google.com/gmail/api/auth/scopes`, `https://developers.google.com/identity/protocols/oauth2`  
**Composio Toolkit Slug:** `GMAIL` (Version `20261018_00`, 63 tools, 2 triggers)  
**Last Researched:** 2026-10-23

---

## 1. Intended Use Case & Integration Scenarios

Gmail integrations have vastly different security and approval footprints depending on what the AI agent or application actually does:
1. **Scenario A — Read, Search & Triage Inbox (`gmail.readonly` or `gmail.modify`):** The agent searches threads, summarizes incoming emails, drafts replies, or modifies labels. **Requires Restricted Scopes.**
2. **Scenario B — Send-Only Transactional / Notification Agent (`gmail.send`):** The agent sends outbound emails on the user's behalf without reading their inbox. **Requires Sensitive Scope only (no CASA security assessment).**
3. **Scenario C — Internal Google Workspace Tool (`Internal` User Type):** The integration is used strictly by employees inside a single company's Google Workspace domain. **Requires zero Google verification.**

---

## 2. Authentication Options & Composio Managed-Auth Assessment

- **Provider Support:** OAuth 2.0 Web Server flow (`https://accounts.google.com/o/oauth2/v2/auth` and `https://oauth2.googleapis.com/token`). Note that Service Accounts **cannot** access consumer `@gmail.com` accounts and only work with Google Workspace accounts when a domain admin configures Domain-Wide Delegation (`SRC-GMAIL-04`, `SRC-GMAIL-07`).
- **Composio Managed OAuth Status:** **Available** (`OAUTH2` supported on `GMAIL` toolkit, `SRC-COMP-01`, `SRC-COMP-05`).
- **Recommended Path by Stage:**
  1. **Development, Prototyping, or Early Launch with Default Scopes:** **Use Composio Managed OAuth (`GMAIL`)**. Because Composio maintains a verified Google OAuth app for its default Gmail scopes, your users avoid the 7-day `Testing` mode token expiration and you avoid waiting weeks for Google's Restricted Scope Verification before validating your product (`SRC-COMP-03`, `SRC-COMP-05`).
  2. **Internal Google Workspace Automation:** **Register a Custom Google OAuth App set to `Internal` User Type**. Takes ~20 minutes, never expires after 7 days, requires no Google review, and gives you a dedicated API quota (`SRC-GMAIL-02`).
  3. **Production External / White-Labeled App:** **Register a Custom Google OAuth App (`External` → `Published` + Verified)**. Required to show your own brand name/logo on the Google consent screen, isolate your API rate limits from Composio's shared quota (`SRC-COMP-05`), or request extra scopes like `gmail.settings.basic` (`SRC-COMP-05`).

---

## 3. Scope Tiers and Verification Consequences

Google classifies Gmail scopes into three tiers (`SRC-GMAIL-04`, updated Sept 10, 2026):

| Tier | Gmail Scopes | Verification Requirement for External Production Apps |
| :--- | :--- | :--- |
| **Non-Sensitive** | `gmail.labels`, `gmail.addons.current.action.compose`, `gmail.addons.current.message.action` | **Brand Verification only** (typically 2–3 business days; automated check completes in minutes, `SRC-GMAIL-03`, `SRC-GMAIL-05`). |
| **Sensitive** | `gmail.send`, `gmail.addons.current.message.metadata`, `gmail.addons.current.message.readonly` | **Sensitive Scope Verification** (typically **3–5 business days** after brand verification; requires verified domain in Search Console + unlisted YouTube demo video, `SRC-GMAIL-03`). |
| **Restricted** | `gmail.readonly`, `gmail.modify`, `gmail.compose`, `gmail.insert`, `gmail.metadata`, `gmail.settings.basic`, `gmail.settings.sharing` (DWD only), `https://mail.google.com/` | **Restricted Scope Verification + Annual CASA Security Assessment** (takes **several weeks**; mandatory third-party security assessment if restricted data is stored on or transmitted through any server, plus Limited Use compliance, `SRC-GMAIL-04`, `SRC-GMAIL-05`). |

**Crucial Scope Rules:**
- **Do not request `https://mail.google.com/`** unless your app specifically needs to permanently delete messages bypassing Trash (`SRC-GMAIL-04`).
- **Do not combine `gmail.metadata` with `gmail.readonly` or `gmail.modify`** (`SRC-COMP-05`). If your agent needs full email bodies, omit `gmail.metadata` entirely.

---

## 4. Most Important Developer Pain Points

1. **`PP-GMAIL-01` — The 7-Day `Testing` Mode Refresh Token Time-Bomb (`invalid_grant`):** External apps in `Testing` status are capped at 100 test users and their refresh tokens automatically expire after **7 days** (`SRC-GMAIL-02`, `SRC-GMAIL-06`). Developers frequently follow Reddit advice to switch to a Service Account (`SRC-GMAIL-09`), which fails for `@gmail.com` users (`SRC-GMAIL-07`).
2. **`PP-GMAIL-02` — Unplanned Multi-Week CASA Audit for Inbox Reading:** Developers build an inbox-reading agent (`gmail.readonly`) assuming OAuth approval takes a couple of days, only to hit Restricted Scope Verification + annual CASA security assessment requirements (`SRC-GMAIL-05`).
3. **`PP-GMAIL-03` — Missing `refresh_token` on Re-Login (`access_type=offline` + `prompt=consent`):** Google only returns `refresh_token` on the **first** consent screen approval. Re-running OAuth without `prompt=consent` returns an `access_token` with no `refresh_token` (`SRC-GMAIL-01`, `SRC-GMAIL-10`, `SRC-GMAIL-12`). Conversely, forcing `prompt=consent` on every login eventually exceeds the **100 refresh tokens per account per client ID** limit, silently invalidating older tokens (`SRC-GMAIL-06`).
4. **`PP-GMAIL-04` — `"App is blocked"` When Adding Extra Scopes to Managed Auth + `gmail.metadata` Conflicts:** Adding `gmail.settings.basic` to Composio's managed auth triggers Google's block screen (`SRC-COMP-05`); combining `gmail.metadata` with `gmail.readonly` breaks full body retrieval (`SRC-COMP-05`).
5. **`PP-GMAIL-05` — `Error 400: redirect_uri_mismatch` & Forgot to Enable Gmail API:** Creating OAuth credentials in Google Cloud Console does **not** automatically enable the Gmail API (`"Gmail API has not been used in project"`, `SRC-COMP-05`), and redirect URIs require exact trailing-slash and HTTPS matching with up to a 5-minute console propagation delay (`SRC-GMAIL-01`, `SRC-GMAIL-12`).

---

## 5. What the Sources Establish vs. What Remains Uncertain

- **Established (`Grade A/B/C`):** Exact scope tier table (`2026-09-10`), `Testing` vs `Published` behavior matrix (`2026-05-22`), 7-day testing refresh token expiration, 100 refresh-token limit per user/client, password change invalidating Gmail refresh tokens (`SRC-GMAIL-06`), 2–3 business day brand verification, 3–5 business day sensitive scope review (`SRC-GMAIL-03`), and multi-week restricted scope + annual CASA requirement (`SRC-GMAIL-05`).
- **Remains Uncertain / Conditional:**
  - Exact CASA security assessment out-of-pocket cost and assessor scheduling duration for a specific startup's architecture (depends on the Google-empanelled assessor tier and remediation rounds).

---

## 6. How This Research Changed the Gmail Guide

1. **Goal-Driven Scope Triage in Section 2:** The guide explicitly separates Send-Only agents (`gmail.send`, Sensitive, 3–5 days review, no CASA) from Inbox-Reading agents (`gmail.readonly` / `gmail.modify`, Restricted, multi-week CASA review), recommending Composio Managed Auth for immediate launch of inbox-reading agents while custom verification runs in parallel.
2. **Explicit Warning Against the Service Account Myth:** Section 6 debunks the popular community workaround of using Service Accounts for personal `@gmail.com` accounts.
3. **Separate Testing vs. Production GCP Projects:** Incorporates Google's policy (`SRC-GMAIL-16`) that production OAuth clients must live in a separate GCP project free of `localhost` redirect URIs.
