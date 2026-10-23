# AuthPath Research Methodology

**Last Updated:** 2026-10-23  
**Scope:** Curated OAuth & Integration Setup Intelligence (GitHub, Gmail / Google OAuth, Slack, Notion, and Composio Managed Authentication) + Live Agent Research Protocol

---

## 1. Research Goals

Standard integration documentation tells a developer what a provider's API specification expects when everything goes right. **AuthPath** is designed around a different objective: **launch readiness and developer decision quality**.

Our research methodology investigates eight questions for every target application:
1. **Official Requirements:** What does the provider officially require to register, configure, authorize, and maintain an integration?
2. **Authentication Architecture:** Which authentication paths exist (e.g., OAuth App vs. GitHub App, Internal Token vs. Public OAuth, Bot vs. User tokens, Managed vs. Custom OAuth), and how does the developer's scenario dictate the right choice?
3. **Real-World Friction:** Where do developers actually lose hours or days when following the official instructions?
4. **Documentation Gaps & Conditionals:** Where is official documentation incomplete, scattered across multiple pages, version-dependent, or conditional on workspace/account tier?
5. **Prevalence vs. Isolation:** Which failure modes are corroborated across independent developer reports, and which are isolated or version-specific edge cases?
6. **External Dependencies & Approval Gates:** Which steps can a developer finish in 20 minutes on their own, and which depend on external organization admins, security assessors (e.g., CASA), or Marketplace reviewers taking weeks or months?
7. **Preventive Interventions:** What concrete check, configuration value, or architectural choice prevents rework before code is written?
8. **Epistemic Honesty:** What has been verified from primary or corroborated sources, and what remains unknown or unverified without logged-in console access?

---

## 2. Source Hierarchy and Evidence Quality Classification

Every source recorded in `docs/research/source-ledger.csv` and embedded in guide evidence records is evaluated using a strict five-tier classification:

| Grade | Classification | Definition & Usage Rules |
| :--- | :--- | :--- |
| **A** | **Current Primary Evidence** | Official provider API documentation, OAuth policy specifications, security/verification guidelines, changelogs, and official Composio toolkit/authentication docs. Used as authoritative ground truth for policy, endpoints, scopes, and documented limits. |
| **B** | **Maintainer-Confirmed Technical Evidence** | Responses, merged PRs, or issue explanations from verified SDK maintainers (e.g., `@octokit`, `@slackapi/bolt-js`, `@googleapis`, `@makenotion`) or official support knowledge base articles (e.g., IBM/HashiCorp SAML advisories). Used to establish SDK behavior, state handling, and confirmed workarounds. |
| **C** | **Corroborated Practical Experience** | Multiple reasonably independent developer reports across Stack Overflow, GitHub issue threads, developer forums, or Reddit describing the same failure mode, symptom, and trigger condition. Used to identify recurring developer traps and validate troubleshooting steps. |
| **D** | **Isolated Report** | A single developer issue, forum thread, or recent regression report (e.g., a beta MCP plugin issue) without independent multi-source corroboration. Included only when it highlights a high-consequence edge case, and explicitly labeled as an isolated or conditional observation rather than a widespread issue. |
| **E** | **Unverified Inference / Hypothesis** | A plausible technical explanation or community suggestion that has not been verified against primary docs or maintainer confirmation. Never stated as fact in guides; either investigated until resolved or logged in `docs/research/research-gaps.md`. |

---

## 3. Iterative Search Strategy

Research was conducted iteratively rather than via single-pass keyword queries:

1. **Pass 1 — Official Setup & Policy Mapping:** Retrieve registration guides, OAuth 2.0 flow specifications, scope/capability reference tables, token expiration/rotation rules, and production verification/distribution requirements.
2. **Pass 2 — Composio Managed-Auth Audit:** Retrieve Composio's current v3/v3.1 documentation (`/docs/authentication`, `/toolkits/managed-auth`, `/docs/authentication/custom-app-vs-managed-app`, and `/toolkits/<provider>`) to determine managed OAuth availability (`composio_managed_auth_schemes`), default callback URLs (`https://backend.composio.dev/api/v3/toolkits/auth/callback`), and toolkit-specific caveats.
3. **Pass 3 — Targeted Failure-Mode & Error-Code Search:** Formulate provider-specific queries using exact error codes and console terminology discovered in Passes 1–2:
   - *GitHub:* `redirect_uri_mismatch`, `bad_verification_code`, `X-OAuth-Scopes`, private repo `404`, `Resource protected by organization SAML enforcement`, `offline_access`, wildcard callback matching (August 2026 change).
   - *Gmail / Google OAuth:* `invalid_grant` 7-day testing expiry, `redirect_uri_mismatch`, missing `refresh_token` (`access_type=offline`, `prompt=consent`), `Error 400: invalid_scope`, `gmail.metadata` vs `gmail.readonly`, restricted scope verification & CASA security assessment, Service Account Domain-Wide Delegation myth.
   - *Slack:* `oauth.v2.access`, `bad_redirect_uri`, `slack_oauth_missing_state` (`/slack/install`), `not_in_channel`, `missing_scope`, `xoxb-` vs `xoxp-`, `xoxe.` token rotation, `Manage Distribution`, Slack Marketplace 10-workspace threshold & review wait times.
   - *Notion:* `object_not_found` (404) unshared page trap, `invalid_client` HTTP Basic Auth token exchange, capabilities vs scopes, re-authentication refresh token invalidation, `Notion-Version: 2025-09-03` / `2026-03-11` `/v1/data_sources` migration, `rate_limited` (`Retry-After`).
