import { Guide } from "@/lib/schema/guideSchema";

export interface GlossaryTerm {
  key: string;
  label: string;
  definition: string;
  pattern: RegExp;
}

// Order matters: more specific terms must come before broader ones.
export const GLOSSARY: GlossaryTerm[] = [
  {
    key: "redirect_uri_mismatch",
    label: "redirect_uri_mismatch",
    definition:
      "An error that means the return address in your code doesn't exactly match the one saved in the provider's settings. Even a missing slash causes it.",
    pattern: /redirect_uri_mismatch|bad_redirect_uri/,
  },
  {
    key: "invalid_grant",
    label: "invalid_grant",
    definition:
      "An error that means a saved login is no longer valid (it expired, was revoked, or was already used). Usually the user has to connect again.",
    pattern: /invalid_grant/,
  },
  {
    key: "invalid_client",
    label: "invalid_client",
    definition:
      "An error that means the provider didn't accept your app's ID and secret, usually because they were sent in the wrong format.",
    pattern: /invalid_client/,
  },
  {
    key: "not_in_channel",
    label: "not_in_channel",
    definition:
      "A Slack error that means your bot hasn't been added to that channel yet.",
    pattern: /not_in_channel/,
  },
  {
    key: "object_not_found",
    label: "object_not_found",
    definition:
      "A Notion error that usually means the page wasn't shared with your app, even though it exists.",
    pattern: /object_not_found/,
  },
  {
    key: "bad_verification_code",
    label: "bad_verification_code",
    definition:
      "A GitHub error meaning the one-time login code was already used or is older than 10 minutes.",
    pattern: /bad_verification_code/,
  },
  {
    key: "gmail.readonly",
    label: "gmail.readonly",
    definition:
      "Google permission to read and search a user's emails. It's in Google's highest-risk group, so it needs the longest review.",
    pattern: /gmail\.readonly/,
  },
  {
    key: "gmail.send",
    label: "gmail.send",
    definition:
      "Google permission to send emails only. Your app can't read the inbox. Review is shorter (about 3–5 business days).",
    pattern: /gmail\.send/,
  },
  {
    key: "gmail.modify",
    label: "gmail.modify",
    definition:
      "Google permission to read, send, label, and move emails to trash. It's in Google's highest-risk group.",
    pattern: /gmail\.modify/,
  },
  {
    key: "gmail.metadata",
    label: "gmail.metadata",
    definition:
      "Google permission to see email headers and labels only, not the message text. Don't combine it with read permissions.",
    pattern: /gmail\.metadata/,
  },
  {
    key: "gmail.settings.basic",
    label: "gmail.settings.basic",
    definition:
      "Google permission to change a user's Gmail settings and filters. It's in Google's highest-risk group.",
    pattern: /gmail\.settings\.basic/,
  },
  {
    key: "gmail.labels",
    label: "gmail.labels",
    definition: "Google permission to see and edit email labels only. Low risk.",
    pattern: /gmail\.labels/,
  },
  {
    key: "mail.google.com",
    label: "Full mailbox access",
    definition:
      "Complete access to a user's mailbox, including permanent deletion. Avoid it unless you truly need it.",
    pattern: /https:\/\/mail\.google\.com\/?/,
  },
  {
    key: "casa",
    label: "CASA security check",
    definition:
      "A yearly security review by an independent company. Google requires it before public apps can read users' Gmail messages on a server. It usually takes several weeks.",
    pattern: /\bCASA\b(?: security assessment| security check| assessment| audit)?/,
  },
  {
    key: "restricted-scope",
    label: "Restricted permission (Google)",
    definition:
      "Google's highest-risk permission group, such as reading all emails. It needs the longest review, including a CASA security check.",
    pattern: /restricted scopes?|restricted permissions?|restricted scope verification/i,
  },
  {
    key: "sensitive-scope",
    label: "Sensitive permission (Google)",
    definition:
      "Google's medium-risk permission group, such as sending email. It needs a Google review that usually takes about 3–5 business days.",
    pattern: /sensitive scopes?|sensitive scope verification|sensitive permissions?/i,
  },
  {
    key: "testing-mode",
    label: "Testing mode (Google)",
    definition:
      "Google's development mode. Only up to 100 listed test users can sign in, and their logins expire every 7 days.",
    pattern: /Testing (?:mode|status)|in `?Testing`?/,
  },
  {
    key: "google-verification",
    label: "Google verification",
    definition:
      "Google's review of your app's name, logo, website, and requested permissions before it can be shown to the public without warnings.",
    pattern: /brand verification|Google verification|scope verification/i,
  },
  {
    key: "service-account",
    label: "Service account",
    definition:
      "A robot Google account used by servers. It can't access personal @gmail.com inboxes.",
    pattern: /service accounts?/i,
  },
  {
    key: "domain-wide-delegation",
    label: "Domain-wide delegation",
    definition:
      "A Google Workspace admin setting that lets a robot account act on behalf of every user in a company.",
    pattern: /domain-wide delegation/i,
  },
  {
    key: "composio-managed",
    label: "Composio managed login",
    definition:
      "Composio has already registered an app with this provider, so you can connect users right away without creating your own. Users will see “Composio” on the permission screen.",
    pattern: /Composio[- ]managed (?:OAuth|auth|login)|Composio Managed (?:OAuth|Auth)|managed auth/i,
  },
  {
    key: "custom-app",
    label: "Your own OAuth app",
    definition:
      "An app you register yourself in the provider's developer settings. It shows your brand name, and you control the permissions and limits.",
    pattern: /custom (?:OAuth )?app|your own (?:OAuth )?app|custom auth config/i,
  },
  {
    key: "github-app",
    label: "GitHub App",
    definition:
      "GitHub's recommended kind of integration. Users choose exactly which repositories it can access and what it can do.",
    pattern: /GitHub Apps?/,
  },
  {
    key: "oauth-app",
    label: "OAuth App (GitHub)",
    definition:
      "GitHub's older kind of integration. It can only ask for broad permissions, such as full access to all private code.",
    pattern: /\bOAuth Apps?\b/,
  },
  {
    key: "oauth",
    label: "OAuth",
    definition:
      "A standard way for users to log in with another service and let your app use their data — without sharing their password.",
    pattern: /\bOAuth(?: 2\.0)?\b/,
  },
  {
    key: "saml",
    label: "SAML SSO",
    definition:
      "A company login system. Some organizations require users to sign in through it before any app can see company data.",
    pattern: /SAML(?: SSO)?|single sign-on/i,
  },
  {
    key: "marketplace",
    label: "Marketplace",
    definition:
      "The provider's public app store. Being listed is optional and can take months of review.",
    pattern: /Slack Marketplace|\bMarketplace\b/,
  },
  {
    key: "public-distribution",
    label: "Public distribution (Slack)",
    definition:
      "A Slack setting that lets any workspace install your app through your link. It's instant and needs no review.",
    pattern: /Manage Distribution|Direct Public Distribution|Public Distribution/i,
  },
  {
    key: "bot-token",
    label: "Bot token",
    definition: "A key that lets your app act as its own bot user in Slack.",
    pattern: /bot tokens?|xoxb-?/i,
  },
  {
    key: "user-token",
    label: "User token",
    definition:
      "A key that lets your app act as the specific person who connected their account.",
    pattern: /user tokens?|xoxp-?/i,
  },
  {
    key: "token-rotation",
    label: "Token rotation",
    definition:
      "Login keys that expire on a schedule (every 12 hours on Slack) and must be renewed. Once turned on in Slack, it can't be turned off.",
    pattern: /token rotation/i,
  },
  {
    key: "bolt",
    label: "Bolt",
    definition: "Slack's official toolkit for building Slack apps.",
    pattern: /\bBolt\b/,
  },
  {
    key: "notion-internal",
    label: "Internal connection (Notion)",
    definition:
      "A simple Notion access key that works only in your own workspace. No login flow is needed.",
    pattern: /Internal Connections?|internal integrations?/i,
  },
  {
    key: "notion-public",
    label: "Public connection (Notion)",
    definition:
      "A Notion login flow that lets people from any workspace connect their own Notion to your app.",
    pattern: /Public Connections?|public integrations?/i,
  },
  {
    key: "page-picker",
    label: "Page picker (Notion)",
    definition:
      "The Notion screen where users choose which pages your app can see. If they pick none, your app sees nothing.",
    pattern: /Page Picker/i,
  },
  {
    key: "capabilities",
    label: "Capabilities (Notion)",
    definition:
      "Notion's version of permissions (read, update, or add content). You set them once in Notion's developer settings.",
    pattern: /\bCapabilit(?:y|ies)\b/,
  },
  {
    key: "refresh-token",
    label: "Refresh token",
    definition:
      "A long-lasting key used to get a fresh login key when the old one expires, so users don't need to sign in again.",
    pattern: /refresh[_ ]tokens?/i,
  },
  {
    key: "access-token",
    label: "Access token",
    definition:
      "A short-lived key your app uses to call the provider's API on behalf of a user.",
    pattern: /access[_ ]tokens?/i,
  },
  {
    key: "redirect",
    label: "Redirect (callback) URL",
    definition:
      "The page on your site where users are sent back after they approve access. It must exactly match what you saved in the provider's settings.",
    pattern: /redirect_uri|redirect URIs?|redirect URLs?|callback URLs?/i,
  },
  {
    key: "client-credentials",
    label: "Client ID & secret",
    definition:
      "The username and password for your app itself. Keep the secret on your server — never in browser code.",
    pattern: /client[_ ](?:id|secret)/i,
  },
  {
    key: "scope",
    label: "Scope (permission)",
    definition:
      "A specific permission your app asks for, such as “read emails” or “send emails”. Ask for as few as possible.",
    pattern: /\bscopes?\b/i,
  },
  {
    key: "basic-auth",
    label: "Basic auth header",
    definition:
      "A way of sending your app's ID and secret in a special request header instead of in the request body.",
    pattern: /HTTP Basic Auth(?:entication)?|Basic auth/i,
  },
  {
    key: "rate-limit",
    label: "Rate limit",
    definition: "A cap on how many requests you can make in a period of time.",
    pattern: /rate[- ]limits?/i,
  },
  {
    key: "workspace-admin",
    label: "Workspace admin",
    definition:
      "The person who manages a company's account and can approve or block apps.",
    pattern: /workspace admins?|org(?:anization)? owners?/i,
  },
  {
    key: "actor-app",
    label: "actor=app",
    definition:
      "Makes actions appear as coming from your app or bot instead of the person who connected.",
    pattern: /actor=app/,
  },
];

