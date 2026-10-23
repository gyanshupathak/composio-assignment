# AuthPath

AuthPath helps developers connect an external app (GitHub, Gmail, Slack, any app) to their product. For each app it tells you which login setup to use, how long it takes, what could block your launch, and what problems other developers ran into — with sources for every claim.

It has two parts:

1. **4 ready-made guides** researched by hand: GitHub, Gmail, Slack and Notion.
2. **A live research agent**: type any other app and it researches the web and writes a new shareable guide in about 3–6 minutes.

**Live site:** [authpath.onrender.com](https://authpath.onrender.com/) · **Source:** [github.com/gyanshupathak/composio-assignment](https://github.com/gyanshupathak/composio-assignment)

> **New here? Read [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md).** It explains the whole project on one page: what was built, how much research was done, how it was tested, which file holds what, and where each part of the assignment is.

---

## Where each assignment deliverable is

| Deliverable | File |
| :--- | :--- |
| Whole project explained simply | [`docs/PROJECT_OVERVIEW.md`](docs/PROJECT_OVERVIEW.md) |
| The 4 ready-made guides | [`src/data/curated/`](src/data/curated/) |
| The live research agent | [`src/lib/research/`](src/lib/research/) (starts in `agentOrchestrator.ts`) |
| 5 example guides made by the live agent | [`data/sample-live-guides.json`](data/sample-live-guides.json) (WhatsApp, Spotify, Zoom, Linear, BGMI) |
| Research: method, 87 sources, 20 developer problems, per-app summaries, gaps | [`docs/research/`](docs/research/) |
| Guidance checked against real sources (what was learned, fixed, not verified) | [`docs/evaluation.md`](docs/evaluation.md), [`docs/research/research-gaps.md`](docs/research/research-gaps.md) |
| Key product decisions | [Below](#key-decisions), and in full in [`docs/product-decisions.md`](docs/product-decisions.md) |
| Demo walkthrough | [`docs/demo-script.md`](docs/demo-script.md) |
| Tests and agent evaluations | [`tests/`](tests/), [`evals/runner.ts`](evals/runner.ts) |

---

## Setup

### What you need
- **Node.js 20.9 or newer** (tested on 20.15.0) — download from [nodejs.org](https://nodejs.org). npm comes with it.
- **Optional:** an **OpenAI API key**, only for live research of new apps. The ready-made guides, the 5 example live guides, the tests and the evaluations all work without any key.

### Steps

```bash
# 1. Install
npm install

# 2. Create your settings file from the template
cp .env.example .env.local        # Windows Command Prompt: copy .env.example .env.local

# 3. (Optional) To use live research, open .env.local and set:
#    AI_API_KEY=your OpenAI key
#    Leave the other placeholder lines as they are.

# 4. Start
npm run dev
```

Open **http://localhost:3000**.

To run the faster production version instead: `npm run build` and then `npm start`.

### Settings (`.env.local`)

| Setting | Needed? | What it does |
| :--- | :--- | :--- |
| `AI_API_KEY` | Only for live research | Your OpenAI key. Without it, live research still searches the web but writes only a basic outline, marked as low confidence. |
| `AI_MODEL` | No (default `gpt-5.5`) | Which OpenAI model to use. |
| `AI_BASE_URL` | No | Only change this to use another OpenAI-compatible provider (OpenAI web search then becomes unavailable). |
| `TAVILY_API_KEY` | No | Adds Tavily as an extra search engine. |
| `COMPOSIO_API_KEY` | No | Lets the agent ask Composio's API directly whether it has a ready-made login for an app. Without it, the agent reads Composio's public docs instead. |
| `AUTHPATH_STORAGE_PROVIDER` | No | Where new guides and feedback are saved. `file` (default) = JSON files in `data/`, right for your own computer. `upstash` = a free Upstash Redis database, used when hosting. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Only with `upstash` | The database address and password, from the Upstash console. |
| `LIVE_RESEARCH_DAILY_LIMIT` | No | Maximum new live researches per day (resets at midnight UTC). Empty = no limit. Opening existing guides never counts. |

Placeholder values such as `your_tavily_api_key_here` are treated as "not set". Your real keys stay in `.env.local`, which git ignores.

---

## Try it

1. **Ready-made guide:** click **GitHub** (or Gmail, Slack, Notion) on the home page.
2. **Example live guides:** scroll to **Guides made by the research agent** and open WhatsApp, Spotify, Zoom, Linear or BGMI.
3. **Live research** (needs `AI_API_KEY`): type an app that is not in the library, for example `Dropbox` or `Calendly`, optionally describe your goal, and click **Research it now**. You will see the 7 steps happen live. When it finishes, the guide opens at its own link; refresh to confirm it was saved.
4. **Edge cases:** type `Mercury` (it asks which Mercury you mean), or `http://169.254.169.254/` (blocked as an unsafe address).

A step-by-step demo is in [`docs/demo-script.md`](docs/demo-script.md).

---

## Tests and evaluations

None of these need an API key.

```bash
npm run typecheck          # TypeScript check
npm run lint               # Code style check
npm test                   # All 77 tests (57 unit + 20 integration)
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only (whole agent with fake web and fake AI)
npm run evals              # 12 agent evaluations (ambiguous names, hidden instructions in pages, unsafe URLs, no public login, ...)
npm run build              # Production build
```

Latest results: all tests pass, 12 of 12 evaluations pass (score 240/240), type check, lint and build pass. There are no automated browser tests; the website was checked by hand.

---

## Hosting (free)

Source code: [github.com/gyanshupathak/composio-assignment](https://github.com/gyanshupathak/composio-assignment).

The public demo runs on [Render](https://render.com)'s free plan, with an [Upstash](https://upstash.com) free Redis database for saving. [`render.yaml`](render.yaml) holds the whole setup.

1. In Upstash, create a free Redis database and copy its **REST URL** and **REST token**.
2. In Render, choose **New → Blueprint**, pick this repository, and paste `AI_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` when asked. Everything else comes from `render.yaml`: the storage choice, the model, and a daily limit of 10.
3. Render builds with `npm ci && npm run build` and starts with `npm start`.

Keys are only ever typed into the Render dashboard; none are in the repository. Also set a monthly spending limit on the OpenAI account.

---

## Key decisions

1. **Focus on "can I launch?", not just "how do I call the API?"** Developers usually lose time on hidden gates — app reviews, wrong app type, permissions that trigger a security audit — so every guide leads with the recommended path, the effort, and what could block launch.
2. **4 apps with 4 different hard parts.** GitHub (which app type to build), Gmail (Google's security review depends on the permissions you ask for), Slack (distribution rules before the Slack Marketplace), Notion (internal vs public integration and page sharing).
3. **Research first, real sources only.** The guides were written after collecting 87 sources, including real developer reports from GitHub issues, Stack Overflow and Reddit. Every claim links to a source, and each problem says how sure we are.
4. **Composio's ready-made login is checked separately.** "The provider supports OAuth", "Composio has a ready-made login" and "you should use it" are treated as three different questions.
5. **One format for hand-made and AI-made guides.** The live agent must meet the same rules; code removes links that are not in its evidence and blocks recommendations the evidence does not support.
6. **Say "we don't know" instead of guessing.** If an app has no public login (for example BGMI), the guide says so and gives no invented steps.

---

## Limitations

1. **No real provider accounts were used.** AuthPath researches public docs and developer reports. It does not log into GitHub, Google, Slack or Notion consoles, create real OAuth apps, or submit apps for review.
2. **Live guides are AI-written and not reviewed by a person.** They are labelled as generated. A sample was checked by hand (see `docs/evaluation.md`).
3. **Live research costs money and time.** Each run takes about 3–6 minutes and uses roughly 150k OpenAI tokens.
4. **Saving is simple.** On your own computer new guides go to `data/runtime-generated-guides.json`. The hosted site saves them in a free Upstash Redis database instead, because free hosts wipe local files on every restart. There are no user accounts, and anyone can read every saved guide (they are meant to be shared).
5. **Only 4 hand-made guides, not 100.** Slack and Notion have fewer hand-checked sources than the target; the reasons are in `docs/research/research-gaps.md`.
6. **Reddit is read only through search summaries**, because Reddit blocks direct reads. Some JavaScript-only pages cannot be read and are marked as not read.
7. **Simple request limits.** At most 3 live researches run at once, identical requests share one run, and the hosted site allows 10 new live researches per day in total. The daily limit is shared by everyone (no per-user limit), counts every research that starts even if it later fails, and there is no cancel button.
8. **Free hosting is slow to wake up.** The hosted site sleeps after about 15 minutes without visitors; the first visit after that takes about a minute to load.
9. **No automated browser tests.** The website was checked by hand.

---

## Troubleshooting

- **Live research fails with `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or "self-signed certificate".** Your antivirus or company network is inspecting HTTPS traffic. Export its root certificate to a `.pem` file and set `NODE_EXTRA_CA_CERTS` to that file's path before `npm run dev`. AuthPath never turns certificate checks off.
- **Port 3000 is busy.** Run `npx next dev -p 3001` and open http://localhost:3001.
- **"Research it now" gives only a basic outline.** `AI_API_KEY` is missing or wrong in `.env.local`. Restart the server after editing it.
