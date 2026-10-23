import { Guide } from "@/lib/schema/guideSchema";

export const githubGuide: Guide = {
  id: "curated-github-oauth-v1",
  slug: "github",
  applicationName: "GitHub",
  aliases: ["gh", "github.com", "github-app", "github-oauth", "octokit"],
  category: "Developer Tools & Source Control",
  canonicalWebsite: "https://github.com",
  developerDocsUrl:
    "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
  shortSummary:
    "Connect GitHub repositories, issues, pull requests, and workflows. Requires choosing upfront between a fine-grained GitHub App (recommended for private repos & organizations), a legacy OAuth App, or Composio Managed OAuth.",
  guideOrigin: "curated",
  createdAt: "2026-10-23T08:00:00.000Z",
  lastReviewedAt: "2026-10-23T10:15:00.000Z",
  schemaVersion: "1.0.0",

  scenario: {
    integrationGoal:
      "Read and manage repository issues, pull requests, and code on behalf of authenticated users across personal and organization accounts.",
    intendedAudience: "multi_workspace_external",
    requiredCapabilities: [
      "Authenticate a GitHub user via OAuth 2.0 web flow",
      "Read and write repository issues and pull requests",
      "Read repository contents on authorized repositories",
      "Operate across organization-owned repositories where permitted",
    ],
    optionalFeatures: [
      {
        feature: "Modify GitHub Actions `.github/workflows` files",
        additionalPermissionsRequired:
          "OAuth App: `workflow` scope. GitHub App: `Workflows: Read and write` permission.",
        impactOnVerification:
          "No GitHub review wait, but security-conscious users may scrutinize workflow write grants.",
      },
      {
        feature: "Organization-wide centralized webhooks",
        additionalPermissionsRequired:
          "Built-in on GitHub Apps; on OAuth Apps requires `write:repo_hook` or `admin:org_hook` per repo/org.",
        impactOnVerification:
          "Organization owners must approve org-level hooks or GitHub App installations.",
      },
      {
        feature: "Check Runs & Check Suites API (CI status checks)",
        additionalPermissionsRequired:
          "Requires a GitHub App (`Checks: Read & write`). Not available to OAuth Apps at all.",
        impactOnVerification:
          "Forces architectural choice of GitHub App over OAuth App.",
      },
    ],
    accountWorkspaceAssumptions: [
      "Target users may belong to GitHub Organizations with Third-Party OAuth App restrictions or SAML SSO enforcement.",
      "Developer has a GitHub account or Organization admin access to register the application.",
    ],
    alternativeScenarios: [
      {
        id: "gh-scenario-prod-private",
        label: "Production SaaS / Private Repos & Orgs (Default)",
        description:
          "Your agent reads or modifies private repositories, issues, or PRs for external customers and teams.",
        recommendedPath: "use_alternative_auth_method",
        recommendedPathTitle:
          "Register a Custom GitHub App (User-to-Server OAuth + Fine-Grained Permissions)",
        customOAuthAppRequired: "yes_for_production",
        recommendedScopesOrCapabilities: [
          "Repository permissions -> Contents: Read-only (or Read & write)",
          "Repository permissions -> Issues: Read & write",
          "Repository permissions -> Pull requests: Read & write",
          "No OAuth `scope` parameter needed (except optional `offline_access`)",
        ],
        activeSetupEstimate: "25–35 minutes",
        externalApprovalWait:
          "0 days provider review (Customer Org Owner approval required if org restricts apps)",
        keyRiskOrBlocker:
          "Users must both authorize AND install the GitHub App on target repos; SAML SSO orgs require an active SAML session.",
        rationale:
          "OAuth Apps force the monolithic `repo` scope (full read/write to all private code and org projects), which enterprise customers routinely reject. GitHub Apps provide fine-grained permissions and per-repo selection.",
        evidenceIds: ["SRC-GH-01", "SRC-GH-02", "SRC-GH-04", "SRC-COMP-02"],
      },
      {
        id: "gh-scenario-prototype",
        label: "Prototype / Internal Dev Tool",
        description:
          "You are building a prototype or internal agent and want immediate GitHub tool access without registering credentials.",
        recommendedPath: "use_composio_managed_oauth",
        recommendedPathTitle: "Use Composio Managed OAuth (`GITHUB` Toolkit)",
        customOAuthAppRequired: "no",
        recommendedScopesOrCapabilities: [
          "Default Composio `GITHUB` OAuth2 scopes",
        ],
        activeSetupEstimate: "5–10 minutes",
        externalApprovalWait: "0 days",
        keyRiskOrBlocker:
          "Consent screen shows 'Composio' branding and requests broad OAuth scopes.",
        rationale:
          "Composio maintains a pre-registered OAuth2 app for the `GITHUB` toolkit (899 tools), eliminating credential setup during development.",
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-02", "SRC-COMP-03"],
      },
      {
        id: "gh-scenario-public-identity",
        label: "Public Repos Only or User Identity Sign-In",
        description:
          "Your app only reads user profile/emails (`read:user`, `user:email`), stars/writes to public repos (`public_repo`), or accesses Enterprise object settings.",
        recommendedPath: "register_custom_oauth_app",
        recommendedPathTitle: "Register a Custom GitHub OAuth App",
        customOAuthAppRequired: "yes_for_production",
        recommendedScopesOrCapabilities: [
          "read:user",
          "user:email",
          "public_repo (if public repo write needed)",
        ],
        activeSetupEstimate: "15–20 minutes",
        externalApprovalWait: "0 days",
        keyRiskOrBlocker:
          "Cannot scope private repository access to read-only or single repositories.",
        rationale:
          "When you do not touch private repositories, a standard OAuth App avoids the separate repository installation step of a GitHub App.",
        evidenceIds: ["SRC-GH-01", "SRC-GH-02", "SRC-GH-03"],
      },
    ],
  },

  authenticationAssessment: {
    providerSupport: "oauth_confirmed",
    composioManagedAuth: {
      status: "available",
      toolkitExamined: "GITHUB (version 20261014_00)",
      authMethodExamined: "OAUTH2",
      evidenceIds: ["SRC-COMP-01", "SRC-COMP-02", "SRC-COMP-03"],
      conditionsAndQualifications: [
        "Composio provides managed OAuth2 for the `GITHUB` toolkit out of the box.",
        "Composio also supports bringing a custom GitHub App (`client_id` and `client_secret`), but Composio does not currently auto-generate the GitHub App installation link during the OAuth flow—you must send users your GitHub App installation link separately so they grant repository access.",
      ],
    },
    recommendedPath: "use_alternative_auth_method",
    verdictHeadline:
      "Start with Composio Managed OAuth for prototyping; use a Custom GitHub App (not a legacy OAuth App) for production private-repo integrations.",
    customOAuthAppRequired: "yes_for_production",
    reasoning:
      "GitHub's official documentation explicitly recommends GitHub Apps over OAuth Apps (`SRC-GH-01`, `SRC-GH-02`). An OAuth App cannot read private repository issues or code without requesting the monolithic `repo` scope, which grants full read/write access to every private repository the user can see and frequently triggers security rejections (`SRC-GH-03`, `SRC-GH-14`). A GitHub App supports user-to-server OAuth 2.0 while scoping permissions finely (e.g., `issues: write`, `contents: read`) and letting users select specific repositories.",
    launchBlockerSummary:
      "No GitHub provider review gate blocks launch (0 days wait). The real-world blockers are customer-side: (1) SAML SSO organizations returning `403 Forbidden` if the user lacks an active SAML session during authorization, (2) Organization Third-Party App policies requiring Org Owner approval, and (3) private repositories returning `404 Not Found` if the user authorized the GitHub App via OAuth but did not install it on the target repo.",
    pathComparison: [
      {
        pathType: "alternative_documented_auth",
        title: "Custom GitHub App (User-to-Server OAuth 2.0)",
        applicability: "recommended_for_production",
        summary:
          "Uses OAuth 2.0 user authorization combined with fine-grained per-resource permissions and per-repository installation grants.",
        whenToChoose: [
          "Production apps accessing private repositories, issues, or pull requests",
          "B2B integrations targeting security-conscious GitHub Organizations",
          "Integrations requiring Check Runs API or scalable rate limits (up to 12,500 req/hr)",
        ],
        tradeOffs: [
          "Requires both user OAuth authorization AND GitHub App installation on target repos",
          "When used with Composio custom auth, you must surface the GitHub App installation URL yourself (`SRC-COMP-02`)",
        ],
        requiredScopesOrCapabilities: [
          "Fine-grained Repository Permissions (e.g., Issues: Read/Write, Contents: Read)",
          "OAuth `scope` parameter is omitted (permissions come from the App + Installation)",
        ],
        evidenceIds: ["SRC-GH-02", "SRC-GH-04", "SRC-COMP-02", "SRC-GH-11"],
      },
      {
        pathType: "composio_managed_oauth",
        title: "Composio Managed OAuth (`GITHUB`)",
        applicability: "recommended_now",
        summary:
          "Zero-credential setup using Composio's pre-registered GitHub OAuth application via `session.authorize()`.",
        whenToChoose: [
          "Local development, PoCs, and internal team workflows",
          "Validating tool calls before registering production credentials",
        ],
        tradeOffs: [
          "Users see 'Composio' on the GitHub authorization screen (`SRC-COMP-03`)",
          "Requests broad OAuth App scopes rather than minimal per-repo GitHub App permissions",
        ],
        requiredScopesOrCapabilities: [
          "Managed automatically by Composio (`GITHUB` toolkit)",
        ],
        evidenceIds: ["SRC-COMP-01", "SRC-COMP-02", "SRC-COMP-03"],
      },
      {
        pathType: "custom_oauth_app",
        title: "Custom GitHub OAuth App (Classic Scopes)",
        applicability: "conditional_alternative",
        summary:
          "Classic OAuth 2.0 app using coarse scope strings (`repo`, `public_repo`, `read:user`).",
        whenToChoose: [
          "Apps that only need user identity (`read:user`, `user:email`) or public repositories (`public_repo`)",
          "Apps that must manage the GitHub Enterprise object itself (`GET /enterprise/settings/license`, `SRC-GH-02`)",
        ],
        tradeOffs: [
          "Requires full `repo` read/write scope to read private repository code or issues (`SRC-GH-03`)",
          "Grants access to ALL repositories the user can access—cannot be restricted to 1 repo (`SRC-GH-02`)",
          "Tied to the user: breaks if the authorizing user leaves the organization (`SRC-GH-02`)",
        ],
        requiredScopesOrCapabilities: [
          "repo (private + public repos)",
          "public_repo (public repos only)",
          "read:user user:email",
        ],
        evidenceIds: ["SRC-GH-01", "SRC-GH-02", "SRC-GH-03", "SRC-GH-14"],
      },
    ],
    evidenceIds: [
      "SRC-GH-01",
      "SRC-GH-02",
      "SRC-GH-03",
      "SRC-GH-04",
      "SRC-COMP-01",
      "SRC-COMP-02",
    ],
  },

  difficultyAndEffort: {
    difficultyCategory: "moderate",
    difficultyReasoning:
      "GitHub does not impose a multi-week provider review gate, making initial registration fast (20–35 minutes). However, developers frequently get tripped up by the architectural split between GitHub Apps and OAuth Apps, the August 3, 2026 callback URL exact-matching rule, and enterprise SAML SSO / Organization approval policies.",
    activeSetupTimeRange: "20–35 minutes (5–10 minutes with Composio Managed Auth)",
    assumptions: [
      "Developer has access to GitHub Developer Settings on a personal or organization account.",
      "Application has a reachable HTTPS callback endpoint (or uses Composio's callback URI).",
    ],
    confidence: "high",
    preparationWork: [
      "Decide between a GitHub App (fine-grained) and an OAuth App (coarse scopes) before registering.",
      "Determine the exact callback URL(s) for each environment (local dev, staging, production).",
      "Prepare an onboarding prompt instructing enterprise users how to authorize SAML SSO and select repositories.",
    ],
    externalDependencies: [
      {
        dependency: "Customer GitHub Organization Owner Approval",
        party: "Customer's GitHub Organization Owner",
        requiredWhen:
          "Target organization has 'Third-party application access policy' enabled (for OAuth Apps) or requires org-level permissions (for GitHub Apps).",
        blockingImpact:
          "App can only see public resources in that organization until an Org Owner approves the request.",
      },
      {
        dependency: "Active Customer SAML SSO Session",
        party: "Authorizing End User",
        requiredWhen:
          "Target GitHub Organization enforces SAML Single Sign-On (SSO).",
        blockingImpact:
          "API requests to org resources fail with `403 Resource protected by organization SAML enforcement` until the user authenticates via SAML and grants the token org access.",
      },
    ],
    publishedApprovalTimeEstimate:
      "0 days (No GitHub review required for standard OAuth Apps or public GitHub Apps; approval only applies to paid/listed GitHub Marketplace listings).",
    corroboratedRealWorldWaitNotes:
      "Self-serve registration is immediate. In B2B deployments, waiting on a customer's GitHub Organization Owner to approve an app or install a GitHub App typically takes hours to a few days depending on customer IT processes (`SRC-GH-06`, `SRC-GH-15`).",
    unknownTimingNotes: [
      "Customer-side Organization Owner approval turnaround time depends entirely on the customer's internal IT governance.",
      "Composio's built-in GitHub App installation link automation is documented as in progress (`SRC-COMP-02`) with no published release date.",
    ],
    conditionsChangingEstimate: [
      "Using Composio Managed OAuth reduces hands-on setup to 5–10 minutes.",
      "Supporting GitHub Enterprise Server (self-hosted) requires per-instance app registration and handling non-expiring token fallbacks (`SRC-GH-13`).",
    ],
  },

  prerequisites: [
    {
      id: "gh-pre-1",
      category: "account",
      title: "GitHub Account or Organization Admin Access",
      detail:
        "You can register up to 100 OAuth Apps or GitHub Apps under a personal account or an organization where you are an Organization Owner or GitHub App Manager.",
      requiredWhen: "Registering a custom GitHub App or OAuth App",
      evidenceIds: ["SRC-GH-01", "SRC-GH-02"],
    },
    {
      id: "gh-pre-2",
      category: "callback_redirect",
      title: "Exact Callback URL(s) Per Environment (Post-Aug 2026 Rule)",
      detail:
        "Confirm the exact callback URL expected by your auth handler. For Composio Custom Auth, use `https://backend.composio.dev/api/v3/toolkits/auth/callback`. Since August 3, 2026, wildcard subdomain/subdirectory matching is disabled by default on new apps—register up to 10 exact callback URLs instead.",
      requiredWhen: "Always when using custom credentials",
      evidenceIds: ["SRC-GH-01", "SRC-GH-08", "SRC-COMP-08"],
    },
    {
      id: "gh-pre-3",
      category: "capabilities_scopes",
      title: "Permission Matrix (GitHub App Permissions vs. OAuth Scopes)",
      detail:
        "Map every API endpoint your agent calls to either fine-grained GitHub App permissions (e.g., `Issues: Read & write`, `Contents: Read-only`) or OAuth App scopes (`read:user`, `public_repo`, `repo`). Remember that GitHub Apps ignore OAuth scopes other than `offline_access`.",
      requiredWhen: "Before configuring app settings or authorization URLs",
      evidenceIds: ["SRC-GH-02", "SRC-GH-03", "SRC-GH-19"],
    },
    {
      id: "gh-pre-4",
      category: "workspace_project",
      title: "Server-Side Token Storage Supporting 8-Hour Token Rotation",
      detail:
        "New GitHub Apps and OAuth Apps have 'Expire user access tokens' enabled by default: access tokens expire in 8 hours and single-use refresh tokens expire in 6 months.",
      requiredWhen:
        "Using direct custom OAuth without Composio's managed token store",
      evidenceIds: ["SRC-GH-01", "SRC-GH-13", "SRC-GH-19"],
    },
  ],

  setupSteps: [
    {
      id: "gh-step-1",
      stepNumber: 1,
      title: "Select Your Integration Architecture (GitHub App vs. OAuth App vs. Composio Managed)",
      instructions:
        "If you are prototyping, skip straight to initializing a Composio session with the `GITHUB` toolkit (`use_composio_managed_auth`). For production apps that access private repositories or organization resources, create a **GitHub App** (`Settings → Developer settings → GitHub Apps → New GitHub App`) rather than a legacy OAuth App so you can request fine-grained permissions instead of the all-or-nothing `repo` scope.",
      whereToDoIt: "GitHub Developer Settings (`https://github.com/settings/apps`)",
      consoleOrDocUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps",
      whyItMatters:
        "Choosing a legacy OAuth App for private repositories forces you to request the `repo` scope (full read/write access to all code, webhooks, and org projects), which causes security-conscious developers and org admins to abandon installation.",
      prerequisites: ["GitHub account or Organization Owner role"],
      expectedOutcome:
        "Clear architectural choice and a new draft GitHub App or OAuth App registration form.",
      completionCheck:
        "Verify whether your Client ID begins with `Iv1.` / `lv1.` (GitHub App) or is a 20-character hex string (OAuth App), as SDKs like `@octokit/oauth-app` require matching `clientType`.",
      commonFailureCases: [
        "Registering a GitHub App but later passing `scope=repo` in the OAuth authorize URL expecting OAuth App behavior (`PP-GH-02`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GH-01", "SRC-GH-02", "SRC-GH-11"],
    },
    {
      id: "gh-step-2",
      stepNumber: 2,
      title: "Configure Exact Authorization Callback URLs and Token Expiration",
      instructions:
        "In your app settings under **Callback URL** (or **Authorization callback URL**), enter the exact redirect URI handled by your auth system. If wiring custom credentials into Composio, enter `https://backend.composio.dev/api/v3/toolkits/auth/callback`. Keep **Wildcard matching** disabled for security, and click **Add callback URL** (up to 10 allowed) if you need separate localhost and staging URLs. Keep **Expire user access tokens** checked (8-hour access token + 6-month refresh token).",
      whereToDoIt:
        "GitHub Developer Settings → Your App → General / OAuth settings",
      consoleOrDocUrl:
        "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url",
      whyItMatters:
        "Following GitHub's August 3, 2026 policy update, new apps require exact callback URL matching (scheme, host, port, and path) unless wildcard matching is explicitly toggled.",
      prerequisites: ["Known callback URL for your backend or Composio"],
      expectedOutcome:
        "Registered callback URL(s) saved without trailing-slash or port discrepancies.",
      completionCheck:
        "Compare the registered URL character-by-character against the `redirect_uri` query parameter sent at runtime. Confirm no internal/private URLs are listed on public app descriptions.",
      commonFailureCases: [
        "Sending `http://localhost:3000/api/auth/callback` at runtime when `http://localhost:3000/callback` is registered (`redirect_uri_mismatch`).",
        "Assuming a subdirectory path will automatically match a root callback URL on an app created after August 3, 2026 (`SRC-GH-08`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GH-01", "SRC-GH-05", "SRC-GH-08", "SRC-COMP-08"],
    },
    {
      id: "gh-step-3",
      stepNumber: 3,
      title: "Configure Fine-Grained Permissions (GitHub App) or Minimal Scopes (OAuth App)",
      instructions:
        "For a **GitHub App**: open **Permissions & events** and select only the required Repository/Organization permissions (e.g., `Metadata: Read-only`, `Issues: Read and write`, `Pull requests: Read and write`, `Contents: Read-only`). Under **Identifying and authorizing users**, enable **Request user authorization (OAuth) during installation** if you want a combined install + OAuth flow. For a **Classic OAuth App**: do not configure permissions in the console; instead, pass space-separated scopes (`scope=read:user%20public_repo` or `scope=repo`) in the runtime `/login/oauth/authorize` URL.",
      whereToDoIt:
        "GitHub Developer Settings → Permissions & events (GitHub App) or Authorization URL builder (OAuth App)",
      consoleOrDocUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
      whyItMatters:
        "Over-requesting scopes reduces user trust, while forgetting to enable user authorization or repository installation on a GitHub App causes `404 Not Found` errors on private repositories.",
      prerequisites: ["Step 1 & Step 2 completed"],
      expectedOutcome:
        "Permissions saved on the GitHub App, or scope list defined in your application config.",
      completionCheck:
        "For OAuth Apps, inspect the `X-OAuth-Scopes` HTTP response header on `GET https://api.github.com/user` after authorization (`SRC-GH-03`).",
      commonFailureCases: [
        "Users manually editing/unchecking requested scopes during the OAuth flow, leaving the token with fewer scopes than requested (`SRC-GH-03`).",
        "Passing `scope=repo` to a GitHub App and wondering why `response.scope` is empty (`SRC-GH-07`).",
      ],
      estimatedTime: "5–10 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GH-02", "SRC-GH-03", "SRC-GH-07", "SRC-GH-20"],
    },
    {
      id: "gh-step-4",
      stepNumber: 4,
      title: "Exchange Authorization Code Server-Side (or Attach Composio Auth Config)",
      instructions:
        "If using Composio Custom Auth: create an auth config with `toolkit: 'github'`, `type: 'use_custom_auth'`, `authScheme: 'OAUTH2'`, and pass your `client_id` and `client_secret` (`SRC-COMP-08`). If using a custom **GitHub App** with Composio, also prompt the user to visit `https://github.com/apps/<app-slug>/installations/new` to install the app on their repositories (`SRC-COMP-02`). If building a direct backend exchange: send `POST https://github.com/login/oauth/access_token` with header `Accept: application/json`, `client_id`, `client_secret`, `code`, and `redirect_uri`.",
      whereToDoIt: "Your backend server or Composio Dashboard / SDK",
      consoleOrDocUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
      whyItMatters:
        "GitHub's token endpoint defaults to `application/x-www-form-urlencoded` unless `Accept: application/json` is set, and returns HTTP `200 OK` even when returning an OAuth error payload like `bad_verification_code`.",
      prerequisites: ["Client ID and generated Client Secret"],
      expectedOutcome:
        "Valid user access token (`ghu_...` for GitHub Apps or `gho_...` for OAuth Apps) and optional refresh token (`ghr_...`) stored securely server-side.",
      completionCheck:
        "Verify that your token exchange parser checks `if (data.error)` even on HTTP 200 responses, and that `GET https://api.github.com/user` returns the authenticated user's login.",
      commonFailureCases: [
        "`bad_verification_code`: caused by exchanging the same single-use `code` twice (e.g., React `useEffect` double-firing in dev mode) or waiting >10 minutes (`SRC-GH-05`).",
        "Tool calls failing on a Composio custom GitHub App because the user completed OAuth login but never installed the GitHub App on their repositories (`SRC-COMP-02`).",
      ],
      estimatedTime: "10 minutes",
      responsibleParty: "developer",
      evidenceIds: ["SRC-GH-05", "SRC-GH-12", "SRC-GH-13", "SRC-COMP-02"],
    },
    {
      id: "gh-step-5",
      stepNumber: 5,
      title: "Verify Organization Access and SAML SSO Authorization",
      instructions:
        "When onboarding users who belong to GitHub Organizations, instruct them to click **Authorize** (or **Request**) next to their target organization on the GitHub OAuth prompt. If the organization enforces SAML SSO, the user must have an active SAML session before or during authorization.",
      whereToDoIt: "GitHub OAuth Consent Prompt & `GET /user/orgs` / `GET /user/installations`",
      consoleOrDocUrl:
        "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/authorizing-oauth-apps",
      whyItMatters:
        "Without SAML authorization or Org Owner approval, API calls to private organization repositories will either omit those repositories from list endpoints or fail with `403 Resource protected by organization SAML enforcement`.",
      prerequisites: ["Completed user OAuth flow"],
      expectedOutcome:
        "Organization repositories appear in `GET /user/installations/{installation_id}/repositories` (GitHub App) or `GET /orgs/{org}/repos` (OAuth App).",
      completionCheck:
        "Make a test request to a private organization repository and inspect for HTTP `403` with the `X-GitHub-SSO` response header.",
      commonFailureCases: [
        "User authorized the app before signing into their org's SAML IdP, requiring them to revoke and re-authorize at `https://github.com/settings/apps/authorizations` (`SRC-GH-06`, `SRC-GH-09`).",
      ],
      estimatedTime: "5 minutes",
      responsibleParty: "end_user",
      evidenceIds: ["SRC-GH-06", "SRC-GH-09", "SRC-GH-15", "SRC-GH-18"],
    },
  ],

  painPoints: [
    {
      id: "PP-GH-01",
      title: "Monolithic `repo` Scope in OAuth Apps Triggers User & Enterprise Rejection",
      symptom:
        "Security-conscious users and enterprise organization owners refuse to authorize the integration because the consent screen asks for full read/write access to all private code, webhooks, deployments, and organization projects.",
      scenario:
        "Using a classic GitHub OAuth App when the integration needs to read or write private repository issues, pull requests, or contents.",
      likelyCause:
        "GitHub OAuth Apps do not support read-only code scopes or issues-only scopes for private repositories (`SRC-GH-02`, `SRC-GH-03`, `SRC-GH-06`). Requesting `repo` is mandatory for private repo access in an OAuth App.",
      causeConfidence: "documented",
      problemClassification: "permission_scope_decision",
      severity: "high",
      evidenceIds: ["SRC-GH-01", "SRC-GH-02", "SRC-GH-03", "SRC-GH-06", "SRC-GH-14"],
      independentReportCount: 4,
      recencyVersionNotes:
        "Confirmed current in 2026 GitHub documentation; GitHub explicitly banners OAuth App docs recommending GitHub Apps instead.",
      prevention:
        "Register a **GitHub App** instead of an OAuth App whenever your integration needs access to private repositories or organization resources.",
      resolution:
        "Migrate the integration to a GitHub App configured with fine-grained permissions (e.g., `Issues: Read & write`, `Contents: Read-only`) and per-repository installation selection.",
      impactOnGuide:
        "Changed Section 1 Verdict and Section 2 Path Recommendation from a classic OAuth App to a Custom GitHub App for production scenarios.",
    },
    {
      id: "PP-GH-02",
      title: "Empty `scope: \"\"` and Private Repo `404 Not Found` on GitHub Apps",
      symptom:
        "Token exchange succeeds (`200 OK`), but the returned JSON contains `\"scope\": \"\"` (empty string) even though `?scope=repo` was passed in the authorize URL, and subsequent API calls to private repositories return `404 Not Found`.",
      scenario:
        "Developer registers a GitHub App (`Iv1...`), follows an OAuth App tutorial that passes `scope=repo`, or uses a custom GitHub App in Composio without completing the separate app installation step.",
      likelyCause:
        "GitHub Apps ignore OAuth `scope` parameters (except `offline_access`). Their permissions come from the intersection of the user's permissions and the **GitHub App's installation grant** on the target account/repository (`SRC-GH-03`, `SRC-GH-07`, `SRC-GH-12`, `SRC-COMP-02`). Furthermore, GitHub returns `404 Not Found` instead of `403 Forbidden` when a token lacks access to a private repository.",
      causeConfidence: "maintainer_confirmed",
      problemClassification: "authorization_flow_misunderstanding",
      severity: "high",
      evidenceIds: ["SRC-GH-03", "SRC-GH-07", "SRC-GH-11", "SRC-GH-12", "SRC-COMP-02"],
      independentReportCount: 5,
      recencyVersionNotes:
        "Verified across current Octokit docs and Composio's October 2026 GitHub toolkit FAQ (`SRC-COMP-02`).",
      prevention:
        "Enable 'Request user authorization (OAuth) during installation' in your GitHub App settings so users install the app on target repositories and authorize in one flow. If using Composio with a custom GitHub App, explicitly present your GitHub App installation link (`https://github.com/apps/<slug>/installations/new`) to the user (`SRC-COMP-02`).",
      resolution:
        "Check `GET /user/installations` with the user access token to verify the GitHub App is installed on the organization/account and that the specific private repository is included in the installation's repository selection (`SRC-GH-15`, `SRC-GH-17`).",
      impactOnGuide:
        "Added explicit Composio GitHub App installation warning in Section 2 and Step 4, plus a `GET /user/installations` check in Section 7.",
    },
    {
      id: "PP-GH-03",
      title: "`redirect_uri_mismatch` and the August 3, 2026 Wildcard Matching Change",
      symptom:
        "GitHub redirects back with `error=redirect_uri_mismatch&error_description=The+redirect_uri+MUST+match+the+registered+callback+URL+for+this+application`.",
      scenario:
        "Passing a callback URL with a different port, protocol (`http` vs `https`), or subdirectory path than the URL registered in GitHub Developer Settings.",
      likelyCause:
        "Prior to August 3, 2026, GitHub enabled wildcard subdomain and subdirectory matching on apps with a single callback URL (`SRC-GH-08`). On new or updated apps where wildcard matching is disabled, `redirect_uri` must match one of the registered callback URLs character-for-character (`SRC-GH-05`, `SRC-GH-08`).",
      causeConfidence: "documented",
      problemClassification: "developer_console_configuration",
      severity: "high",
      evidenceIds: ["SRC-GH-01", "SRC-GH-05", "SRC-GH-08", "SRC-GH-10"],
      independentReportCount: 4,
      recencyVersionNotes:
        "Policy changed August 3, 2026 (`SRC-GH-08`); older Stack Overflow answers claiming subdirectory callbacks always work without configuration are now conditionally outdated.",
      prevention:
        "Register each exact callback URL (up to 10 allowed) in your GitHub App or OAuth App settings rather than enabling wildcard matching.",
      resolution:
        "Either register the exact `redirect_uri` in GitHub Developer Settings or omit the `redirect_uri` parameter in `/login/oauth/authorize` when using a single default registered callback URL (`SRC-GH-05`).",
      impactOnGuide:
        "Added the August 3, 2026 wildcard policy note in Section 3 (Before You Begin) and Step 2.",
    },
    {
      id: "PP-GH-04",
      title: "Organization SAML SSO Enforcement & Third-Party App Restrictions Blocking Repo Access",
      symptom:
        "User completes OAuth login and is even an Organization Owner, but private organization repositories do not appear in list endpoints, or API calls return `403 Resource protected by organization SAML enforcement`.",
      scenario:
        "Connecting to a GitHub Enterprise Cloud organization with SAML Single Sign-On (SSO) or OAuth App access restrictions enabled.",
      likelyCause:
        "GitHub requires an active SAML SSO session for each SAML-protected organization at the moment the user authorizes an OAuth App or GitHub App user token (`SRC-GH-06`, `SRC-GH-09`, `SRC-GH-16`). Additionally, organizations with OAuth App restrictions require explicit Org Owner approval (`SRC-GH-18`).",
      causeConfidence: "documented",
      problemClassification: "account_specific_restriction",
      severity: "high",
      evidenceIds: [
        "SRC-GH-06",
        "SRC-GH-09",
        "SRC-GH-15",
        "SRC-GH-16",
        "SRC-GH-18",
      ],
      independentReportCount: 5,
      recencyVersionNotes:
        "Corroborated by IBM/HashiCorp support advisories (`SRC-GH-09`) and 2025–2026 Reddit reports (`SRC-GH-15`, `SRC-GH-16`).",
      prevention:
        "Remind enterprise users before redirecting to GitHub to ensure they have an active SAML session and to click 'Authorize' next to their organization on the GitHub prompt.",
      resolution:
        "If already stuck, the user must navigate to `GitHub Settings → Applications → Authorized GitHub Apps` (or `Authorized OAuth Apps`), revoke the app, sign into their organization's SAML SSO portal, and re-authorize (`SRC-GH-06`, `SRC-GH-09`).",
      impactOnGuide:
        "Added SAML SSO & Org approval checks to Section 5 (Effort & Approval), Step 5, and Section 7 (Test Before Launch).",
    },
    {
      id: "PP-GH-05",
      title: "`bad_verification_code` Returned Inside an HTTP `200 OK` Response",
      symptom:
        "`POST https://github.com/login/oauth/access_token` returns HTTP status `200`, but no `access_token` is present; body contains `error=bad_verification_code`.",
      scenario:
        "Exchanging the temporary OAuth `code` on the callback route.",
      likelyCause:
        "GitHub authorization codes are single-use and expire after 10 minutes (`SRC-GH-05`). In React/Next.js apps, handling the callback inside a client-side `useEffect` (which fires twice in StrictMode) or retrying a failed network call consumes the code on the first request and returns `bad_verification_code` with HTTP `200 OK` on the second (`SRC-GH-05`, `SRC-GH-13`).",
      causeConfidence: "documented",
      problemClassification: "sdk_framework_implementation",
      severity: "medium",
      evidenceIds: ["SRC-GH-05", "SRC-GH-10", "SRC-GH-13"],
      independentReportCount: 3,
      recencyVersionNotes: "Current behavior on GitHub's OAuth token endpoint.",
      prevention:
        "Perform the `POST /login/oauth/access_token` exchange in a server-side HTTP route handler, send `Accept: application/json`, and always inspect `responseBody.error` even when `res.ok === true`.",
      resolution:
        "Deduplicate incoming callback requests by `code` or `state` and redirect the user to start a fresh `/login/oauth/authorize` flow if `bad_verification_code` is returned.",
      impactOnGuide:
        "Added HTTP 200 error-body check to Step 4 and Section 7.",
    },
  ],

  launchChecklist: [
    {
      id: "gh-check-1",
      label: "Exact Callback URL Match Verified",
      verificationMethod:
        "Confirm the runtime `redirect_uri` matches a registered callback URL in GitHub Developer Settings (including scheme, port, and path) with Wildcard Matching disabled.",
      failureIndicator:
        "Redirect to callback with `?error=redirect_uri_mismatch`.",
      category: "callback_redirect",
    },
    {
      id: "gh-check-2",
      label: "HTTP 200 OAuth Error Payload Handling",
      verificationMethod:
        "Ensure the token exchange handler sends `Accept: application/json` and checks `if (json.error)` on `200 OK` responses from `https://github.com/login/oauth/access_token`.",
      failureIndicator:
        "Application saves `undefined` as the access token when `bad_verification_code` occurs.",
      category: "token_lifecycle",
    },
    {
      id: "gh-check-3",
      label: "Private Repository & Installation Grant Check",
      verificationMethod:
        "Call `GET https://api.github.com/user/installations` (for GitHub Apps) or check the `X-OAuth-Scopes` header on `GET https://api.github.com/user` (for OAuth Apps), then fetch a known private repository.",
      failureIndicator:
        "`404 Not Found` on a private repository the user owns or belongs to.",
      category: "consent_scopes",
    },
    {
      id: "gh-check-4",
      label: "8-Hour Expiring User Token Refresh Tested",
      verificationMethod:
        "Pass `scope=offline_access` (or enable expiring tokens) and verify your store atomically replaces both `access_token` and the single-use `refresh_token` (`ghr_...`).",
      failureIndicator:
        "Integration stops working 8 hours after initial authorization (`401 Bad credentials`).",
      category: "token_lifecycle",
    },
    {
      id: "gh-check-5",
      label: "SAML SSO Organization Header Handling",
      verificationMethod:
        "Check if API responses from organization endpoints return `403 Forbidden` with an `X-GitHub-SSO` header, and surface a re-authorization link in the UI.",
      failureIndicator:
        "Enterprise users report missing organization repositories with no error shown in UI.",
      category: "distribution_approval",
    },
    {
      id: "gh-check-6",
      label: "Client Secret & Tokens Restricted to Server-Side",
      verificationMethod:
        "Verify `GITHUB_CLIENT_SECRET` and issued `ghu_`/`gho_`/`ghr_` tokens are never exposed in browser bundles, URLs, or client logs.",
      failureIndicator:
        "Secret appears in `NEXT_PUBLIC_*` env vars or browser network tab.",
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
        "Composio provides managed OAuth for GITHUB, GMAIL, SLACK, SLACKBOT, and NOTION.",
        "Availability is exposed via `composio_managed_auth_schemes` on `GET /api/v3.1/toolkits/{slug}`.",
      ],
      painPointsSupported: ["PP-GH-01"],
      summaryOfContent:
        "Lists the 124 toolkits with Composio-managed OAuth available and 223 toolkits requiring custom OAuth apps.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Toolkit-level list; method-specific details live on each toolkit page.",
    },
    {
      id: "SRC-COMP-02",
      title: "Composio — GitHub Toolkit Documentation",
      canonicalUrl: "https://docs.composio.dev/toolkits/github.md",
      publisherDomain: "docs.composio.dev",
      sourceType: "composio_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-10-14",
      claimsSupported: [
        "Composio supports OAUTH2 managed auth for GITHUB (v20261014_00, 899 tools).",
        "Custom GitHub Apps are supported via client_id/client_secret, but Composio does not yet auto-provide the GitHub App installation link.",
      ],
      painPointsSupported: ["PP-GH-01", "PP-GH-02"],
      summaryOfContent:
        "Official Composio GitHub toolkit reference and FAQ covering GitHub App installation requirements.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "Built-in installation link handling is noted as in progress without an ETA.",
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
        "Managed auth shows 'Composio wants to access your account' on consent screens and shares rate-limit quotas.",
        "Custom auth is recommended for production branding, custom scopes, dedicated quotas, and <15m polling.",
      ],
      painPointsSupported: ["PP-GH-01"],
      summaryOfContent:
        "Explains trade-offs between Composio managed OAuth apps and bringing custom OAuth credentials.",
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
        "Composio's OAuth callback URL is `https://backend.composio.dev/api/v3/toolkits/auth/callback`.",
      ],
      painPointsSupported: ["PP-GH-03"],
      summaryOfContent:
        "Shows Python and TypeScript examples for creating managed and custom OAuth2 auth configs.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-01",
      title: "GitHub Docs — Creating an OAuth app",
      canonicalUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Up to 10 callback URLs can be registered per OAuth app.",
        "Expire user access tokens is enabled by default on new apps.",
      ],
      painPointsSupported: ["PP-GH-01", "PP-GH-03"],
      summaryOfContent:
        "Step-by-step official instructions for registering a GitHub OAuth app, with a callout advising developers to consider a GitHub App instead.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-02",
      title: "GitHub Docs — Differences between GitHub Apps and OAuth apps",
      canonicalUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "OAuth apps require `repo` scope for issues, PRs, or code and access all user-accessible repositories.",
        "GitHub Apps use fine-grained permissions, per-repo installation grants, short-lived tokens, and scalable rate limits.",
      ],
      painPointsSupported: ["PP-GH-01", "PP-GH-04"],
      summaryOfContent:
        "Comprehensive official comparison of GitHub Apps and OAuth Apps across permissions, webhooks, tokens, and rate limits.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-03",
      title: "GitHub Docs — Scopes for OAuth apps",
      canonicalUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "`repo` scope grants full read/write access to private code, webhooks, deployments, and org projects.",
        "GitHub Apps do not accept scopes in authorization requests (except `offline_access`).",
        "Granted scopes are returned in `X-OAuth-Scopes` header and can be edited down by the user.",
      ],
      painPointsSupported: ["PP-GH-01", "PP-GH-02"],
      summaryOfContent:
        "Official reference table of all GitHub OAuth scopes and scope normalization rules.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-04",
      title: "GitHub Docs — Deciding when to build a GitHub App",
      canonicalUrl:
        "https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Check Runs and Check Suites REST APIs are only available to GitHub Apps.",
        "GitHub Apps do not consume an Enterprise seat and remain installed if the installing user leaves the org.",
      ],
      painPointsSupported: ["PP-GH-01"],
      summaryOfContent:
        "Official architectural decision guide comparing GitHub Apps, OAuth Apps, PATs, and GitHub Actions.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-05",
      title: "GitHub Docs — Troubleshooting OAuth app access token request errors",
      canonicalUrl:
        "https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/troubleshooting-oauth-app-access-token-request-errors",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "`redirect_uri_mismatch` and `bad_verification_code` error structures and causes.",
      ],
      painPointsSupported: ["PP-GH-03", "PP-GH-05"],
      summaryOfContent:
        "Official troubleshooting guide for token exchange errors (`bad_verification_code`, `redirect_uri_mismatch`, `incorrect_client_credentials`).",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-06",
      title: "GitHub Docs — Authorizing OAuth apps (Keeping your account and data secure)",
      canonicalUrl:
        "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/authorizing-oauth-apps",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Source code access cannot be scoped to read-only in OAuth Apps.",
        "SAML SSO organizations require an active SAML session when authorizing an OAuth App or GitHub App.",
      ],
      painPointsSupported: ["PP-GH-01", "PP-GH-04"],
      summaryOfContent:
        "Documents end-user authorization rules, 10-token per user/app/scope limit, and SAML SSO reauthorization requirements.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-07",
      title: "Stack Overflow — GitHub OAuth no scopes being returned in access token",
      canonicalUrl:
        "https://stackoverflow.com/questions/72072101/github-oauth-no-scopes-being-returned-in-access-token",
      publisherDomain: "stackoverflow.com",
      sourceType: "stack_overflow",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2022-05-01",
      claimsSupported: [
        "Passing `scope=repo` to a GitHub App OAuth flow returns `scope: \"\"` and results in 404 on private repos if not properly installed.",
      ],
      painPointsSupported: ["PP-GH-02"],
      summaryOfContent:
        "Developer report demonstrating blank scope response and private repo 404 when mixing GitHub App credentials with OAuth App scope parameters.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community Q&A report corroborated by official GitHub App docs.",
    },
    {
      id: "SRC-GH-08",
      title: "GitHub Docs — About the user authorization callback URL",
      canonicalUrl:
        "https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-03",
      claimsSupported: [
        "Wildcard callback matching changed on August 3, 2026; new apps require exact callback matching unless wildcard matching is explicitly enabled.",
      ],
      painPointsSupported: ["PP-GH-03"],
      summaryOfContent:
        "Official GitHub documentation explaining exact vs. wildcard callback URL matching and the August 3, 2026 policy cutover.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-09",
      title: "IBM Support — VCS connection using Github App fails for SSO enabled Github organisations",
      canonicalUrl:
        "https://www.ibm.com/support/pages/vcs-connection-using-github-app-fails-sso-enabled-github-organisations",
      publisherDomain: "ibm.com",
      sourceType: "support_kb",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-06-15",
      claimsSupported: [
        "Missing active SAML session during GitHub App authorization causes `403 Resource protected by organization SAML enforcement` and empty org repo lists.",
      ],
      painPointsSupported: ["PP-GH-04"],
      summaryOfContent:
        "Enterprise support article detailing the exact symptom and revoke-then-reauthorize fix for SAML-enforced GitHub organizations.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "Documented in the context of HCP Terraform's GitHub App integration.",
    },
    {
      id: "SRC-GH-10",
      title: "GitHub Docs — Troubleshooting authorization request errors",
      canonicalUrl:
        "https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/troubleshooting-authorization-request-errors",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Redirect query error parameters (`application_suspended`, `redirect_uri_mismatch`, `access_denied`).",
      ],
      painPointsSupported: ["PP-GH-03", "PP-GH-05"],
      summaryOfContent:
        "Official troubleshooting reference for authorization step errors.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-11",
      title: "Octokit — @octokit/oauth-app.js Documentation",
      canonicalUrl: "https://github.com/octokit/oauth-app.js/",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-01-10",
      claimsSupported: [
        "`clientType: 'github-app'` vs `'oauth-app'` configuration and automatic token refresh handling in Octokit.",
      ],
      painPointsSupported: ["PP-GH-02"],
      summaryOfContent:
        "Official Octokit library documentation for OAuth Apps and GitHub Apps.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "JavaScript/TypeScript SDK specific.",
    },
    {
      id: "SRC-GH-12",
      title: "Octokit — @octokit/oauth-methods.js Documentation",
      canonicalUrl: "https://github.com/octokit/oauth-methods.js/",
      publisherDomain: "github.com",
      sourceType: "github_repo",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-01-10",
      claimsSupported: [
        "Three distinct token response shapes between OAuth Apps and GitHub Apps (with/without token expiration).",
      ],
      painPointsSupported: ["PP-GH-02"],
      summaryOfContent:
        "Maintainer documentation for `exchangeWebFlowCode` and `refreshToken`.",
      evidenceStrength: "B",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-13",
      title: "GitHub Docs — Authorizing OAuth apps (Web & Device Flow)",
      canonicalUrl:
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "8-hour access token expiry and 6-month refresh token expiry when opted into expiring tokens.",
        "`Accept: application/json` header requirement on `POST /login/oauth/access_token`.",
      ],
      painPointsSupported: ["PP-GH-05"],
      summaryOfContent:
        "Full protocol specification for GitHub's OAuth web application flow, device flow, and expiring tokens.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-14",
      title: "Reddit r/github — Well, you could've asked for the password instead!! (`repo` scope backlash)",
      canonicalUrl:
        "https://www.reddit.com/r/github/comments/fdvd8x/well_you_couldve_asked_for_the_password_instead/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2020-03-05",
      claimsSupported: [
        "Developers actively distrust and abandon third-party OAuth Apps that demand the full `repo` scope.",
      ],
      painPointsSupported: ["PP-GH-01"],
      summaryOfContent:
        "Developer community discussion highlighting user friction caused by GitHub OAuth Apps lacking granular permissions.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community discussion illustrating user perception.",
    },
    {
      id: "SRC-GH-15",
      title: "Reddit r/Slack — Use an event triggered from a private repository from a GitHub organisation",
      canonicalUrl:
        "https://www.reddit.com/r/Slack/comments/1r8v3jk/use_an_event_triggered_from_a_private_repository/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-02-19",
      claimsSupported: [
        "Even when the connected user is an Org Owner, private org repositories do not appear if the integration is only installed on personal repos or blocked by org policy.",
      ],
      painPointsSupported: ["PP-GH-04"],
      summaryOfContent:
        "February 2026 developer report on missing private organization repositories after connecting GitHub.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Reported in the context of Slack's GitHub workflow integration.",
    },
    {
      id: "SRC-GH-16",
      title: "Reddit r/codex — Resolving GitHub auth errors (`oauth_access.regenerate` & SAML)",
      canonicalUrl:
        "https://www.reddit.com/r/codex/comments/1nwoa5e/resolving_github_auth_errors/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2025-10-03",
      claimsSupported: [
        "Expiring user tokens and SAML SSO policies cause AI coding agents to lose cached GitHub access until re-authorized.",
      ],
      painPointsSupported: ["PP-GH-04"],
      summaryOfContent:
        "Developer troubleshooting thread on AI agent connector drops with GitHub Organizations.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community report.",
    },
    {
      id: "SRC-GH-17",
      title: "Reddit r/GoogleAIStudio — Stuck in GitHub login loop in AI Studio",
      canonicalUrl:
        "https://www.reddit.com/r/GoogleAIStudio/comments/1qvav36/help_stuck_in_github_login_loop_in_ai_studio/",
      publisherDomain: "reddit.com",
      sourceType: "reddit",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-03-17",
      claimsSupported: [
        "Stale GitHub App installations without required repo grants can trap users in login loops until revoked under both Installed and Authorized GitHub Apps tabs.",
      ],
      painPointsSupported: ["PP-GH-02", "PP-GH-04"],
      summaryOfContent:
        "March 2026 developer report detailing how to reset a partial GitHub App installation/authorization state.",
      evidenceStrength: "C",
      isIndependentReport: true,
      limitations: "Community report.",
    },
    {
      id: "SRC-GH-18",
      title: "GitHub Docs — Requesting organization approval for OAuth apps",
      canonicalUrl:
        "https://docs.github.com/en/account-and-profile/how-tos/organization-membership/requesting-organization-approval-for-oauth-apps",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Users must authorize an OAuth App on their personal account before requesting Organization Owner approval.",
      ],
      painPointsSupported: ["PP-GH-04"],
      summaryOfContent:
        "Official instructions for requesting organization approval for an OAuth App.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-19",
      title: "GitHub Docs — Refreshing user access tokens",
      canonicalUrl:
        "https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "search_indexed_verified",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "Redeeming a GitHub refresh token immediately invalidates both the old refresh token and old access token.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Official documentation on GitHub App user-to-server token expiration (8h/6m) and single-use refresh token rotation.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
    {
      id: "SRC-GH-20",
      title: "GitHub Docs — Generating a user access token for a GitHub App",
      canonicalUrl:
        "https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app",
      publisherDomain: "docs.github.com",
      sourceType: "official_docs",
      retrievalStatus: "retrieved_200",
      retrievedAt: "2026-10-23",
      publishedOrUpdatedAt: "2026-08-01",
      claimsSupported: [
        "User-to-server tokens share the 5,000 requests/hour rate limit across all OAuth apps and PATs owned by that user.",
      ],
      painPointsSupported: [],
      summaryOfContent:
        "Official guide to generating user access tokens for GitHub Apps and rate-limit behavior.",
      evidenceStrength: "A",
      isIndependentReport: true,
      limitations: "None.",
    },
  ],

  agentResearchTrace: {
    searchesExecuted: 8,
    normalizedQueries: [
      "Composio managed authentication OAuth custom app docs.composio.dev 2026",
      "site:docs.composio.dev/toolkits github gmail slack notion oauth2 managed auth",
      "GitHub OAuth redirect_uri_mismatch bad_verification_code organization approval issues stackoverflow 2025 2026",
      "site:github.com/orgs/community/discussions OR site:github.com/octokit OAuth App GitHub App redirect_uri scope token refresh",
      "GitHub OAuth redirect_uri subdirectory port 404 private repository X-OAuth-Scopes stackoverflow github issues",
      "site:docs.github.com rate limits OAuth apps GitHub Apps expiring user access tokens",
      "site:reddit.com OR site:github.com/orgs/community/discussions OAuth App GitHub App repo scope permissions",
    ],
    sourcesRetrievedCount: 20,
    sourcesFailedCount: 0,
    documentsInspected: [
      "https://docs.composio.dev/toolkits/managed-auth",
      "https://docs.composio.dev/toolkits/github.md",
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps",
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
      "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps",
      "https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app",
      "https://github.com/octokit/oauth-app.js/",
      "https://github.com/octokit/oauth-methods.js/",
    ],
    painPointAreasExplored: [
      "OAuth App monolithic `repo` scope vs. GitHub App fine-grained permissions",
      "Passing `scope` to GitHub Apps resulting in empty `scope: \"\"` and private repo `404`",
      "August 3, 2026 callback URL wildcard policy change",
      "SAML SSO enforcement and Organization Owner third-party app approval blocks",
      "Single-use 10-minute `code` expiration and HTTP 200 masked `bad_verification_code` responses",
      "Composio custom GitHub App manual installation link requirement",
    ],
    validationPerformed: [
      "Verified all 20 evidence source IDs resolve to audited entries in `docs/research/source-ledger.csv`",
      "Cross-checked Composio v20261014_00 `GITHUB` toolkit documentation against GitHub's official App docs",
      "Validated guide record against `GuideSchema` runtime Zod rules",
    ],
    agentPreparedActions: [
      "Mapped scenario-specific permission sets for GitHub App vs. OAuth App vs. Composio Managed Auth",
      "Prepared exact callback URL configuration instructions including the August 3, 2026 wildcard rule",
      "Synthesized 5 corroborated developer pain points with prevention and diagnostic steps",
    ],
    unresolvedQuestions: [
      "Customer-specific GitHub Organization Owner approval turnaround time (varies by customer IT governance).",
      "Release date for Composio's automatic GitHub App installation link handling (`SRC-COMP-02`).",
    ],
    stopReason: "sufficient_evidence",
  },

  outcome: {
    guideStatus: "complete_verified",
    confidence: "high",
    limitations: [
      "We did not execute live interactive installations against a private SAML-enforced GitHub Enterprise organization console; SAML guidance is derived from GitHub's official docs (`SRC-GH-06`) and IBM/HashiCorp support advisories (`SRC-GH-09`).",
    ],
    recommendedNextStep: {
      title: "Register a Fine-Grained GitHub App (or Start a Composio Managed Session for Prototyping)",
      action:
        "If prototyping, call `session.authorize('github')` with Composio Managed Auth. If preparing for production, open `https://github.com/settings/apps/new`, register a GitHub App with exact callback URL `https://backend.composio.dev/api/v3/toolkits/auth/callback` (or your backend callback), and enable 'Request user authorization (OAuth) during installation'.",
      targetUrl: "https://github.com/settings/apps",
      rationale:
        "Avoids building around a legacy OAuth App whose monolithic `repo` scope will force a painful migration before enterprise launch.",
    },
    humanOnlyActions: [
      "Log into GitHub Developer Settings (`https://github.com/settings/apps`) to create the GitHub App or OAuth App.",
      "Generate and securely store the Client Secret (and Private Key `.pem` if minting installation tokens).",
      "Install the GitHub App on target repositories and approve access in any SAML/restricted GitHub Organization.",
    ],
    missingInformationToProceed: [],
    outdatedReportMechanism: {
      instructions:
        "Spot an outdated GitHub callback rule, scope behavior, or Composio toolkit change? Flag this guide with the source URL or error output.",
      endpoint: "/api/feedback",
    },
  },
};
