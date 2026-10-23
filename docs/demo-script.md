# AuthPath Evaluator Demo Script (`docs/demo-script.md`)

**Estimated Walkthrough Time:** 12–15 minutes (a live investigation takes 3–6 minutes of that)  
**Prerequisites:** Run `npm run dev` (or `npm run build && npm start`) and open `http://localhost:3000`. For Step 4, `AI_API_KEY` must be set in `.env.local`.

---

## Step 1 — Search for GitHub & Inspect the Authentication-Path Decision
1. On the homepage, type `GitHub` (or `gh`) into the search box and click **Find guide**, then **Open guide** (or click **GitHub** in the top bar).
2. **What to highlight:**
   - **Overview tab:** while Composio Managed OAuth (`GITHUB`) is available and fine for prototyping, AuthPath recommends a **custom GitHub App** (not a legacy OAuth App) for production private-repository integrations.
   - **Why:** a legacy OAuth App forces the broad `repo` scope (full read/write to all private code), whereas a GitHub App gives fine-grained permissions (`Issues: Read & write`, `Contents: Read-only`) and per-repository selection (`PP-GH-01`, `SRC-GH-02`).
   - **Common problems tab:** passing `scope=repo` to a GitHub App returns `scope: ""` and `404 Not Found` on private repos unless the app is installed, plus Composio's caveat that you must provide the installation link separately (`PP-GH-02`, `SRC-COMP-02`); and GitHub's **August 3, 2026** callback-URL matching change (`PP-GH-03`).

---

## Step 2 — Open Gmail and Show Scope-Dependent Verification
1. Click **Gmail** in the top bar — or search `Google`, open **Add details (optional)**, enter the goal `Send-only notification emails`, and click **Find guide** to see the goal note.
2. **What to highlight:**
   - **Pick what fits you (Overview tab):** switch between the inbox-reader, send-only and internal-company situations and show how the approval wait changes:
     - `Internal` Workspace app: **0 days** of Google review.
     - `gmail.send` (sensitive scope): **3–5 business days** (verified domain + demo video, **no CASA audit**).
     - `gmail.readonly` / `gmail.modify` (restricted scope): **several weeks** plus a mandatory annual third-party **CASA security assessment** (`SRC-GMAIL-04`, `SRC-GMAIL-05`).
   - **Common problems tab:** the **7-day refresh-token expiry (`invalid_grant`)** for External apps left in `Testing` (`PP-GMAIL-01`), and why the popular Reddit workaround of using a Service Account fails on personal `@gmail.com` accounts (`SRC-GMAIL-09`, `SRC-GMAIL-07`).

---

## Step 3 — Open Slack and Notion to Show Different Distribution Decisions
1. **Slack** (`/guides/slack`):
   - "Waiting for approval" at a glance and `PP-SLACK-04`: a new app cannot be submitted to the Slack Marketplace until it is installed on **≥10 active workspaces** (`SRC-SLACK-03`), and 2025–2026 reviews took **7–20+ weeks** (`SRC-SLACK-13`, `SRC-SLACK-14`). AuthPath steers developers to **Direct Public Distribution** first.
   - `PP-SLACK-02`: `not_in_channel` right after install unless `chat:write.public`, `channels:join` or `/invite @bot` is used.
2. **Notion** (`/guides/notion`):
   - In **Pick what fits you**, choose **Single-Workspace Internal Automation**: no OAuth needed — a Notion internal connection token works in about 10 minutes.
   - For multi-workspace apps, `PP-NOTION-01` (zero pages shared by default, so `/v1/search` is empty until pages are picked) and `PP-NOTION-04` (re-authorising invalidates the older `refresh_token`, `SRC-COMP-06`).
3. On any guide, tick a few **Launch checklist** items and refresh the page — progress is remembered.

---

## Step 4 — Investigate an App That Is Not in the Library (Live Agent)
1. Return to the homepage, type an app that has no guide yet — for example `Dropbox` or `Calendly` — and optionally add a goal (e.g. `Upload files to my users' Dropbox`). WhatsApp, Spotify, Zoom, Linear and BGMI already have example guides made by the agent (listed under **Guides made by the research agent**); open one of those if you want to skip the 3–6 minute wait.
2. Click **Find guide**. AuthPath says it has no guide yet; click **Research it now**.
3. **What to highlight while it runs (3–6 minutes):** the panel shows the real current stage and what it is doing, streamed live from the server — e.g. how many official pages it opened, how many links it followed inside the docs, how many follow-up searches the model planned, and how many sources were set aside as off-topic during cross-checking.
4. When it finishes, click **Open guide**.

---

## Step 5 — Inspect the Generated Guide & Verify the Shareable URL
1. The generated guide uses the same viewer and the same `GuideSchema` as the curated guides (overview, setup steps, common problems, launch checklist, sources & research).
2. **What to highlight:**
   - **Common problems tab:** each problem shows how strongly it is supported (documented by the provider, confirmed by a maintainer, reported by several developers, or a single unconfirmed report). Code downgrades any label the cited sources cannot support.
   - **Sources & research tab:** "What we checked" lists the follow-up searches and cross-checks the agent actually ran; "What we couldn't confirm" lists open questions; each source has a short note on what it says, and Reddit items are marked as read through the web-search summary only.
3. Click **Share guide**, then refresh the page or open the copied link in a new tab to confirm the guide was saved (in `data/runtime-generated-guides.json` when running locally, or in the Upstash database on the hosted site).

Note: live results depend on what the web returns that day, so the exact problems and step count vary from run to run. The deterministic versions of these behaviours are checked by `npm run evals` (Eval-A to Eval-L).

---

## Step 6 — Demonstrate Ambiguity Handling (`Mercury`)
1. On the homepage, type `Mercury` and click **Find guide**.
2. AuthPath refuses to guess and asks you to choose between **Mercury Banking (`mercury.com`)**, **Inception Labs Mercury LLM (`inceptionlabs.ai`)** and **Postlight Mercury Parser**.
3. Optionally open the saved BGMI guide (or type `BGMI`): AuthPath reports "No public OAuth path established", shows no invented setup steps, and points to KRAFTON partner access and tournament-platform alternatives instead. The same behaviour is checked deterministically by Eval-C.

---

## Step 7 — Explain Limitations and What Was Not Tested
Finish on the **Sources & research** tab of any guide:
- AuthPath researches public documentation, SDK code and developer reports; it **never claims to have logged into a provider console**, minted secrets or completed reviews on the user's behalf.
- Point out **What you'll do in your own account** and **What we couldn't confirm**, so the evaluator sees verified facts, developer reports and unknowns kept apart.
