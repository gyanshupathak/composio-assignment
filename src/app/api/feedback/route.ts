import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getGuideStore } from "@/lib/persistence/guideStore";

export const dynamic = "force-dynamic";

const FeedbackBodySchema = z.object({
  guideSlug: z.string().min(1).max(100),
  issueType: z.enum([
    "outdated_step",
    "incorrect_scope",
    "broken_source_link",
    "new_pain_point",
    "other",
  ]),
  description: z.string().min(5).max(2000),
  sourceUrl: z.string().url().optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = FeedbackBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage:
            "Please provide a valid issue type and a description (at least 5 characters).",
        },
        { status: 400 }
      );
    }

    const store = getGuideStore();
    const report = await store.saveFeedbackReport({
      guideSlug: parsed.data.guideSlug,
      issueType: parsed.data.issueType,
      description: parsed.data.description,
      sourceUrl: parsed.data.sourceUrl || undefined,
    });

    return NextResponse.json({
      ok: true,
      report,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save feedback report";
    return NextResponse.json(
      { ok: false, errorMessage: message },
      { status: 500 }
    );
  }
}