const EXACT_MATCHERS = GLOSSARY.map((term) => ({
  term,
  exact: new RegExp(`^(?:${term.pattern.source})$`, term.pattern.flags.replace("g", "")),
  anywhere: new RegExp(term.pattern.source, term.pattern.flags.replace("g", "")),
}));

export const GLOSSARY_SCAN_REGEX = new RegExp(
  GLOSSARY.map((t) => `(?:${t.pattern.source})`).join("|"),
  "gi"
);

export function findTermForMatch(match: string): GlossaryTerm | undefined {
  return EXACT_MATCHERS.find((m) => m.exact.test(match))?.term;
}

export function findTermForCode(code: string): GlossaryTerm | undefined {
  return EXACT_MATCHERS.find((m) => m.anywhere.test(code))?.term;
}

/**
 * Removes internal research IDs (e.g. SRC-GH-01, PP-GMAIL-03) and the empty
 * brackets/punctuation they leave behind, so only readable prose remains.
 */
export function cleanText(input: string): string {
  let s = input.replace(/`?\b(?:SRC|PP)-[A-Z0-9]+(?:-[A-Z0-9]+)*`?/g, "");
  for (let i = 0; i < 3; i++) {
    s = s
      .replace(/\(\s*(?:[,;]|and|&|\s)*\)/g, "")
      .replace(/\[\s*(?:[,;]|and|&|\s)*\]/g, "")
      .replace(/\(\s*[,;]\s*/g, "(")
      .replace(/\s*[,;]\s*\)/g, ")")
      .replace(/,\s*,/g, ",");
  }
  return s
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .trim();
}

