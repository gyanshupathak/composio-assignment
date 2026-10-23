import { Guide } from "@/lib/schema/guideSchema";

export const gmailGuide: Guide = {
  id: "curated-gmail-oauth-v1",
  slug: "gmail",
  applicationName: "Gmail / Google OAuth",
  aliases: [
    "google",
    "google-oauth",
    "google-mail",
    "google-workspace",
    "gmail-api",
    "gcp-oauth",
  ],
  category: "Email & Productivity (Google Cloud)",
  canonicalWebsite: "https://mail.google.com",
  developerDocsUrl: "https://developers.google.com/gmail/api/auth/scopes",
  shortSummary:
    "Connect Gmail accounts to read, search, draft, or send email via Google OAuth 2.0. Launch readiness depends heavily on whether your scopes are Sensitive (`gmail.send`, 3–5 days review) or Restricted (`gmail.readonly` / `gmail.modify`, multi-week CASA security assessment).",
  guideOrigin: "curated",
  createdAt: "2026-10-23T08:05:00.000Z",
  lastReviewedAt: "2026-10-23T10:15:00.000Z",
  schemaVersion: "1.0.0",

  scenario: {
    integrationGoal:
      "Search and read user emails, manage labels/drafts, and send messages on behalf of external Google Account and Google Workspace users.",
    intendedAudience: "multi_workspace_external",
    requiredCapabilities: [
      "Authorize external `@gmail.com` and Google Workspace users via OAuth 2.0",
      "Obtain and persist offline `refresh_token` credentials that do not expire after 7 days",
      "Read/search threads or send emails using the narrowest scope tier possible",
    ],
    optionalFeatures: [
      {
        feature: "Read and search full email message bodies (`gmail.readonly` or `gmail.modify`)",
        additionalPermissionsRequired:
          "Restricted Scope: `https://www.googleapis.com/auth/gmail.readonly` (or `gmail.modify`).",
        impactOnVerification:
          "Triggers Google Restricted Scope Verification + mandatory annual third-party CASA Security Assessment (several weeks).",
      },
      {
        feature: "Send outbound email only without reading inbox (`gmail.send`)",
        additionalPermissionsRequired:
          "Sensitive Scope: `https://www.googleapis.com/auth/gmail.send`.",
        impactOnVerification:
          "Requires Sensitive Scope Verification (typically 3–5 business days after brand verification) and an unlisted YouTube demo video, but NO CASA security audit.",
      },
      {
        feature: "Manage Gmail filters and forwarding (`gmail.settings.basic`)",
        additionalPermissionsRequired:
          "Restricted Scope: `https://www.googleapis.com/auth/gmail.settings.basic`.",
        impactOnVerification:
          "Not verified on Composio's default managed client (shows 'App is blocked', `SRC-COMP-05`); requires a custom verified Google OAuth app.",
      },
    ],
    accountWorkspaceAssumptions: [
      "Target audience includes external consumer `@gmail.com` accounts and/or external Google Workspace domains.",
      "Application backend stores or transmits Gmail data (which triggers CASA when using Restricted scopes).",
    ],
    alternativeScenarios: [
      {
        id: "gmail-scenario-read-modify",
        label: "Inbox Reader / AI Email Assistant (`gmail.readonly` / `gmail.modify`)",
        description:
          "Your agent searches threads, summarizes emails, drafts replies, or modifies labels for external users.",
        recommendedPath: "use_composio_managed_oauth",
        recommendedPathTitle:
          "Start with Composio Managed OAuth Now; Run Custom Restricted Scope + CASA Verification in Parallel for Production",
        customOAuthAppRequired: "yes_for_production",
        recommendedScopesOrCapabilities: [
          "https://www.googleapis.com/auth/gmail.readonly (or gmail.modify)",
          "Do NOT include gmail.metadata alongside gmail.readonly/modify (`SRC-COMP-05`)",
          "Do NOT request https://mail.google.com/ unless permanently deleting messages bypassing Trash (`SRC-GMAIL-04`)",
        ],
        activeSetupEstimate:
          "10 mins (Composio Managed) / 35–45 mins + 4–6 hrs verification prep (Custom OAuth)",
        externalApprovalWait:
          "0 days with Composio Managed Auth; 3–8+ weeks for Custom App Restricted Scope Verification + CASA Security Assessment",
        keyRiskOrBlocker:
          "Custom apps left in 'Testing' status expire refresh tokens every 7 days (`invalid_grant`); going to production with Restricted scopes requires an annual third-party CASA audit (`SRC-GMAIL-05`).",
        rationale:
          "Composio's managed `GMAIL` app is already verified for default Gmail scopes, letting you ship immediately (with Composio branding and shared quota) while your own production GCP project undergoes multi-week Restricted Scope + CASA verification.",
        evidenceIds: [
          "SRC-GMAIL-02",
          "SRC-GMAIL-04",
          "SRC-GMAIL-05",
          "SRC-COMP-03",
          "SRC-COMP-05",
        ],
      },
      {
        id: "gmail-scenario-send-only",
        label: "Send-Only Agent (`gmail.send` Only)",
        description:
          "Your agent only sends emails on the user's behalf and never reads or searches their inbox.",
        recommendedPath: "register_custom_oauth_app",
        recommendedPathTitle:
          "Register a Custom Google OAuth App with `gmail.send` (Sensitive Scope)",
        customOAuthAppRequired: "yes_for_production",
        recommendedScopesOrCapabilities: [
          "https://www.googleapis.com/auth/gmail.send",
          "openid email profile (optional identity)",
        ],
        activeSetupEstimate: "30–40 minutes + 2 hours verification prep",
        externalApprovalWait:
          "2–3 business days (Brand Verification) + 3–5 business days (Sensitive Scope Verification) (`SRC-GMAIL-03`)",
        keyRiskOrBlocker:
          "Requires domain verification in Google Search Console, same-domain Privacy Policy, and an unlisted YouTube demo video.",
        rationale:
          "Because `gmail.send` is classified as Sensitive rather than Restricted (`SRC-GMAIL-04`), dropping read scopes eliminates the multi-week third-party CASA security assessment entirely!",
        evidenceIds: ["SRC-GMAIL-03", "SRC-GMAIL-04"],
      },
      {
        id: "gmail-scenario-internal-workspace",
        label: "Internal Company Tool (Single Google Workspace Domain)",
        description:
          "Only employees inside your own company's Google Workspace organization will connect their Gmail.",
        recommendedPath: "register_custom_oauth_app",
        recommendedPathTitle:
          "Register a Custom Google OAuth App with User Type = `Internal`",
        customOAuthAppRequired: "yes_always",
        recommendedScopesOrCapabilities: [
          "gmail.readonly, gmail.modify, or gmail.send as needed",
        ],
        activeSetupEstimate: "20–30 minutes",
        externalApprovalWait: "0 days (No Google verification required for Internal apps)",
        keyRiskOrBlocker:
          "Cannot be authorized by any external `@gmail.com` or outside Workspace user (`SRC-GMAIL-02`).",
        rationale:
          "Setting User Type to `Internal` in Google Cloud Console bypasses Google verification, the 100-user cap, and the 7-day Testing refresh token expiration for all users in your domain (`SRC-GMAIL-02`).",
        evidenceIds: ["SRC-GMAIL-02", "SRC-GMAIL-03"],
      },
    ],
  },

  authenticationAssessment: {
    providerSupport: "oauth_confirmed",
    composioManagedAuth: {
      status: "available",
      toolkitExamined: "GMAIL (version 20261018_00)",
      authMethodExamined: "OAUTH2",
      evidenceIds: ["SRC-COMP-01", "SRC-COMP-05"],
      conditionsAndQualifications: [
        "Composio provides a verified managed OAuth2 client for `GMAIL` (63 tools, 2 polling triggers).",
        "Managed auth shares Google API rate-limit quotas across Composio users; high-volume production apps can hit `429 Quota Exhausted` faster and should bring their own verified Google OAuth credentials (`SRC-COMP-05`).",
        "Adding extra scopes not verified on Composio's default client (such as `gmail.settings.basic`) causes Google to display `'App is blocked'` (`SRC-COMP-05`).",
      ],
    },
    recommendedPath: "use_composio_managed_oauth",
    verdictHeadline:
      "Use Composio Managed OAuth to launch immediately without the 7-day Testing token expiry; start custom Google OAuth verification in parallel (3–5 days for `gmail.send`, or several weeks + CASA audit for `gmail.readonly`/`gmail.modify`).",
    customOAuthAppRequired: "yes_for_production",
    reasoning:
      "Google OAuth has the sharpest gap between 'works on localhost' and 'ready for production launch' of any major provider. An External custom OAuth app in `Testing` mode is capped at 100 allowlisted test users and **automatically expires all refresh tokens after 7 days** (`invalid_grant`, `SRC-GMAIL-02`, `SRC-GMAIL-06`). Meanwhile, publishing a custom app that reads emails (`gmail.readonly` or `gmail.modify`) requires Restricted Scope Verification and an annual third-party CASA security assessment taking several weeks (`SRC-GMAIL-04`, `SRC-GMAIL-05`). Using Composio Managed Auth unblocks development and early users immediately while you prepare your dedicated production GCP project.",
    launchBlockerSummary:
      "Three primary launch blockers: (1) Leaving a custom External app in `Testing` mode causes every user's refresh token to fail with `invalid_grant` after 7 days (`PP-GMAIL-01`); (2) Requesting Restricted scopes (`gmail.readonly`, `gmail.modify`) requires multi-week Google verification + annual CASA security assessment (`PP-GMAIL-02`); and (3) Omitting `access_type=offline` and `prompt=consent` causes re-authenticated users to receive no `refresh_token` (`PP-GMAIL-03`).",
    pathComparison: [
      {
        pathType: "composio_managed_oauth",
        title: "Composio Managed OAuth (`GMAIL`)",
        applicability: "recommended_now",
        summary:
          "Uses Composio's verified Google OAuth client via `session.authorize('gmail')` with zero GCP setup.",
        whenToChoose: [
          "Prototyping, MVPs, and early production while your custom GCP verification is pending",
          "When default Gmail read/send/label scopes cover your use case",
        ],
        tradeOffs: [
          "Consent screen shows 'Composio' instead of your brand (`SRC-COMP-05`)",
          "Shares Google API quota with other Composio managed-auth users (`SRC-COMP-05`)",
          "Cannot add unverified extra scopes like `gmail.settings.basic` (`SRC-COMP-05`)",
        ],
        requiredScopesOrCapabilities: ["Composio default verified Gmail scopes"],
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-03", "SRC-COMP-05"],
      },
      {
        pathType: "custom_oauth_app",
        title: "Custom Google OAuth 2.0 Web Client (External Verified or Internal)",
        applicability: "recommended_for_production",
        summary:
          "Your own Google Cloud Console project and OAuth 2.0 Web Client ID wired into Composio (`use_custom_auth`) or your backend.",
        whenToChoose: [
          "Production customer-facing apps requiring your brand on the Google consent screen",
          "High-volume apps needing a dedicated Google API rate-limit quota",
          "Internal Google Workspace tools (`User Type = Internal`, 0 days verification)",
        ],
        tradeOffs: [
          "Requires separate GCP projects for testing vs. production (`SRC-GMAIL-16`)",
          "External apps requesting `gmail.readonly` or `gmail.modify` require Restricted Scope Verification + annual CASA audit (`SRC-GMAIL-05`)",
        ],
        requiredScopesOrCapabilities: [
          "gmail.send (Sensitive: 3–5 business days review)",
          "gmail.readonly or gmail.modify (Restricted: several weeks + CASA audit)",
        ],
        evidenceIds: [
          "SRC-GMAIL-01",
          "SRC-GMAIL-02",
          "SRC-GMAIL-03",
          "SRC-GMAIL-04",
          "SRC-GMAIL-05",
        ],
      },
      {
        pathType: "alternative_documented_auth",
        title: "Google Service Account (Domain-Wide Delegation ONLY)",
        applicability: "conditional_alternative",
        summary:
          "Server-to-server key authentication impersonating users within a Google Workspace domain.",
        whenToChoose: [
          "Enterprise background daemons where a Google Workspace Super Admin explicitly grants Domain-Wide Delegation (DWD) to your service account client ID",
        ],
        tradeOffs: [
          "DOES NOT WORK for personal `@gmail.com` accounts (`SRC-GMAIL-07`)—despite frequent incorrect Reddit suggestions (`SRC-GMAIL-09`)",
          "Still requires scope verification if distributed as a Domain-Wide Install to external Workspace domains (`SRC-GMAIL-03`)",
        ],
        requiredScopesOrCapabilities: [
          "Google Workspace Admin Console -> API Controls -> Domain-wide Delegation",
        ],
        evidenceIds: ["SRC-GMAIL-02", "SRC-GMAIL-03", "SRC-GMAIL-07", "SRC-GMAIL-09"],
      },
    ],
    evidenceIds: [
      "SRC-GMAIL-01",
      "SRC-GMAIL-02",
      "SRC-GMAIL-03",
      "SRC-GMAIL-04",
      "SRC-GMAIL-05",
      "SRC-COMP-05",
    ],
  },

  difficultyAndEffort: {
    difficultyCategory: "complex_approval_gated",
    difficultyReasoning:
      "Initial GCP console configuration takes 30–45 minutes, but launching an External custom OAuth app with inbox read/modify scopes (`gmail.readonly`, `gmail.modify`) is gated on Google Brand Verification (2–3 business days), Restricted Scope Verification, and an annual third-party CASA security assessment (several weeks).",
    activeSetupTimeRange: "30–45 minutes (hands-on console & code setup)",
    assumptions: [
      "Developer has a Google Cloud Console account and owns a public HTTPS domain.",
      "Preparation work (2–6 hours) for domain verification, privacy policy, and YouTube demo video is tracked separately from active console configuration.",
    ],
    confidence: "high",
    preparationWork: [
      "Create separate Google Cloud projects for Testing/Staging and Production (`SRC-GMAIL-16` — production projects must not contain `localhost` redirect URIs).",
      "Verify ownership of your application domain in Google Search Console using an account that is an Owner/Editor on the GCP project (`SRC-GMAIL-03`).",
      "Publish a public Homepage and a Privacy Policy hosted on the same verified domain disclosing Limited Use compliance (`SRC-GMAIL-03`, `SRC-GMAIL-05`).",
      "Record an unlisted English YouTube demonstration video showing the full OAuth consent flow with the OAuth `client_id` visible in the browser address bar (`SRC-GMAIL-03`, `SRC-GMAIL-05`).",
    ],
    externalDependencies: [
      {
        dependency: "Google OAuth Brand Verification",
        party: "Google Trust & Safety",
        requiredWhen: "Publishing any External OAuth app to production",
        blockingImpact:
          "Typically takes 2–3 business days (`SRC-GMAIL-05`). Note: Approved brand verification expires in 7 days if you do not click 'Publish branding' (`SRC-GMAIL-03`).",
      },
      {
        dependency: "Google Sensitive Scope Verification",
        party: "Google Trust & Safety",
        requiredWhen:
          "Requesting Sensitive scopes such as `https://www.googleapis.com/auth/gmail.send` on an External app",
        blockingImpact:
          "Typically takes 3–5 business days (`SRC-GMAIL-03`). Unverified apps show a warning screen and are capped at 100 users.",
      },
      {
        dependency: "Google Restricted Scope Verification & CASA Security Assessment",
        party: "Google Trust & Safety + Google-Empanelled Third-Party Assessor (CASA)",
        requiredWhen:
          "Requesting Restricted scopes (`gmail.readonly`, `gmail.modify`, `gmail.compose`, `gmail.metadata`, `mail.google.com/`) when data is stored on or transmitted through a server",
        blockingImpact:
          "Takes several weeks (`SRC-GMAIL-05`) and requires annual recertification every 12 months.",
      },
      {
        dependency: "Customer Google Workspace Admin API Controls",
        party: "Customer's Google Workspace Administrator",
        requiredWhen:
          "Enterprise customers restrict third-party OAuth apps in Google Workspace Admin Console",
        blockingImpact:
          "Even a Google-verified app can be blocked by a Workspace Admin unless marked as 'Trusted' (`SRC-GMAIL-02`).",
      },
    ],
    publishedApprovalTimeEstimate:
      "Brand Verification: 2–3 business days (`SRC-GMAIL-05`). Sensitive Scopes (`gmail.send`): 3–5 business days (`SRC-GMAIL-03`). Restricted Scopes (`gmail.readonly` / `gmail.modify`) + CASA Assessment: 'Several weeks' (`SRC-GMAIL-05`).",
    corroboratedRealWorldWaitNotes:
      "Corroborated 2026 integration guides (`SRC-GMAIL-12`, `SRC-GMAIL-17`) report 3–8 weeks total for Restricted Gmail scopes due to third-party CASA security assessment scheduling and remediation.",
    unknownTimingNotes: [
      "Exact CASA assessor turnaround time and fee depend on your application's architecture and selected Google-empanelled assessor.",
    ],
    conditionsChangingEstimate: [
      "Dropping `gmail.readonly` in favor of `gmail.send` (if your agent only sends email) eliminates the multi-week CASA assessment and reduces review to 3–5 business days (`SRC-GMAIL-03`, `SRC-GMAIL-04`).",
      "Setting User Type to `Internal` (for single-organization Google Workspace apps) reduces approval wait to 0 days (`SRC-GMAIL-02`).",
      "If a customer's Google Workspace Admin marks your app as 'Trusted' in Admin Console -> API Controls, it overrides the 100-user cap and 7-day Testing token expiration for that organization's users (`SRC-GMAIL-02`).",
    ],
  },

  prerequisites: [
    {
      id: "gmail-pre-1",
      category: "workspace_project",
      title: "Separate Testing and Production Google Cloud Projects",
      detail:
        "Google's OAuth policy requires separate GCP projects for testing and production. Your production project's OAuth clients must not contain `http://localhost` or test-server redirect URIs (`SRC-GMAIL-16`).",
      requiredWhen: "Before submitting for Google OAuth verification",
      evidenceIds: ["SRC-GMAIL-16"],
    },
    {
      id: "gmail-pre-2",
      category: "domain_website",
      title: "Verified Domain in Google Search Console + Same-Domain Privacy Policy",
      detail:
        "Every domain used in your homepage, privacy policy, and redirect URIs must be verified in Google Search Console by a Google Account that is an Owner or Editor of the GCP project (`SRC-GMAIL-03`, `SRC-GMAIL-16`).",
      requiredWhen: "Submitting an External app for Brand/Scope verification",
      evidenceIds: ["SRC-GMAIL-03", "SRC-GMAIL-05", "SRC-GMAIL-16"],
    },
    {
      id: "gmail-pre-3",
      category: "callback_redirect",
      title: "Exact HTTPS Authorized Redirect URI",
      detail:
        "Web application OAuth clients require exact HTTPS redirect URIs (case-sensitive, including trailing slash; no wildcards). For Composio Custom Auth, register `https://backend.composio.dev/api/v3/toolkits/auth/callback`.",
      requiredWhen: "Creating the OAuth 2.0 Web Client ID",
      evidenceIds: ["SRC-GMAIL-01", "SRC-GMAIL-12", "SRC-COMP-08"],
    },
    {
      id: "gmail-pre-4",
      category: "capabilities_scopes",
      title: "Minimal Gmail Scope Selection (Sensitive vs. Restricted Decision)",
      detail:
        "Choose `gmail.send` (Sensitive) if only sending mail, or `gmail.readonly` / `gmail.modify` (Restricted) if reading mail. Never combine `gmail.metadata` with `gmail.readonly` or `gmail.modify` (`SRC-COMP-05`).",
      requiredWhen: "Configuring the Cloud Console Data Access / Scopes page",
      evidenceIds: ["SRC-GMAIL-04", "SRC-COMP-05"],
    },
  ],

  setupSteps: [
    {
      id: "gmail-step-1",
      stepNumber: 1,
      title: "Create Google Cloud Project and Explicitly Enable the Gmail API",
      instructions:
        "Open the Google Cloud Console, create or select your project (use separate projects for dev and prod), navigate to **APIs & Services → Library**, search for **Gmail API**, and click **Enable**. Wait 2–3 minutes for API activation to propagate.",
      whereToDoIt:
        "Google Cloud Console → APIs & Services → Library (`https://console.cloud.google.com/apis/library/gmail.googleapis.com`)",
      consoleOrDocUrl:
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance",
      whyItMatters:
        "Creating an OAuth Client ID in a GCP project does not enable the Gmail API. Calling Gmail endpoints without enabling the API fails with `Gmail API has not been used in project ... before or it is disabled` (`SRC-COMP-05`).",
      prerequisites: ["Google Cloud account with Owner or Editor role"],
      expectedOutcome: "Gmail API shows status 'Enabled' in the project dashboard.",
      completionCheck:
        "Verify 'Gmail API' appears in `APIs & Services → Enabled APIs & services`.",
      commonFailureCases: [
        "Enabling the Gmail API in a personal test GCP project while using OAuth credentials from a production GCP project (`SRC-COMP-05`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GMAIL-16", "SRC-COMP-05"],
    },
    {
      id: "gmail-step-2",
      stepNumber: 2,
      title: "Configure OAuth Branding, User Type (`Internal` vs `External`), and Test Users",
      instructions:
        "Navigate to **Google Auth Platform → Branding** (and **Audience**). Select `Internal` if the app is strictly for your own Google Workspace organization. Select `External` if any outside user will connect. While in `Testing` status on an `External` app, explicitly add your test Gmail addresses under **Test users** (maximum 100 users).",
      whereToDoIt:
        "Google Cloud Console → Auth Branding & Audience (`https://console.developers.google.com/auth/branding`)",
      consoleOrDocUrl:
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/overview",
      whyItMatters:
        "An `External` app in `Testing` status blocks any Google Account not listed in the 100-user test allowlist (`Error 403: access_denied`) and **expires all issued refresh tokens after 7 days** (`SRC-GMAIL-02`, `SRC-GMAIL-06`).",
      prerequisites: ["Step 1 completed"],
      expectedOutcome:
        "Consent screen configured with accurate app name, support email, and test user allowlist.",
      completionCheck:
        "Confirm your test Google Account email is listed under Test Users before attempting your first OAuth login.",
      commonFailureCases: [
        "Deploying an `External` app in `Testing` status to production and having every user's connection break with `invalid_grant` 7 days later (`PP-GMAIL-01`).",
        "Verifying branding but failing to click **Publish branding** within 7 days, causing the status to revert to `Need to re-verify` (`SRC-GMAIL-03`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GMAIL-02", "SRC-GMAIL-03", "SRC-GMAIL-06"],
    },
    {
      id: "gmail-step-3",
      stepNumber: 3,
      title: "Declare Minimal Gmail Scopes in Data Access",
      instructions:
        "Open **Data Access** (`Add or remove scopes`) and declare only the scopes your integration requires: `https://www.googleapis.com/auth/gmail.send` (Sensitive) for sending only, or `https://www.googleapis.com/auth/gmail.readonly` / `https://www.googleapis.com/auth/gmail.modify` (Restricted) for reading/modifying threads. Do **not** include `gmail.metadata` if your app fetches full email bodies (`SRC-COMP-05`).",
      whereToDoIt: "Google Cloud Console → Data Access",
      consoleOrDocUrl: "https://developers.google.com/gmail/api/auth/scopes",
      whyItMatters:
        "Scope classification determines whether Google review takes 3–5 business days (`gmail.send`) or several weeks plus an annual third-party CASA security assessment (`gmail.readonly` / `gmail.modify`).",
      prerequisites: ["Step 2 completed"],
      expectedOutcome:
        "Declared scopes saved and categorized into Non-sensitive, Sensitive, or Restricted buckets.",
      completionCheck:
        "Ensure every scope requested in your runtime `https://accounts.google.com/o/oauth2/v2/auth` URL is declared in Data Access and does not mix `gmail.metadata` with `gmail.readonly`.",
      commonFailureCases: [
        "`Error 400: invalid_scope` due to typos or undeclared scopes (`SRC-COMP-05`).",
        "`App is blocked` when adding extra scopes like `gmail.settings.basic` to an unverified or managed OAuth client (`SRC-COMP-05`).",
      ],
      estimatedTime: "5–10 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GMAIL-03", "SRC-GMAIL-04", "SRC-GMAIL-05", "SRC-COMP-05"],
    },
    {
      id: "gmail-step-4",
      stepNumber: 4,
      title: "Create Web Application OAuth Client ID and Register Exact Redirect URIs",
      instructions:
        "Go to **Clients → Create Client**, select application type **Web application**, and add your exact callback URL under **Authorized redirect URIs** (leave Authorized JavaScript origins empty for server-side OAuth). For Composio Custom Auth, add `https://backend.composio.dev/api/v3/toolkits/auth/callback`. Wait 5 minutes after saving for propagation (`SRC-GMAIL-12`).",
      whereToDoIt: "Google Cloud Console → Credentials / Clients",
      consoleOrDocUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      whyItMatters:
        "Google enforces exact, case-sensitive matching on `redirect_uri` (including `http` vs `https`, port, and trailing slash) in both the authorization step and the token exchange step.",
      prerequisites: ["Known callback URL"],
      expectedOutcome:
        "Generated `Client ID` (`*.apps.googleusercontent.com`) and `Client Secret`.",
      completionCheck:
        "Verify the URI is in **Authorized redirect URIs** (not Authorized JavaScript origins) and has no trailing-slash mismatch.",
      commonFailureCases: [
        "`Error 400: redirect_uri_mismatch` when selecting 'Desktop app' (`InstalledAppFlow`) or mismatching trailing slashes (`SRC-GMAIL-11`, `SRC-GMAIL-12`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GMAIL-01", "SRC-GMAIL-11", "SRC-GMAIL-12", "SRC-COMP-08"],
    },
    {
      id: "gmail-step-5",
      stepNumber: 5,
      title: "Request Offline Access (`access_type=offline`) and Persist the Refresh Token",
      instructions:
        "If using Composio, create a `use_custom_auth` config for `gmail` with your `client_id` and `client_secret` (Composio handles offline refresh automatically). If implementing the web server flow directly, redirect users to `https://accounts.google.com/o/oauth2/v2/auth` with `access_type=offline`, `include_granted_scopes=true`, and `state`. Pass `prompt=consent` when onboarding or reconnecting a user who lacks a stored `refresh_token`, then exchange the single-use `code` at `POST https://oauth2.googleapis.com/token`.",
      whereToDoIt: "Your backend OAuth controller or Composio SDK session config",
      consoleOrDocUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      whyItMatters:
        "Google defaults to `access_type=online` (no refresh token) and only returns a `refresh_token` on the **first** consent screen approval unless `prompt=consent` is included (`SRC-GMAIL-01`, `SRC-GMAIL-10`).",
      prerequisites: ["Client ID and Client Secret from Step 4"],
      expectedOutcome:
        "Both `access_token` (~3599s lifetime) and long-lived `refresh_token` persisted in your encrypted credential store.",
      completionCheck:
        "Inspect your database record after authorization and confirm `refresh_token` is non-null. Test refreshing via `grant_type=refresh_token`.",
      commonFailureCases: [
        "Subsequent logins without `prompt=consent` returning an `access_token` and `refresh_token: undefined` (`PP-GMAIL-03`).",
        "Passing `prompt=consent` on every routine login until the user exceeds the 100 refresh-token limit per client ID, silently invalidating their oldest refresh token (`SRC-GMAIL-06`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: [
        "SRC-GMAIL-01",
        "SRC-GMAIL-06",
        "SRC-GMAIL-10",
        "SRC-GMAIL-13",
        "SRC-GMAIL-19",
      ],
    },
  ],

  painPoints: [
    {
      id: "PP-GMAIL-01",
      title: "7-Day Refresh Token Expiration (`invalid_grant`) in 'Testing' Mode & the Service Account Myth",
      symptom:
        "Integration works for exactly one week, then fails in background tasks with `400 Bad Request: {\"error\": \"invalid_grant\", \"error_description\": \"Token has been expired or revoked.\"}`.",
      scenario:
        "External Google OAuth app left in `Testing` publishing status while requesting any Gmail scope.",
      likelyCause:
        "Google revokes consent and expires refresh tokens after **7 days** for any GCP project with User Type `External` and Publishing Status `Testing` (`SRC-GMAIL-02`, `SRC-GMAIL-06`). Furthermore, Reddit threads (`SRC-GMAIL-09`) frequently advise switching to a Google Service Account to avoid this—which **fails completely on personal `@gmail.com` accounts** because Gmail only allows Service Accounts on Google Workspace domains with Domain-Wide Delegation (`SRC-GMAIL-07`).",
      causeConfidence: "documented",
      problemClassification: "community_workaround_trap",
      severity: "critical",
      evidenceIds: [
        "SRC-GMAIL-02",
        "SRC-GMAIL-06",
        "SRC-GMAIL-07",
        "SRC-GMAIL-08",
        "SRC-GMAIL-09",
      ],
      independentReportCount: 8,
      recencyVersionNotes:
        "Confirmed in Google's May/August 2026 OAuth documentation (`SRC-GMAIL-02`, `SRC-GMAIL-06`) and recurring 2025–2026 n8n/Stack Overflow threads (`SRC-GMAIL-07`, `SRC-GMAIL-09`).",
      prevention:
        "Do not use a Service Account for `@gmail.com` users. Use Composio Managed Auth (`GMAIL`) during development/early launch, or set your GCP app to `Internal` (if Workspace-only), or move the app to `In production`.",
      resolution:
        "For personal/small-team apps (`<100` users), click **Publish app** (`In production`) in the Google Cloud Console and re-authorize once (bypassing the unverified-app warning on personal accounts stops the 7-day expiry, `SRC-GMAIL-07`, `SRC-GMAIL-08`). For public multi-user apps, complete Google scope verification.",
      impactOnGuide:
        "Made the 7-day Testing expiration and the Service Account warning a centerpiece of Section 1, Section 2, and Section 6.",
    },
    {
      id: "PP-GMAIL-02",
      title: "Unplanned Multi-Week CASA Security Assessment for Restricted Gmail Scopes",
      symptom:
        "Developer finishes coding an inbox-reading agent (`gmail.readonly` or `gmail.modify`) and clicks 'Publish', only to discover Google requires a YouTube demo video, Search Console domain verification, and a multi-week third-party CASA security assessment before removing the unverified block/warning.",
      scenario:
        "Publishing an `External` production app that requests `gmail.readonly`, `gmail.modify`, `gmail.compose`, `gmail.metadata`, or `https://mail.google.com/` and processes data through a server.",
      likelyCause:
        "Google classifies all Gmail message-reading and modifying scopes as **Restricted** (`SRC-GMAIL-04`). Any server-backed app requesting Restricted scopes must pass an annual Cloud Application Security Assessment (CASA) by a Google-empanelled assessor (`SRC-GMAIL-05`).",
      causeConfidence: "documented",
      problemClassification: "provider_policy_approval_gate",
      severity: "critical",
      evidenceIds: [
        "SRC-GMAIL-03",
        "SRC-GMAIL-04",
        "SRC-GMAIL-05",
        "SRC-GMAIL-12",
        "SRC-GMAIL-17",
      ],
      independentReportCount: 6,
      recencyVersionNotes:
        "Verified against Google's September 10, 2026 Gmail scopes table (`SRC-GMAIL-04`) and Restricted Scope Verification policy (`SRC-GMAIL-05`).",
      prevention:
        "Audit your feature set before coding: if your agent only sends email, request `gmail.send` (Sensitive scope: 3–5 business days review, zero CASA assessment). If inbox reading is required, launch MVP on Composio Managed Auth while starting your CASA verification weeks in advance.",
      resolution:
        "Separate your testing and production GCP projects (`SRC-GMAIL-16`), verify your domain in Search Console, publish a Limited Use-compliant privacy policy, record the required YouTube demo video showing `client_id` in the address bar, and initiate verification in the OAuth Verification Center (`SRC-GMAIL-05`).",
      impactOnGuide:
        "Structured Section 2 and Section 5 around the Sensitive (`gmail.send`) vs. Restricted (`gmail.readonly`) verification cliff.",
    },
    {
      id: "PP-GMAIL-03",
      title: "Silent Omission of `refresh_token` on Second Authorization & the 100-Token Cap",
      symptom:
        "First user login works, but when a user reconnects or a developer re-tests with the same Google Account, the token endpoint returns `access_token` without a `refresh_token`, causing `401 Unauthorized` 1 hour later.",
      scenario:
        "Calling `https://accounts.google.com/o/oauth2/v2/auth` with `access_type=offline` but without `prompt=consent` for a user who previously approved the app.",
      likelyCause:
        "Google only issues a `refresh_token` on the initial consent screen approval (`SRC-GMAIL-01`, `SRC-GMAIL-10`, `SRC-GMAIL-12`). Subsequent authorizations skip the consent prompt and omit `refresh_token` unless `prompt=consent` is passed. Conversely, Google caps live refresh tokens at **100 per Google Account per Client ID** (`SRC-GMAIL-06`) and also invalidates Gmail refresh tokens whenever the user changes their Google password (`SRC-GMAIL-06`).",
      causeConfidence: "documented",
      problemClassification: "authorization_flow_misunderstanding",
      severity: "high",
      evidenceIds: [
        "SRC-GMAIL-01",
        "SRC-GMAIL-06",
        "SRC-GMAIL-10",
        "SRC-GMAIL-12",
        "SRC-GMAIL-13",
      ],
      independentReportCount: 7,
      recencyVersionNotes:
        "1,000+ upvote Stack Overflow issue (`SRC-GMAIL-10`) confirmed current in 2026 Google Web Server OAuth docs (`SRC-GMAIL-01`).",
      prevention:
        "Pass `access_type=offline` and `prompt=consent` when onboarding or re-linking a Gmail connection so a `refresh_token` is guaranteed, then store it durably and avoid re-running `prompt=consent` on normal app sign-ins.",
      resolution:
        "If `refresh_token` is missing, redirect the user with `access_type=offline&prompt=consent` (or revoke the app at `https://myaccount.google.com/permissions` and reconnect). Also handle `invalid_grant` after user password changes by prompting re-authentication (`SRC-GMAIL-06`).",
      impactOnGuide:
        "Added explicit `access_type=offline&prompt=consent` and password-change invalidation checks to Step 5 and Section 7.",
    },
    {
      id: "PP-GMAIL-04",
      title: "`gmail.metadata` Breaking Full Email Fetches & `'App is blocked'` on Extra Scopes",
      symptom:
        "Fetching full email bodies fails when `gmail.metadata` is included in the auth config, or adding `gmail.settings.basic` to Composio Managed Auth triggers Google's `'This app is blocked'` screen.",
      scenario:
        "Customizing OAuth scopes on a Gmail auth config.",
      likelyCause:
        "Composio's Gmail documentation confirms two scope traps (`SRC-COMP-05`): (1) `gmail.metadata` is a metadata-only scope that is incompatible with content scopes (`gmail.readonly`, `gmail.modify`, `mail.google.com`) in the same OAuth grant when fetching message payloads; (2) adding scopes that are not verified on Composio's default OAuth client (such as `gmail.settings.basic`) causes Google to block the authorization request.",
      causeConfidence: "documented",
      problemClassification: "composio_specific_configuration",
      severity: "medium",
      evidenceIds: ["SRC-COMP-05", "SRC-GMAIL-04"],
      independentReportCount: 3,
      recencyVersionNotes:
        "Documented directly in Composio's October 2026 Gmail Toolkit FAQ (`SRC-COMP-05`).",
      prevention:
        "Never include `gmail.metadata` if your agent needs email body text. Keep default scopes when using Composio Managed Auth.",
      resolution:
        "Remove `gmail.metadata` from your auth config and reconnect the user account. If you need `gmail.settings.basic`, register and verify your own Google OAuth client (`SRC-COMP-05`).",
      impactOnGuide:
        "Added explicit `gmail.metadata` exclusion rule in Section 3 (Prerequisites) and Step 3.",
    },
    {
      id: "PP-GMAIL-05",
      title: "`Error 400: redirect_uri_mismatch` and Unenabled Gmail API in GCP",
      symptom:
        "Sign-in fails immediately with `Error 400: redirect_uri_mismatch`, or post-auth API calls fail with `403: Gmail API has not been used in project`.",
      scenario:
        "Setting up a custom Google Cloud OAuth client or moving from local development to a deployed HTTPS domain.",
      likelyCause:
        "Google requires exact string matching on `redirect_uri` (scheme, port, case, and trailing slash), rejects plain `http://` on non-localhost hosts, takes up to 5 minutes to propagate console edits (`SRC-GMAIL-01`, `SRC-GMAIL-12`), and requires the Gmail API to be enabled separately from OAuth client creation (`SRC-COMP-05`).",
      causeConfidence: "documented",
      problemClassification: "developer_console_configuration",
      severity: "high",
      evidenceIds: [
        "SRC-GMAIL-01",
        "SRC-GMAIL-11",
        "SRC-GMAIL-12",
        "SRC-GMAIL-14",
        "SRC-COMP-05",
      ],
      independentReportCount: 6,
      recencyVersionNotes: "Current 2026 Google Cloud Console behavior.",
      prevention:
        "Enable the Gmail API in Step 1, create a **Web application** (not Desktop) OAuth client, and copy the exact redirect URI into `Authorized redirect URIs`.",
      resolution:
        "Inspect the `Request details: redirect_uri=...` string on Google's error page, match it character-for-character in `Authorized redirect URIs`, and wait 5 minutes before re-testing.",
      impactOnGuide:
        "Added Step 1 (Enable Gmail API) and Step 4 (5-minute propagation + exact URI check).",
    },
  ],

  launchChecklist: [
    {
      id: "gmail-check-1",
      label: "Gmail API Enabled in the Owning GCP Project",
      verificationMethod:
        "Confirm 'Gmail API' is listed under `APIs & Services → Enabled APIs & services` in the exact GCP project that owns your OAuth Client ID.",
      failureIndicator:
        "`403 Forbidden: Gmail API has not been used in project ... before or it is disabled`.",
      category: "api_verification",
    },
    {
      id: "gmail-check-2",
      label: "Publishing Status Not Left in 'Testing' for Production Users",
      verificationMethod:
        "Check `Google Auth Platform → Audience`. Confirm the app is either `Internal` (Workspace only), using Composio Managed Auth, or `Published` (`In production`).",
      failureIndicator:
        "All user refresh tokens fail with `400 invalid_grant` exactly 7 days after connecting.",
      category: "distribution_approval",
    },
    {
      id: "gmail-check-3",
      label: "`gmail.metadata` Excluded When Reading Full Messages",
      verificationMethod:
        "Inspect requested scopes and confirm `gmail.metadata` is NOT combined with `gmail.readonly` or `gmail.modify`.",
      failureIndicator:
        "Message fetch calls fail or omit body payload content despite `gmail.readonly` being listed.",
      category: "consent_scopes",
    },
    {
      id: "gmail-check-4",
      label: "Offline `refresh_token` Persisted and Tested",
      verificationMethod:
        "Verify initial authorization passes `access_type=offline&prompt=consent`, stores the returned `refresh_token`, and successfully exchanges it at `POST https://oauth2.googleapis.com/token`.",
      failureIndicator:
        "`refresh_token` is `undefined` on re-login or connection drops after 3,599 seconds.",
      category: "token_lifecycle",
    },
    {
      id: "gmail-check-5",
      label: "Separate Production GCP Project Without `localhost` Redirect URIs",
      verificationMethod:
        "Confirm the production OAuth client only lists verified HTTPS redirect URIs and contains no `http://localhost` entries (`SRC-GMAIL-16`).",
      failureIndicator:
        "Google Trust & Safety rejects the verification submission for policy non-compliance.",
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
        "Composio provides managed OAuth2 for `GMAIL` (`GET /api/v3.1/toolkits/gmail`).",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Documents managed OAuth availability and the `composio_managed_auth_schemes` API check using `gmail` as the canonical example.",
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
        "When to use Composio managed auth vs. custom OAuth credentials (branding, custom scopes, shared quota).",
      ],
      painPointsSupported: ["PP-GMAIL-02"],
      summaryOfContent:
        "Official decision guide comparing managed and custom OAuth apps in Composio.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-COMP-05",
      title: "Composio — Gmail Toolkit Documentation",
      canonicalUrl: "https://docs.composio.dev/toolkits/gmail",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-18",
      claimsSupported: [
        "Adding unverified scopes like `gmail.settings.basic` to managed auth triggers 'App is blocked'.",
        "`gmail.metadata` is incompatible with `gmail.readonly`, `gmail.modify`, and `mail.google.com` when fetching full email content.",
        "Shared quota on default OAuth app can cause rate limits to be hit faster.",
      ],
      painPointsSupported: [
        "PP-GMAIL-02",
        "PP-GMAIL-03",
        "PP-GMAIL-04",
        "PP-GMAIL-05",
      ],
      summaryOfContent:
        "Official Composio Gmail toolkit reference (v20261018_00) and troubleshooting FAQ.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Notes ~50 refresh token limit in FAQ whereas Google's primary doc states 100.",
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
        "Composio custom OAuth redirect URI is `https://backend.composio.dev/api/v3/toolkits/auth/callback`.",
      ],
      painPointsSupported: ["PP-GMAIL-05"],
      summaryOfContent:
        "Code examples for configuring custom OAuth credentials in Composio.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-01",
      title: "Google for Developers — Using OAuth 2.0 for Web Server Applications",
      canonicalUrl:
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Exact `redirect_uri` matching (scheme, case, trailing slash).",
        "`access_type=offline` and `prompt=consent` behavior for obtaining refresh tokens.",
      ],
      painPointsSupported: ["PP-GMAIL-03", "PP-GMAIL-05"],
      summaryOfContent:
        "Primary specification for Google OAuth 2.0 web server authorization and token endpoints.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-02",
      title: "Google for Developers — OAuth app state overview",
      canonicalUrl:
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/overview",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-05-22",
      claimsSupported: [
        "External apps in Testing status are capped at 100 test users and expire refresh tokens in 7 days.",
        "Internal apps require no Google verification.",
        "Google Workspace Admins can mark an app as 'Trusted' to override the 7-day Testing expiration for their domain.",
      ],
      painPointsSupported: ["PP-GMAIL-01", "PP-GMAIL-02"],
      summaryOfContent:
        "Official comparison matrix of Internal vs. External and Testing vs. Published OAuth app states.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Updated May 22, 2026.",
    },
    {
      id: "SRC-GMAIL-03",
      title: "Google for Developers — Sensitive scope verification",
      canonicalUrl:
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Sensitive scope verification typically takes 3–5 business days.",
        "Compliant brand verification results expire in 7 days if not published.",
        "Requires verified domain in Search Console and unlisted YouTube demo video.",
      ],
      painPointsSupported: ["PP-GMAIL-02"],
      summaryOfContent:
        "Official preparation steps, exceptions, and timelines for Google Sensitive Scope Verification.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-04",
      title: "Google for Developers — Choose Gmail API scopes",
      canonicalUrl: "https://developers.google.com/gmail/api/auth/scopes",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-09-10",
      claimsSupported: [
        "Non-sensitive: `gmail.labels`, `gmail.addons.*`.",
        "Sensitive: `gmail.send`.",
        "Restricted: `mail.google.com/`, `gmail.readonly`, `gmail.compose`, `gmail.insert`, `gmail.modify`, `gmail.metadata`, `gmail.settings.basic`, `gmail.settings.sharing`.",
      ],
      painPointsSupported: ["PP-GMAIL-01", "PP-GMAIL-02", "PP-GMAIL-04"],
      summaryOfContent:
        "Authoritative classification table of all Gmail API OAuth scopes (updated Sept 10, 2026).",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-05",
      title: "Google for Developers — Restricted scope verification",
      canonicalUrl:
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Brand verification takes 2–3 business days; Restricted scope verification can take several weeks.",
        "Apps storing or transmitting restricted scope data through a server must complete an annual CASA security assessment.",
      ],
      painPointsSupported: ["PP-GMAIL-02"],
      summaryOfContent:
        "Official requirements for Restricted scopes, Limited Use compliance, and annual CASA security assessments.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Does not publish fixed dollar costs for third-party CASA assessors.",
    },
    {
      id: "SRC-GMAIL-06",
      title: "Google for Developers — Using OAuth 2.0 to Access Google APIs (Refresh token expiration)",
      canonicalUrl: "https://developers.google.com/identity/protocols/oauth2",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "External apps in Testing status issue refresh tokens expiring in 7 days.",
        "Limit of 100 refresh tokens per Google Account per OAuth 2.0 client ID.",
        "User password changes invalidate refresh tokens that contain Gmail scopes.",
      ],
      painPointsSupported: ["PP-GMAIL-01", "PP-GMAIL-03"],
      summaryOfContent:
        "Lists all official causes of Google OAuth refresh token expiration and revocation.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-07",
      title: "Stack Overflow — avoid auth token to expire (`invalid_grant` after 7 days & Service Account failure)",
      canonicalUrl:
        "https://stackoverflow.com/questions/72406414/avoid-auth-token-to-expire",
      publisherDomain: "stackoverflow.com",
      sourceType: "stack_overflow",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2022-05-27",
      claimsSupported: [
        "Service accounts cannot access personal `@gmail.com` accounts via Gmail API (requires Google Workspace Domain-Wide Delegation).",
        "Publishing an External app for personal use (<100 users) stops the 7-day refresh token expiration.",
      ],
      painPointsSupported: ["PP-GMAIL-01"],
      summaryOfContent:
        "Developer report detailing wasted hours attempting the Service Account workaround on personal Gmail and resolving the 7-day `invalid_grant` error.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community report corroborated by official Google docs.",
    },
    {
      id: "SRC-GMAIL-08",
      title: "Linda Lawton (Google Developer Expert) — How to Fix Invalid Grant and Expiring Refresh Token Errors",
      canonicalUrl: "https://www.youtube.com/watch?v=SYU-Zb4BJC4",
      publisherDomain: "youtube.com",
      sourceType: "developer_forum",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2023-01-15",
      claimsSupported: [
        "Google revokes user consent after 7 days when an External app is in Testing status.",
      ],
      painPointsSupported: ["PP-GMAIL-01"],
      summaryOfContent:
        "Technical walkthrough explaining why developers miss the 7-day Testing token expiration rule in Google's docs.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Video transcript analysis.",
    },
    {
      id: "SRC-GMAIL-09",
      title: "Reddit r/n8n — Best fix for n8n + Google 'invalid_grant' without going Production?",
      canonicalUrl:
        "https://www.reddit.com/r/n8n/comments/1nndvp8/best_fix_for_n8n_google_invalid_grant_without/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-09-22",
      claimsSupported: [
        "Developers repeatedly encounter the 7-day `invalid_grant` error in automation tools and frequently suggest Service Accounts without noting the Gmail consumer account restriction.",
      ],
      painPointsSupported: ["PP-GMAIL-01"],
      summaryOfContent:
        "September 2025 Reddit thread showing ongoing developer confusion around Testing mode token expiry.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Contains the community workaround misconception that AuthPath explicitly refutes for consumer Gmail.",
    },
    {
      id: "SRC-GMAIL-10",
      title: "Stack Overflow — Not receiving Google OAuth refresh token",
      canonicalUrl:
        "https://stackoverflow.com/questions/10827920/not-receiving-google-oauth-refresh-token",
      publisherDomain: "stackoverflow.com",
      sourceType: "stack_overflow",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2012-05-31",
      claimsSupported: [
        "`refresh_token` is only returned on the first authorization unless `prompt=consent&access_type=offline` is passed.",
      ],
      painPointsSupported: ["PP-GMAIL-03"],
      summaryOfContent:
        "Accepted Stack Overflow answer (1,037+ score) explaining why subsequent OAuth requests omit `refresh_token`.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-11",
      title: "Stack Overflow — Issue with redirect URI mismatch for Google OAuth 2.0",
      canonicalUrl:
        "https://stackoverflow.com/questions/79367839/issue-with-redirect-uri-mismatch-for-google-oauth-2-0",
      publisherDomain: "stackoverflow.com",
      sourceType: "stack_overflow",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-01-18",
      claimsSupported: [
        "Using `InstalledAppFlow.run_local_server` in a web deployment causes `Error 400: redirect_uri_mismatch`.",
      ],
      painPointsSupported: ["PP-GMAIL-05"],
      summaryOfContent:
        "2025 developer report of `redirect_uri_mismatch` when transitioning from local testing to production.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-12",
      title: "Unified.to — Google Cloud Console shared OAuth2 registration mechanics",
      canonicalUrl:
        "https://docs.unified.to/skills/google-cloud-console-oauth/SKILL.md",
      publisherDomain: "docs.unified.to",
      sourceType: "third_party_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-04-01",
      claimsSupported: [
        "Redirect URI rules (trailing slash sensitivity, no wildcards, public suffix TLD, 5-minute propagation delay) and refresh token rules.",
      ],
      painPointsSupported: ["PP-GMAIL-02", "PP-GMAIL-03", "PP-GMAIL-05"],
      summaryOfContent:
        "Integration platform operational guide for Google Cloud Console OAuth2 registration.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "Third-party engineering guide; claims cross-checked against Google primary docs.",
    },
    {
      id: "SRC-GMAIL-13",
      title: "GitHub Issue — Refresh token and invalid_grant error confusion (google-api-nodejs-client #2494)",
      canonicalUrl:
        "https://github.com/googleapis/google-api-nodejs-client/issues/2494",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2021-01-27",
      claimsSupported: [
        "Developers must persist `refresh_token` and pass it to `oauth2Client.setCredentials({ refresh_token })`.",
      ],
      painPointsSupported: ["PP-GMAIL-03"],
      summaryOfContent:
        "Maintainer (@bcoe) guidance on handling `refresh_token` vs `access_token` in Google's Node.js SDK.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-14",
      title: "GitHub Issue — Getting redirect_uri_mismatch error at the time of getting refresh token (google-api-php-client #1115)",
      canonicalUrl:
        "https://github.com/googleapis/google-api-php-client/issues/1115",
      publisherDomain: "github.com",
      sourceType: "github_issue",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2017-07-20",
      claimsSupported: [
        "`redirect_uri` must match protocol and exact path in both authorization and token exchange requests.",
      ],
      painPointsSupported: ["PP-GMAIL-05"],
      summaryOfContent:
        "Maintainer (@bshaffer) confirmation of exact `redirect_uri` matching during token exchange.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-16",
      title: "Google for Developers — Comply with OAuth 2.0 policies",
      canonicalUrl:
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance",
      publisherDomain: "developers.google.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-19",
      claimsSupported: [
        "Google requires separate projects for testing and production; production clients must not contain test/localhost redirect URIs.",
      ],
      painPointsSupported: ["PP-GMAIL-02", "PP-GMAIL-05"],
      summaryOfContent:
        "Official Google OAuth 2.0 policy compliance checklist (updated Aug 19, 2026).",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GMAIL-17",
      title: "Unipile — Google OAuth Verification & Gmail API Credentials (2026)",
      canonicalUrl:
        "https://www.unipile.com/integrating-google-oauth-2-0-user-authentication-into-your-app/",
      publisherDomain: "unipile.com",
      sourceType: "third_party_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-02-01",
      claimsSupported: [
        "Corroborates multi-week timeline for Restricted Gmail scope verification and CASA assessment.",
      ],
      painPointsSupported: ["PP-GMAIL-02"],
      summaryOfContent:
        "2026 technical guide walking through Gmail OAuth credentials and verification requirements.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Third-party technical guide.",
    },
    {
      id: "SRC-GMAIL-19",
      title: "Google API PHP Client — docs/oauth-web.md",
      canonicalUrl:
        "https://github.com/googleapis/google-api-php-client/blob/main/docs/oauth-web.md",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-11-01",
      claimsSupported: [
        "Default `access_type` is `online`; explicit `offline` configuration is required for background refresh.",
      ],
      painPointsSupported: ["PP-GMAIL-03"],
      summaryOfContent:
        "Official Google SDK documentation for web server OAuth.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
  ],

  agentResearchTrace: {
    searchesExecuted: 7,
    normalizedQueries: [
      "Google OAuth Gmail invalid_grant testing 7 days refresh token CASA verification issues stackoverflow reddit 2025 2026",
      "Google OAuth access_type=offline prompt=consent refresh_token missing OR redirect_uri_mismatch Gmail CASA Tier 2 stackoverflow reddit",
      "site:github.com/googleapis invalid_grant OR refresh_token OR redirect_uri_mismatch oauth2 gmail",
      "site:docs.composio.dev/toolkits github gmail slack notion oauth2 managed auth",
    ],
    sourcesRetrievedCount: 21,
    sourcesFailedCount: 1,
    documentsInspected: [
      "https://docs.composio.dev/toolkits/gmail",
      "https://developers.google.com/identity/protocols/oauth2/web-server",
      "https://developers.google.com/identity/protocols/oauth2/production-readiness/overview",
      "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification",
      "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification",
      "https://developers.google.com/identity/protocols/oauth2/production-readiness/policy-compliance",
      "https://developers.google.com/gmail/api/auth/scopes",
      "https://docs.unified.to/skills/google-cloud-console-oauth/SKILL.md",
    ],
    painPointAreasExplored: [
      "7-day refresh token expiration in Testing status (`invalid_grant`) and why the Service Account workaround fails for `@gmail.com`",
      "Sensitive (`gmail.send`) vs. Restricted (`gmail.readonly`, `gmail.modify`) scope verification and CASA security assessments",
      "Missing `refresh_token` on re-login without `prompt=consent` vs. 100 refresh-token limit per account/client",
      "Incompatibility of `gmail.metadata` with `gmail.readonly`/`gmail.modify` and unverified extra scopes (`gmail.settings.basic`)",
      "`redirect_uri_mismatch` exact matching and forgetting to enable the Gmail API in GCP",
    ],
    validationPerformed: [
      "Verified scope classifications against Google's Sept 10, 2026 Gmail API scopes table (`SRC-GMAIL-04`)",
      "Logged HTTP 404 retrieval failure on `https://docs.composio.dev/toolkits/google.md` (`SRC-COMP-09`) and verified canonical `/toolkits/gmail`",
      "Validated guide record against `GuideSchema` runtime Zod rules",
    ],
    agentPreparedActions: [
      "Constructed scope decision matrix separating Non-sensitive, Sensitive (3–5 days), and Restricted (multi-week + CASA) Gmail scopes",
      "Prepared step-by-step setup instructions separating Testing vs. Production GCP projects",
      "Documented concrete refutation of the community Service Account workaround for personal `@gmail.com` accounts",
    ],
    unresolvedQuestions: [
      "Exact third-party CASA assessor fee and scheduling timeline for a specific organization's architecture (`SRC-GMAIL-05`).",
    ],
    stopReason: "sufficient_evidence",
  },

  outcome: {
    guideStatus: "complete_verified",
    confidence: "high",
    limitations: [
      "Third-party CASA security assessment pricing and assessor turnaround vary by application architecture and are not fixed in Google's public documentation (`SRC-GMAIL-05`).",
    ],
    recommendedNextStep: {
      title: "Decide Whether You Truly Need Inbox Read Access (`gmail.readonly`) or Send-Only (`gmail.send`)",
      action:
        "If your agent only sends email, register a custom Google OAuth app requesting ONLY `https://www.googleapis.com/auth/gmail.send` (3–5 day Sensitive review, no CASA audit). If your agent must read/search inbox messages, start with Composio Managed Auth (`session.authorize('gmail')`) to avoid the 7-day Testing token expiry while you prepare a separate Production GCP project for Restricted Scope + CASA verification.",
      targetUrl: "https://console.cloud.google.com/apis/library/gmail.googleapis.com",
      rationale:
        "Prevents both the 7-day `invalid_grant` production outage and an unexpected multi-week launch freeze from requesting Restricted scopes unnecessarily.",
    },
    humanOnlyActions: [
      "Create Testing and Production projects in Google Cloud Console and enable the Gmail API.",
      "Verify domain ownership via DNS records in Google Search Console.",
      "Record and upload an unlisted YouTube demonstration video showing the OAuth consent flow and client ID.",
      "Complete the third-party CASA security assessment if requesting Restricted Gmail scopes on a server-backed external app.",
    ],
    missingInformationToProceed: [],
    outdatedReportMechanism: {
      instructions:
        "Has Google updated its CASA tier rules, scope classifications, or Testing token expiry policy? Submit a report with the official URL.",
      endpoint: "/api/feedback",
    },
  },
};
