import { readUpstashConfig, upstashCommand, UpstashConfig } from "@/lib/persistence/upstash";

/**
 * Daily cap on new live researches, so a public demo cannot drain the shared AI budget.
 * Off unless LIVE_RESEARCH_DAILY_LIMIT is a positive number. Days roll over at midnight UTC.
 */

export interface DailyLimitDecision {
  allowed: boolean;
  limit: number | null;
  used: number;
  message?: string;
}

export function readDailyLimit(
  env: Record<string, string | undefined> = process.env
): number | null {
  const parsed = Number.parseInt(env.LIVE_RESEARCH_DAILY_LIMIT ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const memoryCounts = new Map<string, number>();

function dayKey(now: Date): string {
  return `authpath:live-research:${now.toISOString().slice(0, 10)}`;
}

async function incrementCount(key: string, config: UpstashConfig | null): Promise<number> {
  if (config) {
    try {
      const count = await upstashCommand<number>(config, ["INCR", key]);
      if (count === 1) {
        await upstashCommand(config, ["EXPIRE", key, 2 * 24 * 60 * 60]);
      }
      return count;
    } catch {
      // Fall through: a per-server count still bounds spending while the database is unreachable.
    }
  }
  const next = (memoryCounts.get(key) ?? 0) + 1;
  memoryCounts.set(key, next);
  return next;
}

export async function reserveLiveResearchSlot(options?: {
  now?: Date;
  env?: Record<string, string | undefined>;
}): Promise<DailyLimitDecision> {
  const env = options?.env ?? process.env;
  const limit = readDailyLimit(env);
  if (limit === null) return { allowed: true, limit: null, used: 0 };

  const used = await incrementCount(dayKey(options?.now ?? new Date()), readUpstashConfig(env));
  if (used <= limit) return { allowed: true, limit, used };

  return {
    allowed: false,
    limit,
    used: limit,
    message: `Today's limit of ${limit} new live research${
      limit === 1 ? "" : "es"
    } has been reached. It keeps this free demo within its AI budget. Every guide already listed still opens normally, and the limit resets at midnight UTC.`,
  };
}

export function resetDailyLimitMemoryForTests(): void {
  memoryCounts.clear();
}
