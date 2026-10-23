import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function GuideNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div data-testid="guide-not-found">
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Guide Not Found in Library
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
          There&apos;s no guide at this address yet. You can open one of the
          ready-made guides, or ask the research agent to write a new one.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2 text-sm">
          {[
            ["github", "GitHub"],
            ["gmail", "Gmail"],
            ["slack", "Slack"],
            ["notion", "Notion"],
          ].map(([slug, name]) => (
            <Link
              key={slug}
              href={`/guides/${slug}`}
              className="rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-stone-700 hover:border-teal-300"
            >
              {name}
            </Link>
          ))}
        </div>

        <Link
          href="/#investigate-panel"
          className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Look up another app
        </Link>
      </div>
    </div>
  );
}
