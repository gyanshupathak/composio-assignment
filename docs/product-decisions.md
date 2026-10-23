# AuthPath Product & Architecture Decisions (`docs/product-decisions.md`)

**Last Updated:** 2026-10-23

---

## 1. Why the Problem Is Framed Around Launch Readiness

Most developer tools treat OAuth integration as a syntax problem: *"Here is the `/authorize` URL and here is the `/token` POST body."*

In practice, teams building AI agents and SaaS integrations rarely fail because they cannot write a `fetch()` call to a token endpoint. They lose days or miss product launches because of **hidden architectural, permission, and organizational gates**:
1. **Building on the wrong authentication primitive** (e.g., building a classic GitHub OAuth App with the monolithic `repo` scope only to have enterprise customers reject it, forcing a rewrite to a fine-grained GitHub App).
2. **Confusing "works in development" with "works in production"** (e.g., testing a Google OAuth app in `Testing` status and discovering 7 days after launch that all user refresh tokens expire with `invalid_grant`, or discovering that `gmail.readonly` requires a multi-week CASA security assessment).
3. **Confusing multi-workspace OAuth with Marketplace approval** (e.g., delaying a Slack launch for months waiting on Slack Marketplace review without realizing Slack *requires* 10 active workspaces via Direct Public Distribution before you are even eligible to submit to the Marketplace).
4. **Silent post-auth resource invisibility** (e.g., completing Notion OAuth with a `200 OK` token that returns `[]` on `/v1/search` and `404 object_not_found` on every page because zero pages were shared in the Page Picker, or hitting `not_in_channel` on Slack bot tokens).

Framing AuthPath around **launch readiness** ensures every guide answers the questions an engineering lead or product manager must know *before* committing to an integration architecture.

---

## 2. Why These Four Curated Applications Were Chosen

The four curated providers—**GitHub**, **Gmail / Google OAuth**, **Slack**, and **Notion**—were chosen not merely because they are popular, but because they expose **four fundamentally different integration and approval decision structures**:

| Provider | Core Architectural Decision Exposed | Primary Launch / Operational Gate | Composio Managed vs. Custom Nuance |
| :--- | :--- | :--- | :--- |
| **1. GitHub** | **GitHub App (fine-grained, per-repo) vs. OAuth App (coarse `repo` scope)** | **Customer Org Governance:** 0-day provider wait, but SAML SSO active-session enforcement (`403`) and Org Owner third-party app restrictions block enterprise users. | Composio supports custom GitHub Apps, but developers must manually provide the GitHub App installation link alongside OAuth (`SRC-COMP-02`). |
| **2. Gmail / Google** | **Scope Sensitivity Cliff:** Non-sensitive (`gmail.labels`) vs. Sensitive (`gmail.send`, 3–5d review) vs. Restricted (`gmail.readonly`/`modify`, multi-week CASA audit). | **Provider Security Audit & 7-Day Testing Time-Bomb:** External apps in `Testing` expire refresh tokens every 7 days; production Restricted scopes require an annual third-party CASA assessment. | Composio Managed Auth (`GMAIL`) is already verified for default scopes—making it ideal to bypass the 7-day Testing expiry immediately while custom CASA verification runs in parallel. |
| **3. Slack** | **Identity Split (`scope` Bot `xoxb-` vs. `user_scope` User `xoxp-`) & Two-Phase Distribution.** | **The 10-Workspace Catch-22:** You cannot submit to the Slack Marketplace until you already have ≥10 active workspaces (`SRC-SLACK-03`), and Marketplace review takes 7–20+ weeks. | Composio splits Slack into `SLACK` (user) and `SLACKBOT` (bot), and notes its managed Slack app is still pending Marketplace review—so strict customer workspaces require a custom Slack app (`SRC-COMP-04`). |
| **4. Notion** | **Audience Split:** Single-workspace Internal Connection (`ntn_` static token, no OAuth) vs. Multi-workspace Public Connection (OAuth 2.0 + Page Picker). | **Page-Level Sharing & Token Invalidation:** Notion has **no OAuth scopes** (uses portal Capabilities) and shares **zero pages** by default (`404 object_not_found`). | Re-authenticating the same user on a shared Notion OAuth app invalidates their prior `refresh_token`, and Notion attributes page edits to the app name ("Composio")—making a custom Notion app critical in production (`SRC-COMP-06`). |

