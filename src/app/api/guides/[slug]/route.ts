import { NextRequest, NextResponse } from "next/server";
import { getGuideStore } from "@/lib/persistence/guideStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const store = getGuideStore();
    const guide = await store.getGuideBySlug(slug);

    if (!guide) {
      return NextResponse.json(
        {
          ok: false,
          errorMessage: `No guide found for slug "${slug}".`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      guide,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to load guide";
    return NextResponse.json(
      { ok: false, errorMessage: message },
      { status: 500 }
    );
  }
}
