import { PainPoint } from "@/lib/schema/guideSchema";
import { CanonicalSourceRecord } from "./canonicalSources";

export interface SynthesizedPainPointMatrix {
  painPoints: PainPoint[];
  conflictingEvidenceNotes: string[];
  resolvedHistoricalNotes: string[];
  isolatedReportCount: number;
  corroboratedPatternCount: number;
}

interface PainPointPatternRule {
  idSuffix: string;
  title: string;
  keywords: RegExp;
  symptom: string;
  scenario: string;
  likelyCause: string;
  problemClassification: PainPoint["problemClassification"];
  severity: PainPoint["severity"];
  prevention: string;
  resolution: string;
  impactOnGuide: string;
}

const COMMON_PROVIDER_PATTERNS: PainPointPatternRule[] = [
  {
    idSuffix: "REDIRECT-MISMATCH",
    title: "Callback / Redirect URL Mismatch (`redirect_uri_mismatch`)",
    keywords:
      /redirect_uri_mismatch|redirect_uri.*not whitelisted|bad_redirect_uri|redirect uri.*match|invalid redirect_uri|callback.*mismatch/i,
    symptom:
      "Login fails immediately with `redirect_uri_mismatch` or `Invalid redirect_uri` before or during token exchange.",
    scenario:
      "Redirecting users back to your app after they click Allow, or moving from `localhost` to your production HTTPS domain.",
    likelyCause:
      "The `redirect_uri` sent in your authorization link does not exactly match the URL saved in the provider's developer dashboard (even a missing `/` at the end or `http` vs `https` will cause it to fail).",
    problemClassification: "developer_console_configuration",
    severity: "high",
    prevention:
      "Copy and paste the exact callback URL into the provider dashboard (or `https://backend.composio.dev/api/v3/toolkits/auth/callback` if using Composio).",
    resolution:
      "Compare the `redirect_uri` in your code character-by-character with the dashboard setting, and make sure both your `/authorize` link and `/token` request send the exact same URL.",
    impactOnGuide:
      "Added an exact callback URL check in Step 1 and the pre-launch checklist.",
  },
  {
    idSuffix: "TOKEN-ROTATION-RACE",
    title: "Refresh Token Failing (`invalid_grant`) After Expiration or Parallel Requests",
    keywords:
      /invalid_grant|refresh_token.*rotat|refresh token system|token.*expired or revoked|single-use refresh|refresh token.*invalid/i,
    symptom:
      "Refreshing an expired access token returns `400 Bad Request` (`invalid_grant`), disconnecting the user.",
    scenario:
      "Keeping a user connected in the background or when two server workers try to refresh the token at the same time.",
    likelyCause:
      "When a provider rotates refresh tokens, using a `refresh_token` immediately invalidates the old one and gives you a brand-new one. If your database doesn't save the new `refresh_token` right away, the next refresh fails with `invalid_grant`.",
    problemClassification: "sdk_framework_implementation",
    severity: "high",
    prevention:
      "Always save both the new `access_token` AND the new `refresh_token` every time you refresh, using a mutex lock so two workers don't refresh at the same time.",
    resolution:
      "If you get `invalid_grant`, stop retrying the dead token and prompt the user for re-authentication.",
    impactOnGuide:
      "Added refresh-token storage instructions to Step 3 and the launch checklist.",
  },
  {
    idSuffix: "ACTOR-OR-SCOPE-MISMATCH",
    title: "Permission / Scope Errors (`insufficient_scope` or Admin Approval Blocks)",
    keywords:
      /actor=app|actor=application|insufficient_scope|missing_scope|invalid_scope|workspace admin|admin scope|403 forbidden/i,
    symptom:
      "User finishes logging in, but API calls fail with `403 Forbidden`, `insufficient_scope`, or `invalid_scope`.",
    scenario:
      "Calling an API endpoint that requires a permission scope that wasn't requested during login, or installing a workspace-wide bot without admin rights.",
    likelyCause:
      "The scopes requested in the `/authorize` link don't match the specific API endpoint being called, or the user's account lacks workspace admin permission.",
    problemClassification: "permission_scope_decision",
    severity: "medium",
    prevention:
      "Request only the exact scopes required for your feature and verify whether workspace admin approval is needed.",
    resolution:
      "Update your requested scopes in the developer portal and have the user log in again so the new permissions take effect.",
    impactOnGuide:
      "Added scope selection advice to Section 2 and Step 2.",
  },
];

