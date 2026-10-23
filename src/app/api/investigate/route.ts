import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  runLiveInvestigation,
  ResearchRuntimeDeps,
  ResearchStageEvent,
} from "@/lib/research/agentOrchestrator";
import {
  DeterministicFixturePageExtractor,
  DeterministicFixtureSearchProvider,
} from "@/lib/research/evalFixtures";
import { TavilyWebSearchProvider } from "@/lib/research/webSearch";
import { LiveSafePageExtractor } from "@/lib/research/sourceExtractor";
import { OpenAICompatibleModelProvider } from "@/lib/research/modelProvider";
import { IntendedAudienceSchema } from "@/lib/schema/guideSchema";
import { reserveLiveResearchSlot } from "@/lib/persistence/dailyLimit";

export const dynamic = "force-dynamic";

const InvestigateRequestBodySchema = z.object({
  query: z.string(),
  integrationGoal: z.string().max(500).optional(),
  intendedAudience: IntendedAudienceSchema.optional(),
  forceFreshResearch: z.boolean().optional(),
  useAuditedFixture: z.boolean().optional(),
  stream: z.boolean().optional(),
});

type InvestigationResult = Awaited<ReturnType<typeof runLiveInvestigation>>;
type StageListener = (event: ResearchStageEvent) => void;

// A deep investigation makes ~11 model calls over several minutes, so cap parallel runs per server
// and let identical requests share one run instead of paying for it twice.
const MAX_PARALLEL_INVESTIGATIONS = 3;
const running = new Map<
  string,
  { result: Promise<InvestigationResult>; listeners: Set<StageListener> }
>();

function joinOrStartInvestigation(
  key: string,
  start: (onStage: StageListener) => Promise<InvestigationResult>,
  listener?: StageListener
): Promise<InvestigationResult> | null {
  const existing = running.get(key);
  if (existing) {
    if (listener) existing.listeners.add(listener);
    return existing.result.finally(() => {
      if (listener) existing.listeners.delete(listener);
    });
  }
  if (running.size >= MAX_PARALLEL_INVESTIGATIONS) return null;

  const listeners = new Set<StageListener>(listener ? [listener] : []);
  const result = start((event) => listeners.forEach((l) => l(event))).finally(() =>
    running.delete(key)
  );
  running.set(key, { result, listeners });
  return result;
}

const BUSY_RESPONSE = {
  status: "research_failed",
  errorMessage:
    "AuthPath is already running several investigations. Please try again in a few minutes.",
  stages: [],
};

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsed = InvestigateRequestBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          status: "invalid_input",
          errorMessage: "Malformed investigation request payload.",
          stages: [],
        },
        { status: 400 }
      );
    }

    const {
      query,
      integrationGoal,
      intendedAudience,
      forceFreshResearch,
      useAuditedFixture,
      stream,
    } = parsed.data;

    const deps: ResearchRuntimeDeps = useAuditedFixture
      ? {
          searchProvider: new DeterministicFixtureSearchProvider(),
          pageExtractor: new DeterministicFixturePageExtractor(),
          modelProvider: new OpenAICompatibleModelProvider({ apiKey: "" }),
        }
      : {
          searchProvider: new TavilyWebSearchProvider({ allowPublicFallback: true }),
          pageExtractor: new LiveSafePageExtractor(),
          modelProvider: new OpenAICompatibleModelProvider({ labelUnwrittenOutline: true }),
          reserveLiveResearch: () => reserveLiveResearchSlot(),
        };

    const investigation = {
      query,
      integrationGoal,
      intendedAudience,
      forceFreshResearch,
    };
    const runKey = JSON.stringify([
      query.trim().toLowerCase(),
      (integrationGoal ?? "").trim().toLowerCase(),
      intendedAudience ?? "",
      Boolean(useAuditedFixture),
      Boolean(forceFreshResearch),
    ]);
    const start = (onStage: StageListener) =>
      runLiveInvestigation(investigation, { ...deps, onStage });

    if (!running.has(runKey) && running.size >= MAX_PARALLEL_INVESTIGATIONS) {
      return NextResponse.json(BUSY_RESPONSE, { status: 429 });
    }

    // Streaming mode sends each real stage event as it happens (newline-delimited JSON),
    // then the final result, so the UI never shows progress that did not occur.
    if (stream) {
      const encoder = new TextEncoder();
      const body = new ReadableStream<Uint8Array>({
        async start(controller) {
          const send = (payload: unknown) => {
            try {
              controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));
            } catch {
              // The browser went away; the investigation keeps running and is still saved.
            }
          };
          try {
            const pending = joinOrStartInvestigation(runKey, start, (event) =>
              send({ type: "stage", event })
            );
            send({ type: "result", result: pending ? await pending : BUSY_RESPONSE });
          } catch (err: unknown) {
            send({
              type: "result",
              result: {
                status: "research_failed",
                errorMessage:
                  err instanceof Error ? err.message : "Unexpected investigation error",
                stages: [],
              },
            });
          } finally {
            try {
              controller.close();
            } catch {
              // Already closed by a disconnected client.
            }
          }
        },
      });
      return new Response(body, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    const pending = joinOrStartInvestigation(runKey, start);
    if (!pending) {
      return NextResponse.json(BUSY_RESPONSE, { status: 429 });
    }
    const result = await pending;

    const statusCode =
      result.status === "invalid_input" ||
      result.status === "unsafe_url_rejected"
        ? 400
        : result.status === "daily_limit_reached"
        ? 429
        : result.status === "unconfigured_runtime"
        ? 503
        : result.status === "research_failed"
        ? 502
        : 200;

    return NextResponse.json(result, { status: statusCode });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unexpected investigation error";
    return NextResponse.json(
      {
        status: "research_failed",
        errorMessage: message,
        stages: [],
      },
      { status: 500 }
    );
  }
}