export function termsUsedInGuide(guide: Guide): GlossaryTerm[] {
  const corpus = JSON.stringify({
    a: guide.authenticationAssessment,
    s: guide.scenario,
    d: guide.difficultyAndEffort,
    p: guide.prerequisites,
    st: guide.setupSteps,
    pp: guide.painPoints,
    c: guide.launchChecklist,
  });
  return EXACT_MATCHERS.filter((m) => m.anywhere.test(corpus)).map((m) => m.term);
}

export interface PlainGuideIntro {
  oneLiner: string;
  approval: string;
}

export const PLAIN_GUIDE_INTROS: Record<string, PlainGuideIntro> = {
  github: {
    oneLiner:
      "Start today with Composio's ready-made login. When you go live with private code, create your own GitHub App so you only ask for the access you actually need.",
    approval: "None from GitHub (company admins may need to approve)",
  },
  gmail: {
    oneLiner:
      "Start with Composio's ready-made Gmail login. If your app only sends emails, Google's review takes about a week. If it reads emails, plan for several weeks plus a yearly security check.",
    approval: "About 1 week (sending) to several weeks (reading emails)",
  },
  slack: {
    oneLiner:
      "Start with Composio's login. For real customers, create your own Slack app and turn on public sharing — you can launch without waiting for Slack's app store.",
    approval: "None to launch (app store listing takes 2–5 months)",
  },
  notion: {
    oneLiner:
      "Only your own team? Use a simple Notion access key — no login flow needed. For customers, create your own Notion login and make sure users pick the pages to share.",
    approval: "None",
  },
};

