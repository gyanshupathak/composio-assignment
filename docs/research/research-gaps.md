# Research Gaps, Limitations, and Unresolved Questions (`research-gaps.md`)

**Last Updated:** 2026-10-23  
**Purpose:** Explicitly document inaccessible sources, retrieval failures, conflicting or conditional evidence, and unresolved provider questions so nothing in AuthPath is overstated or fabricated.

---

## 1. Explicit Source Retrieval Failures & Inaccessible Endpoints

| URL / Target | Provider | Retrieval Outcome | Impact & How Handled |
| :--- | :--- | :--- | :--- |
| `https://docs.composio.dev/toolkits/google.md` (`SRC-COMP-09`) | Gmail / Google | `HTTP 404 Not Found` | Confirmed that Composio does not publish a single monolithic `/toolkits/google.md` page; instead, each Google service has its own toolkit page (`/toolkits/gmail`, `/toolkits/googlecalendar`, `/toolkits/googledrive`). Logged in `source-ledger.csv` and handled via alias mapping (`google` / `google-mail` → `gmail`). |
| Live `GET https://backend.composio.dev/api/v3.1/toolkits/{slug}` authenticated API calls | Composio | Not executed at research time (requires live `COMPOSIO_API_KEY`) | We verified `composio_managed_auth_schemes` and toolkit metadata (`GITHUB` v20261014_00, `GMAIL` v20261018_00, `SLACK` v20261020_00, `NOTION` v20261018_00) directly from Composio's current primary documentation pages (`SRC-COMP-01` through `SRC-COMP-06`). In the live agent (`composioCheck.ts`), if `COMPOSIO_API_KEY` is not configured or the API call fails, the agent checks documented managed-auth evidence or reports `unknown` rather than guessing. |
| Logged-in Provider Developer Consoles (`console.cloud.google.com`, `github.com/settings/apps`, `api.slack.com/apps`, `notion.so/profile/integrations`) | All | Requires authenticated human developer account | Our research is based on primary official documentation, SDK source code, and corroborated developer issue reports. Console UI steps that require an authenticated developer account are marked as `responsibleParty: "developer"` and listed under **Human-Only Actions**. |

---

## 2. Conflicting or Conditional Evidence Across Sources

1. **Google Refresh Token Limit Per Account Per Client ID (`50` vs `100`):**
   - *Conflict:* Google's primary OAuth 2.0 documentation (`SRC-GMAIL-06`) currently states: *"There is currently a limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID."* Meanwhile, Composio's Gmail FAQ (`SRC-COMP-05`) and older Stack Overflow posts state `~50 per account`.
   - *Resolution in Guide:* We cite Google's primary documentation (`100` live refresh tokens per account per client ID) as the current authoritative limit while noting that older docs/FAQs reference `~50`, and emphasize the same operational fix: persist and reuse the first `refresh_token` rather than passing `prompt=consent` on every login.
2. **Slack Marketplace Functional Review Timeline ("Up to 10 weeks" vs "3 to 5 months"):**
   - *Conflict:* Slack's official communications estimate 1–2 weeks for preliminary review and "up to 10 weeks" for functional review, whereas multiple independent 2025–2026 developer reports (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`) report total wait times of **7–12 weeks** up to **5 months** end-to-end.
   - *Resolution in Guide:* We present both numbers transparently in Section 5 (Effort and Approval), clearly distinguishing Slack's stated guideline from corroborated developer wait times, and recommend launching via **Direct Public Distribution** (`0 days` wait) first.
3. **Google Cloud Console Redirect URI Propagation Time ("A few minutes" vs "Up to a few hours"):**
   - *Conflict:* Composio's docs (`SRC-COMP-05`) mention waiting "a few minutes," while third-party OAuth engineering docs (`SRC-GMAIL-12`) note changes can take "five minutes to a few hours."
   - *Resolution in Guide:* We advise waiting at least 5 minutes after saving a redirect URI before concluding it is broken, while noting occasional longer propagation delays.

---

## 3. Isolated Reports Not Generalized as Universal Issues

- **Notion Remote MCP Beta Token Endpoint (`SRC-NOTION-08`, `Grade D`):**
  - Issue `makenotion/claude-code-notion-plugin#22` (Feb 2026) reported that `https://mcp.notion.com/token` did not return a `refresh_token` during beta OAuth exchange.
  - Because this applies only to Notion's hosted MCP beta server (`mcp.notion.com`) and contradicts standard Notion OAuth behavior on `https://api.notion.com/v1/oauth/token` (`SRC-COMP-06`, `SRC-NOTION-07`, `SRC-NOTION-16`), we classify it as `Grade D (Isolated)` and do not claim standard Notion OAuth lacks refresh tokens.

---

## 4. Research Coverage Against the Source Targets

The build brief set a target of roughly 20–35 distinct sources per curated app, with at least 5 official pages and 10 community reports where available. Counted from `source-ledger.csv` (the guides' own evidence lists hold 19–24 sources each because some also cite the 4 shared Composio pages):

| App | Ledger rows | Official pages | Community reports (issues, Q&A, Reddit, repos, support) | Against target |
| :--- | :--- | :--- | :--- | :--- |
| GitHub | 22 | 12 | 9 | Total met; community one short of 10 |
| Gmail | 22 | 7 | 11 | Met |
| Slack | 18 | 5 | 12 | Total 2 short of 20 |
| Notion | 17 | 9 | 6 | Total and community both short |

Notion has fewer independent community reports because most Notion OAuth discussion is about the hosted MCP beta or repeats the same page-sharing problem; we did not pad the ledger with duplicates or unrelated threads. GitHub's community evidence is concentrated in SDK repositories and Reddit rather than Stack Overflow.

---

## 5. Unresolved Provider Questions

1. **Composio GitHub App Auto-Installation Link Release Date:**
   - `SRC-COMP-02` states *"Composio does not currently provide the GitHub App installation link automatically during this flow... Built-in installation-link handling is being worked on."* No target completion date is published.
2. **Composio Managed Slack App Marketplace Approval Date:**
   - `SRC-COMP-04` states *"Composio is working on Marketplace review for the managed Slack app."* No target completion date is published.
3. **Notion Public Marketplace / Gallery Review SLA:**
   - While Notion Public Connections can be authorized via OAuth immediately once configured, Notion does not publish an official turnaround time for optional public listing in the Notion Integrations Marketplace.
4. **CASA Security Assessment Cost Variance for Gmail Restricted Scopes:**
   - Google's Restricted Scope Verification docs (`SRC-GMAIL-05`) require an annual CASA security assessment from a Google-empanelled assessor if restricted data touches a server, but Google does not publish a fixed fee schedule because pricing and duration depend on the application's architecture and selected assessor tier.
