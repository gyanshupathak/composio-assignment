import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { FileGuideStore } from "@/lib/persistence/guideStore";
import { CURATED_GUIDES } from "@/data/curated";

describe("FileGuideStore sample guides", () => {
  it("shows shipped sample guides, lets new guides replace them, and never writes to the sample file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "authpath-store-"));
    const sample = structuredClone(CURATED_GUIDES[0]);
    sample.slug = "sample-app";
    sample.guideOrigin = "generated";
    const samplePath = path.join(dir, "samples.json");
    const sampleText = JSON.stringify({ [sample.slug]: sample });
    await fs.writeFile(samplePath, sampleText, "utf-8");

    const store = new FileGuideStore(
      path.join(dir, "runtime.json"),
      path.join(dir, "feedback.json"),
      samplePath
    );
    expect((await store.getGuideBySlug("sample-app"))?.applicationName).toBe(sample.applicationName);

    const updated = structuredClone(sample);
    updated.applicationName = "Sample App (re-researched)";
    await store.saveGeneratedGuide(updated);

    expect((await store.getGuideBySlug("sample-app"))?.applicationName).toBe("Sample App (re-researched)");
    expect((await store.getAllGuides()).filter((g) => g.slug === "sample-app")).toHaveLength(1);
    expect(await fs.readFile(samplePath, "utf-8")).toBe(sampleText);
    await fs.rm(dir, { recursive: true, force: true });
  });
});
