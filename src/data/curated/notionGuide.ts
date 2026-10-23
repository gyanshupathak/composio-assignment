import { Guide } from "@/lib/schema/guideSchema";

export const notionGuide: Guide = {
  id: "curated-notion-oauth-v1",
  slug: "notion",
  applicationName: "Notion",
  aliases: ["notion.so", "notion-api", "notion-oauth", "notion-mcp"],
  category: "Docs, Wikis & Knowledge Management",
  canonicalWebsite: "https://www.notion.so",
  developerDocsUrl: "https://developers.notion.com/docs/authorization",
  shortSummary:
    "Connect Notion pages and data sources via Internal Connections (`ntn_` static token for 1 workspace) or Public OAuth 2.0 Connections (for multi-workspace products). Notion uses portal-configured Capabilities instead of OAuth scopes and grants access to zero pages until explicitly shared.",
  guideOrigin: "curated",
  createdAt: "2026-10-23T08:15:00.000Z",
  lastReviewedAt: "2026-10-23T10:15:00.000Z",
  schemaVersion: "1.0.0",

  scenario: {
    integrationGoal:
      "Search, read, create, and update Notion pages and multi-source databases across user workspaces.",
    intendedAudience: "multi_workspace_external",
    requiredCapabilities: [
      "Authenticate users across external Notion workspaces via Public OAuth 2.0 (or connect a single internal workspace via an Internal Connection token)",
      "Exchange authorization codes using HTTP Basic Authentication (`Authorization: Basic base64(client_id:client_secret)`)",
      "Ensure users share target pages/databases so API calls do not return empty results or `404 object_not_found`",
    ],
    optionalFeatures: [
      {
        feature: "Read workspace user email addresses (`GET /v1/users`)",
        additionalPermissionsRequired:
          "Portal Capability: `User information with email addresses` (`SRC-NOTION-03`).",
        impactOnVerification:
          "If changed later in the Developer Portal, existing users must re-authenticate for email addresses to appear (`SRC-NOTION-03`).",
      },
      {
        feature: "Duplicate a starter Notion Template during OAuth onboarding",
        additionalPermissionsRequired:
          "Configure a public Notion page URL in the Developer Portal's 'Notion URL for optional template' field (`SRC-NOTION-01`).",
        impactOnVerification:
          "Automatically shares the duplicated template page with your integration, preventing the '0 pages shared' failure mode (`SRC-NOTION-01`).",
      },
      {
        feature: "Real-time Page & Data Source Webhooks",
        additionalPermissionsRequired:
          "Webhook ingress endpoint + reverse `webhook_signing_secret` token verification paste into Notion (`SRC-COMP-06`).",
        impactOnVerification:
          "Note that Notion aggregates page content edits over a ~60s window (`SRC-COMP-06`).",
      },
    ],
    accountWorkspaceAssumptions: [
      "Users authorizing a Public Connection must be Workspace Admins or have `Full Access` permission on the pages they select in the OAuth Page Picker (`SRC-NOTION-01`, `SRC-NOTION-04`).",
      "Integration targets current Notion API version `2026-03-11` (or `2025-09-03`), where database rows are queried via `/v1/data_sources/{data_source_id}/query` (`SRC-NOTION-02`, `SRC-NOTION-10`).",
    ],
    alternativeScenarios: [
      {
        id: "notion-scenario-public-multi-workspace",
        label: "Multi-Workspace SaaS / AI Agent Product (Default)",
        description:
          "External users across separate Notion workspaces connect their Notion accounts to your application.",
        recommendedPath: "register_custom_oauth_app",
        recommendedPathTitle:
          "Register a Custom Notion Public Connection (OAuth 2.0) with Installation Scope = `Any workspace`",
        customOAuthAppRequired: "yes_for_production",
        recommendedScopesOrCapabilities: [
          "Capabilities (set in Portal, NOT OAuth scopes): Read content, Update content, Insert content",
          "User capabilities: User information without email addresses (or with email if required)",
        ],
        activeSetupEstimate: "25–40 minutes",
        externalApprovalWait:
          "0 days for direct OAuth installation across workspaces (Optional public Marketplace gallery listing has no published SLA)",
        keyRiskOrBlocker:
          "Re-authenticating the same user on a shared OAuth app invalidates their older `refresh_token` (`SRC-COMP-06`), and users who select zero pages in the Page Picker cause `POST /v1/search` to return `[]` (`SRC-NOTION-09`).",
        rationale:
          "Composio's official Notion guide strongly recommends registering your own Notion app for production (`SRC-COMP-06`) because Notion invalidates older refresh tokens when the same user reconnects to the same Notion app, and Notion attributes all page edits to the integration's name ('Composio' vs. your brand).",
        evidenceIds: [
          "SRC-NOTION-01",
          "SRC-NOTION-03",
          "SRC-NOTION-09",
          "SRC-NOTION-14",
          "SRC-COMP-06",
        ],
      },
      {
        id: "notion-scenario-single-workspace-internal",
        label: "Single-Workspace Internal Automation (No OAuth Needed!)",
        description:
          "You are connecting your own company's Notion workspace to an internal agent, sync pipeline, or dashboard.",
        recommendedPath: "use_alternative_auth_method",
        recommendedPathTitle:
          "Create a Notion Internal Connection (`API_KEY` / `ntn_...` Static Bearer Token)",
        customOAuthAppRequired: "not_applicable",
        recommendedScopesOrCapabilities: [
          "Portal Capabilities: Read content, Update content, Insert content",
          "Manual Page Sharing: Open target page -> `•••` (top right) -> `Add connections`",
        ],
        activeSetupEstimate: "10–15 minutes",
        externalApprovalWait: "0 days",
        keyRiskOrBlocker:
          "Every target top-level page or database MUST be manually shared via `••• -> Add connections` or API calls return `404 object_not_found` (`SRC-NOTION-01`, `SRC-NOTION-05`).",
        rationale:
          "Internal Connections issue a static bearer token immediately in the Notion Developer Portal with zero OAuth callback or token refresh complexity (`SRC-NOTION-01`, `SRC-NOTION-13`).",
        evidenceIds: ["SRC-NOTION-01", "SRC-NOTION-05", "SRC-NOTION-13"],
      },
      {
        id: "notion-scenario-prototype-managed",
        label: "Multi-Workspace Prototype (`NOTION` Composio Managed OAuth)",
        description:
          "You want to test multi-user Notion OAuth quickly before registering a custom public integration.",
        recommendedPath: "use_composio_managed_oauth",
        recommendedPathTitle: "Use Composio Managed OAuth (`NOTION` Toolkit)",
        customOAuthAppRequired: "no",
        recommendedScopesOrCapabilities: [
          "No scopes passed (Notion uses page picker selection during OAuth, `SRC-COMP-06`)",
        ],
        activeSetupEstimate: "5–10 minutes",
        externalApprovalWait: "0 days",
        keyRiskOrBlocker:
          "Page edits show 'Composio' as author, and if the user connects to Composio's managed Notion app elsewhere, their previous refresh token is invalidated (`SRC-COMP-06`).",
        rationale:
          "Fastest way to test the Notion OAuth Page Picker and pre-provisioned webhook triggers (`SRC-COMP-06`).",
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-06"],
      },
    ],
  },

  authenticationAssessment: {
    providerSupport: "oauth_confirmed",
    composioManagedAuth: {
      status: "available",
      toolkitExamined: "NOTION (version 20261018_00)",
      authMethodExamined: "OAUTH2 and API_KEY",
      evidenceIds: ["SRC-COMP-01", "SRC-COMP-06"],
      conditionsAndQualifications: [
        "Composio supports both managed `OAUTH2` (for Public Connections) and `API_KEY` (for Internal Connections) on the `NOTION` toolkit (`SRC-COMP-06`).",
        "Notion does not use OAuth scopes; do not pass `scopes` when creating a Composio Notion auth config (`SRC-COMP-06`).",
        "Critical token isolation warning (`SRC-COMP-06`): When a Notion user reconnects to the same Notion OAuth app, Notion issues a new token pair and invalidates the older `refresh_token`. Composio strongly recommends using your own custom Notion OAuth app in production so your users' tokens cannot be invalidated by another product sharing Composio's managed Notion app.",
      ],
    },
    recommendedPath: "register_custom_oauth_app",
    verdictHeadline:
      "For a single workspace, skip OAuth and use a Notion Internal Connection (`API_KEY`). For multi-workspace apps, register a Custom Notion Public Connection (OAuth 2.0) to prevent shared-app refresh token invalidation and 'Composio' edit attribution.",
    customOAuthAppRequired: "yes_for_production",
    reasoning:
      "Notion has three unique architectural traits established by our research: (1) Single-workspace integrations do not need OAuth at all (`Internal Connections` issue an immediate static token, `SRC-NOTION-01`); (2) Notion has **no OAuth scopes**—permissions are configured as **Capabilities** in the Developer Portal, while data visibility is controlled page-by-page (`SRC-NOTION-03`, `SRC-COMP-06`); and (3) Re-authenticating the same user against the same Notion OAuth app invalidates their prior `refresh_token`, making a dedicated custom Notion Public Connection essential for production multi-workspace stability (`SRC-COMP-06`).",
    launchBlockerSummary:
      "Four primary blockers: (1) Zero pages are accessible after auth unless shared via the OAuth Page Picker (which requires `Full Access`) or `••• → Add connections`, causing empty `/v1/search` results and `404 object_not_found` (`PP-NOTION-01`); (2) `POST /v1/oauth/token` rejects body credentials with `401 invalid_client` because it requires `Authorization: Basic base64(client_id:client_secret)` (`PP-NOTION-02`); (3) Re-connecting the same user invalidates their previous `refresh_token` (`PP-NOTION-04`); and (4) API versions `2025-09-03` / `2026-03-11` moved database row queries from `/v1/databases/{id}/query` to `/v1/data_sources/{data_source_id}/query` (`PP-NOTION-05`).",
    pathComparison: [
      {
        pathType: "custom_oauth_app",
        title: "Custom Notion Public Connection (OAuth 2.0)",
        applicability: "recommended_for_production",
        summary:
          "Public OAuth 2.0 integration created in the Notion Developer Portal with Installation Scope set to `Any workspace`.",
        whenToChoose: [
          "Multi-workspace SaaS products and AI agents used by external customers",
          "When page edits/comments must show your product's name and icon instead of 'Composio' (`SRC-COMP-06`)",
          "To isolate your users' `refresh_token` lifecycle from other apps (`SRC-COMP-06`)",
        ],
        tradeOffs: [
          "Token exchange requires HTTP Basic Auth (`base64(client_id:client_secret)`) and JSON body (`SRC-NOTION-01`)",
          "Custom webhook setup in Composio requires a 4-step reverse verification token paste (`SRC-COMP-06`)",
        ],
        requiredScopesOrCapabilities: [
          "Portal Capabilities: Read content, Update content, Insert content",
          "OAuth URL params: client_id, redirect_uri, response_type=code, owner=user (NO scope param)",
        ],
        evidenceIds: [
          "SRC-NOTION-01",
          "SRC-NOTION-03",
          "SRC-NOTION-14",
          "SRC-COMP-06",
        ],
      },
      {
        pathType: "alternative_documented_auth",
        title: "Notion Internal Connection (`API_KEY` / `ntn_...` Static Token)",
        applicability: "conditional_alternative",
        summary:
          "Workspace-scoped static bearer token created in the Notion Developer Portal with zero OAuth flow.",
        whenToChoose: [
          "Internal company automations, sync scripts, and agents operating inside a single Notion workspace (`SRC-NOTION-01`, `SRC-NOTION-13`)",
        ],
        tradeOffs: [
          "Cannot be installed by external workspaces (`SRC-NOTION-13`)",
          "Workspace members must manually share every target parent page/database via `••• → Add connections` (`SRC-NOTION-01`, `SRC-NOTION-05`)",
        ],
        requiredScopesOrCapabilities: [
          "Portal Capabilities + manual page sharing via `••• → Add connections`",
        ],
        evidenceIds: ["SRC-NOTION-01", "SRC-NOTION-05", "SRC-NOTION-13"],
      },
      {
        pathType: "composio_managed_oauth",
        title: "Composio Managed OAuth (`NOTION`)",
        applicability: "recommended_now",
        summary:
          "Zero-config OAuth flow and pre-provisioned webhook ingress using Composio's managed Notion integration.",
        whenToChoose: [
          "Prototyping multi-workspace Notion OAuth and testing Notion triggers immediately (`SRC-COMP-06`)",
        ],
        tradeOffs: [
          "All Notion page edits and comments are attributed to 'Composio' (`SRC-COMP-06`)",
          "If a user connects to Composio's managed Notion app in another tool, their previous refresh token is invalidated (`SRC-COMP-06`)",
        ],
        requiredScopesOrCapabilities: [
          "Managed by Composio; user selects pages in the Notion OAuth Page Picker",
        ],
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-06"],
      },
    ],
    evidenceIds: [
      "SRC-NOTION-01",
      "SRC-NOTION-02",
      "SRC-NOTION-03",
      "SRC-NOTION-14",
      "SRC-COMP-01",
      "SRC-COMP-06",
    ],
  },

  difficultyAndEffort: {
    difficultyCategory: "moderate",
    difficultyReasoning:
      "Notion does not block OAuth integrations behind a multi-week security audit like Gmail, nor does it require 10 workspaces before multi-workspace OAuth works like Slack Marketplace. However, its non-standard token exchange (HTTP Basic Auth + JSON body), complete absence of OAuth scopes, mandatory per-page sharing model (`404 object_not_found`), and 2025/2026 `/v1/data_sources` breaking API change trip up nearly every first-time implementer.",
    activeSetupTimeRange:
      "10–15 minutes (Internal Connection) / 25–40 minutes (Custom Public OAuth Connection)",
    assumptions: [
      "Developer is a Workspace Owner in a Notion workspace to create the integration (`SRC-NOTION-01`).",
      "Target users have `Full Access` permission on the Notion pages they want to share during OAuth (`SRC-NOTION-01`, `SRC-NOTION-04`).",
    ],
    confidence: "high",
    preparationWork: [
      "Decide whether your integration targets a single workspace (use Internal Connection) or multiple external workspaces (use Public Connection with Installation Scope = `Any workspace`—this choice cannot be changed after creation, `SRC-NOTION-01`, `SRC-NOTION-14`).",
      "Prepare a public Privacy Policy URL, Terms of Use URL, and support email (required in the Notion Developer Portal form when creating a Public Connection).",
      "Consider creating a starter public Notion page to link in the 'Notion URL for optional template' setting so users who don't know which page to pick can auto-duplicate a pre-shared template (`SRC-NOTION-01`).",
    ],
    externalDependencies: [
      {
        dependency: "Authorizing User Role & Page 'Full Access' Permission",
        party: "Authorizing End User / Customer Workspace Admin",
        requiredWhen: "Every Public OAuth authorization",
        blockingImpact:
          "Only workspace admins can complete OAuth in restricted workspaces (`SRC-NOTION-04`, `SRC-NOTION-09`), and the OAuth Page Picker **only lists pages where the user has `Full Access`** (pages with `Can Edit` or `Can View` are hidden, `SRC-NOTION-01`, `SRC-NOTION-04`).",
      },
      {
        dependency: "Customer Enterprise Approved-Connections Policy",
        party: "Customer's Notion Enterprise Workspace Owner",
        requiredWhen:
          "Customer workspace restricts third-party connections to an approved list (`SRC-NOTION-09`)",
        blockingImpact:
          "Workspace Owner must approve the connection before members can authorize it.",
      },
    ],
    publishedApprovalTimeEstimate:
      "0 days for Internal Connections and direct OAuth installation of Public Connections (`Any workspace`). Optional public listing in the Notion Integrations Marketplace has no published SLA in Notion's documentation.",
    corroboratedRealWorldWaitNotes:
      "Public OAuth credentials (`client_id`, `client_secret`, and Authorization URL) work immediately for direct OAuth link installations once the Public Connection configuration form is saved (`SRC-NOTION-01`).",
    unknownTimingNotes: [
      "Notion does not publish an official turnaround time for optional public directory listing in the Notion Marketplace.",
    ],
    conditionsChangingEstimate: [
      "Using an Internal Connection for single-workspace use cuts setup time to 10–15 minutes with zero OAuth code.",
      "Setting up custom Notion webhooks with Composio adds ~10 minutes for the reverse `webhook_signing_secret` verification token paste (`SRC-COMP-06`).",
    ],
  },

  prerequisites: [
    {
      id: "notion-pre-1",
      category: "account",
      title: "Notion Workspace Owner Access",
      detail:
        "You must be a Workspace Owner in the Notion workspace where you create the connection in the Developer Portal (`https://www.notion.so/profile/integrations`). If you are not an admin in your company workspace, create a free personal Notion workspace to own the integration (`SRC-NOTION-01`, `SRC-NOTION-02`).",
      requiredWhen: "Creating an Internal or Public Notion Connection",
      evidenceIds: ["SRC-NOTION-01", "SRC-NOTION-02"],
    },
    {
      id: "notion-pre-2",
      category: "workspace_project",
      title: "Irreversible Installation Scope Selection (`Any workspace` vs `Selected workspaces`)",
      detail:
        "When creating a Public Connection, select **Any workspace** if external customers will install it. Notion documents that Installation Scope **cannot be changed after creation** (`SRC-NOTION-01`, `SRC-NOTION-14`).",
      requiredWhen: "Creating a Public Connection",
      evidenceIds: ["SRC-NOTION-01", "SRC-NOTION-14"],
    },
    {
      id: "notion-pre-3",
      category: "capabilities_scopes",
      title: "Portal-Configured Capabilities (No OAuth Scopes)",
      detail:
        "Select `Read content`, `Update content`, `Insert content`, and `User information` capabilities in the Developer Portal before onboarding users. Changing capabilities later requires existing users to re-authenticate (`SRC-NOTION-03`, `SRC-COMP-06`).",
      requiredWhen: "Before generating the OAuth authorization link",
      evidenceIds: ["SRC-NOTION-03", "SRC-COMP-06"],
    },
    {
      id: "notion-pre-4",
      category: "callback_redirect",
      title: "HTTPS OAuth Redirect URI",
      detail:
        "Register your exact HTTPS callback URI in the Public Connection's OAuth configuration. For Composio Custom Auth, register `https://backend.composio.dev/api/v3/toolkits/auth/callback` (`SRC-NOTION-01`, `SRC-COMP-08`).",
      requiredWhen: "Using Public OAuth 2.0",
      evidenceIds: ["SRC-NOTION-01", "SRC-COMP-08"],
    },
  ],

  setupSteps: [
    {
      id: "notion-step-1",
      stepNumber: 1,
      title: "Choose Internal Connection (1 Workspace) vs. Public Connection (Multi-Workspace OAuth)",
      instructions:
        "Open the Notion Developer Portal (`https://www.notion.so/profile/integrations`) and click **New integration**. If building for a single internal workspace, choose **Internal** and copy the static `ntn_...` token—you do not need OAuth. If building for multiple customer workspaces, choose **Public** and set **Installation scope** to **Any workspace** (`SRC-NOTION-01`, `SRC-NOTION-14`).",
      whereToDoIt:
        "Notion Developer Portal (`https://www.notion.so/profile/integrations`)",
      consoleOrDocUrl: "https://developers.notion.com/docs/authorization",
      whyItMatters:
        "Installation scope (`Any workspace` vs `Selected workspaces only`) is locked permanently at creation time (`SRC-NOTION-01`), and choosing a custom Public Connection prevents the shared-app refresh token invalidation documented on Composio's managed Notion app (`SRC-COMP-06`).",
      prerequisites: ["Workspace Owner role in a Notion workspace"],
      expectedOutcome:
        "Created Notion integration with either a static `ntn_...` token (Internal) or `OAuth client ID` and `OAuth client secret` (Public).",
      completionCheck:
        "Confirm the integration's name and icon match your product branding, because Notion displays the integration name as the author of every page edit and comment (`SRC-COMP-06`).",
      commonFailureCases: [
        "Selecting 'Selected workspaces only' at creation and later discovering external customers cannot install the app (`SRC-NOTION-01`, `SRC-NOTION-14`).",
      ],
      estimatedTime: "5–10 minutes",
      responsibleParty: "developer",
      evidenceIds: [
        "SRC-NOTION-01",
        "SRC-NOTION-13",
        "SRC-NOTION-14",
        "SRC-COMP-06",
      ],
    },
    {
      id: "notion-step-2",
      stepNumber: 2,
      title: "Configure Content, Comment, and User Capabilities in the Portal",
      instructions:
        "Under the **Configuration** (or **Capabilities**) tab of your connection, check the minimum capabilities your agent needs: `Read content`, `Update content`, and/or `Insert content`. Under **User capabilities**, choose `User information with email addresses` only if your app requires user emails (`GET /v1/users`); otherwise choose `User information without email addresses` (`SRC-NOTION-03`). Save your changes.",
      whereToDoIt: "Notion Developer Portal → Your Integration → Capabilities",
      consoleOrDocUrl: "https://developers.notion.com/reference/capabilities",
      whyItMatters:
        "Notion does not support OAuth `scope` strings. All permissions come from these portal checkboxes, and any capability change made after a user connects will not apply until that user re-runs the OAuth flow (`SRC-NOTION-03`).",
      prerequisites: ["Step 1 completed"],
      expectedOutcome: "Saved capability matrix in the Notion Developer Portal.",
      completionCheck:
        "Verify you are NOT passing a `scope` parameter in your Notion OAuth authorize URL or Composio auth config (`SRC-COMP-06`).",
      commonFailureCases: [
        "`GET /v1/users` returning user objects without `person.email` because 'User information without email addresses' was left selected (`SRC-NOTION-03`, `SRC-NOTION-09`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-NOTION-03", "SRC-NOTION-09", "SRC-COMP-06"],
    },
    {
      id: "notion-step-3",
      stepNumber: 3,
      title: "Direct Users to Notion's OAuth Authorize URL (`owner=user`) and Page Picker",
      instructions:
        "For Public Connections, redirect the user to `https://api.notion.com/v1/oauth/authorize?client_id=<CLIENT_ID>&response_type=code&owner=user&redirect_uri=<URL_ENCODED_REDIRECT_URI>&state=<CSRF_TOKEN>`. Remind the user on your pre-auth screen that they **must select at least one page or database** in Notion's Page Picker (or duplicate your optional template), and that the Page Picker only displays pages where they have **Full Access** (`SRC-NOTION-01`, `SRC-NOTION-04`).",
      whereToDoIt: "Your application's 'Connect Notion' flow or Composio `session.authorize('notion')`",
      consoleOrDocUrl: "https://developers.notion.com/docs/authorization",
      whyItMatters:
        "If a user clicks through the OAuth prompt without selecting any pages (or only has `Can Edit` instead of `Full Access` on their team's pages), OAuth succeeds with a valid token that has access to **zero pages** (`SRC-NOTION-01`, `SRC-NOTION-04`, `SRC-NOTION-09`).",
      prerequisites: ["Registered HTTPS `redirect_uri` in the Developer Portal"],
      expectedOutcome:
        "User selects target workspace pages/databases and Notion redirects to `redirect_uri?code=...&state=...`.",
      completionCheck:
        "Verify `state` matches your session CSRF token and handles `?error=access_denied` gracefully if the user clicks Cancel (`SRC-NOTION-01`).",
      commonFailureCases: [
        "Users complaining that a team page doesn't appear in the Notion Page Picker search bar because their Notion permission level on that page is `Can Edit` rather than `Full Access` (`SRC-NOTION-04`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-NOTION-01", "SRC-NOTION-04", "SRC-NOTION-09"],
    },
    {
      id: "notion-step-4",
      stepNumber: 4,
      title: "Exchange Code at `POST /v1/oauth/token` Using HTTP Basic Auth + JSON Body",
      instructions:
        "If using Composio Custom Auth (`use_custom_auth` with `authScheme: 'OAUTH2'`), pass `client_id`, `client_secret`, and `oauth_redirect_uri: 'https://backend.composio.dev/api/v3/toolkits/auth/callback'` (`SRC-COMP-08`). If implementing direct token exchange, send `POST https://api.notion.com/v1/oauth/token` with headers `Authorization: Basic <base64(client_id + ':' + client_secret)>`, `Content-Type: application/json`, and `Notion-Version: 2026-03-11`, and JSON body `{\"grant_type\": \"authorization_code\", \"code\": \"...\", \"redirect_uri\": \"...\"}` (`SRC-NOTION-01`). Atomically store both `access_token`, `refresh_token`, `workspace_id`, and `bot_id`.",
      whereToDoIt: "Your backend token exchange handler or Composio Auth Config",
      consoleOrDocUrl: "https://developers.notion.com/docs/authorization",
      whyItMatters:
        "Notion rejects standard OAuth body credentials (`client_id`/`client_secret` in the body) with `401 invalid_client` (`SRC-NOTION-09`). Furthermore, Notion rotates refresh tokens and invalidates the previous `refresh_token` if the same user re-authenticates (`SRC-COMP-06`, `SRC-NOTION-07`).",
      prerequisites: ["Temporary `code` from Step 3"],
      expectedOutcome:
        "Valid `access_token`, `refresh_token`, `workspace_id`, and `duplicated_template_id` (if template used) persisted per user/workspace.",
      completionCheck:
        "Confirm your code encodes ` `${clientId}:${clientSecret}` ` in Base64 in the `Authorization: Basic ...` header and reuses the existing active connection per user instead of prompting repeated re-logins (`SRC-COMP-06`).",
      commonFailureCases: [
        "`401 invalid_client` caused by sending `client_id` and `client_secret` in the JSON body or using `application/x-www-form-urlencoded` on `/v1/oauth/token` (`SRC-NOTION-01`, `SRC-NOTION-09`).",
        "`400 invalid_grant` on token refresh due to concurrent refresh race conditions overwriting the rotated `refresh_token` (`SRC-NOTION-07`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: [
        "SRC-NOTION-01",
        "SRC-NOTION-07",
        "SRC-NOTION-09",
        "SRC-COMP-06",
        "SRC-COMP-08",
      ],
    },
    {
      id: "notion-step-5",
      stepNumber: 5,
      title: "Run an Immediate Post-Auth `/v1/search` Check and Query via `/v1/data_sources`",
      instructions:
        "Immediately after storing the token (or configuring an Internal Connection token), call `POST https://api.notion.com/v1/search` with headers `Authorization: Bearer <token>` and `Notion-Version: 2026-03-11` (`{\"page_size\": 5}`). If `results` is empty (`[]`), immediately show a UI prompt instructing the user to share a page (`••• → Add connections` for Internal Connections, or re-open the OAuth Page Picker for Public Connections). When querying database rows on API version `2025-09-03` or `2026-03-11`, use `POST /v1/data_sources/{data_source_id}/query` instead of the deprecated `/v1/databases/{id}/query` endpoint (`SRC-NOTION-02`, `SRC-NOTION-10`).",
      whereToDoIt: "Post-connect verification handler & Notion API client",
      consoleOrDocUrl:
        "https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03",
      whyItMatters:
        "Catches the #1 Notion support ticket ('I connected Notion but the agent can't find any of my pages') within 2 seconds of onboarding, and prevents `400`/`404` failures on multi-source databases.",
      prerequisites: ["Bearer token from Step 1 (Internal) or Step 4 (Public OAuth)"],
      expectedOutcome:
        "`POST /v1/search` returns at least 1 shared page or `data_source`, and rate-limited requests respect `Retry-After` on HTTP `429`/`529`.",
      completionCheck:
        "Verify `results.length > 0` on `POST /v1/search` and confirm every REST request includes `Notion-Version: 2026-03-11`.",
      commonFailureCases: [
        "Users looking for the integration in Notion's top-right `Share → Invite` box (outdated pre-2023 UI) instead of `••• → Add connections` (`SRC-NOTION-05`).",
        "`404 object_not_found` when adding a page to a linked database whose underlying source database was not shared with the integration (`SRC-NOTION-06`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: [
        "SRC-NOTION-02",
        "SRC-NOTION-05",
        "SRC-NOTION-06",
        "SRC-NOTION-09",
        "SRC-NOTION-10",
        "SRC-NOTION-12",
      ],
    },
  ],

  painPoints: [
    {
      id: "PP-NOTION-01",
      title: "Empty `/v1/search` (`[]`) and `404 object_not_found` Because Zero Pages Are Shared by Default",
      symptom:
        "Authentication succeeds (`200 OK`), but `POST /v1/search` returns `{\"results\": []}` with no error, and calling `GET /v1/pages/{id}` on a valid page UUID returns `404 Not Found` (`\"code\": \"object_not_found\"`).",
      scenario:
        "Calling Notion API endpoints after creating an Internal Connection or completing Public OAuth.",
      likelyCause:
        "Notion integrations have access to **zero workspace pages by default** (`SRC-NOTION-01`, `SRC-NOTION-09`). For Internal Connections, a user must open the target page and click `••• (top right) → Add connections` (older tutorials say 'Share → Invite', which no longer lists integrations, `SRC-NOTION-05`). For Public OAuth Connections, the user must select pages in the OAuth Page Picker—which **only displays pages where the user has `Full Access`** (`SRC-NOTION-01`, `SRC-NOTION-04`). Additionally, sharing a page that contains a linked database does not grant access to the underlying source database unless that source database is also shared (`SRC-NOTION-06`).",
      causeConfidence: "documented",
      problemClassification: "authorization_flow_misunderstanding",
      severity: "critical",
      evidenceIds: [
        "SRC-NOTION-01",
        "SRC-NOTION-04",
        "SRC-NOTION-05",
        "SRC-NOTION-06",
        "SRC-NOTION-09",
        "SRC-COMP-06",
      ],
      independentReportCount: 9,
      recencyVersionNotes:
        "Confirmed across 2025–2026 Notion docs, Stack Overflow (`SRC-NOTION-05`), and `makenotion/notion-mcp-server#81` (`SRC-NOTION-06`).",
      prevention:
        "Call `POST /v1/search` immediately after connection setup. If `results.length === 0`, block completion and display a visual guide showing `••• → Add connections` (Internal) or a 'Re-open Notion Page Picker' button (Public OAuth). Optionally configure a starter Notion Template URL in your Public Connection settings (`SRC-NOTION-01`).",
      resolution:
        "In Notion, open `Settings & Members → Connections` (or open the target parent page → `••• → Add connections`) and grant access to the top-level page and any underlying source databases (`SRC-COMP-06`, `SRC-NOTION-05`).",
      impactOnGuide:
        "Made post-auth `POST /v1/search` verification Step 5 of the setup guide and the #1 item in Test Before Launch.",
    },
    {
      id: "PP-NOTION-02",
      title: "`401 invalid_client` at Token Exchange Due to Missing Base64 HTTP Basic Auth Header",
      symptom:
        "`POST https://api.notion.com/v1/oauth/token` fails with `401 Unauthorized` (`{\"error\": \"invalid_client\"}`) or `400 invalid_grant`.",
      scenario:
        "Exchanging the temporary OAuth `code` for an `access_token` in a custom Notion Public Connection.",
      likelyCause:
        "Unlike providers that accept `client_id` and `client_secret` in the POST body, Notion requires credentials to be Base64-encoded in the HTTP Basic Authorization header (`Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)`) with `Content-Type: application/json` (`SRC-NOTION-01`, `SRC-NOTION-09`). Also, `redirect_uri` is required in the JSON body if and only if it was sent in the authorization URL or multiple redirect URIs are configured (`SRC-NOTION-01`).",
      causeConfidence: "documented",
      problemClassification: "authorization_flow_misunderstanding",
      severity: "high",
      evidenceIds: ["SRC-NOTION-01", "SRC-NOTION-09", "SRC-NOTION-15"],
      independentReportCount: 4,
      recencyVersionNotes:
        "Documented in Notion's current Authorization guide (`SRC-NOTION-01`) and Unified.to engineering reference (`SRC-NOTION-09`).",
      prevention:
        "Always send `Authorization: Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` and `Content-Type: application/json` when calling `https://api.notion.com/v1/oauth/token`.",
      resolution:
        "Remove `client_id` and `client_secret` from the JSON request body, move them into the `Authorization: Basic` header, and ensure `redirect_uri` matches the authorize request exactly.",
      impactOnGuide:
        "Explicitly detailed the `Authorization: Basic` + JSON body contract in Step 4.",
    },
    {
      id: "PP-NOTION-03",
      title: "No OAuth Scopes (`scope` Ignored) & Missing User Emails from Capability Configuration",
      symptom:
        "Passing `scope=...` in the OAuth URL has no effect on permissions, or calling `GET /v1/users` returns user objects without `person.email`.",
      scenario:
        "Configuring permissions for a Notion integration or retrieving workspace user emails.",
      likelyCause:
        "Notion does not use OAuth scopes (`SRC-COMP-06`). Instead, capabilities (`Read content`, `Update content`, `Insert content`, `Read/Insert comments`, and `User information with/without email addresses`) are configured statically in the Notion Developer Portal (`SRC-NOTION-03`). If capabilities are updated later, existing tokens do not gain the new capability until the user re-authenticates (`SRC-NOTION-03`).",
      causeConfidence: "documented",
      problemClassification: "permission_scope_decision",
      severity: "medium",
      evidenceIds: ["SRC-NOTION-03", "SRC-NOTION-09", "SRC-COMP-06"],
      independentReportCount: 3,
      recencyVersionNotes: "Confirmed in 2026 Notion Capabilities reference (`SRC-NOTION-03`).",
      prevention:
        "Configure all required Content, Comment, and User capabilities in the Notion Developer Portal before onboarding users, and omit `scopes` from Composio Notion auth configs (`SRC-COMP-06`).",
      resolution:
        "Enable `User information with email addresses` in the Developer Portal under Capabilities and prompt existing users to re-authorize the connection (`SRC-NOTION-03`).",
      impactOnGuide:
        "Added Step 2 (Configure Capabilities in Portal) and Section 3 Prerequisite.",
    },
    {
      id: "PP-NOTION-04",
      title: "Re-Authentication Invalidates Previous `refresh_token` Across Shared OAuth Apps",
      symptom:
        "A user's existing Notion connection works for up to an hour, then fails permanently with `invalid_grant` on refresh after the user connected Notion in another session or another product using Composio's managed Notion app.",
      scenario:
        "Using a shared OAuth app (like Composio Managed Auth for Notion) in production, or asking the same user to re-run OAuth multiple times, or running concurrent token refreshes without a lock.",
      likelyCause:
        "Composio's Notion documentation (`SRC-COMP-06`) and Notion's MCP OAuth cookbook (`SRC-NOTION-07`) confirm that when a Notion user connects to the same Notion OAuth app again, Notion issues a new `access_token`/`refresh_token` pair and invalidates the older `refresh_token`. Similarly, parallel refresh calls without a mutex cause losing requests to fail with `invalid_grant` (`SRC-NOTION-07`). (Note: An isolated beta report on Notion's separate hosted `mcp.notion.com` server omitting `refresh_token` was also logged in `SRC-NOTION-08`, `Grade D`, which does not apply to standard `api.notion.com/v1/oauth/token`.)",
      causeConfidence: "documented",
      problemClassification: "composio_specific_configuration",
      severity: "high",
      evidenceIds: [
        "SRC-COMP-06",
        "SRC-NOTION-07",
        "SRC-NOTION-08",
        "SRC-NOTION-09",
        "SRC-NOTION-16",
      ],
      independentReportCount: 4,
      recencyVersionNotes:
        "Explicitly warned in Composio's October 2026 Notion toolkit docs (`SRC-COMP-06`).",
      prevention:
        "For production apps, register your own custom Notion Public Connection so your users' tokens are isolated to your product (`SRC-COMP-06`). Keep one active Notion connection per user and use a mutex lock when refreshing tokens (`SRC-NOTION-07`).",
      resolution:
        "Migrate from Composio's shared managed Notion app to a custom Notion OAuth auth config (`use_custom_auth`), persist every rotated `refresh_token` atomically, and prompt re-authentication when `invalid_grant` occurs.",
      impactOnGuide:
        "Drove the recommendation in Section 1 and Section 2 to use a Custom Notion Public Connection for production multi-workspace apps.",
    },
    {
      id: "PP-NOTION-05",
      title: "Breaking `2025-09-03` / `2026-03-11` `data_sources` Migration & Shared Workspace `429` Rate Limits",
      symptom:
        "Requests without `Notion-Version` fail with `400 Bad Request`; legacy `POST /v1/databases/{id}/query` calls fail on multi-source databases in `2025-09-03` / `2026-03-11`; or requests return `429 rate_limited` (`public_api_space_request_rate_limit`) even at <1 req/sec.",
      scenario:
        "Querying Notion databases and handling rate limits in 2026.",
      likelyCause:
        "Starting with API version `2025-09-03` (and current `2026-03-11`), Notion models databases as containers of one or more `data_sources`, moving row queries to `POST /v1/data_sources/{data_source_id}/query` (`SRC-NOTION-02`, `SRC-NOTION-10`, `SRC-NOTION-11`). Additionally, Notion enforces both a per-connection limit (180 req/min on standard plans, 600 req/min on Business/Enterprise, ~3 req/s for data source queries) AND a **shared per-workspace limit** across all integrations installed in that workspace (`SRC-NOTION-12`).",
      causeConfidence: "documented",
      problemClassification: "outdated_source",
      severity: "medium",
      evidenceIds: [
        "SRC-NOTION-02",
        "SRC-NOTION-09",
        "SRC-NOTION-10",
        "SRC-NOTION-11",
        "SRC-NOTION-12",
      ],
      independentReportCount: 4,
      recencyVersionNotes:
        "Applies to all integrations using Notion API versions `2025-09-03` and `2026-03-11` (`SRC-NOTION-02`, `SRC-NOTION-10`, `SRC-NOTION-12`).",
      prevention:
        "Send `Notion-Version: 2026-03-11` on every REST call (or use `@notionhq/client` v4+), discover `data_sources[].id` via `GET /v1/databases/{id}`, query via `POST /v1/data_sources/{data_source_id}/query`, and queue outgoing requests respecting the integer `Retry-After` header on `429` and `529` responses (`SRC-NOTION-12`).",
      resolution:
        "Update legacy `/v1/databases/{id}/query` calls to `/v1/data_sources/{data_source_id}/query` and pause for `Number(res.headers.get('Retry-After'))` seconds on `429 rate_limited` or `529 service_overload` (unless `rate_limit_reason === 'public_api_request_blocked'`, `SRC-NOTION-12`).",
      impactOnGuide:
        "Added `Notion-Version: 2026-03-11`, `/v1/data_sources` query migration, and `Retry-After` checks to Step 5 and Section 7.",
    },
  ],

  launchChecklist: [
    {
      id: "notion-check-1",
      label: "Post-Auth `POST /v1/search` Non-Empty Check Implemented",
      verificationMethod:
        "Immediately after token exchange (or internal token setup), call `POST https://api.notion.com/v1/search` and verify `results.length > 0`. If `0`, prompt the user to select/share pages.",
      failureIndicator:
        "User completes OAuth without selecting pages and sees empty state or `404 object_not_found` across your app.",
      category: "api_verification",
    },
    {
      id: "notion-check-2",
      label: "HTTP Basic Auth Header Used on `POST /v1/oauth/token`",
      verificationMethod:
        "Confirm token exchange sends `Authorization: Basic base64(client_id:client_secret)` and `Content-Type: application/json` rather than form-encoded body credentials.",
      failureIndicator:
        "`401 Unauthorized` (`invalid_client`) during authorization code exchange.",
      category: "callback_redirect",
    },
    {
      id: "notion-check-3",
      label: "Portal Capabilities Match Endpoint Needs (Including User Email Setting)",
      verificationMethod:
        "Check the Notion Developer Portal Capabilities tab to confirm `Read content`, `Update content`, `Insert content`, and `User information` match your API calls.",
      failureIndicator:
        "`403 restricted_resource` or missing `person.email` on `GET /v1/users`.",
      category: "consent_scopes",
    },
    {
      id: "notion-check-4",
      label: "Atomic Refresh Token Rotation & Single Connection Reuse",
      verificationMethod:
        "Verify your app reuses the existing active Notion connection per user (rather than re-triggering OAuth on every login) and atomically saves rotated `refresh_token` values under a mutex lock (`SRC-COMP-06`, `SRC-NOTION-07`).",
      failureIndicator:
        "Older connections fail with `invalid_grant` after the user reconnects or when two workers refresh simultaneously.",
      category: "token_lifecycle",
    },
    {
      id: "notion-check-5",
      label: "`Notion-Version: 2026-03-11` Header & `Retry-After` Backoff Active",
      verificationMethod:
        "Confirm every API request includes `Notion-Version: 2026-03-11`, queries rows via `/v1/data_sources/{data_source_id}/query`, and pauses for `Retry-After` seconds on HTTP `429` and `529`.",
      failureIndicator:
        "`400 Bad Request` (missing version header) or unrecovered `429 rate_limited` errors during workspace bursts.",
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
        "Composio provides managed OAuth2 for `NOTION`.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Official list of 124 toolkits with Composio-managed OAuth available.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-COMP-06",
      title: "Composio — Notion Toolkit Documentation",
      canonicalUrl: "https://docs.composio.dev/toolkits/notion",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-18",
      claimsSupported: [
        "Notion supports `OAUTH2` and `API_KEY` in Composio (v20261018_00) and does not use OAuth scopes.",
        "Notion attributes edits to the integration name ('Composio' unless using a custom Notion app).",
        "If the same Notion user connects again through the same Notion app, Notion issues a new token pair and invalidates the older `refresh_token`; Composio strongly recommends a custom Notion app for production.",
        "Custom Notion webhook ingress requires a reverse verification token paste.",
      ],
      painPointsSupported: ["PP-NOTION-01", "PP-NOTION-03", "PP-NOTION-04"],
      summaryOfContent:
        "Official Composio Notion toolkit reference and troubleshooting FAQ.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
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
        "Shows exact Python and TypeScript code for creating a custom Notion OAuth2 auth config with `oauth_redirect_uri: 'https://backend.composio.dev/api/v3/toolkits/auth/callback'`.",
      ],
      painPointsSupported: ["PP-NOTION-04"],
      summaryOfContent:
        "Official Composio programmatic auth config documentation using Notion as the primary custom OAuth2 example.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-01",
      title: "Notion Docs — Authorization",
      canonicalUrl: "https://developers.notion.com/docs/authorization",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-03-11",
      claimsSupported: [
        "Internal connections use a static bearer token and require sharing pages via `••• → Add connections`.",
        "Public connections use OAuth 2.0, require choosing `Any workspace` vs `Selected workspaces only` at creation (irreversible), and require `Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)` with JSON body at `POST /v1/oauth/token`.",
        "The OAuth Page Picker only displays pages where the user has `Full Access`.",
      ],
      painPointsSupported: ["PP-NOTION-01", "PP-NOTION-02"],
      summaryOfContent:
        "Primary official Notion authorization guide covering Internal Connections, PATs, and Public OAuth 2.0 Connections.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-02",
      title: "Notion Docs — API Reference Introduction",
      canonicalUrl: "https://developers.notion.com/reference/intro",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-03-11",
      claimsSupported: [
        "Mandatory `Notion-Version: 2026-03-11` header, `null` instead of empty string `\"\"`, and `POST /v1/data_sources/{data_source_id}/query` pagination.",
      ],
      painPointsSupported: ["PP-NOTION-05"],
      summaryOfContent:
        "Official Notion REST API conventions and header requirements.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-03",
      title: "Notion Docs — Connection Capabilities",
      canonicalUrl: "https://developers.notion.com/reference/capabilities",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-03-11",
      claimsSupported: [
        "Capabilities (`Read content`, `Update content`, `Insert content`, `Read/Insert comments`, `User information with/without email`) control permissions instead of OAuth scopes.",
        "Users must re-authenticate if capabilities are changed after initial authorization.",
      ],
      painPointsSupported: ["PP-NOTION-03"],
      summaryOfContent:
        "Official specification of Notion's capability permission system.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-04",
      title: "Notion Changelog — OAuth improvements (Page Picker Full Access rule)",
      canonicalUrl: "https://developers.notion.com/changelog/oauth-improvements",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2024-06-01",
      claimsSupported: [
        "The OAuth Page Picker only shows pages for which the user has `Full Access` permission (hiding `Can View` / `Can Edit` pages).",
        "Only workspace admins and the original authorizing user can re-run the OAuth flow to modify shared pages.",
      ],
      painPointsSupported: ["PP-NOTION-01"],
      summaryOfContent:
        "Official Notion changelog detailing OAuth Page Picker search and permission rules.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-05",
      title: "Stack Overflow — Using Notion API, I get 'not found' errors trying to read any page",
      canonicalUrl:
        "https://stackoverflow.com/questions/77203541/using-notion-api-i-get-not-found-errors-trying-to-read-any-page",
      publisherDomain: "stackoverflow.com",
      sourceType: "stack_overflow",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2023-09-29",
      claimsSupported: [
        "`404 object_not_found` occurs when pages are not shared via the three-dot menu `••• → Add connections` (replacing the old 'Share → Invite' UI).",
      ],
      painPointsSupported: ["PP-NOTION-01"],
      summaryOfContent:
        "Developer report explaining how outdated 'Invite' instructions cause `404 object_not_found` until the connection is added via `••• → Add connections`.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-06",
      title: "GitHub Issue — 'object_not_found' error when adding page to database despite integration permissions (makenotion/notion-mcp-server #81)",
      canonicalUrl: "https://github.com/makenotion/notion-mcp-server/issues/81",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-07-13",
      claimsSupported: [
        "Even when a parent page is shared, writing to a database inside it returns `404 object_not_found` if the underlying database / data source itself is not shared with the integration.",
      ],
      painPointsSupported: ["PP-NOTION-01"],
      summaryOfContent:
        "July 2025 issue report in Notion's official MCP server repository demonstrating database-level `object_not_found`.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-07",
      title: "Notion Cookbook — docs/mcp-client-integration.md (Token Refresh & Rotation)",
      canonicalUrl:
        "https://github.com/makenotion/notion-cookbook/blob/main/docs/mcp-client-integration.md",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-11-01",
      claimsSupported: [
        "Refresh token rotation invalidates older tokens; concurrent refreshes without a mutex lock cause losing requests to fail with `invalid_grant`.",
      ],
      painPointsSupported: ["PP-NOTION-04"],
      summaryOfContent:
        "Official Notion cookbook guide on OAuth token refresh and concurrency locking.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-08",
      title: "GitHub Issue — OAuth: refresh_token not issued on mcp.notion.com (makenotion/claude-code-notion-plugin #22)",
      canonicalUrl:
        "https://github.com/makenotion/claude-code-notion-plugin/issues/22",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-02-01",
      claimsSupported: [
        "Isolated report that Notion's beta remote MCP server (`mcp.notion.com/token`) omitted `refresh_token` despite advertising it in metadata.",
      ],
      painPointsSupported: ["PP-NOTION-04"],
      summaryOfContent:
        "Isolated February 2026 issue report on Notion's hosted MCP beta server (distinct from standard `api.notion.com/v1/oauth/token`).",
      evidenceStrength: "D",
      isIndependentReport: true,
      limitations: "Applies only to `mcp.notion.com` beta; classified as Grade D isolated report.",
    },
    {
      id: "SRC-NOTION-09",
      title: "Unified.to — Notion OAuth2 App Registration Engineering Guide",
      canonicalUrl: "https://docs.unified.to/skills/notion-oauth-app/SKILL.md",
      publisherDomain: "docs.unified.to",
      sourceType: "third_party_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-04-01",
      claimsSupported: [
        "Symptom/cause table covering empty search results, `404 object_not_found`, `401 invalid_client` (missing Basic auth), `400 invalid_grant`, and missing `Notion-Version` header.",
      ],
      painPointsSupported: [
        "PP-NOTION-01",
        "PP-NOTION-02",
        "PP-NOTION-03",
        "PP-NOTION-04",
        "PP-NOTION-05",
      ],
      summaryOfContent:
        "Comprehensive engineering troubleshooting reference for Notion OAuth2 integrations.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "Third-party integration guide corroborated against primary Notion docs.",
    },
    {
      id: "SRC-NOTION-10",
      title: "Notion Docs — Upgrade guide 2025-09-03 (Multi-source databases)",
      canonicalUrl:
        "https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-09-03",
      claimsSupported: [
        "API version `2025-09-03`+ models databases as containers of `data_sources` and moves queries to `/v1/data_sources/{data_source_id}/query`.",
      ],
      painPointsSupported: ["PP-NOTION-05"],
      summaryOfContent:
        "Official Notion migration guide for the `2025-09-03` multi-source database API change.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-11",
      title: "Notion Docs — Upgrade FAQs 2025-09-03",
      canonicalUrl:
        "https://developers.notion.com/guides/get-started/upgrade-faqs-2025-09-03",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-09-03",
      claimsSupported: [
        "How to discover `data_sources[].id` from `GET /v1/databases/{database_id}`.",
      ],
      painPointsSupported: ["PP-NOTION-05"],
      summaryOfContent:
        "Official FAQ on migrating from `/v1/databases` to `/v1/data_sources`.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-12",
      title: "Notion Docs — Request limits",
      canonicalUrl: "https://developers.notion.com/reference/request-limits",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-08",
      claimsSupported: [
        "Per-connection limit: 180 req/min (3 req/s) on standard plans, 600 req/min (10 req/s) on Business/Enterprise, ~3 req/s for data source queries.",
        "Shared per-workspace limit (`public_api_space_request_rate_limit`) and mandatory `Retry-After` handling on HTTP 429 and 529.",
      ],
      painPointsSupported: ["PP-NOTION-05"],
      summaryOfContent:
        "Official Notion rate limit and retry specification (updated Sept 2026).",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-13",
      title: "Notion Docs — Internal connections",
      canonicalUrl:
        "https://developers.notion.com/guides/get-started/internal-connections",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-03-11",
      claimsSupported: [
        "Internal connections are scoped to a single workspace, use a static API token, and require no OAuth flow.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Official guide to creating and sharing pages with a Notion Internal Connection.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-14",
      title: "Notion Docs — Public connections",
      canonicalUrl:
        "https://developers.notion.com/guides/get-started/public-connections",
      publisherDomain: "developers.notion.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-03-11",
      claimsSupported: [
        "Public connections follow OAuth 2.0 and require choosing `Any workspace` or `Selected workspaces only` at creation.",
      ],
      painPointsSupported: ["PP-NOTION-01"],
      summaryOfContent:
        "Official guide to Notion Public Connections and the OAuth Page Picker.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-15",
      title: "GitHub Issue — 401 using mcp.notion.com/mcp (makenotion/notion-mcp-server #106)",
      canonicalUrl: "https://github.com/makenotion/notion-mcp-server/issues/106",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-09-08",
      claimsSupported: [
        "Maintainer (@mquan) confirms internal `ntn_` tokens and standard public OAuth tokens cannot be passed directly to Notion's remote `mcp.notion.com` server without completing the MCP server's own OAuth flow.",
      ],
      painPointsSupported: ["PP-NOTION-02"],
      summaryOfContent:
        "Maintainer explanation distinguishing standard Notion API tokens from `mcp.notion.com` tokens.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-NOTION-16",
      title: "Notion JS SDK — Release v4.0.2 (`notion.oauth.token` refresh support)",
      canonicalUrl:
        "https://github.com/makenotion/notion-sdk-js/releases/tag/v4.0.2",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-10-01",
      claimsSupported: [
        "`@notionhq/client` v4.0.2+ supports `grant_type: 'refresh_token'` in `notion.oauth.token(...)`.",
      ],
      painPointsSupported: ["PP-NOTION-04"],
      summaryOfContent:
        "Official Notion JS SDK release notes adding built-in refresh token support.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
  ],

  agentResearchTrace: {
    searchesExecuted: 6,
    normalizedQueries: [
      "Notion OAuth API object_not_found OR Basic token exchange OR internal integration OR share page stackoverflow github issues reddit 2025 2026",
      "site:github.com/makenotion oauth OR object_not_found OR unauthorized OR refresh issues",
      "Notion API rate_limited OR invalid_client Basic auth OR data_sources 2025 2026 developers.notion.com stackoverflow github",
      "site:docs.composio.dev/toolkits github gmail slack notion oauth2 managed auth",
    ],
    sourcesRetrievedCount: 19,
    sourcesFailedCount: 0,
    documentsInspected: [
      "https://docs.composio.dev/toolkits/notion",
      "https://developers.notion.com/docs/authorization",
      "https://developers.notion.com/reference/intro",
      "https://developers.notion.com/reference/capabilities",
      "https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03",
      "https://developers.notion.com/reference/request-limits",
      "https://github.com/makenotion/notion-cookbook/blob/main/docs/mcp-client-integration.md",
      "https://docs.unified.to/skills/notion-oauth-app/SKILL.md",
    ],
    painPointAreasExplored: [
      "Internal (`ntn_` static token) vs. Public OAuth 2.0 connection architecture",
      "Zero pages shared by default causing empty `/v1/search` and `404 object_not_found`",
      "HTTP Basic Auth (`base64(client_id:client_secret)`) + JSON body requirement at `POST /v1/oauth/token`",
      "Portal Capabilities vs. OAuth scopes and missing user email addresses",
      "Re-authentication invalidating previous `refresh_token` across shared OAuth apps (`SRC-COMP-06`)",
      "`2025-09-03` / `2026-03-11` `/v1/data_sources` breaking API change and shared workspace rate limits",
    ],
    validationPerformed: [
      "Verified all 19 evidence source IDs against `docs/research/source-ledger.csv`",
      "Distinguished `Grade D` isolated `mcp.notion.com` beta report (`SRC-NOTION-08`) from standard `api.notion.com/v1/oauth/token` behavior",
      "Validated guide record against `GuideSchema` runtime Zod rules",
    ],
    agentPreparedActions: [
      "Created decision split between Single-Workspace Internal Connections (no OAuth) and Multi-Workspace Custom Public Connections",
      "Designed post-OAuth `POST /v1/search` empty-array recovery check to eliminate `404 object_not_found` confusion",
      "Documented exact Base64 Basic Auth token exchange and `2026-03-11` `/v1/data_sources` query format",
    ],
    unresolvedQuestions: [
      "Notion does not publish an official turnaround time for optional public directory listing in the Notion Integrations Marketplace.",
    ],
    stopReason: "sufficient_evidence",
  },

  outcome: {
    guideStatus: "complete_verified",
    confidence: "high",
    limitations: [
      "Optional listing in the public Notion Integrations Marketplace has no published SLA in Notion's documentation; however, direct multi-workspace OAuth installation works immediately once the Public Connection is configured (`SRC-NOTION-01`).",
    ],
    recommendedNextStep: {
      title: "Choose Internal Connection (1 Workspace) or Custom Public Connection (Multi-Workspace) in Notion Portal",
      action:
        "Open `https://www.notion.so/profile/integrations`. If connecting only your own workspace, create an **Internal Connection**, copy the `ntn_...` token, and share your target page via `••• → Add connections`. If building for external users, create a **Public Connection** with Installation Scope set to **Any workspace**, configure your Content Capabilities, and implement the post-OAuth `POST /v1/search` empty-page check.",
      targetUrl: "https://www.notion.so/profile/integrations",
      rationale:
        "Prevents building unnecessary OAuth for single-workspace tools while protecting multi-workspace production apps from shared-app refresh token invalidation (`SRC-COMP-06`).",
    },
    humanOnlyActions: [
      "Log into `https://www.notion.so/profile/integrations` as a Workspace Owner to create the connection and toggle Capabilities.",
      "Share target pages via `••• → Add connections` (Internal) or select pages with `Full Access` in the OAuth Page Picker (Public).",
      "If using custom Notion webhooks with Composio, paste the `webhook_signing_secret` token back into Notion's webhook verification field (`SRC-COMP-06`).",
    ],
    missingInformationToProceed: [],
    outdatedReportMechanism: {
      instructions:
        "Did Notion release a newer `Notion-Version` header or change its Page Picker behavior? Flag this guide with the changelog URL.",
      endpoint: "/api/feedback",
    },
  },
};
