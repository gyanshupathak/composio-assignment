import { NextRequest, NextResponse } from "next/server";
import { getGuideStore } from "@/lib/persistence/guideStore";
import { searchGuidesLibrary } from "@/lib/research/providerIdentifier";
import { getRuntimeConfigStatus } from "@/lib/research/agentOrchestrator";
import { IntendedAudienceSchema } from "@/lib/schema/guideSchema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const goal = searchParams.get("goal") ?? undefined;
    const rawAudience = searchParams.get("audience") ?? undefined;

    const parsedAudience = IntendedAudienceSchema.safeParse(rawAudience);
    const audience = parsedAudience.success ? parsedAudience.data : undefined;

    const store = getGuideStore();
    const allGuides = await store.getAllGuides();
    const outcome = searchGuidesLibrary(q, allGuides, goal, audience);

    return NextResponse.json({
      ok: true,
      ...outcome,
      allGuidesCount: allGuides.length,
      runtimeConfigStatus: getRuntimeConfigStatus(),
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to query guide library";
    return NextResponse.json(
      { ok: false, errorMessage: message },
      { status: 500 }
    );
  }
}
