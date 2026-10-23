/**
 * Minimal client for the Upstash Redis REST API (https://upstash.com/docs/redis/features/restapi).
 * Plain fetch, so the hosted app needs no extra database driver.
 */

export interface UpstashConfig {
  url: string;
  token: string;
}

function isRealValue(value: string | undefined): value is string {
  return Boolean(value && value.trim() && !/^your_.*_here$/i.test(value.trim()));
}

export function readUpstashConfig(
  env: Record<string, string | undefined> = process.env
): UpstashConfig | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!isRealValue(url) || !isRealValue(token)) return null;
  return { url: url.trim().replace(/\/+$/, ""), token: token.trim() };
}

export async function upstashCommand<T = unknown>(
  config: UpstashConfig,
  command: (string | number)[]
): Promise<T> {
  const res = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { result?: T; error?: string };
  if (!res.ok || data.error) {
    throw new Error(
      `Database request ${String(command[0])} failed (${res.status}${data.error ? `: ${data.error}` : ""}).`
    );
  }
  return data.result as T;
}
