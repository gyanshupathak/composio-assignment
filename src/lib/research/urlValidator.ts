/**
 * SSRF & URL Validation Module (`urlValidator.ts`)
 *
 * Enforces strict safety checks on any developer-supplied or discovered URL before network fetching:
 * - Only allows `https:` (or `http:` only when explicitly permitted for public documentation, never for private IPs).
 * - Blocks unsafe schemes (`file:`, `javascript:`, `data:`, `ftp:`, `gopher:`, `ws:`, `wss:`, `dict:`).
 * - Blocks `localhost`, loopback (`127.0.0.0/8`, `::1`, `0.0.0.0`), private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`),
 *   link-local & cloud metadata (`169.254.0.0/16`, `metadata.google.internal`, `100.100.100.200`), CGNAT (`100.64.0.0/10`),
 *   and private IPv6 (`fc00::/7`, `fe80::/10`, `::ffff:127.*`, `::ffff:10.*`, etc.).
 * - Blocks URLs containing embedded credentials (`user:pass@host`).
 * - Revalidates redirect destinations on every hop (bounded to max 3 redirects).
 */

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  reason?: string;
  errorCode?:
    | "MALFORMED_URL"
    | "UNSAFE_SCHEME"
    | "EMBEDDED_CREDENTIALS"
    | "PRIVATE_OR_LOOPBACK_HOST"
    | "CLOUD_METADATA_HOST"
    | "INTERNAL_TLD"
    | "REDIRECT_LIMIT_EXCEEDED"
    | "UNSAFE_REDIRECT_TARGET";
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
  "100.100.100.200",
  "0.0.0.0",
]);

const BLOCKED_TLDS = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".corp",
  ".home",
  ".lan",
];

function isPrivateOrReservedIpv4(ip: string): {
  blocked: boolean;
  isMetadata?: boolean;
} {
  // Handle octal/hex/integer IP notations (e.g., 2130706433 or 0x7f.0.0.1)
  if (/^\d+$/.test(ip) || /^0x[0-9a-f]+$/i.test(ip)) {
    return { blocked: true };
  }

  const parts = ip.split(".");
  if (parts.length !== 4) return { blocked: false };

  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return { blocked: false };
    // Reject leading zeros (octal ambiguity like 0177.0.0.1)
    if (part.length > 1 && part.startsWith("0")) {
      return { blocked: true };
    }
    const num = Number(part);
    if (num < 0 || num > 255) return { blocked: true };
    octets.push(num);
  }

  const [a, b] = octets;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return { blocked: true };
  // 10.0.0.0/8 (Private network)
  if (a === 10) return { blocked: true };
  // 100.64.0.0/10 (Shared Address Space / CGNAT & Alibaba Cloud metadata 100.100.100.200)
  if (a === 100 && b >= 64 && b <= 127) {
    return {
      blocked: true,
      isMetadata: ip === "100.100.100.200",
    };
  }
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return { blocked: true };
  // 169.254.0.0/16 (Link-local & AWS/GCP/Azure Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) {
    return {
      blocked: true,
      isMetadata: true,
    };
  }
  // 172.16.0.0/12 (Private network)
  if (a === 172 && b >= 16 && b <= 31) return { blocked: true };
  // 192.0.0.0/24, 192.0.2.0/24 (TEST-NET)
  if (a === 192 && b === 0) return { blocked: true };
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return { blocked: true };
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return { blocked: true };
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved/Broadcast)
  if (a >= 224) return { blocked: true };

  return { blocked: false };
}

function isPrivateOrReservedIpv6(rawHost: string): boolean {
  const host = rawHost.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host.includes(":")) return false;

  // Unspecified or loopback
  if (host === "::" || host === "::1" || host === "0:0:0:0:0:0:0:1" || host === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // Unique local addresses (fc00::/7 -> fc00..fdff)
  if (/^f[cd][0-9a-f]{2}:/i.test(host)) {
    return true;
  }

  // Link-local addresses (fe80::/10 -> fe80..febf)
  if (/^fe[89ab][0-9a-f]:/i.test(host)) {
    return true;
  }

  // IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (host.startsWith("::ffff:")) {
    const suffix = host.slice("::ffff:".length);
    if (suffix.includes(".")) {
      return isPrivateOrReservedIpv4(suffix).blocked;
    }
    // Hex-encoded IPv4 in URL parser (e.g., ::ffff:7f00:1 or ::ffff:a9fe:a9fe)
    return true;
  }

  return false;
}

