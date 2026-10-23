import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Guide, validateGuide } from "@/lib/schema/guideSchema";
import { CURATED_GUIDES, CURATED_GUIDES_BY_SLUG } from "@/data/curated";
import { readUpstashConfig, upstashCommand, UpstashConfig } from "@/lib/persistence/upstash";

export interface FeedbackReport {
  id: string;
  guideSlug: string;
  issueType: "outdated_step" | "incorrect_scope" | "broken_source_link" | "new_pain_point" | "other";
  description: string;
  sourceUrl?: string;
  createdAt: string;
}

export interface GuideStore {
  getAllGuides(): Promise<Guide[]>;
  getGuideBySlug(slug: string): Promise<Guide | null>;
  saveGeneratedGuide(guide: Guide): Promise<{ saved: Guide; shareUrl: string }>;
  saveFeedbackReport(
    report: Omit<FeedbackReport, "id" | "createdAt">
  ): Promise<FeedbackReport>;
}

const DEFAULT_STORE_PATH = path.join(
  process.cwd(),
  "data",
  "runtime-generated-guides.json"
);

const DEFAULT_FEEDBACK_PATH = path.join(
  process.cwd(),
  "data",
  "runtime-feedback.json"
);

/** Read-only guides produced by real live-agent runs, shipped so a fresh copy has examples to open. */
const SAMPLE_LIVE_GUIDES_PATH = path.join(process.cwd(), "data", "sample-live-guides.json");

