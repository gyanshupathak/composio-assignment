import { notFound } from "next/navigation";
import { getGuideStore } from "@/lib/persistence/guideStore";
import { GuideViewer } from "@/components/GuideViewer";

export const dynamic = "force-dynamic";

interface GuideDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ goalNote?: string }>;
}

export default async function GuideDetailPage({
  params,
  searchParams,
}: GuideDetailPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const store = getGuideStore();
  const guide = await store.getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  return (
    <GuideViewer
      guide={guide}
      goalDifferenceNotice={query?.goalNote}
    />
  );
}
