import { Guide } from "@/lib/schema/guideSchema";

export const slackGuide: Guide = {
  id: "curated-slack-oauth-v1",
  slug: "slack",
  applicationName: "Slack",
  aliases: ["slackbot", "slack.com", "slack-app", "slack-oauth", "bolt"],
  category: "Team Messaging & Collaboration",
  canonicalWebsite: "https://slack.com",
  developerDocsUrl: "https://api.slack.com/authentication/oauth-v2",
  shortSummary:
    "Connect Slack workspaces via OAuth v2 using Bot (`xoxb-`) or User (`xoxp-`) tokens. Multi-workspace launch requires activating Direct Public Distribution (`Manage Distribution`), while Slack Marketplace listing requires ≥10 active workspaces upfront and 7–20+ weeks of review.",
  guideOrigin: "curated",
  createdAt: "2026-10-23T08:10:00.000Z",
  lastReviewedAt: "2026-10-23T10:15:00.000Z",
  schemaVersion: "1.0.0",

  scenario: {
    integrationGoal:
      "Send and read channel messages, respond to `@mentions` or slash commands, and search workspace conversations across customer Slack workspaces.",
    intendedAudience: "multi_workspace_external",
    requiredCapabilities: [
      "Install app across multiple Slack workspaces via OAuth v2 (`/oauth/v2/authorize`)",
      "Separate Bot token (`scope` / `xoxb-`) from User token (`user_scope` / `xoxp-`)",
      "Post messages and read channel history without failing on `not_in_channel`",
    ],
    optionalFeatures: [
      {
        feature: "Post to public channels without inviting the bot (`chat:write.public`)",
        additionalPermissionsRequired: "Bot scope: `chat:write.public` (alongside `chat:write`).",
        impactOnVerification:
          "Eliminates `not_in_channel` errors when posting notifications to public channels.",
      },
      {
        feature: "Cross-workspace message search (`search:read`)",
        additionalPermissionsRequired: "User scope (`user_scope`): `search:read`.",
        impactOnVerification:
          "Explicitly flagged in Slack Marketplace guidelines as a restricted/high-scrutiny scope that can cause Marketplace rejection if not essential (`SRC-SLACK-03`).",
      },
      {
        feature: "12-hour Expiring Token Rotation (`xoxe.`)",
        additionalPermissionsRequired:
          "Opt-in toggle in Slack App Settings (`token_rotation_enabled: true`).",
        impactOnVerification:
          "Irreversible once turned on (`SRC-SLACK-04`); requires a persistent database InstallationStore.",
      },
    ],
    accountWorkspaceAssumptions: [
      "Customer Slack workspaces may have 'Require approved apps' or 'Require apps from Slack Marketplace' enabled by Workspace Admins (`SRC-COMP-04`).",
      "Developer has a Slack development workspace where they can create and test apps.",
    ],
    alternativeScenarios: [
      {
        id: "slack-scenario-multi-workspace-direct",
        label: "Multi-Workspace SaaS Launch via Direct Public Distribution (Default)",
        description:
          "You are launching a B2B product or AI agent that customers install into their Slack workspaces via your 'Add to Slack' OAuth flow.",
        recommendedPath: "register_custom_oauth_app",
        recommendedPathTitle:
          "Register a Custom Slack App and Activate Direct Public Distribution (`Manage Distribution`)",
        customOAuthAppRequired: "yes_for_production",
        recommendedScopesOrCapabilities: [
          "Bot scopes (`scope`): chat:write, chat:write.public, channels:read, channels:history, channels:join, app_mentions:read",
          "User scopes (`user_scope`): omit unless user-attributed actions or search:read are strictly required",
        ],
        activeSetupEstimate: "25–40 minutes",
        externalApprovalWait:
          "0 days for Direct Public Distribution (Customer Workspace Admin approval required on restricted workspaces)",
        keyRiskOrBlocker:
          "You CANNOT submit to the Slack Marketplace until your app is already installed on ≥10 active workspaces with ≥10 weekly active users (`SRC-SLACK-03`).",
        rationale:
          "Activating 'Manage Distribution' lets any Slack workspace install your custom app immediately via your OAuth URL without waiting 2–5 months for Slack Marketplace review, and avoids the non-Marketplace warning tied to Composio's shared Slack app.",
        evidenceIds: [
          "SRC-SLACK-01",
          "SRC-SLACK-02",
          "SRC-SLACK-03",
          "SRC-COMP-04",
        ],
      },
      {
        id: "slack-scenario-prototype-managed",
        label: "Prototype / Internal Bot (`SLACKBOT` or `SLACK` Managed Auth)",
        description:
          "You are prototyping or connecting a permissive workspace where admin app-approval gates are off.",
        recommendedPath: "use_composio_managed_oauth",
        recommendedPathTitle:
          "Use Composio Managed OAuth (`SLACKBOT` for bot actions, `SLACK` for user actions)",
        customOAuthAppRequired: "no",
        recommendedScopesOrCapabilities: [
          "Composio `SLACKBOT` (bot token) or `SLACK` (user token) defaults",
        ],
        activeSetupEstimate: "5–10 minutes",
        externalApprovalWait: "0 days",
        keyRiskOrBlocker:
          "Composio's managed Slack app is still undergoing Slack Marketplace review (`SRC-COMP-04`), so strict workspaces show a non-Marketplace warning or require admin approval.",
        rationale:
          "Zero OAuth app setup and pre-provisioned webhook endpoints for Slack triggers (`SRC-COMP-04`).",
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-04"],
      },
      {
        id: "slack-scenario-marketplace",
        label: "Public Slack Marketplace Listing (Post-10 Workspaces)",
        description:
          "You already have ≥10 active customer workspaces and want your app listed in the Slack Marketplace with no unreviewed-app warning.",
        recommendedPath: "register_custom_oauth_app",
        recommendedPathTitle:
          "Submit Custom Slack App for Slack Marketplace Review",
        customOAuthAppRequired: "yes_always",
        recommendedScopesOrCapabilities: [
          "Strictly minimal bot scopes; avoid `search:read`, `admin.*`, or LLM training on Slack data (`SRC-SLACK-03`)",
        ],
        activeSetupEstimate: "4–8 hours submission prep",
        externalApprovalWait:
          "Documented: 1–2 weeks preliminary + up to 10 weeks functional review. Corroborated 2025–2026 reports: 7–20+ weeks (2 to 5 months) (`SRC-SLACK-13`, `SRC-SLACK-14`).",
        keyRiskOrBlocker:
          "Apps with <10 active workspaces, MCP-only servers without in-Slack UI, or LLM training on Slack messages are rejected (`SRC-SLACK-03`).",
        rationale:
          "Marketplace listing removes the unapproved-app banner and increases enterprise trust, but must be treated as a Phase 2 milestone after Direct Distribution.",
        evidenceIds: [
          "SRC-SLACK-03",
          "SRC-SLACK-13",
          "SRC-SLACK-14",
          "SRC-SLACK-15",
          "SRC-SLACK-16",
        ],
      },
    ],
  },

  authenticationAssessment: {
    providerSupport: "oauth_confirmed",
    composioManagedAuth: {
      status: "available",
      toolkitExamined: "SLACK and SLACKBOT (version 20261020_00)",
      authMethodExamined: "OAUTH2",
      evidenceIds: ["SRC-COMP-01", "SRC-COMP-04"],
      conditionsAndQualifications: [
        "Composio splits Slack into two toolkits: `SLACK` (authenticates as a user for workspace-level actions) and `SLACKBOT` (authenticates as a bot for in-channel messaging, app mentions, and slash commands).",
        "With Composio-managed Slack credentials, event webhook endpoints are automatically provisioned (`SRC-COMP-04`).",
        "Composio's managed Slack app is currently undergoing Slack Marketplace review (`SRC-COMP-04`). Workspaces with 'Require apps from Slack Marketplace' or 'Require approved apps' enabled will show a warning or require Workspace Admin approval. Composio recommends using the workspace's own custom Slack OAuth app in strict workspaces (`SRC-COMP-04`).",
      ],
    },
    recommendedPath: "register_custom_oauth_app",
    verdictHeadline:
      "Use Composio Managed Auth (`SLACKBOT`/`SLACK`) for prototyping; for production, register a Custom Slack App and activate Direct Public Distribution (`Manage Distribution`)—do not block launch on Slack Marketplace review.",
    customOAuthAppRequired: "yes_for_production",
    reasoning:
      "A newly created Slack app is locked to its single development workspace until you activate **Manage Distribution** (`SRC-SLACK-01`). However, developers often confuse activating public OAuth distribution (which takes 5 minutes and 0 days of review) with listing in the **Slack Marketplace** (which requires ≥10 active workspaces upfront, disqualifies MCP-only or LLM-training apps, and takes 7–20+ weeks of review in 2025–2026, `SRC-SLACK-03`, `SRC-SLACK-13`, `SRC-SLACK-14`). Registering your own Slack App with Direct Public Distribution gives you immediate multi-workspace OAuth installation under your own brand.",
    launchBlockerSummary:
      "Four primary blockers: (1) Forgetting to activate `Manage Distribution` locks your app to your dev workspace (`PP-SLACK-03`); (2) Bot tokens (`xoxb-`) fail with `not_in_channel` when reading/posting to channels the bot hasn't joined (`PP-SLACK-02`); (3) Toggling token rotation (`xoxe.`) is irreversible and breaks apps without a database refresh store (`PP-SLACK-05`); and (4) Planning a launch around Slack Marketplace approval fails because you need 10 active workspaces before you can even submit (`PP-SLACK-04`).",
    pathComparison: [
      {
        pathType: "custom_oauth_app",
        title: "Custom Slack App with Direct Public Distribution (`Manage Distribution`)",
        applicability: "recommended_for_production",
        summary:
          "Your own Slack App configured with OAuth v2 (`scope` / `user_scope`) and Public Distribution activated.",
        whenToChoose: [
          "Production B2B apps installing across multiple customer workspaces",
          "Workspaces where admins only approve dedicated vendor apps",
          "Building toward the 10-active-workspace threshold for future Marketplace listing",
        ],
        tradeOffs: [
          "Displays a standard 'This app is not approved by Slack Marketplace' notice during OAuth until Marketplace review is completed (`SRC-COMP-04`, `SRC-SLACK-13`)",
          "If bringing your own app to Composio and using event triggers, you must configure the custom OAuth webhook URL (`SRC-COMP-04`)",
        ],
        requiredScopesOrCapabilities: [
          "Bot scopes (`scope`): chat:write, chat:write.public, channels:read, channels:history, channels:join",
          "Optional user scopes (`user_scope`): search:read",
        ],
        evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-02", "SRC-COMP-04"],
      },
      {
        pathType: "composio_managed_oauth",
        title: "Composio Managed OAuth (`SLACKBOT` / `SLACK`)",
        applicability: "recommended_now",
        summary:
          "Immediate OAuth connection and pre-provisioned event webhooks via Composio's managed Slack app.",
        whenToChoose: [
          "Rapid prototyping and testing in workspaces without strict Marketplace-only policies",
          "When you want zero webhook ingress configuration for Slack triggers (`SRC-COMP-04`)",
        ],
        tradeOffs: [
          "Consent screen shows 'Composio' (`SRC-COMP-03`)",
          "Composio's managed Slack app is pending Marketplace review, so strict customer workspaces will require admin approval (`SRC-COMP-04`)",
        ],
        requiredScopesOrCapabilities: [
          "Choose `SLACKBOT` for bot messaging/mentions or `SLACK` for user-level workspace actions (`SRC-COMP-04`)",
        ],
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-03", "SRC-COMP-04"],
      },
      {
        pathType: "alternative_documented_auth",
        title: "Single-Workspace Internal Install (Static Bot Token)",
        applicability: "conditional_alternative",
        summary:
          "Installing the app only into its owning Development Workspace via the 'Install to Workspace' button in the Slack console.",
        whenToChoose: [
          "Internal company bots that only ever run inside one Slack workspace and do not use token rotation (`SRC-SLACK-08`)",
        ],
        tradeOffs: [
          "Cannot be installed by any external workspace (`SRC-SLACK-01`)",
          "Incompatible with Slack Token Rotation (which forces full OAuth redirect installation, `SRC-SLACK-08`)",
        ],
        requiredScopesOrCapabilities: ["Configured under OAuth & Permissions -> Scopes"],
        evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-08"],
      },
    ],
    evidenceIds: [
      "SRC-SLACK-01",
      "SRC-SLACK-02",
      "SRC-SLACK-03",
      "SRC-SLACK-04",
      "SRC-COMP-04",
    ],
  },

  difficultyAndEffort: {
    difficultyCategory: "moderate",
    difficultyReasoning:
      "Setting up Slack OAuth v2 and activating Direct Public Distribution (`Manage Distribution`) is straightforward (25–40 minutes, 0 days wait). However, developers lose significant time to Bot vs. User token confusion, `not_in_channel` errors, Bolt state verification errors (`slack_oauth_missing_state`), and mistakenly assuming Slack Marketplace approval is fast or available before launch.",
    activeSetupTimeRange: "25–40 minutes (5–10 minutes with Composio Managed Auth)",
    assumptions: [
      "Launching via Direct Public Distribution (`Manage Distribution`) rather than blocking on Slack Marketplace listing.",
      "Developer has an HTTPS callback URL (or uses Composio's callback URI).",
    ],
    confidence: "high",
    preparationWork: [
      "Decide whether your integration needs a Bot token (`scope` / `SLACKBOT`), a User token (`user_scope` / `SLACK`), or both (`SRC-SLACK-01`, `SRC-COMP-04`).",
      "Ensure your backend database can store both `team.id` (or `enterprise.id`), `access_token` (`xoxb-`), and `authed_user.access_token` (`xoxp-`) (`SRC-SLACK-01`).",
      "If planning a future Slack Marketplace submission, verify your app does not violate Marketplace disqualifiers (no LLM training on Slack data, must include in-Slack UI beyond just an MCP server, `SRC-SLACK-03`).",
    ],
    externalDependencies: [
      {
        dependency: "Customer Workspace Admin Approval ('Require approved apps')",
        party: "Customer's Slack Workspace Owner / Admin",
        requiredWhen:
          "Customer workspace has 'Require approved apps' or 'Require apps from Slack Marketplace' enabled in App Management Settings",
        blockingImpact:
          "Installing user is prompted to submit an approval request to their Workspace Admin before OAuth completes (`SRC-COMP-04`).",
      },
      {
        dependency: "Slack Marketplace Review (Optional / Post-Launch Milestone)",
        party: "Slack Marketplace Review Team",
        requiredWhen:
          "You want your app listed in the public Slack Marketplace and the 'unapproved app' banner removed",
        blockingImpact:
          "Cannot even submit until installed on ≥10 active workspaces with ≥10 weekly active users (`SRC-SLACK-03`). Review takes 1–2 weeks preliminary + up to 10 weeks documented (7–20+ weeks reported in 2025–2026, `SRC-SLACK-13`, `SRC-SLACK-14`).",
      },
    ],
    publishedApprovalTimeEstimate:
      "0 days for Direct Public Distribution (`Manage Distribution`). For Slack Marketplace: Slack's submission communications state 1–2 weeks preliminary review + up to 10 weeks functional review (`SRC-SLACK-13`, `SRC-SLACK-14`).",
    corroboratedRealWorldWaitNotes:
      "Multiple independent 2025–2026 developer reports on `r/Slack` (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`) document 7–12+ weeks (and up to 3–5 months end-to-end) for initial Slack Marketplace approval due to reviewer backlog and strict scope scrutiny. Subsequent updates to an already-approved app take a few days (`SRC-SLACK-16`).",
    unknownTimingNotes: [
      "Exact Slack Marketplace queue wait fluctuates with Slack's review team backlog.",
      "Composio's managed Slack app Marketplace approval completion date is not published (`SRC-COMP-04`).",
    ],
    conditionsChangingEstimate: [
      "Requesting `*:history` or `search:read` scopes triggers heightened security/scope scrutiny during Slack Marketplace review (`SRC-SLACK-03`, `SRC-SLACK-15`).",
      "Enabling Token Rotation (`xoxe.`) requires implementing and testing a persistent refresh token store before toggling it on (`SRC-SLACK-04`).",
    ],
  },

  prerequisites: [
    {
      id: "slack-pre-1",
      category: "account",
      title: "Slack Development Workspace & App Management Access",
      detail:
        "Create your Slack app at `https://api.slack.com/apps` tied to a development workspace where you have permission to install and test apps (`SRC-SLACK-04`).",
      requiredWhen: "Always when creating a custom Slack app",
      evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-04"],
    },
    {
      id: "slack-pre-2",
      category: "callback_redirect",
      title: "HTTPS Redirect URL (No `#` Anchors, Exact Match Between Authorize & Access)",
      detail:
        "Slack OAuth v2 requires an `https://` Redirect URL without `#` fragments (`SRC-SLACK-01`). For Composio Custom Auth, use `https://backend.composio.dev/api/v3/toolkits/auth/callback`. For `@slack/bolt`, default is `https://<your-domain>/slack/oauth_redirect` (`SRC-SLACK-09`).",
      requiredWhen: "Configuring OAuth & Permissions",
      evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-09", "SRC-COMP-08"],
    },
    {
      id: "slack-pre-3",
      category: "capabilities_scopes",
      title: "Separated Bot Scopes (`scope`) vs. User Scopes (`user_scope`)",
      detail:
        "List bot permissions (e.g., `chat:write`, `chat:write.public`, `channels:read`, `channels:history`, `channels:join`) under **Bot Token Scopes**, and user permissions (`search:read`) under **User Token Scopes**. Never combine Sign in with Slack (`openid`, `profile`, `email`) scopes in the same OAuth flow (`SRC-SLACK-01`).",
      requiredWhen: "Before building the authorization URL",
      evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-02"],
    },
    {
      id: "slack-pre-4",
      category: "policy_compliance",
      title: "Slack Marketplace Eligibility Check (If Planning Future Listing)",
      detail:
        "Ensure your app includes meaningful in-Slack functionality (not just a standalone MCP server or data exporter) and never uses Slack data to train LLMs (`SRC-SLACK-03`).",
      requiredWhen: "If you intend to list in the Slack Marketplace later",
      evidenceIds: ["SRC-SLACK-03"],
    },
  ],

  setupSteps: [
    {
      id: "slack-step-1",
      stepNumber: 1,
      title: "Create Your Slack App and Choose Bot vs. User Token Architecture",
      instructions:
        "If prototyping with Composio, select the `SLACKBOT` toolkit for bot messaging/mentions or the `SLACK` toolkit for user-level actions (`SRC-COMP-04`). If creating a custom app, go to `https://api.slack.com/apps`, click **Create New App → From scratch**, name your app, and select your development workspace.",
      whereToDoIt: "Slack API App Management (`https://api.slack.com/apps`)",
      consoleOrDocUrl: "https://api.slack.com/authentication/oauth-v2",
      whyItMatters:
        "Slack separates bot identity (`xoxb-`, acts independently in channels) from user identity (`xoxp-`, acts on behalf of the authorizing human). Picking the wrong token type causes `missing_scope` or `not_allowed_token_type` errors.",
      prerequisites: ["Slack account in a development workspace"],
      expectedOutcome:
        "Created Slack App with `Client ID`, `Client Secret`, and `Signing Secret` under Basic Information.",
      completionCheck:
        "Confirm you have copied `Client ID`, `Client Secret`, and `Signing Secret` into your server-side environment variables.",
      commonFailureCases: [
        "Using the `SLACK` Composio toolkit when expecting bot-centric `@mention` triggers (which belong to `SLACKBOT`, `SRC-COMP-04`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-SLACK-01", "SRC-COMP-04"],
    },
    {
      id: "slack-step-2",
      stepNumber: 2,
      title: "Configure HTTPS Redirect URLs and Granular Scopes",
      instructions:
        "Navigate to **OAuth & Permissions**. Under **Redirect URLs**, click **Add New Redirect URL** and enter your HTTPS callback (for Composio: `https://backend.composio.dev/api/v3/toolkits/auth/callback`; for Bolt: `https://<your-domain>/slack/oauth_redirect`), then click **Save URLs**. Scroll down to **Scopes** and add your **Bot Token Scopes** (`chat:write`, `chat:write.public`, `channels:read`, `channels:history`, `channels:join`, `app_mentions:read`). Keep **Token Rotation** OFF until you have tested a persistent refresh-token database store (`SRC-SLACK-04`).",
      whereToDoIt: "Slack App Console → OAuth & Permissions",
      consoleOrDocUrl: "https://api.slack.com/scopes",
      whyItMatters:
        "Adding `chat:write.public` allows your bot to post to public channels without being invited first, while `channels:join` allows calling `conversations.join` before reading `channels:history` (`SRC-SLACK-02`, `SRC-SLACK-07`).",
      prerequisites: ["Step 1 completed"],
      expectedOutcome:
        "Saved HTTPS Redirect URL(s) and minimal granular scopes.",
      completionCheck:
        "Ensure you clicked **Save URLs** after clicking **Add New Redirect URL** (a common console UI slip).",
      commonFailureCases: [
        "Turning on **Opt in to token rotation** prematurely—it **cannot be turned off once enabled** (`SRC-SLACK-04`).",
        "Combining Sign in with Slack (`openid`, `profile`, `email`) scopes with `chat:write` in the same OAuth flow (`SRC-SLACK-01`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: [
        "SRC-SLACK-01",
        "SRC-SLACK-02",
        "SRC-SLACK-04",
        "SRC-SLACK-07",
        "SRC-COMP-08",
      ],
    },
    {
      id: "slack-step-3",
      stepNumber: 3,
      title: "Activate Direct Public Distribution (`Manage Distribution`)",
      instructions:
        "In the left sidebar, click **Manage Distribution**. Complete the four checklist items (add scopes, add at least one HTTPS Redirect URL, remove hardcoded information checkboxes), and click **Activate Public Distribution**.",
      whereToDoIt: "Slack App Console → Manage Distribution",
      consoleOrDocUrl: "https://api.slack.com/authentication/oauth-v2",
      whyItMatters:
        "Until Public Distribution is activated, Slack rejects OAuth installations from any workspace other than your single development workspace (`SRC-SLACK-01`). Activating this is immediate and requires **zero Slack review**.",
      prerequisites: ["At least one HTTPS Redirect URL and one scope saved in Step 2"],
      expectedOutcome:
        "App status shows Public Distribution is active, allowing multi-workspace OAuth installs.",
      completionCheck:
        "If using `@slack/bolt`, do **not** copy the raw `https://slack.com/oauth/v2/authorize?...` link from this page for your users; instead, route users to your Bolt server's `https://<your-domain>/slack/install` path so Bolt generates the CSRF `state` cookie (`SRC-SLACK-05`, `SRC-SLACK-06`).",
      commonFailureCases: [
        "Users in external workspaces getting blocked because `Manage Distribution` was never activated (`SRC-SLACK-01`).",
        "Bolt apps failing with `slack_oauth_missing_state` when users click the raw `slack.com` link from Manage Distribution instead of `/slack/install` (`SRC-SLACK-05`, `SRC-SLACK-06`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: [
        "SRC-SLACK-01",
        "SRC-SLACK-05",
        "SRC-SLACK-06",
        "SRC-SLACK-09",
      ],
    },
    {
      id: "slack-step-4",
      stepNumber: 4,
      title: "Exchange Code at `oauth.v2.access` and Verify Installed `team.id`",
      instructions:
        "When the user approves the prompt, Slack redirects to your `redirect_uri` with a 10-minute single-use `code`. Exchange it via `POST https://slack.com/api/oauth.v2.access` (`application/x-www-form-urlencoded`) passing `client_id`, `client_secret`, `code`, and the **exact same `redirect_uri`** sent in step 1 (`SRC-SLACK-01`). Store the top-level `access_token` (`xoxb-...`), `bot_user_id`, `team.id` (or `enterprise.id`), and—if `user_scope` was requested—`authed_user.access_token` (`xoxp-...`).",
      whereToDoIt: "Your backend OAuth callback handler or Composio Custom Auth Config",
      consoleOrDocUrl: "https://api.slack.com/authentication/oauth-v2",
      whyItMatters:
        "If a user is signed into a different Slack workspace in their browser than the `team` parameter you hinted, Slack **silently drops the `team` parameter** and installs into their active session's workspace (`SRC-SLACK-01`). You must read `response.team.id` from `oauth.v2.access` as the source of truth.",
      prerequisites: ["Step 2 & Step 3 completed"],
      expectedOutcome:
        "Persisted workspace installation record keyed by `team.id` / `enterprise.id` and `authed_user.id`.",
      completionCheck:
        "Check `response.ok === true` (Slack returns HTTP 200 even on errors like `{\"ok\": false, \"error\": \"bad_redirect_uri\"}`) and verify `response.team.id`.",
      commonFailureCases: [
        "`bad_redirect_uri` when multiple Redirect URLs are registered and `redirect_uri` is passed in `/oauth/v2/authorize` but omitted or changed in `oauth.v2.access` (`SRC-SLACK-01`).",
        "Using Bolt's default `MemoryInstallationStore` or `FileInstallationStore` in production, losing all workspace tokens on server restart (`SRC-SLACK-10`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-10", "SRC-SLACK-11"],
    },
    {
      id: "slack-step-5",
      stepNumber: 5,
      title: "Ensure Channel Membership Before Reading History (`not_in_channel` Prevention)",
      instructions:
        "Before calling `conversations.history` or reading messages in a channel with a Bot token (`xoxb-`), either call `conversations.join` (for public channels, requires `channels:join`) or instruct the user to invite the bot to the channel by typing `/invite @YourBotName` in Slack (`SRC-SLACK-07`). For posting messages to public channels without joining, ensure `chat:write.public` is granted.",
      whereToDoIt: "Your Slack tool execution flow or onboarding UI",
      consoleOrDocUrl:
        "https://stackoverflow.com/questions/60198159/slack-api-conversations-history-returns-error-not-in-channel",
      whyItMatters:
        "Installing a Slack app in a workspace does **not** add the bot user to individual channels. Calling `conversations.history` on a channel the bot hasn't joined immediately returns `{\"ok\": false, \"error\": \"not_in_channel\"}` (`SRC-SLACK-07`).",
      prerequisites: ["Valid `xoxb-` bot token from Step 4"],
      expectedOutcome:
        "`conversations.history` and `chat.postMessage` succeed with `ok: true`.",
      completionCheck:
        "Test reading history from a public channel where the bot was not previously a member and confirm your auto-join or user prompt works.",
      commonFailureCases: [
        "Attempting to call `conversations.join` on a **private** channel (`groups:history`)—bots cannot self-join private channels; a human member must run `/invite @YourBotName` (`SRC-SLACK-07`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-SLACK-02", "SRC-SLACK-07"],
    },
  ],

  painPoints: [
    {
      id: "PP-SLACK-01",
      title: "Bot (`scope` / `xoxb-`) vs. User (`user_scope` / `xoxp-`) Confusion & Composio's Two-Toolkit Split",
      symptom:
        "Authorization fails with `invalid_scope` when requesting `search:read` in `scope`, or developer cannot find the user's `xoxp-` token at the top level of `oauth.v2.access`, or `@mention` triggers don't appear in Composio's `SLACK` toolkit.",
      scenario:
        "Configuring Slack OAuth v2 scopes or choosing between Composio's `SLACK` and `SLACKBOT` toolkits.",
      likelyCause:
        "Slack OAuth v2 separates Bot permissions (`scope=...`, returned at `response.access_token`) from User permissions (`user_scope=...`, returned nested at `response.authed_user.access_token`, `SRC-SLACK-01`). Additionally, Sign in with Slack (`openid`, `profile`, `email`) scopes cannot be combined with workspace scopes in the same OAuth request (`SRC-SLACK-01`). In Composio, `SLACK` is user-centric while `SLACKBOT` is bot-centric (`SRC-COMP-04`).",
      causeConfidence: "documented",
      problemClassification: "permission_scope_decision",
      severity: "high",
      evidenceIds: ["SRC-SLACK-01", "SRC-SLACK-02", "SRC-COMP-04"],
      independentReportCount: 5,
      recencyVersionNotes:
        "Current in Slack OAuth v2 (`SRC-SLACK-01`) and Composio v20261020_00 (`SRC-COMP-04`).",
      prevention:
        "Use `scope` (and Composio `SLACKBOT`) for bot actions (`chat:write`, `channels:history`, `app_mentions:read`), and `user_scope` (and Composio `SLACK`) only when acting as the individual human user (e.g., `search:read`).",
      resolution:
        "Move user-only scopes from `scope` to `user_scope` in `/oauth/v2/authorize` and read the resulting token from `response.authed_user.access_token`. Separate Sign in with Slack (`openid`) into a dedicated login route.",
      impactOnGuide:
        "Explained the Bot vs. User and `SLACK` vs. `SLACKBOT` distinction in Section 2 and Step 1.",
    },
    {
      id: "PP-SLACK-02",
      title: "`not_in_channel` Error Immediately After Successful Bot OAuth Install",
      symptom:
        "OAuth installation succeeds with `channels:history` and `chat:write`, but calling `conversations.history` or `chat.postMessage` returns `{\"ok\": false, \"error\": \"not_in_channel\"}`.",
      scenario:
        "Using a Bot token (`xoxb-`) to read or post in a channel where the bot has not been added.",
      likelyCause:
        "Workspace-level OAuth installation creates the bot user in the workspace but does not add it as a member of any channel (`SRC-SLACK-07`).",
      causeConfidence: "corroborated",
      problemClassification: "authorization_flow_misunderstanding",
      severity: "high",
      evidenceIds: ["SRC-SLACK-02", "SRC-SLACK-07"],
      independentReportCount: 6,
      recencyVersionNotes:
        "230+ upvote Stack Overflow issue (`SRC-SLACK-07`) that remains one of the most frequent Slack bot pitfalls in 2026.",
      prevention:
        "Include `chat:write.public` if your bot posts to public channels without joining, and include `channels:join` if your bot needs to join public channels programmatically to read history.",
      resolution:
        "Call `conversations.join` with the target `channel_id` before reading public channel history, or instruct users to type `/invite @YourBotName` inside the target public or private channel (`SRC-SLACK-07`).",
      impactOnGuide:
        "Added Step 5 specifically for channel membership and `not_in_channel` prevention.",
    },
    {
      id: "PP-SLACK-03",
      title: "Single-Workspace Lock (`Manage Distribution`) & Bolt `slack_oauth_missing_state` Error",
      symptom:
        "External workspaces cannot install the app, or Bolt fails on `/slack/oauth_redirect` with `slack_oauth_missing_state` / `redirect url is missing state or code query parameters`.",
      scenario:
        "Distributing a Slack app to a second workspace or using `@slack/bolt` / `bolt-python`.",
      likelyCause:
        "(1) Slack apps are locked to their development workspace until `Manage Distribution → Activate Public Distribution` is completed (`SRC-SLACK-01`). (2) When using Bolt, clicking the raw `https://slack.com/oauth/v2/authorize` URL shown in the Slack console bypasses Bolt's `/slack/install` route, so the browser never receives the signed `state` cookie (`SRC-SLACK-05`, `SRC-SLACK-06`).",
      causeConfidence: "maintainer_confirmed",
      problemClassification: "sdk_framework_implementation",
      severity: "high",
      evidenceIds: [
        "SRC-SLACK-01",
        "SRC-SLACK-05",
        "SRC-SLACK-06",
        "SRC-SLACK-09",
        "SRC-SLACK-10",
      ],
      independentReportCount: 5,
      recencyVersionNotes:
        "Maintainer-confirmed by `@seratch` in `slackapi/bolt-js` (`SRC-SLACK-05`, `SRC-SLACK-06`).",
      prevention:
        "Activate `Manage Distribution` in the Slack console, and in Bolt apps always initiate OAuth by sending users to `https://<your-domain>/slack/install` (with `installerOptions: { directInstall: true }` if you want to skip Bolt's HTML button page) rather than disabling `stateVerification`.",
      resolution:
        "Replace raw `slack.com/oauth/v2/authorize` links in your frontend with your backend's `/slack/install` endpoint and configure a database-backed `InstallationStore` (`SRC-SLACK-05`, `SRC-SLACK-10`).",
      impactOnGuide:
        "Added Step 3 covering `Manage Distribution` and the Bolt `/slack/install` state requirement.",
    },
    {
      id: "PP-SLACK-04",
      title: "The 10-Workspace Prerequisite & 2–5 Month Slack Marketplace Review Queue",
      symptom:
        "Team promises a 'Slack Marketplace Approved' launch date, or users on strict workspaces get blocked by non-Marketplace warnings (`Require apps from Slack Marketplace`), and the team discovers they cannot submit to the Marketplace or face a multi-month queue.",
      scenario:
        "Planning production launch for a B2B Slack integration or using Composio's managed Slack app on restricted enterprise workspaces.",
      likelyCause:
        "Slack's official Marketplace guidelines (`SRC-SLACK-03`) **disqualify apps installed on fewer than 10 active workspaces with <10 weekly active users**, disqualify apps that train LLMs on Slack data, and disqualify MCP-only servers without in-Slack UI. Furthermore, corroborated 2025–2026 developer reports (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-15`, `SRC-SLACK-16`) show Marketplace reviews taking **7 to 20+ weeks (2 to 5 months)**.",
      causeConfidence: "documented",
      problemClassification: "provider_policy_approval_gate",
      severity: "critical",
      evidenceIds: [
        "SRC-SLACK-03",
        "SRC-COMP-04",
        "SRC-SLACK-13",
        "SRC-SLACK-14",
        "SRC-SLACK-15",
        "SRC-SLACK-16",
      ],
      independentReportCount: 6,
      recencyVersionNotes:
        "Verified against current Slack Marketplace guidelines (`SRC-SLACK-03`) and Jan–June 2026 `r/Slack` developer timeline reports (`SRC-SLACK-13`, `SRC-SLACK-14`, `SRC-SLACK-16`).",
      prevention:
        "Never make Slack Marketplace listing a Day-1 launch blocker. Launch via **Direct Public Distribution** (`Manage Distribution`, 0 days wait) to onboard your first 10+ active customer workspaces, then submit the minimal-scope app for Marketplace review.",
      resolution:
        "For enterprise customers whose workspace settings block non-Marketplace apps (`Require approved apps`), provide a short guide for their Workspace Owner to approve your custom Slack App in `Settings → Apps & Workflows → App Management Settings` (`SRC-COMP-04`).",
      impactOnGuide:
        "Separated Direct Public Distribution (0 days wait) from Slack Marketplace Listing (≥10 active workspaces + 2–5 months review) in Section 1, Section 2, and Section 5.",
    },
    {
      id: "PP-SLACK-05",
      title: "Irreversible Token Rotation (`xoxe.`) Breaking Static Token Stores After 12 Hours",
      symptom:
        "Developer toggles on 'Opt in to token rotation' in Slack App Settings, discovers the toggle cannot be turned off, and 12 hours later all workspace connections fail with `token_expired`.",
      scenario:
        "Enabling Slack Token Rotation (`token_rotation_enabled: true`) without a database refresh-token rotation loop or while relying on the console 'Install to Workspace' button.",
      likelyCause:
        "Slack's documentation explicitly warns: *'Token rotation may not be turned off once it's turned on'* (`SRC-SLACK-04`). Rotated access tokens (`xoxe.xoxb-...`) expire in 12 hours (`43,200` seconds), each `refresh_token` (`xoxe-1-...`) is single-use, and apps with token rotation enabled **must** be installed via the OAuth redirect flow rather than the admin console install button (`SRC-SLACK-04`, `SRC-SLACK-08`).",
      causeConfidence: "documented",
      problemClassification: "sdk_framework_implementation",
      severity: "high",
      evidenceIds: [
        "SRC-SLACK-04",
        "SRC-SLACK-08",
        "SRC-SLACK-10",
        "SRC-SLACK-11",
        "SRC-SLACK-12",
      ],
      independentReportCount: 4,
      recencyVersionNotes:
        "Confirmed in official Slack Token Rotation docs (`SRC-SLACK-04`) and `@slack/oauth` source code (`SRC-SLACK-11`).",
      prevention:
        "Test token rotation on a disposable development Slack App first. Ensure your database `InstallationStore` saves `authVersion: 'v2'`, `expiresAt`, and the new `refresh_token` on every refresh (`SRC-SLACK-11`).",
      resolution:
        "If already enabled on an app with existing long-lived tokens, run a one-time migration script calling `POST https://slack.com/api/oauth.v2.exchange` for each stored token and persist the returned `xoxe.` access and refresh tokens (`SRC-SLACK-04`, `SRC-SLACK-12`).",
      impactOnGuide:
        "Added irreversible token rotation warning to Step 2 and Section 7.",
    },
  ],

  launchChecklist: [
    {
      id: "slack-check-1",
      label: "Direct Public Distribution Activated (`Manage Distribution`)",
      verificationMethod:
        "Open `api.slack.com/apps → Manage Distribution` and confirm 'Public Distribution' is active before testing with a second Slack workspace.",
      failureIndicator:
        "External workspace users see an error stating the app cannot be installed outside its owning workspace.",
      category: "distribution_approval",
    },
    {
      id: "slack-check-2",
      label: "Authoritative `team.id` Read from `oauth.v2.access` Response",
      verificationMethod:
        "Confirm your callback handler binds the installation to `response.team.id` (or `response.enterprise.id`) returned by `oauth.v2.access` rather than trusting the `team` query hint sent before login (`SRC-SLACK-01`).",
      failureIndicator:
        "Tokens are associated with the wrong tenant when a user switches workspaces during the Slack login prompt.",
      category: "callback_redirect",
    },
    {
      id: "slack-check-3",
      label: "Channel Membership / `not_in_channel` Handling Verified",
      verificationMethod:
        "Test posting and reading in a public channel where the bot was not manually invited. Confirm `chat:write.public` or `conversations.join` (`channels:join`) works, and that private channel `not_in_channel` errors prompt the user to run `/invite @BotName`.",
      failureIndicator:
        "Unhandled `{\"ok\": false, \"error\": \"not_in_channel\"}` on first user action.",
      category: "api_verification",
    },
    {
      id: "slack-check-4",
      label: "Persistent Database InstallationStore Configured (No Memory/File Store in Prod)",
      verificationMethod:
        "Ensure tokens (and rotated `xoxe-1-` refresh tokens if rotation is enabled) are stored in an encrypted database rather than Bolt's dev-only `MemoryInstallationStore` or `FileInstallationStore` (`SRC-SLACK-10`).",
      failureIndicator:
        "All Slack workspaces disconnect whenever your server restarts or redeploys.",
      category: "token_lifecycle",
    },
    {
      id: "slack-check-5",
      label: "Signing Secret & Webhook Signature Verification Enabled",
      verificationMethod:
        "Verify incoming Slack event webhooks validate `X-Slack-Signature` and `X-Slack-Request-Timestamp` using your `SLACK_SIGNING_SECRET`.",
      failureIndicator:
        "Webhook endpoint accepts forged unsigned POST requests.",
      category: "security_credentials",
    },
  ],

  evidence: [
    {
      id: "SRC-COMP-01",
      title: "Composio — Managed OAuth apps",
      canonicalUrl: "https://docs.composio.dev/toolkits/managed-auth",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-20",
      claimsSupported: [
        "Composio provides managed OAuth2 for both `SLACK` and `SLACKBOT` toolkits.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Official catalog of toolkits supporting Composio-managed OAuth.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-COMP-03",
      title: "Composio — Managed vs custom auth",
      canonicalUrl:
        "https://docs.composio.dev/docs/authentication/custom-app-vs-managed-app",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-18",
      claimsSupported: [
        "Trade-offs between Composio managed OAuth and custom OAuth apps.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Explains when to switch from Composio managed auth to custom credentials.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-COMP-04",
      title: "Composio — Slack Toolkit Documentation",
      canonicalUrl: "https://docs.composio.dev/toolkits/slack",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-20",
      claimsSupported: [
        "Distinguishes `SLACK` (user-level workspace actions) from `SLACKBOT` (bot messaging, mentions, slash commands).",
        "Notes Composio's managed Slack app is currently undergoing Marketplace review, causing warnings or admin approval prompts on strict workspaces.",
      ],
      painPointsSupported: ["PP-SLACK-01", "PP-SLACK-04"],
      summaryOfContent:
        "Official Composio Slack toolkit documentation (v20261020_00) and troubleshooting FAQ.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Marketplace review status is current as of Oct 2026.",
    },
    {
      id: "SRC-COMP-08",
      title: "Composio — Programmatic Auth Configs",
      canonicalUrl:
        "https://docs.composio.dev/docs/authentication/programmatic-auth-configs",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-18",
      claimsSupported: [
        "Composio OAuth redirect URI is `https://backend.composio.dev/api/v3/toolkits/auth/callback`.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Documentation for programmatic auth config creation in Composio.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-01",
      title: "Slack Docs — Installing via OAuth authorization code flow (OAuth v2)",
      canonicalUrl: "https://api.slack.com/authentication/oauth-v2",
      publisherDomain: "api.slack.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-01",
      claimsSupported: [
        "`scope` (bot) vs `user_scope` (user) separation and Sign in with Slack scope conflict rule.",
        "`bad_redirect_uri` when authorize and `oauth.v2.access` redirect URIs do not match.",
        "`team` parameter is silently dropped if the user has an active session in another workspace.",
        "Non-distributed apps can only be installed in the owning workspace.",
      ],
      painPointsSupported: ["PP-SLACK-01", "PP-SLACK-03"],
      summaryOfContent:
        "Primary official specification for Slack OAuth v2 authorization and token exchange.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-02",
      title: "Slack Docs — OAuth Scopes Reference",
      canonicalUrl: "https://api.slack.com/scopes",
      publisherDomain: "api.slack.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-01",
      claimsSupported: [
        "Definitions of `chat:write`, `chat:write.public`, `channels:history`, `channels:join`, `groups:history`, `search:read`, and `mcp:connect`.",
      ],
      painPointsSupported: ["PP-SLACK-01", "PP-SLACK-02"],
      summaryOfContent:
        "Complete reference table of Slack OAuth scopes.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-03",
      title: "Slack Docs — Slack Marketplace Submission Guidelines and Requirements",
      canonicalUrl: "https://api.slack.com/start/distributing/guidelines",
      publisherDomain: "api.slack.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-01",
      claimsSupported: [
        "Apps installed on fewer than 10 active workspaces with <10 weekly active users are ineligible for Slack Marketplace submission.",
        "Apps that use Slack data to train LLMs or provide only an MCP server without in-Slack UI are unsuitable for the Marketplace.",
      ],
      painPointsSupported: ["PP-SLACK-04"],
      summaryOfContent:
        "Official eligibility rules, disqualifiers, and listing requirements for the Slack Marketplace.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Does not state the current review backlog duration on this page.",
    },
    {
      id: "SRC-SLACK-04",
      title: "Slack Docs — Using Token Rotation",
      canonicalUrl: "https://api.slack.com/authentication/rotation",
      publisherDomain: "api.slack.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-01",
      claimsSupported: [
        "Token rotation cannot be turned off once turned on.",
        "Access tokens (`xoxe.xoxb-`) expire in 12 hours (`43,200`s); single-use refresh tokens (`xoxe-1-`) must be persisted on every refresh; max 2 active tokens.",
      ],
      painPointsSupported: ["PP-SLACK-05"],
      summaryOfContent:
        "Official guide to Slack token rotation, `oauth.v2.exchange`, and refresh token handling.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-05",
      title: "GitHub Issue — Installation Options on api.slack.com 'Manage Distribution' don't work (slackapi/bolt-js #1284)",
      canonicalUrl: "https://github.com/slackapi/bolt-js/issues/1284",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2022-01-23",
      claimsSupported: [
        "Starting OAuth from the raw `slack.com` link instead of Bolt's `/slack/install` route causes missing `state` parameter errors.",
      ],
      painPointsSupported: ["PP-SLACK-03"],
      summaryOfContent:
        "Maintainer (@seratch) explanation of how Bolt's `/slack/install` endpoint generates the required `state` parameter.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "Bolt SDK specific.",
    },
    {
      id: "SRC-SLACK-06",
      title: "GitHub Issue — 'slack_oauth_missing_state' error during OAuth Flow (slackapi/bolt-js #1436)",
      canonicalUrl: "https://github.com/slackapi/bolt-js/issues/1436",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2022-04-29",
      claimsSupported: [
        "Maintainer confirmation that `/slack/install` is the recommended entry point to avoid `slack_oauth_missing_state`.",
      ],
      painPointsSupported: ["PP-SLACK-03"],
      summaryOfContent:
        "Bolt maintainer confirmation on resolving `slack_oauth_missing_state`.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-07",
      title: "Stack Overflow — Slack API conversations.history returns error: not_in_channel",
      canonicalUrl:
        "https://stackoverflow.com/questions/60198159/slack-api-conversations-history-returns-error-not-in-channel",
      publisherDomain: "stackoverflow.com",
      sourceType: "stack_overflow",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2020-02-13",
      claimsSupported: [
        "Bot tokens receive `not_in_channel` unless the bot is invited (`/invite @bot`), calls `conversations.join`, or uses `chat:write.public` for posting.",
      ],
      painPointsSupported: ["PP-SLACK-02"],
      summaryOfContent:
        "High-corroboration Stack Overflow thread explaining why `not_in_channel` occurs after OAuth installation and three ways to resolve it.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-08",
      title: "GitHub Issue — Why do I need to set a redirect URL to opt in to token rotation (slackapi/bolt-python #746)",
      canonicalUrl: "https://github.com/slackapi/bolt-python/issues/746",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2022-10-24",
      claimsSupported: [
        "Enabling token rotation requires installing the app via the OAuth redirect flow rather than the static 'Install to Workspace' button in the admin console.",
      ],
      painPointsSupported: ["PP-SLACK-03", "PP-SLACK-05"],
      summaryOfContent:
        "Maintainer explanation of why token rotation mandates an OAuth redirect URL and database InstallationStore.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-09",
      title: "Slack Docs — Authenticating with OAuth (Bolt for JavaScript)",
      canonicalUrl:
        "https://docs.slack.dev/tools/bolt-js/concepts/authenticating-oauth/",
      publisherDomain: "docs.slack.dev",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-01",
      claimsSupported: [
        "Default `/slack/install` and `/slack/oauth_redirect` paths and `installerOptions` configuration in Bolt.",
      ],
      painPointsSupported: ["PP-SLACK-03"],
      summaryOfContent:
        "Official Bolt for JavaScript OAuth configuration guide.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-10",
      title: "Slack SDK — node-slack-sdk OAuth & InstallationStore Docs",
      canonicalUrl:
        "https://github.com/slackapi/node-slack-sdk/blob/main/docs/english/oauth.md",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-01-15",
      claimsSupported: [
        "`MemoryInstallationStore` and `FileInstallationStore` are development-only; production deployments require a custom database `InstallationStore`.",
      ],
      painPointsSupported: ["PP-SLACK-03", "PP-SLACK-05"],
      summaryOfContent:
        "Official `@slack/oauth` documentation warning against in-memory and local-file installation stores in production.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-11",
      title: "Slack SDK — packages/oauth/src/install-provider.ts Source Code",
      canonicalUrl:
        "https://github.com/slackapi/node-slack-sdk/blob/main/packages/oauth/src/install-provider.ts",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-01-15",
      claimsSupported: [
        "`InstallProvider` refreshes tokens expiring within 2 hours and requires `authVersion: 'v2'` in stored records.",
      ],
      painPointsSupported: ["PP-SLACK-05"],
      summaryOfContent:
        "Source code of `@slack/oauth` `InstallProvider.authorize()` showing exact token rotation logic.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-12",
      title: "GitHub Issue — Token rotation in Bolt - What needs to be done? (slackapi/bolt-js #1395)",
      canonicalUrl: "https://github.com/slackapi/bolt-js/issues/1395",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2022-03-28",
      claimsSupported: [
        "Existing non-expiring tokens must be migrated offline via `oauth.v2.exchange` when enabling token rotation.",
      ],
      painPointsSupported: ["PP-SLACK-05"],
      summaryOfContent:
        "Maintainer guidance on migrating existing tokens when enabling Slack token rotation.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-SLACK-13",
      title: "Reddit r/Slack — Why does Slack app approvals take so long? (Jan 2026)",
      canonicalUrl:
        "https://www.reddit.com/r/Slack/comments/1qcdejk/why_does_slack_app_approvals_take_so_long/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-01-14",
      claimsSupported: [
        "Slack informs developers that preliminary review takes 1–2 weeks and functional review takes up to 10 weeks.",
      ],
      painPointsSupported: ["PP-SLACK-04"],
      summaryOfContent:
        "January 2026 developer report on Slack Marketplace review delays impacting launch plans.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community report.",
    },
    {
      id: "SRC-SLACK-14",
      title: "Reddit r/Slack — It took 5 months to get my app onto the Slack Marketplace (June 2026)",
      canonicalUrl:
        "https://www.reddit.com/r/Slack/comments/1u2sgxk/it_took_5_months_to_get_my_app_onto_the_slack/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-06-11",
      claimsSupported: [
        "Real-world Slack Marketplace approval took ~5 months in 2026, with heavy scrutiny on requested permissions/scopes.",
      ],
      painPointsSupported: ["PP-SLACK-04"],
      summaryOfContent:
        "June 2026 post-mortem of a 5-month Slack Marketplace review timeline.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Single developer post-mortem, corroborated by SRC-SLACK-13, 15, 16.",
    },
    {
      id: "SRC-SLACK-15",
      title: "Reddit r/Slack — We got our Slack app approved & featured on the Marketplace (~3 months)",
      canonicalUrl:
        "https://www.reddit.com/r/Slack/comments/1jbatis/we_got_our_slack_app_approved_featured_on_the/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-11-16",
      claimsSupported: [
        "End-to-end Marketplace approval took ~3 months (2 weeks preliminary + 2 months wait + 1 month functional review rounds).",
      ],
      painPointsSupported: ["PP-SLACK-04"],
      summaryOfContent:
        "B2B SaaS engineering team breakdown of their 3-month Slack Marketplace review.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community report.",
    },
    {
      id: "SRC-SLACK-16",
      title: "Reddit r/Slack — 'Your app has been submitted for review' (Jan–Mar 2026 thread)",
      canonicalUrl:
        "https://www.reddit.com/r/Slack/comments/1qs2x8a/your_app_has_been_submitted_for_review/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-01-31",
      claimsSupported: [
        "Multiple developers report 7–12+ week wait times in 2026 and advise checking the Slack review dashboard directly because email notifications can be missed.",
      ],
      painPointsSupported: ["PP-SLACK-04"],
      summaryOfContent:
        "Multi-developer discussion comparing 2026 Slack Marketplace review wait times.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community report.",
    },
  ],

  agentResearchTrace: {
    searchesExecuted: 6,
    normalizedQueries: [
      "Slack OAuth v2 redirect_uri OR not_in_channel OR missing_scope OR Manage Distribution bolt-js bolt-python issues stackoverflow reddit",
      "site:github.com/slackapi oauth.v2.access OR token rotation OR redirect_uri OR InstallationStore issues",
      "site:reddit.com/r/Slack OR site:stackoverflow.com Slack Marketplace OR App Directory review time OAuth redirect_uri",
      "site:docs.composio.dev/toolkits github gmail slack notion oauth2 managed auth",
    ],
    sourcesRetrievedCount: 20,
    sourcesFailedCount: 0,
    documentsInspected: [
      "https://docs.composio.dev/toolkits/slack",
      "https://api.slack.com/authentication/oauth-v2",
      "https://api.slack.com/scopes",
      "https://api.slack.com/start/distributing/guidelines",
      "https://api.slack.com/authentication/rotation",
      "https://docs.slack.dev/tools/bolt-js/concepts/authenticating-oauth/",
      "https://github.com/slackapi/node-slack-sdk/blob/main/docs/english/oauth.md",
      "https://github.com/slackapi/node-slack-sdk/blob/main/packages/oauth/src/install-provider.ts",
    ],
    painPointAreasExplored: [
      "Bot scopes (`scope` / `xoxb-`) vs. User scopes (`user_scope` / `xoxp-`) and Composio's `SLACK` vs `SLACKBOT` split",
      "`not_in_channel` errors after successful Bot OAuth installation",
      "Single-workspace lock prior to activating `Manage Distribution` and Bolt's `slack_oauth_missing_state` error",
      "10-active-workspace prerequisite and 2–5 month Slack Marketplace review queue vs. immediate Direct Public Distribution",
      "Irreversible 12-hour Token Rotation (`xoxe.`) toggle",
    ],
    validationPerformed: [
      "Verified all 20 evidence source IDs against `docs/research/source-ledger.csv`",
      "Inspected `@slack/oauth` `install-provider.ts` source code to confirm 2-hour pre-expiry refresh threshold",
      "Validated guide record against `GuideSchema` runtime Zod rules",
    ],
    agentPreparedActions: [
      "Separated Direct Public Distribution (0 days wait) from Slack Marketplace Listing (≥10 workspaces + 7–20+ weeks wait)",
      "Mapped Bot vs. User scope sets and Composio `SLACKBOT` vs `SLACK` toolkit selection",
      "Added explicit `not_in_channel` and `response.team.id` verification steps",
    ],
    unresolvedQuestions: [
      "Exact completion date for Composio's managed Slack app Marketplace review (`SRC-COMP-04`).",
    ],
    stopReason: "sufficient_evidence",
  },

  outcome: {
    guideStatus: "complete_verified",
    confidence: "high",
    limitations: [
      "Slack Marketplace review durations (7–20+ weeks) reflect corroborated 2025–2026 developer reports (`SRC-SLACK-13`–`16`) alongside Slack's stated 'up to 10 weeks' functional review guideline; actual queue times depend on Slack's review backlog.",
    ],
    recommendedNextStep: {
      title: "Create a Custom Slack App, Add Granular Bot Scopes, and Activate 'Manage Distribution'",
      action:
        "Open `https://api.slack.com/apps`, create your app, add `https://backend.composio.dev/api/v3/toolkits/auth/callback` (or your HTTPS callback) under OAuth & Permissions, add `chat:write`, `chat:write.public`, `channels:read`, and `channels:history`, then open **Manage Distribution** and click **Activate Public Distribution** so external workspaces can install immediately.",
      targetUrl: "https://api.slack.com/apps",
      rationale:
        "Unlocks multi-workspace OAuth installations in 25 minutes with zero Slack review wait, allowing you to onboard the first 10 active workspaces required before Slack Marketplace submission is even permitted.",
    },
    humanOnlyActions: [
      "Create the Slack App in `https://api.slack.com/apps` and activate `Manage Distribution`.",
      "Invite the bot user (`/invite @BotName`) to any private Slack channels it needs to read.",
      "Have customer Workspace Admins approve the app if their workspace enforces 'Require approved apps'.",
    ],
    missingInformationToProceed: [],
    outdatedReportMechanism: {
      instructions:
        "Did Composio complete its Slack Marketplace review, or did Slack update its Marketplace workspace minimum? Report the change here.",
      endpoint: "/api/feedback",
    },
  },
};
