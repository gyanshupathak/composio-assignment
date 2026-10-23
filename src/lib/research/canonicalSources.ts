import {
  EvidenceStrengthSchema,
  RetrievalStatusSchema,
  SourceTypeSchema,
} from "@/lib/schema/guideSchema";
import { z } from "zod";

export type SourceType = z.infer<typeof SourceTypeSchema>;
export type RetrievalStatus = z.infer<typeof RetrievalStatusSchema>;
export type EvidenceStrength = z.infer<typeof EvidenceStrengthSchema>;

export interface RawDiscoveredSource {
  title: string;
  url: string;
  snippet: string;
  extractedContent?: string;
  publishedDate?: string;
  retrievalStatus?: RetrievalStatus;
  /** How this source was obtained, shown as its limitation (e.g. read via search summary only). */
  note?: string;
}

export interface CanonicalSourceRecord {
  id: string;
  title: string;
  canonicalUrl: string;
  publisherDomain: string;
  sourceType: SourceType;
  retrievalStatus: RetrievalStatus;
  retrievedAt: string;
  publishedOrUpdatedAt?: string;
  snippet: string;
  extractedContent: string;
  evidenceStrength: EvidenceStrength;
  isIndependentReport: boolean;
  duplicateOfId?: string;
  sanitizedForPromptInjection: boolean;
  promptInjectionDetected: boolean;
  limitations: string;
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "ref",
  "source",
]);

export function canonicalizeSourceUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    // Remove trailing slash except for root path
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function classifySourceDomainAndType(
  url: string,
  providerDomain?: string
): {
  publisherDomain: string;
  sourceType: SourceType;
  defaultStrength: EvidenceStrength;
} {
  let hostname = "unknown";
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    hostname = "unknown";
  }

  const normalizedProviderHost = providerDomain
    ? (() => {
        try {
          return new URL(
            providerDomain.startsWith("http")
              ? providerDomain
              : `https://${providerDomain}`
          ).hostname
            .toLowerCase()
            .replace(/^www\./, "");
        } catch {
          return providerDomain.toLowerCase().replace(/^www\./, "");
        }
      })()
    : "";

  if (hostname.endsWith("composio.dev")) {
    return {
      publisherDomain: hostname,
      sourceType: "composio_docs",
      defaultStrength: "A",
    };
  }

  if (
    (normalizedProviderHost &&
      (hostname === normalizedProviderHost ||
        hostname.endsWith(`.${normalizedProviderHost}`))) ||
    hostname.startsWith("docs.") ||
    hostname.startsWith("developers.") ||
    hostname.startsWith("api.") ||
    hostname.endsWith(".dev")
  ) {
    // Distinguish third-party integration platforms from primary provider docs
    if (
      hostname.includes("unified.to") ||
      hostname.includes("nango.dev") ||
      hostname.includes("vectle.com") ||
      hostname.includes("unipile.com")
    ) {
      return {
        publisherDomain: hostname,
        sourceType: "third_party_docs",
        defaultStrength: "C",
      };
    }
    return {
      publisherDomain: hostname,
      sourceType: "official_docs",
      defaultStrength: "A",
    };
  }

  if (hostname === "github.com") {
    if (url.includes("/issues/") || url.includes("/discussions/") || url.includes("/pull/")) {
      return {
        publisherDomain: hostname,
        sourceType: "github_issue",
        defaultStrength: "B",
      };
    }
    return {
      publisherDomain: hostname,
      sourceType: "github_repo",
      defaultStrength: "B",
    };
  }

  if (hostname.includes("stackoverflow.com") || hostname.includes("stackexchange.com")) {
    return {
      publisherDomain: hostname,
      sourceType: "stack_overflow",
      defaultStrength: "C",
    };
  }

  if (hostname.includes("reddit.com")) {
    return {
      publisherDomain: hostname,
      sourceType: "reddit",
      defaultStrength: "C",
    };
  }

  if (
    hostname.includes("community.") ||
    hostname.includes("forum.") ||
    hostname.includes("discuss.")
  ) {
    return {
      publisherDomain: hostname,
      sourceType: "developer_forum",
      defaultStrength: "C",
    };
  }

  return {
    publisherDomain: hostname,
    sourceType: "third_party_docs",
    defaultStrength: "C",
  };
}

function normalizeContentFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

/**
 * Deduplicates discovered sources by canonical URL and near-identical content fingerprints
 * (e.g., scraped Stack Overflow mirrors or cross-posted GitHub issues).
 */
export function deduplicateAndCatalogSources(
  rawSources: RawDiscoveredSource[],
  providerSlug: string,
  providerDomain?: string,
  sanitizeFn?: (text: string) => { sanitizedText: string; injectionDetected: boolean }
): CanonicalSourceRecord[] {
  const seenUrls = new Map<string, string>();
  const seenFingerprints = new Map<string, string>();
  const records: CanonicalSourceRecord[] = [];
  const today = new Date().toISOString().slice(0, 10);

  let counter = 1;

  for (const raw of rawSources) {
    const canonicalUrl = canonicalizeSourceUrl(raw.url);
    if (seenUrls.has(canonicalUrl)) {
      continue;
    }

    const id = `SRC-${providerSlug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)}-${String(counter).padStart(2, "0")}`;
    seenUrls.set(canonicalUrl, id);

    const sanitize =
      sanitizeFn ??
      ((t: string) => ({ sanitizedText: t, injectionDetected: false }));

    const sanitizedTitle = sanitize(raw.title);
    const sanitizedSnippet = sanitize(raw.snippet);
    const sanitizedExtracted = sanitize(raw.extractedContent ?? "");
    const anyInjection =
      sanitizedTitle.injectionDetected ||
      sanitizedSnippet.injectionDetected ||
      sanitizedExtracted.injectionDetected;

    const fingerprint = normalizeContentFingerprint(
      raw.extractedContent || raw.snippet || raw.title
    );
    let duplicateOfId: string | undefined;
    if (fingerprint.length > 50 && seenFingerprints.has(fingerprint)) {
      duplicateOfId = seenFingerprints.get(fingerprint);
    } else if (fingerprint.length > 50) {
      seenFingerprints.set(fingerprint, id);
    }

    const { publisherDomain, sourceType, defaultStrength } =
      classifySourceDomainAndType(canonicalUrl, providerDomain);

    const isIndependentReport = !duplicateOfId;
    const strength: EvidenceStrength = duplicateOfId
      ? "D"
      : raw.retrievalStatus === "http_error" || raw.retrievalStatus === "unreachable"
      ? "E"
      : defaultStrength;

    records.push({
      id,
      title: sanitizedTitle.sanitizedText.trim() || canonicalUrl,
      canonicalUrl,
      publisherDomain,
      sourceType,
      retrievalStatus: raw.retrievalStatus ?? "retrieved_200",
      retrievedAt: today,
      publishedOrUpdatedAt: raw.publishedDate,
      snippet: sanitizedSnippet.sanitizedText.trim(),
      extractedContent: sanitizedExtracted.sanitizedText,
      evidenceStrength: strength,
      isIndependentReport,
      duplicateOfId,
      sanitizedForPromptInjection: true,
      promptInjectionDetected: anyInjection,
      limitations: duplicateOfId
        ? `Cross-post or mirror of ${duplicateOfId}; not counted as an independent corroboration.`
        : anyInjection
        ? "Adversarial prompt-injection instructions were detected and stripped from this untrusted web source."
        : raw.note
        ? raw.note
        : raw.retrievalStatus && raw.retrievalStatus !== "retrieved_200"
        ? `Retrieval status: ${raw.retrievalStatus}.`
        : "Retrieved and verified.",
    });

    counter++;
  }

  return records;
}