---

## 3. Why the Guide Has Its 10-Section Structure

Every guide page follows a deliberate 10-section sequence designed around how a developer moves from evaluation to launch:
1. **Start here — The Verdict:** Gives an immediate, scannable answer on the recommended path, whether a custom OAuth app is required, active setup time, and the primary launch blocker.
2. **Choose the Authentication Path:** Separates provider OAuth support, Composio managed-auth status, and scenario-specific recommendations with an interactive scenario switcher.
3. **Before You Begin:** Surfaces only provider-specific prerequisites (such as Google Search Console domain verification or Notion's irreversible `Any workspace` creation toggle) before the developer opens a console.
4. **Step-by-Step Setup:** Pairs each action with *Where to do it*, *Why it matters*, *How to verify completion*, and *What to check if the expected outcome does not occur*.
5. **Effort and Approval:** Explicitly separates active hands-on coding (minutes) from compliance preparation (hours) and external review/admin queues (days to months).
6. **Where Developers Get Stuck:** Presents the highest-consequence corroborated pain points (`Symptom → Scenario → Root Cause → Prevention → Resolution → Evidence`).
7. **Test Before Launch:** An interactive, persistent verification checklist tailored to that provider's specific failure modes.
8. **What We Verified vs. Where You Must Intervene:** Separates documentation/issues inspected by the agent from human-only developer console actions and unresolved questions.
9. **Audited Source Ledger:** Inline clickable source badges (`[Grade A]`–`[Grade E]`) plus an expandable, filterable evidence table.
10. **Your Next Step & Feedback Loop:** One concrete action to take immediately, plus an embedded form to flag outdated steps or new pain points.

---

## 4. Why Evidence and Uncertainty Are Visible

AI developer tools lose trust when they present hallucinated parameters, outdated Stack Overflow workarounds, and primary official policies with identical confidence.

AuthPath makes epistemic quality visible without cluttering the reading experience:
- **Inline Source Badges (`SRC-GMAIL-04 [A]`):** Every setup step, prerequisite, path comparison, and pain point links directly to the exact supporting source(s).
- **Evidence Grading (`A`–`E`):** Distinguishes current official specs (`Grade A`) and maintainer-confirmed SDK guidance (`Grade B`) from corroborated developer reports (`Grade C`) and isolated reports (`Grade D`).
- **Explicit Unknowns:** When a provider does not publish an approval SLA (e.g., Notion Marketplace review), when a lookup fails (`Eval H`), or when no public OAuth flow is established (`BGMI`, `Eval C`), AuthPath states the unknown explicitly instead of guessing.

---

## 5. Why Curated and Generated Guides Share One Schema

Using a single runtime-validated schema (`GuideSchema` in `src/lib/schema/guideSchema.ts`) and a single viewer component (`GuideViewer.tsx`) for both Part A (Curated) and Part B (Generated) enforces three product guarantees:
1. **No Lower Bar for Live Agent Output:** A generated guide cannot skip evidence linking, mix active effort with approval wait times, or recommend Composio Managed Auth when status is `unknown`—because `GuideSchema.superRefine` rejects those violations at runtime.
2. **Consistent UX for Partial & Negative Outcomes:** Whether a guide is `complete_verified`, `partial_evidence`, or `no_public_oauth_found`, the developer gets the same predictable layout, honest status banner, research trace, and shareable URL (`/guides/[slug]`).
3. **Direct Auditability:** Evaluators and automated tests can run identical schema and critical-failure checks across both curated and dynamically generated guides.