// In-memory write mutex to prevent concurrent request race conditions
let writeLockPromise: Promise<void> = Promise.resolve();

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLockPromise;
  let release!: () => void;
  writeLockPromise = new Promise<void>((res) => {
    release = res;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

export function createSlug(input: string): string {
  const cleaned = input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return cleaned || `guide-${crypto.randomBytes(4).toString("hex")}`;
}

export function createCollisionResistantSlug(
  applicationName: string,
  integrationGoal?: string
): string {
  const base = createSlug(applicationName);
  if (!integrationGoal || !integrationGoal.trim()) {
    return base;
  }
  const goalSlug = createSlug(integrationGoal).slice(0, 24);
  const hash = crypto
    .createHash("sha256")
    .update(`${base}:${integrationGoal.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 6);
  return `${base}-${goalSlug}-${hash}`.replace(/--+/g, "-").replace(/-$/g, "");
}

async function readGuideFile(filePath: string): Promise<Record<string, Guide>> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const validMap: Record<string, Guide> = {};

    for (const [slug, item] of Object.entries(parsed)) {
      const check = validateGuide(item);
      if (check.success && check.data) {
        validMap[slug] = check.data;
      }
    }
    return validMap;
  } catch {
    return {};
  }
}

function sortNewestFirst(guides: Guide[]): Guide[] {
  return guides.sort(
    (a, b) =>
      new Date(b.lastReviewedAt).getTime() -
      new Date(a.lastReviewedAt).getTime()
  );
}

function validateForSave(guide: Guide): Guide {
  const validation = validateGuide(guide);
  if (!validation.success || !validation.data) {
    throw new Error(
      `Cannot persist invalid guide: ${validation.errors?.join("; ")}`
    );
  }
  return validation.data;
}

export class FileGuideStore implements GuideStore {
  private filePath: string;
  private feedbackPath: string;
  private samplePath?: string;

  constructor(
    filePath: string = DEFAULT_STORE_PATH,
    feedbackPath: string = DEFAULT_FEEDBACK_PATH,
    samplePath?: string
  ) {
    this.filePath = filePath;
    this.feedbackPath = feedbackPath;
    this.samplePath = samplePath;
  }

  private async readGeneratedMap(): Promise<Record<string, Guide>> {
    return readGuideFile(this.filePath);
  }

  /** Newly generated guides win over a shipped sample with the same slug. */
  private async readVisibleMap(): Promise<Record<string, Guide>> {
    const samples = this.samplePath ? await readGuideFile(this.samplePath) : {};
    return { ...samples, ...(await this.readGeneratedMap()) };
  }

  async getAllGuides(): Promise<Guide[]> {
    const generatedMap = await this.readVisibleMap();
    return [...CURATED_GUIDES, ...sortNewestFirst(Object.values(generatedMap))];
  }

  async getGuideBySlug(slug: string): Promise<Guide | null> {
    const normalized = slug.toLowerCase().trim();
    if (CURATED_GUIDES_BY_SLUG[normalized]) {
      return CURATED_GUIDES_BY_SLUG[normalized];
    }
    const generatedMap = await this.readVisibleMap();
    return generatedMap[normalized] ?? null;
  }

  async saveGeneratedGuide(
    guide: Guide
  ): Promise<{ saved: Guide; shareUrl: string }> {
    const validGuide = validateForSave(guide);

    return withWriteLock(async () => {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
      const currentMap = await this.readGeneratedMap();
      currentMap[validGuide.slug] = validGuide;

      const tmpPath = `${this.filePath}.${crypto.randomBytes(4).toString("hex")}.tmp`;
      await fs.writeFile(tmpPath, JSON.stringify(currentMap, null, 2), "utf-8");
      await fs.rename(tmpPath, this.filePath);

      return {
        saved: validGuide,
        shareUrl: `/guides/${validGuide.slug}`,
      };
    });
  }

  async saveFeedbackReport(
    report: Omit<FeedbackReport, "id" | "createdAt">
  ): Promise<FeedbackReport> {
    return withWriteLock(async () => {
      const dir = path.dirname(this.feedbackPath);
      await fs.mkdir(dir, { recursive: true });
      let existing: FeedbackReport[] = [];
      try {
        const raw = await fs.readFile(this.feedbackPath, "utf-8");
        existing = JSON.parse(raw) as FeedbackReport[];
      } catch {
        existing = [];
      }
      const entry: FeedbackReport = {
        ...report,
        id: `fb-${crypto.randomBytes(6).toString("hex")}`,
        createdAt: new Date().toISOString(),
      };
      existing.push(entry);
      await fs.writeFile(
        this.feedbackPath,
        JSON.stringify(existing, null, 2),
        "utf-8"
      );
      return entry;
    });
  }
}

export class InMemoryGuideStore implements GuideStore {
  private generated: Map<string, Guide> = new Map();
  private feedback: FeedbackReport[] = [];
  private shouldFailOnSave: boolean = false;

  constructor(options?: { shouldFailOnSave?: boolean; initialGuides?: Guide[] }) {
    this.shouldFailOnSave = options?.shouldFailOnSave ?? false;
    if (options?.initialGuides) {
      for (const g of options.initialGuides) {
        this.generated.set(g.slug, g);
      }
    }
  }

  setFailOnSave(fail: boolean) {
    this.shouldFailOnSave = fail;
  }

  async getAllGuides(): Promise<Guide[]> {
    return [...CURATED_GUIDES, ...Array.from(this.generated.values())];
  }

  async getGuideBySlug(slug: string): Promise<Guide | null> {
    const normalized = slug.toLowerCase().trim();
    if (CURATED_GUIDES_BY_SLUG[normalized]) {
      return CURATED_GUIDES_BY_SLUG[normalized];
    }
    return this.generated.get(normalized) ?? null;
  }

  async saveGeneratedGuide(
    guide: Guide
  ): Promise<{ saved: Guide; shareUrl: string }> {
    if (this.shouldFailOnSave) {
      throw new Error("Persistence store write failed (simulated storage outage).");
    }
    const validation = validateGuide(guide);
    if (!validation.success || !validation.data) {
      throw new Error(
        `Cannot persist invalid guide: ${validation.errors?.join("; ")}`
      );
    }
    this.generated.set(validation.data.slug, validation.data);
    return {
      saved: validation.data,
      shareUrl: `/guides/${validation.data.slug}`,
    };
  }

  async saveFeedbackReport(
    report: Omit<FeedbackReport, "id" | "createdAt">
  ): Promise<FeedbackReport> {
    const entry: FeedbackReport = {
      ...report,
      id: `fb-${crypto.randomBytes(4).toString("hex")}`,
      createdAt: new Date().toISOString(),
    };
    this.feedback.push(entry);
    return entry;
  }
}

const UPSTASH_GUIDES_KEY = "authpath:guides";
const UPSTASH_FEEDBACK_KEY = "authpath:feedback";

/**
 * Hosted storage: guides live in one Redis hash (slug -> guide JSON) and feedback in a Redis list,
 * so they survive restarts on hosts whose disk is wiped on every deploy or sleep.
 */
export class UpstashGuideStore implements GuideStore {
  constructor(
    private config: UpstashConfig,
    private samplePath?: string
  ) {}

  private async readGeneratedMap(): Promise<Record<string, Guide>> {
    const flat = await upstashCommand<string[] | null>(this.config, [
      "HGETALL",
      UPSTASH_GUIDES_KEY,
    ]);
    const map: Record<string, Guide> = {};
    for (let i = 0; flat && i + 1 < flat.length; i += 2) {
      const guide = parseStoredGuide(flat[i + 1]);
      if (guide) map[flat[i]] = guide;
    }
    return map;
  }

  async getAllGuides(): Promise<Guide[]> {
    const samples = this.samplePath ? await readGuideFile(this.samplePath) : {};
    const visible = { ...samples, ...(await this.readGeneratedMap()) };
    return [...CURATED_GUIDES, ...sortNewestFirst(Object.values(visible))];
  }

  async getGuideBySlug(slug: string): Promise<Guide | null> {
    const normalized = slug.toLowerCase().trim();
    if (CURATED_GUIDES_BY_SLUG[normalized]) {
      return CURATED_GUIDES_BY_SLUG[normalized];
    }
    const stored = await upstashCommand<string | null>(this.config, [
      "HGET",
      UPSTASH_GUIDES_KEY,
      normalized,
    ]);
    const guide = stored ? parseStoredGuide(stored) : null;
    if (guide) return guide;
    const samples = this.samplePath ? await readGuideFile(this.samplePath) : {};
    return samples[normalized] ?? null;
  }

  async saveGeneratedGuide(
    guide: Guide
  ): Promise<{ saved: Guide; shareUrl: string }> {
    const validGuide = validateForSave(guide);
    await upstashCommand(this.config, [
      "HSET",
      UPSTASH_GUIDES_KEY,
      validGuide.slug,
      JSON.stringify(validGuide),
    ]);
    return { saved: validGuide, shareUrl: `/guides/${validGuide.slug}` };
  }

  async saveFeedbackReport(
    report: Omit<FeedbackReport, "id" | "createdAt">
  ): Promise<FeedbackReport> {
    const entry: FeedbackReport = {
      ...report,
      id: `fb-${crypto.randomBytes(6).toString("hex")}`,
      createdAt: new Date().toISOString(),
    };
    await upstashCommand(this.config, ["RPUSH", UPSTASH_FEEDBACK_KEY, JSON.stringify(entry)]);
    return entry;
  }
}

function parseStoredGuide(raw: string): Guide | null {
  try {
    const check = validateGuide(JSON.parse(raw));
    return check.success && check.data ? check.data : null;
  } catch {
    return null;
  }
}

let defaultStoreInstance: GuideStore | null = null;

export function getGuideStore(): GuideStore {
  if (!defaultStoreInstance) {
    const provider = (process.env.AUTHPATH_STORAGE_PROVIDER ?? "file").trim().toLowerCase();
    if (provider === "upstash") {
      const config = readUpstashConfig();
      if (!config) {
        throw new Error(
          "AUTHPATH_STORAGE_PROVIDER is \"upstash\" but UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set."
        );
      }
      defaultStoreInstance = new UpstashGuideStore(config, SAMPLE_LIVE_GUIDES_PATH);
    } else {
      defaultStoreInstance = new FileGuideStore(
        DEFAULT_STORE_PATH,
        DEFAULT_FEEDBACK_PATH,
        SAMPLE_LIVE_GUIDES_PATH
      );
    }
  }
  return defaultStoreInstance;
}