4. **Pass 4 — Workaround Verification:** Cross-check community-suggested fixes against current primary documentation to filter out unsafe or obsolete advice (for example, rejecting the Reddit suggestion to use a Google Service Account for personal `@gmail.com` accounts, or rejecting Bolt `stateVerification: false` in production when `/slack/install` solves the state error safely).

---

## 4. Source Selection, Deduplication, and Recency Rules

- **Distinct URLs vs. Independent Reports:** A high search-result count does not equal high real-world prevalence. Cross-posted Stack Overflow answers, scraped mirrors, and GitHub issues that merely link to an earlier issue are deduplicated when assessing whether a pain point is corroborated.
- **Recency and Version Context:** Every source is checked for publication/update dates and API/SDK version context. For instance:
  - GitHub's single-callback wildcard matching rule changed on **August 3, 2026**; older tutorials stating subdirectory redirects always work without configuration are now conditionally outdated.
  - Notion's API introduced multi-source databases in `2025-09-03` and updated header conventions in `2026-03-11`, deprecating `/v1/databases/{id}/query` in favor of `/v1/data_sources/{data_source_id}/query`.
  - Linear migrated all OAuth2 applications to mandatory refresh tokens on **April 1, 2026**.
- **Handling Conflicting Sources:** When community reports conflict with official documentation:
  - For **policy and protocol rules** (e.g., whether an endpoint requires HTTP Basic Auth or whether a scope is classified as Restricted), current **Grade A** official documentation takes precedence.
  - For **operational timelines and UX friction** (e.g., Slack Marketplace review taking 7–20 weeks in practice despite docs stating "up to 10 weeks" for functional review), both the official documented estimate and the corroborated developer reports (**Grade C**) are presented side-by-side with explicit attribution.

---

## 5. Mapping Research Claims to Product Decisions

A pain point or official requirement is only included in an AuthPath guide if it alters a developer's decision or prevents a concrete failure:

| Finding Category | Guide Intervention in AuthPath |
| :--- | :--- |
| **Auth-path trade-off** (e.g., GitHub App vs OAuth App; Notion Internal vs Public) | Surface in **Section 1 (The Verdict)** and **Section 2 (Choose the Authentication Path)** with scenario-specific recommendations. |
| **Console prerequisite or domain requirement** (e.g., Google Search Console domain verification; Slack HTTPS redirect URL) | Surface in **Section 3 (Before You Begin)** so developers do not start registration without required assets. |
| **Exact step configuration trap** (e.g., Notion Basic Auth header; Google `access_type=offline&prompt=consent`) | Embed directly in **Section 4 (Step-by-Step Setup)** inside the relevant step's *Completion Check* and *Common Failure Cases*. |
| **External review/approval gate** (e.g., Google CASA assessment; Slack Marketplace review; GitHub Org SAML approval) | Separate from hands-on coding time in **Section 5 (Effort and Approval)** with honest wait ranges and conditions. |
| **Corroborated runtime/setup failure** (e.g., Gmail 7-day testing token expiry; Notion `object_not_found`) | Feature in **Section 6 (Where Developers Get Stuck)** with Symptom, Root Cause, Prevention, Resolution, and Evidence links. |
| **Pre-launch verification check** (e.g., testing private repo 404 vs 200; verifying refresh token persistence) | Add as an interactive item in **Section 7 (Test Before Launch)**. |

---

## 6. Research Boundaries: Documentation Analysis vs. Live Console Execution

AuthPath enforces a strict boundary between **evidence-backed research** and **authenticated provider actions**:
- **What our research establishes:** Publicly documented protocol rules, parameter schemas, scope classifications, Composio toolkit specifications, maintainer-confirmed SDK behaviors, and corroborated developer issue patterns.
- **What our research does NOT perform:** The agent does not log into a developer's private Google Cloud Console, GitHub Organization Settings, Slack App Management portal, or Notion Developer Portal, nor does it mint live production client secrets or submit apps for Trust & Safety review.
- All steps requiring an authenticated developer account or organization administrator approval are explicitly marked with `responsibleParty: "developer"` or `"organization_admin"` and listed under **Human-Only Actions** in the guide viewer.
