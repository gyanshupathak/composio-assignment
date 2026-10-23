# AuthPath UI Redesign Brief (Prompt)

Use this brief whenever the AuthPath interface is redesigned or extended.

---

## The problem

The current screens show everything at once. A developer opening a guide sees dozens of boxes, badges, internal codes, and unexplained technical words on a single page. Nothing tells them where to look first. Reading it is harder than reading the provider's own documentation.

## The goal

Keep **every piece of information** we have today, but present it so a developer (or a non-technical teammate) can:

1. Understand the answer in **10 seconds**.
2. Follow the setup in **one calm, linear flow**.
3. Find details, risks, and sources **only when they want them**.
4. Understand every technical word **without leaving the page**.

The experience should feel like good documentation (Stripe, Linear, Vercel docs): quiet, spacious, and readable.

---

## Design principles

1. **One idea per screen area.** Never place more than 3–4 cards side by side.
2. **Answer first, details later (progressive disclosure).** Show the summary up front. Put reasoning, edge cases, and sources behind tabs, "Read more" toggles, and expandable rows.
3. **Plain words over jargon.** Every heading and label is written for a beginner. Technical terms stay in the content (developers need them) but are always explained on hover or tap.
4. **No internal codes on screen.** Never display research IDs like `SRC-GH-01`, `PP-GMAIL-03`, evidence grades like `[A]`, or raw enum values like `complete_verified`. Sources appear as friendly links ("Official docs · docs.github.com").
5. **Calm visuals.** Warm off-white background, white rounded cards, generous spacing, one soft accent colour (teal), muted amber only for warnings, red only for real blockers. No dense borders, no colourful badge walls.
6. **Readable type.** Body text 15–16px, line-height ~1.7, line length under ~75 characters for paragraphs.
7. **Honest, but gentle.** Uncertainty and "we could not verify this" stay visible, but in one clearly labelled place rather than sprinkled everywhere.

---

## Information architecture for a guide page

### Header
- App name, a **one-sentence plain-English summary**, last-updated date, number of sources checked.
- Buttons: "Share guide" and "Official docs".

### At a glance (4 tiles maximum)
- Recommended approach
- Hands-on setup time
- Waiting for approval
- Difficulty (Easy / Medium / Hard — needs approval / Unclear)

### "Confused by a word?" glossary
- A toggle that opens a plain-English glossary of only the terms used in this guide.

### Tabs (one at a time, sticky under the header)
1. **Overview** — our recommendation and why (short, with "Read more"), a "Pick what fits you" chooser for different situations, "Know this before launch" as a short bullet list, "What you'll need first", and expandable "Compare all options" and "Does Composio handle the login?".
2. **Setup steps** — a vertical numbered stepper. Each step shows only the title, the instruction, who does it, and a time estimate. "How to check it worked" and "Common mistakes" sit inside a collapsed "Tips for this step".
3. **Common problems** — an accordion. Each row shows only a plain title and an impact label ("Can block launch", "Common and painful", "Good to know"). Opening a row shows: what you'll see, why it happens, how to avoid it, how to fix it.
4. **Launch checklist** — checkboxes with a progress bar; progress is remembered.
5. **Sources & research** — what we checked, what you must do in your own account, what is still uncertain, and the full list of sources filterable by "Official docs" and "Developer reports".

### Footer of every guide
- A single, calm "Your next step" card with one clear action button.
- A small "Report something outdated" link.

---

## Homepage

- One centred headline, one sentence of explanation, and **one large search box**.
- Optional details ("What do you want to do?", "Who will use it?") hidden behind "Add details (optional)".
- Example chips under the search box.
- When researching a new app, show a **single progress bar** with the current step in plain words ("Reading official docs…"). The 7 detailed steps are available behind "Show details".
- Four guide cards: app initial, name, one-sentence summary, setup time, approval wait.
- A short "How it works" strip with three steps.

---

## Language rules

| Instead of | Say |
| :--- | :--- |
| Provider OAuth support: `oauth_confirmed` | "Supports login with OAuth" |
| Composio managed auth: `available` | "Composio can handle the login for you" |
| `register_custom_oauth_app` | "Create your own app" |
| Pain points | Common problems |
| Evidence / Grade A | Sources / Official docs |
| `partial_evidence` | "Some details could not be confirmed" |
| Human-only actions | Things you need to do in your own account |
| Restricted scope + CASA | "Reading emails needs Google's longest review, including a yearly security check (CASA)" — with a hover explanation |

Technical identifiers such as `gmail.readonly`, `redirect_uri`, `invalid_grant`, or `xoxb-` stay visible because developers will type them, but they are shown as soft code chips with a hover/tap definition.

---

## Glossary (explained on hover/tap)

OAuth, Composio managed login, your own OAuth app, scope/permission, redirect (callback) URL, access token, refresh token, client ID/secret, `invalid_grant`, `redirect_uri_mismatch`, CASA, restricted vs. sensitive Google permissions, Gmail permission names (`gmail.readonly`, `gmail.send`, `gmail.modify`, `gmail.metadata`), Testing mode, Google verification, service account, GitHub App vs. OAuth App, `repo` permission, SAML SSO, marketplace, Slack public distribution, bot vs. user token, token rotation, `not_in_channel`, Notion internal vs. public connection, page picker, capabilities, `object_not_found`, Basic auth, rate limits, workspace admin, `actor=app`.

---

## Acceptance checklist

- [ ] No research IDs, evidence grades, or enum values are visible anywhere.
- [ ] A first-time visitor can say the recommendation for each app after 10 seconds.
- [ ] Each guide shows at most one tab of content at a time.
- [ ] Every technical term in the visible text has a hover/tap explanation the first time it appears.
- [ ] Nothing from the previous version was removed — it was moved behind tabs or toggles.
- [ ] Works on a phone screen with no horizontal scrolling.
- [ ] Keyboard users can reach tabs, toggles, and explanations.
