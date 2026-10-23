import Link from "next/link";
import { Compass } from "lucide-react";

const NAV_GUIDES = [
  { href: "/guides/github", label: "GitHub" },
  { href: "/guides/gmail", label: "Gmail" },
  { href: "/guides/slack", label: "Slack" },
  { href: "/guides/notion", label: "Notion" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#f7f6f3]/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-stone-900"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white">
            <Compass className="h-4 w-4" />
          </span>
          AuthPath
        </Link>

        <nav aria-label="Primary Navigation" className="flex items-center gap-1 text-sm">
          <div className="hidden items-center gap-1 md:flex">
            {NAV_GUIDES.map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="rounded-full px-3 py-1.5 text-stone-500 hover:bg-stone-200/50 hover:text-stone-900"
              >
                {g.label}
              </Link>
            ))}
          </div>
          <Link
            href="/#investigate-panel"
            className="ml-2 rounded-full bg-stone-900 px-4 py-1.5 text-white hover:bg-stone-700"
          >
            Look up an app
          </Link>
        </nav>
      </div>
    </header>
  );
}