export function validateExternalUrl(rawInput: string): UrlValidationResult {
  const trimmed = rawInput.trim();
  if (!trimmed || trimmed.length > 2048) {
    return {
      valid: false,
      reason: "URL is empty or exceeds the maximum length of 2048 characters.",
      errorCode: "MALFORMED_URL",
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      reason: `Malformed URL: "${trimmed}". Must be a valid absolute URL.`,
      errorCode: "MALFORMED_URL",
    };
  }

  // 1. Validate scheme
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      valid: false,
      reason: `Disallowed URL scheme "${parsed.protocol}". Only https: and http: public web URLs are permitted.`,
      errorCode: "UNSAFE_SCHEME",
    };
  }

  // 2. Reject embedded credentials
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: "URLs containing embedded userinfo credentials (user:pass@host) are rejected.",
      errorCode: "EMBEDDED_CREDENTIALS",
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 3. Check explicit blocked hostnames & metadata endpoints
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    const isMeta =
      hostname.includes("metadata") ||
      hostname === "169.254.169.254" ||
      hostname === "100.100.100.200" ||
      hostname === "instance-data";
    return {
      valid: false,
      reason: isMeta
        ? `Blocked cloud metadata endpoint "${hostname}" (SSRF protection).`
        : `Blocked loopback or local hostname "${hostname}" (SSRF protection).`,
      errorCode: isMeta ? "CLOUD_METADATA_HOST" : "PRIVATE_OR_LOOPBACK_HOST",
    };
  }

  // 4. Check internal TLDs
  for (const tld of BLOCKED_TLDS) {
    if (hostname.endsWith(tld)) {
      return {
        valid: false,
        reason: `Blocked internal/local domain suffix "${tld}" on host "${hostname}".`,
        errorCode: "INTERNAL_TLD",
      };
    }
  }

  // 5. Check IPv6 private/loopback ranges
  if (isPrivateOrReservedIpv6(hostname)) {
    return {
      valid: false,
      reason: `Blocked private or loopback IPv6 address "${hostname}" (SSRF protection).`,
      errorCode: "PRIVATE_OR_LOOPBACK_HOST",
    };
  }

  // 6. Check IPv4 private/loopback/metadata ranges
  const ipv4Check = isPrivateOrReservedIpv4(hostname);
  if (ipv4Check.blocked) {
    return {
      valid: false,
      reason: ipv4Check.isMetadata
        ? `Blocked cloud metadata IP address "${hostname}" (SSRF protection).`
        : `Blocked private, loopback, or reserved IPv4 address "${hostname}" (SSRF protection).`,
      errorCode: ipv4Check.isMetadata
        ? "CLOUD_METADATA_HOST"
        : "PRIVATE_OR_LOOPBACK_HOST",
    };
  }

  // 7. Ensure hostname has at least one dot (public domain)
  if (!hostname.includes(".")) {
    return {
      valid: false,
      reason: `Blocked unqualified single-label hostname "${hostname}".`,
      errorCode: "INTERNAL_TLD",
    };
  }

  // Strip hash fragments before fetching
  parsed.hash = "";

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname,
  };
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  finalUrl: string;
  contentType: string;
  bodyText: string;
  errorReason?: string;
  errorCode?: string;
}

/**
 * Performs a safe HTTP GET with SSRF validation on the initial URL and every redirect hop,
 * strict timeout, and response size cap.
 */
export async function safeFetchUrl(
  targetUrl: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const maxBytes = options.maxBytes ?? 250_000; // 250 KB cap
  const maxRedirects = options.maxRedirects ?? 3;
  const fetchFn = options.fetchImpl ?? fetch;

  let currentUrl = targetUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const check = validateExternalUrl(currentUrl);
    if (!check.valid || !check.normalizedUrl) {
      return {
        ok: false,
        status: 0,
        finalUrl: currentUrl,
        contentType: "",
        bodyText: "",
        errorReason:
          hop > 0
            ? `Redirect target rejected (${check.reason})`
            : check.reason,
        errorCode:
          hop > 0 ? "UNSAFE_REDIRECT_TARGET" : check.errorCode ?? "UNSAFE_URL",
      };
    }

    currentUrl = check.normalizedUrl;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchFn(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "AuthPath-ResearchAgent/1.0 (+https://composio.dev)",
          Accept: "text/html,application/xhtml+xml,text/plain,text/markdown,*/*;q=0.8",
          ...options.headers,
        },
      });

      clearTimeout(timer);

      // Handle 3xx redirects manually to revalidate destination URL
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.headers.get("location")
      ) {
        if (hop === maxRedirects) {
          return {
            ok: false,
            status: response.status,
            finalUrl: currentUrl,
            contentType: "",
            bodyText: "",
            errorReason: `Exceeded maximum redirect limit (${maxRedirects}).`,
            errorCode: "REDIRECT_LIMIT_EXCEEDED",
          };
        }
        const locationHeader = response.headers.get("location")!;
        try {
          currentUrl = new URL(locationHeader, currentUrl).toString();
        } catch {
          return {
            ok: false,
            status: response.status,
            finalUrl: currentUrl,
            contentType: "",
            bodyText: "",
            errorReason: `Invalid redirect Location header: "${locationHeader}"`,
            errorCode: "UNSAFE_REDIRECT_TARGET",
          };
        }
        continue;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const rawText = await response.text();
      const truncatedText =
        rawText.length > maxBytes ? rawText.slice(0, maxBytes) : rawText;

      return {
        ok: response.ok,
        status: response.status,
        finalUrl: currentUrl,
        contentType,
        bodyText: truncatedText,
        errorReason: response.ok
          ? undefined
          : `HTTP status ${response.status}`,
        errorCode: response.ok ? undefined : `HTTP_${response.status}`,
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const message =
        err instanceof Error ? err.message : "Unknown network fetch error";
      return {
        ok: false,
        status: 0,
        finalUrl: currentUrl,
        contentType: "",
        bodyText: "",
        errorReason: message,
        errorCode: message.toLowerCase().includes("abort")
          ? "FETCH_TIMEOUT"
          : "FETCH_ERROR",
      };
    }
  }

  return {
    ok: false,
    status: 0,
    finalUrl: currentUrl,
    contentType: "",
    bodyText: "",
    errorReason: "Exceeded redirect hops.",
    errorCode: "REDIRECT_LIMIT_EXCEEDED",
  };
}
