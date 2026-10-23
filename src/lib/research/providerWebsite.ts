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

/** Profile, store, and news hosts. A page here is about a company; it is not the company. */
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
  "pitchbook.com",
  "tracxn.com",
  "indexed.vc",
  "startupintros.com",
  "cbinsights.com",
  "wellfound.com",
  "angellist.com",
  "dealroom.co",
  "owler.com",
  "zoominfo.com",
  "craft.co",
  "similarweb.com",
  "alternativeto.net",
  "saashub.com",
  "f6s.com",
  "apple.com",
  "apps.apple.com",
  "techcrunch.com",
  "bloomberg.com",
  "forbes.com",
  "reuters.com",
  "theverge.com",
  "wired.com",
  "venturebeat.com",
  "businessinsider.com",
];

/** Safety ceiling so a long model reply cannot turn into an endless picker. */
const MAX_STARTUP_CHOICES = 12;

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

function websitesNamedIn(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.match(/https?:\/\/[^\s<>"')\]]+/gi) ?? []) {
    found.add(match.replace(/[.,;]+$/, ""));
  }
  for (const match of text.match(/\b(?:[a-z0-9-]+\.)+[a-z]{2,}\b/gi) ?? []) {
    found.add(`https://${match}`);
  }
  return Array.from(found);
}

function hostMatchesName(host: string, providerName: string): boolean {
  const compact = providerName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (compact.length < 3) return false;
  return host.split(".").some((label) => label.replace(/[^a-z0-9]/g, "") === compact);
}

function consider(
  url: string,
  title: string,
  snippet: string,
  providerName: string,
  sites: Map<string, ScoredSite>,
  hostMustMatchName = false
): void {
  const rawHost = hostOf(url);
  if (!rawHost || isDirectoryHost(rawHost)) return;
  const host = organizationHost(rawHost);
  if (!host || isDirectoryHost(host)) return;
  if (hostMustMatchName && !hostMatchesName(host, providerName)) return;
  const text = `${title} ${snippet} ${url}`;
  if (!mentionsName(text, rawHost, providerName) && !hostMatchesName(host, providerName)) return;

  let score = 2;
  try {
    const path = new URL(url).pathname;
    if (path === "/" || path === "") score += 2;
  } catch {
    // The host already parsed, so the path bonus is optional.
  }
  if (SITE_PREFIX.test(rawHost.split(".")[0] ?? "")) score += 1;

  const cleanTitle = title.trim() || providerName;
  const cleanSnippet = snippet.trim();
  const current = sites.get(host);
  if (!current) {
    sites.set(host, { host, score, bestHit: score, title: cleanTitle, snippet: cleanSnippet });
  } else {
    current.score += score;
    if (score > current.bestHit) {
      current.bestHit = score;
      current.title = cleanTitle;
      current.snippet = cleanSnippet;
    }
  }
}

export function resolveProviderWebsite(
  providerName: string,
  results: WebsiteCandidateResult[],
  options?: { askWhenClose?: boolean }
): WebsiteResolution {
  const sites = new Map<string, ScoredSite>();

  for (const result of results) {
    const rawHost = hostOf(result.url);
    const text = `${result.title} ${result.snippet} ${result.url}`;
    if (rawHost && isDirectoryHost(rawHost)) {
      // A Y Combinator or Wikipedia page is not the company. A website named in it is.
      for (const mentioned of websitesNamedIn(text)) {
        consider(mentioned, result.title, result.snippet, providerName, sites, true);
      }
      continue;
    }
    consider(result.url, result.title, result.snippet, providerName, sites);
  }

  const ranked = Array.from(sites.values()).sort((a, b) => b.score - a.score);
  if (ranked.length === 0) {
    return {
      status: "unconfirmed",
      detail: `No startup named "${providerName}" was found, so research did not start and no guide was saved.`,
    };
  }

  const leader = ranked[0];
  const runnerUp = ranked[1];
  const askWhenClose = options?.askWhenClose !== false;
  // The opening lookup asks whenever two companies share the name, even if one has more pages.
  // A later pass may keep the leader so a long research is not thrown away on a passing mention.
  const confirmLeader =
    ranked.length === 1 ||
    (!askWhenClose && !!runnerUp && leader.score > runnerUp.score);

  if (confirmLeader) {
    return {
      status: "confirmed",
      canonicalDomain: `https://${leader.host}`,
      detail: `Identified "${providerName}" (https://${leader.host}). This website came from search results.`,
    };
  }

  const shown = ranked.slice(0, MAX_STARTUP_CHOICES);
  const candidates: AmbiguityCandidate[] = shown.map((site) => ({
    id: site.host.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: mentionsName(site.title, site.host, providerName)
      ? site.title.slice(0, 80)
      : `${providerName} (${site.host})`,
    domain: site.host,
    description: (site.snippet || "This website appeared in search results for that name.").slice(0, 220),
  }));
  const count = ranked.length;

  return {
    status: "ambiguous",
    candidates,
    clarifyingQuestion:
      count > shown.length
        ? `"${providerName}" is used by ${count} startups. Here are ${shown.length}. Which one do you mean?`
        : `"${providerName}" is used by ${count} startups. Which one do you mean?`,
    detail: `"${providerName}" is used by ${count} startups, so no website was chosen.`,
  };
}
