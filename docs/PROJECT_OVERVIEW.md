# AuthPath — The Whole Project on One Page

This page explains, in plain words, what AuthPath is, what was built, what research was done, how it was checked, and where every file is. Each section points to the file with the full detail.

---

## 1. The problem

A developer building an AI agent wants their users to connect an app (GitHub, Gmail, Slack...). Before launch they often must create an "OAuth app" with that provider and sometimes get it approved. It is hard to know in advance:

- Do I need my own OAuth app, or can I use Composio's ready-made one?
- Is this one hour of work or weeks of waiting for a review?
- What will break, and what do other developers get stuck on?

AuthPath answers those questions with a guide you can read, follow and share.

## 2. What you can do with it

1. **Look up an app.** Type a name or website. If we already have a guide, it opens.
2. **Read the guide.** It tells you the recommended login setup, how long it takes, what could block launch, step-by-step setup, common problems, a launch checklist, and the sources behind every claim.
3. **Research a new app live.** If the app is not in the library, an AI agent researches it in about 3–6 minutes, shows each step as it happens, and saves a new guide.
4. **Share it.** Every guide has its own link (`/guides/<name>`) that keeps working after refresh.

## 3. What was built

| Part | What it is | Where |
| :--- | :--- | :--- |
| Ready-made guides | 4 guides researched by hand: **GitHub, Gmail, Slack, Notion**. Picked because each one has a different hard part (GitHub: which app type; Gmail: Google's security review; Slack: distribution rules; Notion: page sharing). | `src/data/curated/` |
| Live research agent | Researches any new app from real web sources and writes a guide in the same format. | `src/lib/research/` |
| One guide format | Both kinds of guide use the same data shape and the same page, so live guides are held to the same rules. | `src/lib/schema/guideSchema.ts`, `src/components/GuideViewer.tsx` |
| Website | Home page with search, guide pages with tabs, share button, feedback button. | `src/app/`, `src/components/` |
| Saving | Live guides are saved and get a share link: to a file on your own computer, or to a free Upstash Redis database on the hosted site. | `src/lib/persistence/` |
| Cost guard | The hosted site allows 10 new live researches per day, so a public demo cannot drain the OpenAI budget. | `src/lib/persistence/dailyLimit.ts` |
| Hosting setup | One file describing the free Render web service and its settings. | `render.yaml` |

## 4. The research done by hand (for the 4 ready-made guides)

The research was done before the guides were written, and every source is recorded.

| What | Number |
| :--- | :--- |
| Sources recorded in the source list | **87** (GitHub 22, Gmail 22, Slack 18, Notion 17, Composio 4, Linear 4) |
| Kinds of sources | Official docs, Composio docs, GitHub issues and SDK repos, Stack Overflow, Reddit, support pages, third-party guides |
| Developer problems written up | **20** (5 per app), each with symptom, cause, how sure we are, fix, and sources |
| Starting guesses tested | **7** (for example "developers create their own OAuth app when they don't need to") — each one confirmed, adjusted or rejected |
| Size of each ready-made guide | About 5,300 words, 5 setup steps, 5 common problems, 19–24 sources |

Where the research is:

- `docs/research/research-method.md` — how the research was done and how sources were graded (A = official docs ... E = guess).
- `docs/research/source-ledger.csv` — the list of all 87 sources: link, date, what it proves, how strong it is.
- `docs/research/pain-point-matrix.md` — the 20 developer problems and the 7 starting guesses.
- `docs/research/provider-dossiers/` — one research summary per app (`github.md`, `gmail.md`, `slack.md`, `notion.md`).
- `docs/research/guide-decisions.md` — how the research changed what the guides recommend.
- `docs/research/research-gaps.md` — what could not be found or confirmed, and where the source targets were not met.

## 5. What the live agent does (for a new app)

It follows the same method as the hand research, in 7 visible steps:

1. **Identify the app** — and ask you to clarify if the name is ambiguous (for example "Mercury").
2. **Read the official docs** — web-search for the provider's OAuth, permissions and app-review pages, open them, and follow useful links inside them.
3. **Find real developer problems** — read the docs, plan 7–9 targeted searches, then search Stack Overflow (with answers), GitHub issues (with maintainer replies), Reddit, forums and the web.
4. **Cross-check** — read all sources side by side, drop off-topic ones, merge duplicates, and mark each problem as documented, confirmed, seen by several people, or only a guess.
5. **Decide the login path** — check Composio's docs for a ready-made login, then choose the path from the evidence.
6. **Write and check the guide** — write it, then code removes links not found in the evidence, lowers unsupported confidence, and validates the whole guide.
7. **Save** — store it and give it a share link.

A typical run: about 15 searches, 11 AI calls, 3–6 minutes, 23–48 sources kept. It uses OpenAI `gpt-5.5`. Without an OpenAI key it still searches, but only writes a basic outline marked as low confidence.

Five real live guides are included in `data/sample-live-guides.json`, so you can open them without spending anything:

| App | Sources | Setup steps | Result |
| :--- | :--- | :--- | :--- |
| WhatsApp | 37 | 9 | Use Composio's ready-made login; Meta app review is the main blocker |
| Spotify | 48 | 9 | Composio has no ready-made login, so register your own app |
| Zoom | 44 | 8 | Use Composio's ready-made login |
| Linear | 40 | 9 | Use Composio's ready-made login |
| BGMI (a game) | 23 | 0 | No public login found — the agent says so instead of inventing steps |

## 6. How we know it works

| Check | Result | Where |
| :--- | :--- | :--- |
| Unit tests (small pieces of code, including the database store and the daily limit) | 48 pass | `tests/unit/` |
| Integration tests (whole agent with fake web and fake AI) | 20 pass | `tests/integration/` |
| Agent evaluations (12 tricky cases, e.g. ambiguous name, hidden instructions in a web page, unsafe URL, no public login) | 12 of 12 pass, score 240/240 | `evals/runner.ts` |
| Type check, lint, production build | All pass | `npm run typecheck`, `npm run lint`, `npm run build` |
| Hand checks against real sources | Composio status of all 5 live apps checked on Composio's own pages; Spotify's 6-month token limit checked on Spotify's docs; WhatsApp guide checked against its sources | `docs/evaluation.md` section 4 |
| Fresh setup test | The README steps were followed in a clean copy of the project (install, settings file, start, open every guide) | — |

Things the checks caught and that were fixed (details in `docs/evaluation.md`):

- The first BGMI run wrongly said Composio had a ready-made login. The Composio check was too loose; it is fixed and tested.
- A dropped connection once produced a weak Zoom guide. Calls are now retried, and the weak version says it is weak.
- Without an OpenAI key, the basic outline was labelled "high confidence". It is now labelled low confidence and says why.

There are no automated browser tests; the website was checked by hand.

## 7. The assignment, line by line

| The assignment asked for | Where it is |
| :--- | :--- |
| Look up an app and get a guide you can use and share | Home page search; guide pages at `/guides/<name>` |
| How easy or hard it is, time and effort, approval wait | Top of every guide ("At a glance") and the effort section |
| Requirements and nuances | "What you'll need first", setup steps, common problems |
| What an agent can do for you and where you take over | Each guide's "What we checked" / "What you'll do in your own account" sections |
| A few varied apps | 4 ready-made guides plus 5 live guides (section 5 above) |
| Submit an unfamiliar app and watch the guide generate live | "Research it now" on the home page (needs an OpenAI key) |
| Check guidance against real sources; say what was learned, corrected, or not verified | `docs/evaluation.md`, `docs/research/research-gaps.md`, `docs/research/source-ledger.csv` |
| Understand what a provider OAuth app is and Composio's managed OAuth | `docs/research/provider-dossiers/`, `docs/product-decisions.md` |
| A short README with setup, key decisions, limitations | `README.md` |
| Keep credentials out | Keys live only in `.env.local`, which git ignores; `.env.example` has placeholders only |
| A link to the working experience and the source repository | Live site: https://authpath.onrender.com/ · Source: https://github.com/gyanshupathak/composio-assignment |

## 8. Every folder and file

```
README.md                      Setup, key decisions, limitations (start here)
.env.example                   Settings template with placeholder keys
render.yaml                    Free hosting setup on Render (no keys inside)

docs/
  PROJECT_OVERVIEW.md          This page
  product-decisions.md         Why the problem is framed this way, why these 4 apps, why this guide layout
  evaluation.md                Tests, evaluations, live runs and hand checks
  demo-script.md               A step-by-step demo to show the product
  ui-redesign-brief.md         The design brief used to simplify the screens
  research/                    All hand research (see section 4)

src/
  app/                         Website pages and server endpoints
    page.tsx                   Home page
    guides/[slug]/             Guide page and "guide not found" page
    api/investigate/           Starts live research and streams its progress
    api/guides/                Lists and returns saved guides
    api/feedback/              "Something wrong? Let us know" reports
  components/
    HomeClient.tsx             Home page: search, live research progress
    GuideViewer.tsx            The guide page (tabs, steps, problems, sources)
    RichText.tsx, Navbar.tsx   Text formatting and top bar
  data/curated/                The 4 ready-made guides (GitHub, Gmail, Slack, Notion)
  lib/schema/guideSchema.ts    The one guide format and its honesty rules
  lib/persistence/
    guideStore.ts              Saving and loading guides (file on your computer, database when hosted)
    upstash.ts                 Talks to the Upstash Redis database
    dailyLimit.ts              The daily limit on new live researches
  lib/ui/glossary.ts           Plain-English explanations of terms like "OAuth" and "scope"
  lib/research/                The live agent
    agentOrchestrator.ts       Runs the 7 steps in order
    providerIdentifier.ts      Step 1: works out which app you mean
    webSearch.ts               Searches (OpenAI web search, Stack Overflow, GitHub, Composio docs)
    sourceExtractor.ts         Opens pages safely and strips hidden instructions
    urlValidator.ts            Blocks unsafe addresses (local network, cloud metadata)
    canonicalSources.ts        Removes duplicate sources and labels each source type
    deepResearch.ts            Plans follow-up searches and cross-checks findings
    painPointAnalyzer.ts       Builds the list of developer problems
    composioCheck.ts           Checks whether Composio has a ready-made login
    modelProvider.ts           Talks to OpenAI
    groundedWriter.ts          Writes the guide and enforces citation rules
    evalFixtures.ts            Saved evidence used only by tests and evaluations

tests/                         Unit and integration tests
evals/runner.ts                The 12 agent evaluations
data/sample-live-guides.json   5 real guides made by the live agent (read-only examples)
data/runtime-generated-guides.json  Guides you generate (created when you run it; not in git)
```

## 9. What it does not do (limitations)

- It does not log into provider consoles or create real OAuth apps; it researches public sources and tells you what you must do yourself.
- Live guides are written by AI from real sources and are not reviewed by a person.
- Live research needs an OpenAI API key and costs money per run (roughly 150k tokens). Without a key, it still searches but writes a basic outline marked as low confidence.
- The hosted site allows 10 new live researches per day for everyone together; after that it asks you to try again tomorrow. Existing guides always open.
- The free hosted site sleeps when nobody uses it; the first visit after that takes about a minute.
- Only 4 hand-made guides, not 100. Slack and Notion have fewer hand-checked sources than the target (see `research-gaps.md`).
- Reddit can only be read through search summaries, not opened directly.
- No cancel button for a running research; no automated browser tests.