/**
 * Analyzes canonical retrieved sources to extract evidence-backed developer pain points,
 * distinguishing corroborated patterns from isolated reports and flagging resolved historical issues
 * or conflicting sources.
 */
export function synthesizePainPointsFromSources(
  providerSlug: string,
  sources: CanonicalSourceRecord[]
): SynthesizedPainPointMatrix {
  const validSources = sources.filter(
    (s) =>
      s.retrievalStatus === "retrieved_200" ||
      s.retrievalStatus === "search_indexed_verified"
  );

  const painPoints: PainPoint[] = [];
  const conflictingEvidenceNotes: string[] = [];
  const resolvedHistoricalNotes: string[] = [];
  let isolatedReportCount = 0;
  let corroboratedPatternCount = 0;

  // Check for resolved/historical issues in source text
  for (const src of validSources) {
    const text = `${src.title} ${src.snippet} ${src.extractedContent}`;
    if (
      /resolved in v\d|fixed in release|deprecated in favor of|was fixed in 202[0-4]/i.test(
        text
      )
    ) {
      resolvedHistoricalNotes.push(
        `Source ${src.id} (${src.title}) describes a historical or version-specific issue that was subsequently resolved or deprecated; it is not treated as an active universal requirement.`
      );
    }
  }

  // Check for conflicts between official docs (Grade A) and secondary/community sources (Grade C/D)
  const officialText = validSources
    .filter(
      (s) => s.sourceType === "official_docs" || s.sourceType === "composio_docs"
    )
    .map((s) => `${s.title} ${s.snippet} ${s.extractedContent}`)
    .join(" ")
    .toLowerCase();

  const communitySources = validSources.filter(
    (s) =>
      s.sourceType === "stack_overflow" ||
      s.sourceType === "reddit" ||
      s.sourceType === "github_issue" ||
      s.sourceType === "developer_forum" ||
      s.sourceType === "third_party_docs"
  );

  for (const comm of communitySources) {
    const cText = `${comm.title} ${comm.snippet} ${comm.extractedContent}`.toLowerCase();
    if (
      (cText.includes("tokens never expire") ||
        cText.includes("no refresh token needed")) &&
      (officialText.includes("refresh token") ||
        officialText.includes("migrated to the new refresh token") ||
        officialText.includes("expires_in"))
    ) {
      conflictingEvidenceNotes.push(
        `Conflict detected: Community/secondary source ${comm.id} ("${comm.title}") claims access tokens do not expire or do not use refresh tokens, whereas current official documentation establishes that expiring access tokens and refresh tokens are used. Official primary documentation takes precedence.`
      );
    }
  }

  const usedSourceIds = new Set<string>();

  // 1. Match pattern rules against independent sources
  for (const rule of COMMON_PROVIDER_PATTERNS) {
    const matchingSources = validSources.filter((s) =>
      rule.keywords.test(`${s.title} ${s.snippet} ${s.extractedContent}`)
    );

    if (matchingSources.length === 0) {
      continue;
    }

    for (const ms of matchingSources) {
      usedSourceIds.add(ms.id);
    }

    const independentMatches = matchingSources.filter(
      (s) => s.isIndependentReport
    );
    const hasOfficial = matchingSources.some(
      (s) => s.sourceType === "official_docs" || s.sourceType === "composio_docs"
    );
    const hasMaintainer = matchingSources.some(
      (s) => s.evidenceStrength === "B"
    );

    const isCorroborated = independentMatches.length >= 2 || hasOfficial;
    if (isCorroborated) {
      corroboratedPatternCount++;
    } else {
      isolatedReportCount++;
    }

    const confidence: PainPoint["causeConfidence"] = hasOfficial
      ? "documented"
      : hasMaintainer
      ? "maintainer_confirmed"
      : independentMatches.length >= 2
      ? "corroborated"
      : "hypothesis";

    const reportNote =
      independentMatches.length >= 2
        ? `Corroborated across ${independentMatches.length} independent sources (${matchingSources
            .map((m) => m.id)
            .join(", ")}).`
        : `Observed in ${matchingSources[0].id} (${
            hasOfficial
              ? "official documentation"
              : "single isolated report — not established as a widespread issue"
          }).`;

    painPoints.push({
      id: `PP-${providerSlug.toUpperCase().slice(0, 6)}-${rule.idSuffix}`,
      title: rule.title,
      symptom: rule.symptom,
      scenario: rule.scenario,
      likelyCause: `${rule.likelyCause} ${
        !isCorroborated
          ? "(Note: Based on an isolated report rather than broad multi-source corroboration.)"
          : ""
      }`.trim(),
      causeConfidence: confidence,
      problemClassification: rule.problemClassification,
      severity: rule.severity,
      evidenceIds: matchingSources.map((s) => s.id),
      independentReportCount: independentMatches.length || undefined,
      recencyVersionNotes: reportNote,
      prevention: rule.prevention,
      resolution: rule.resolution,
      impactOnGuide: rule.impactOnGuide,
    });
  }

  // 2. If live search discovered real Stack Overflow or GitHub Issue threads not yet covered above,
  // include up to 2 of them as specific developer-reported issues so any unfamiliar app gets rich pain points
  const additionalIssues = communitySources.filter(
    (s) =>
      !usedSourceIds.has(s.id) &&
      s.isIndependentReport &&
      (s.sourceType === "stack_overflow" || s.sourceType === "github_issue")
  );

  for (const issueSrc of additionalIssues.slice(0, 2)) {
    isolatedReportCount++;
    const cleanTitle = issueSrc.title
      .replace(/^Stack Overflow — /i, "")
      .replace(/^GitHub Issue \([^)]+\) — /i, "")
      .slice(0, 110);

    painPoints.push({
      id: `PP-${providerSlug.toUpperCase().slice(0, 6)}-ISSUE-${painPoints.length + 1}`,
      title: `Developer Report: ${cleanTitle}`,
      symptom: issueSrc.snippet.slice(0, 240) || cleanTitle,
      scenario: `Reported by developers on ${
        issueSrc.sourceType === "stack_overflow"
          ? "Stack Overflow"
          : "GitHub Issues"
      } while integrating OAuth.`,
      likelyCause:
        "Configuration or SDK mismatch reported in community troubleshooting thread (single isolated report — verify against your SDK version).",
      causeConfidence:
        issueSrc.evidenceStrength === "B" ? "maintainer_confirmed" : "hypothesis",
      problemClassification: "sdk_framework_implementation",
      severity: "medium",
      evidenceIds: [issueSrc.id],
      independentReportCount: 1,
      recencyVersionNotes: `Observed in ${issueSrc.id} (single isolated report${
        issueSrc.publishedOrUpdatedAt
          ? `, dated ${issueSrc.publishedOrUpdatedAt}`
          : ""
      }).`,
      prevention:
        "Check your SDK version and verify your authorization parameters against the official documentation before deploying.",
      resolution: `Review the discussion and accepted solution in ${issueSrc.title} (${issueSrc.canonicalUrl}).`,
      impactOnGuide:
        "Surfaced from live developer community search to highlight real-world integration edge cases.",
    });
  }

  return {
    painPoints,
    conflictingEvidenceNotes,
    resolvedHistoricalNotes,
    isolatedReportCount,
    corroboratedPatternCount,
  };
}
