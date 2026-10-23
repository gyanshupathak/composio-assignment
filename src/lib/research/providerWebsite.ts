import { AmbiguityCandidate } from "@/lib/research/providerIdentifier";

/**
 * Picks a company's website from search results.
 * A name is never turned into name.com. A website is used only when search
 * results point at it, and two competing websites produce a question instead of a guess.
 */

export interface WebsiteCandidateResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebsiteResolution {
  status: "confirmed" | "ambiguous" | "unconfirmed";
  canonicalDomain?: string;
  candidates?: AmbiguityCandidate[];
  clarifyingQuestion?: string;
  detail: string;
}

const DIRECTORY_HOSTS = [
  "wikipedia.org",
  "github.com",
  "gitlab.com",
  "linkedin.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "reddit.com",
  "medium.com",
  "crunchbase.com",
  "ycombinator.com",
  "producthunt.com",
  "g2.com",
  "capterra.com",
  "stackoverflow.com",
  "stackexchange.com",
  "facebook.com",
  "instagram.com",
  "composio.dev",
  "npmjs.com",
  "pypi.org",
  "google.com",
  "bing.com",
  "duckduckgo.com",
];

/** Hosts where each customer gets a subdomain, so the parent is not the company. */
const SHARED_PARENTS = new Set([
  "example.com",
  "github.io",
  "vercel.app",
  "netlify.app",
  "pages.dev",
  "herokuapp.com",
  "onrender.com",
  "wordpress.com",
  "wixsite.com",
  "webflow.io",
  "notion.site",
]);

const MULTI_PART_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "com.au",
  "co.in",
  "com.br",
  "co.jp",
  "com.mx",
  "co.nz",
  "com.sg",
  "co.za",
]);

const SITE_PREFIX = /^(docs|developer|developers|api|dev)$/;

export function organizationHost(hostname: string): string {
  const host = hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  const labels = host.split(".").filter(Boolean);
  if (labels.length <= 2) return host;
  if (SITE_PREFIX.test(labels[0])) {
    return organizationHost(labels.slice(1).join("."));
  }
  const last2 = labels.slice(-2).join(".");
  const last3 = labels.slice(-3).join(".");
  if (SHARED_PARENTS.has(last2) || SHARED_PARENTS.has(last3)) return host;
  if (MULTI_PART_SUFFIXES.has(last2) && labels.length >= 3) {
    return labels.slice(-3).join(".");
  }
  return last2;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isDirectoryHost(host: string): boolean {
  return DIRECTORY_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

function mentionsName(text: string, host: string, providerName: string): boolean {
  const name = providerName.trim().toLowerCase();
  if (name.length < 3) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${escaped}\\b`, "i").test(text)) return true;
  const compact = name.replace(/[^a-z0-9]/g, "");
  if (compact.length < 4) return false;
  return host.split(".").some((label) => label.replace(/[^a-z0-9]/g, "") === compact);
}

interface ScoredSite {
  host: string;
  score: number;
  bestHit: number;
  title: string;
  snippet: string;
}

export function resolveProviderWebsite(
  providerName: string,
  results: WebsiteCandidateResult[],
  options?: { askWhenClose?: boolean }
): WebsiteResolution {
  const sites = new Map<string, ScoredSite>();

  for (const result of results) {
    const rawHost = hostOf(result.url);
    if (!rawHost || isDirectoryHost(rawHost)) continue;
    const host = organizationHost(rawHost);
    if (!host || isDirectoryHost(host)) continue;
    const text = `${result.title} ${result.snippet} ${result.url}`;
    if (!mentionsName(text, rawHost, providerName)) continue;

    let score = 2;
    try {
      const path = new URL(result.url).pathname;
      if (path === "/" || path === "") score += 2;
    } catch {
      // The host already parsed, so the path bonus is optional.
    }
    if (SITE_PREFIX.test(rawHost.split(".")[0] ?? "")) score += 1;

    const title = result.title.trim() || providerName;
    const snippet = result.snippet.trim();
    const current = sites.get(host);
    if (!current) {
      sites.set(host, { host, score, bestHit: score, title, snippet });
    } else {
      current.score += score;
      if (score > current.bestHit) {
        current.bestHit = score;
        current.title = title;
        current.snippet = snippet;
      }
    }
  }

  const ranked = Array.from(sites.values()).sort((a, b) => b.score - a.score);
  if (ranked.length === 0) {
    return {
      status: "unconfirmed",
      detail: `No single official website was found for "${providerName}", so research continues from the name only.`,
    };
  }

  const leader = ranked[0];
  const runnerUp = ranked[1];
  const askWhenClose = options?.askWhenClose !== false;
  const clearLeader =
    !runnerUp ||
    (askWhenClose
      ? leader.score >= runnerUp.score + 3
      : leader.score > runnerUp.score);

  if (ranked.length === 1 || clearLeader) {
    return {
      status: "confirmed",
      canonicalDomain: `https://${leader.host}`,
      detail: `Identified "${providerName}" (https://${leader.host}). This website came from search results.`,
    };
  }

  const candidates: AmbiguityCandidate[] = ranked.slice(0, 4).map((site) => ({
    id: site.host.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: mentionsName(site.title, site.host, providerName)
      ? site.title.slice(0, 80)
      : `${providerName} (${site.host})`,
    domain: site.host,
    description: (site.snippet || "This website appeared in search results for that name.").slice(0, 180),
  }));

  return {
    status: "ambiguous",
    candidates,
    clarifyingQuestion: `"${providerName}" matches more than one website. Which one do you mean?`,
    detail: `"${providerName}" matches ${candidates.length} websites, so no website was chosen.`,
  };
}