export function getPlainIntro(guide: Guide): PlainGuideIntro {
  const curated = PLAIN_GUIDE_INTROS[guide.slug];
  if (curated) return curated;
  const approvalRaw = guide.difficultyAndEffort.publishedApprovalTimeEstimate;
  return {
    oneLiner: cleanText(guide.authenticationAssessment.verdictHeadline),
    approval: approvalRaw
      ? cleanText(approvalRaw).split(/[.(]/)[0].trim()
      : "No review time published",
  };
}

export const DIFFICULTY_LABELS: Record<
  Guide["difficultyAndEffort"]["difficultyCategory"],
  string
> = {
  straightforward: "Easy",
  moderate: "Medium",
  complex_approval_gated: "Hard — needs approval",
  inconclusive: "Unclear",
};

export const PATH_LABELS: Record<
  Guide["authenticationAssessment"]["recommendedPath"],
  string
> = {
  use_composio_managed_oauth: "Use Composio's login",
  register_custom_oauth_app: "Create your own app",
  use_alternative_auth_method: "Use the recommended alternative",
  clarify_use_case: "Clarify your use case first",
  gather_more_evidence: "Check the docs before building",
  contact_provider: "Contact the provider",
  no_reliable_path_established: "No public login found",
};

export const RESPONSIBLE_LABELS: Record<string, string> = {
  developer: "You",
  organization_admin: "Company admin",
  end_user: "Your user",
  provider_review_team: "Provider's review team",
  agent_assisted: "AuthPath",
};

export const IMPACT_LABELS: Record<
  string,
  { label: string; dot: string; text: string }
> = {
  critical: {
    label: "Can block launch",
    dot: "bg-rose-400",
    text: "text-rose-700",
  },
  high: {
    label: "Common and painful",
    dot: "bg-amber-400",
    text: "text-amber-700",
  },
  medium: {
    label: "Good to know",
    dot: "bg-sky-400",
    text: "text-sky-700",
  },
  low: { label: "Minor", dot: "bg-stone-300", text: "text-stone-600" },
};

/**
 * Splits summaries like "Three blockers: (1) ...; (2) ...; (3) ..." into a clean list.
 */
export function splitIntoPoints(text: string): { intro: string; points: string[] } {
  const cleaned = cleanText(text);
  const parts = cleaned.split(/\s*\(\d\)\s*/);
  if (parts.length <= 1) {
    return { intro: "", points: [cleaned] };
  }
  const [intro, ...rest] = parts;
  return {
    intro: intro.replace(/[:;,\s]+$/, "").trim(),
    points: rest
      .map((p) => p.replace(/[;,]\s*(?:and\s*)?$/i, "").replace(/\s*and$/i, "").trim())
      .filter(Boolean),
  };
}
