import { getGuideStore } from "@/lib/persistence/guideStore";
import { getRuntimeConfigStatus } from "@/lib/research/agentOrchestrator";
import { HomeClient } from "@/components/HomeClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const store = getGuideStore();
  const allGuides = await store.getAllGuides();
  const runtimeConfigStatus = getRuntimeConfigStatus();

  return (
    <HomeClient
      initialGuides={allGuides}
      runtimeConfigStatus={runtimeConfigStatus}
    />
  );
}
