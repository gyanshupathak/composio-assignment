"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EvidenceSource, Guide } from "@/lib/schema/guideSchema";
import { RichText } from "@/components/RichText";
import {
  cleanText,
  DIFFICULTY_LABELS,
  getPlainIntro,
  IMPACT_LABELS,
  PATH_LABELS,
  RESPONSIBLE_LABELS,
  splitIntoPoints,
  termsUsedInGuide,
} from "@/lib/ui/glossary";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  Gauge,
  Hourglass,
  Info,
} from "lucide-react";

type TabId = "overview" | "setup" | "problems" | "checklist" | "sources";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "setup", label: "Setup steps" },
  { id: "problems", label: "Common problems" },
  { id: "checklist", label: "Launch checklist" },
  { id: "sources", label: "Sources & research" },
];

const SOURCE_TYPE_LABELS: Record<EvidenceSource["sourceType"], string> = {
  official_docs: "Official docs",
  composio_docs: "Composio docs",
  github_issue: "GitHub issue",
  github_repo: "Code library",
  stack_overflow: "Stack Overflow",
  developer_forum: "Developer forum",
  reddit: "Reddit",
  support_kb: "Support article",
  third_party_docs: "Technical guide",
};

const COMPOSIO_STATUS_TEXT: Record<
  Guide["authenticationAssessment"]["composioManagedAuth"]["status"],
  string
> = {
  available: "Yes — Composio can handle the login for you.",
  unavailable: "No — you'll need to bring your own app.",
  not_applicable: "Not needed — this app uses an access key instead of a login.",
  unknown: "We couldn't confirm this yet.",
};

const PATH_APPLICABILITY_TEXT: Record<string, string> = {
  recommended_now: "Best to start with",
  recommended_for_production: "Best for going live",
  conditional_alternative: "Only in some cases",
  not_recommended: "Not recommended",
  not_available: "Not available",
};

interface GuideViewerProps {
  guide: Guide;
  goalDifferenceNotice?: string;
}

function SectionTitle({
  children,
  hint,
}: {
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-stone-900">{children}</h2>
      {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-7 ${className}`}
    >
      {children}
    </div>
  );
}

function Disclosure({
  summary,
  children,
  defaultOpen = false,
  testId,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  testId?: string;
}) {
  return (
    <details
      open={defaultOpen}
      data-testid={testId}
      className="group rounded-xl border border-stone-200 bg-white open:bg-stone-50/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[15px] font-medium text-stone-800 [&::-webkit-details-marker]:hidden">
        <span className="flex-1">{summary}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 pt-1">{children}</div>
    </details>
  );
}

export function GuideViewer({ guide, goalDifferenceNotice }: GuideViewerProps) {
  const intro = getPlainIntro(guide);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    guide.scenario.alternativeScenarios?.[0]?.id ?? ""
  );
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "official" | "community"
  >("all");
  const [showAllSources, setShowAllSources] = useState(false);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<
    | "outdated_step"
    | "incorrect_scope"
    | "broken_source_link"
    | "new_pain_point"
    | "other"
  >("outdated_step");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackUrl, setFeedbackUrl] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<
    "idle" | "submitting" | "submitted" | "error"
  >("idle");
  const [feedbackError, setFeedbackError] = useState("");

  const glossaryTerms = useMemo(() => termsUsedInGuide(guide), [guide]);
  const evidenceById = useMemo(() => {
    const map: Record<string, EvidenceSource> = {};
    for (const ev of guide.evidence) map[ev.id] = ev;
    return map;
  }, [guide.evidence]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`authpath-checklist-${guide.slug}`);
      // localStorage is browser-only; reading it during render would break hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved) setCheckedItems(JSON.parse(saved));
    } catch {
      // storage unavailable
    }
  }, [guide.slug]);

  const toggleChecklistItem = (id: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(
          `authpath-checklist-${guide.slug}`,
          JSON.stringify(next)
        );
      } catch {
        // storage unavailable
      }
      return next;
    });
  };

  const handleCopyShareLink = async () => {
    const shareUrl = `${window.location.origin}/guides/${guide.slug}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 3000);
    } catch {
      setCopyStatus("error");
      setTimeout(() => setCopyStatus("idle"), 4000);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackStatus("submitting");
    setFeedbackError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideSlug: guide.slug,
          issueType: feedbackType,
          description: feedbackText,
          sourceUrl: feedbackUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setFeedbackStatus("error");
        setFeedbackError(data.errorMessage ?? "Could not send your report.");
        return;
      }
      setFeedbackStatus("submitted");
      setFeedbackText("");
      setFeedbackUrl("");
    } catch {
      setFeedbackStatus("error");
      setFeedbackError("Network error. Please try again.");
    }
  };

  const goToTab = (tab: TabId) => {
    setActiveTab(tab);
    document
      .getElementById("guide-tabs")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sourceLinks = (ids: string[]) => {
    const evs = Array.from(new Set(ids))
      .map((id) => evidenceById[id])
      .filter((e): e is EvidenceSource => Boolean(e))
      .slice(0, 3);
    if (evs.length === 0) return null;
    return (
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-400">
        <span>Based on</span>
        {evs.map((ev) => (
          <a
            key={ev.id}
            href={ev.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={ev.title}
            className="inline-flex items-center gap-1 text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-teal-700"
          >
            {SOURCE_TYPE_LABELS[ev.sourceType]}
            <span className="text-stone-400">· {ev.publisherDomain}</span>
          </a>
        ))}
      </div>
    );
  };

  const scenarios = guide.scenario.alternativeScenarios ?? [];
  const activeScenario =
    scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];
  const blockers = splitIntoPoints(
    guide.authenticationAssessment.launchBlockerSummary
  );
  const reasoning = cleanText(guide.authenticationAssessment.reasoning);
  const isLongReasoning = reasoning.length > 320;

  const officialSources = guide.evidence.filter(
    (e) => e.sourceType === "official_docs" || e.sourceType === "composio_docs"
  );
  const filteredSources =
    sourceFilter === "official"
      ? officialSources
      : sourceFilter === "community"
      ? guide.evidence.filter((e) => !officialSources.includes(e))
      : guide.evidence;
  const visibleSources = showAllSources
    ? filteredSources
    : filteredSources.slice(0, 6);

  const completedCount = guide.launchChecklist.filter(
    (c) => checkedItems[c.id]
  ).length;
  const checklistPercent =
    guide.launchChecklist.length > 0
      ? Math.round((completedCount / guide.launchChecklist.length) * 100)
      : 0;

  const nextTabButton = (tab: TabId, label: string) => (
    <div className="mt-8 flex justify-end">
      <button
        type="button"
        onClick={() => goToTab(tab)}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
      >
        Next: {label}
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      {/* Header */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800"
      >
        <ArrowLeft className="h-4 w-4" />
        All guides
      </Link>

      <header className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            {guide.applicationName}
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-stone-600">
            <RichText text={intro.oneLiner} />
          </p>
          <p className="mt-3 text-sm text-stone-400">
            Updated {guide.lastReviewedAt.slice(0, 10)} · Checked against{" "}
            {guide.evidence.length} sources ·{" "}
            {guide.guideOrigin === "curated"
              ? "Hand-researched guide"
              : "Generated by the research agent"}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            {guide.developerDocsUrl && (
              <a
                href={guide.developerDocsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Official docs
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={handleCopyShareLink}
              data-testid="copy-share-link-btn"
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
            >
              {copyStatus === "copied" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copyStatus === "copied" ? "Link copied" : "Share guide"}
            </button>
          </div>
          <div aria-live="polite" className="text-xs text-stone-500">
            {copyStatus === "error" &&
              `Couldn't copy. Link: /guides/${guide.slug}`}
          </div>
        </div>
      </header>

      {/* Notices */}
      {guide.outcome.guideStatus !== "complete_verified" && (
        <div
          data-testid="guide-partial-or-inconclusive-banner"
          className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/70 p-5"
        >
          <p className="font-semibold text-amber-900">
            {guide.outcome.guideStatus === "no_public_oauth_found"
              ? "No Public OAuth Path Established"
              : "Some details could not be confirmed"}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80">
            We didn&apos;t find verified public login instructions for{" "}
            {guide.applicationName}. Instead of guessing, this page shows what
            we did confirm and what to do next.
          </p>
        </div>
      )}

      {goalDifferenceNotice && (
        <div className="mt-8 rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
          <p className="font-semibold text-teal-900">
            A note about your goal
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-teal-900/80">
            <RichText text={goalDifferenceNotice} />
          </p>
        </div>
      )}

      {/* At a glance */}
      <section aria-label="At a glance" className="mt-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              icon: Compass,
              label: "Recommended approach",
              value: PATH_LABELS[guide.authenticationAssessment.recommendedPath],
            },
            {
              icon: Clock,
              label: "Hands-on setup",
              value: cleanText(
                guide.difficultyAndEffort.activeSetupTimeRange.split("(")[0]
              ),
            },
            {
              icon: Hourglass,
              label: "Waiting for approval",
              value: intro.approval,
            },
            {
              icon: Gauge,
              label: "Difficulty",
              value:
                DIFFICULTY_LABELS[guide.difficultyAndEffort.difficultyCategory],
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-2xl border border-stone-200/80 bg-white p-4"
            >
              <tile.icon className="h-4 w-4 text-teal-600" />
              <div className="mt-2.5 text-xs text-stone-500">{tile.label}</div>
              <div className="mt-0.5 text-[15px] font-medium leading-snug text-stone-900">
                {tile.value}
              </div>
            </div>
          ))}
        </div>

        {glossaryTerms.length > 0 && (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setGlossaryOpen((o) => !o)}
              aria-expanded={glossaryOpen}
              className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-teal-700"
            >
              <BookOpen className="h-4 w-4" />
              {glossaryOpen
                ? "Hide the glossary"
                : "New to these terms? Open the plain-English glossary"}
            </button>
            {glossaryOpen && (
              <dl className="mt-4 grid gap-3 rounded-2xl border border-stone-200/80 bg-white p-5 sm:grid-cols-2">
                {glossaryTerms.map((t) => (
                  <div key={t.key} className="rounded-xl bg-stone-50 p-3.5">
                    <dt className="text-sm font-medium text-stone-900">
                      {t.label}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-stone-600">
                      {t.definition}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </section>

      {/* Tabs */}
      <div
        id="guide-tabs"
        className="sticky top-14 z-20 -mx-4 mt-10 scroll-mt-20 border-b border-stone-200 bg-[#f7f6f3]/95 px-4 backdrop-blur sm:mx-0 sm:px-0"
      >
        <div
          role="tablist"
          aria-label="Guide sections"
          className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((tab) => {
            const selected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors ${
                  selected
                    ? "border-teal-600 font-medium text-stone-900"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <div
            role="tabpanel"
            id="panel-overview"
            aria-labelledby="tab-overview"
            className="space-y-6"
          >
            <Card>
              <SectionTitle>Our recommendation</SectionTitle>
              <p className="text-[16px] leading-[1.75] text-stone-700">
                <RichText
                  text={
                    showFullReasoning || !isLongReasoning
                      ? reasoning
                      : `${reasoning.slice(0, 300).replace(/\s+\S*$/, "")}…`
                  }
                />
              </p>
              {isLongReasoning && (
                <button
                  type="button"
                  onClick={() => setShowFullReasoning((v) => !v)}
                  className="mt-2 text-sm font-medium text-teal-700 hover:underline"
                >
                  {showFullReasoning ? "Show less" : "Read more"}
                </button>
              )}
              {sourceLinks(guide.authenticationAssessment.evidenceIds)}
            </Card>

            {scenarios.length > 0 && activeScenario && (
              <Card>
                <SectionTitle hint="The right setup depends on what you're building.">
                  Pick what fits you
                </SectionTitle>
                <div
                  role="radiogroup"
                  aria-label="Your situation"
                  className="flex flex-col gap-2 sm:flex-row"
                >
                  {scenarios.map((s) => {
                    const selected = s.id === activeScenario.id;
                    return (
                      <button
                        key={s.id}
                        role="radio"
                        aria-checked={selected}
                        type="button"
                        onClick={() => setSelectedScenarioId(s.id)}
                        className={`flex-1 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                          selected
                            ? "border-teal-500 bg-teal-50/60 text-teal-900"
                            : "border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                        }`}
                      >
                        <RichText text={s.label} annotate={false} />
                      </button>
                    );
                  })}
                </div>

                <div
                  data-testid="selected-scenario-detail"
                  className="mt-5 rounded-xl bg-stone-50 p-5"
                >
                  <p className="text-sm text-stone-500">
                    <RichText text={activeScenario.description} />
                  </p>
                  <p className="mt-3 text-[16px] font-medium leading-snug text-stone-900">
                    <RichText text={activeScenario.recommendedPathTitle} />
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
                    <RichText text={activeScenario.rationale} />
                  </p>

                  <dl className="mt-4 grid gap-4 border-t border-stone-200 pt-4 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-stone-500">Setup time</dt>
                      <dd className="mt-0.5 text-stone-800">
                        <RichText text={activeScenario.activeSetupEstimate} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Approval wait</dt>
                      <dd className="mt-0.5 text-stone-800">
                        <RichText text={activeScenario.externalApprovalWait} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-stone-500">Watch out for</dt>
                      <dd className="mt-0.5 text-stone-800">
                        <RichText text={activeScenario.keyRiskOrBlocker} />
                      </dd>
                    </div>
                  </dl>

                  {activeScenario.recommendedScopesOrCapabilities.length >
                    0 && (
                    <div className="mt-4 border-t border-stone-200 pt-4">
                      <p className="text-sm text-stone-500">
                        Permissions to ask for
                      </p>
                      <ul className="mt-2 space-y-1.5 text-sm text-stone-700">
                        {activeScenario.recommendedScopesOrCapabilities.map(
                          (sc, i) => (
                            <li key={i} className="flex gap-2">
                              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-stone-400" />
                              <RichText text={sc} />
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card>
              <SectionTitle>Know this before you launch</SectionTitle>
              {blockers.intro && (
                <p className="mb-3 text-[15px] text-stone-600">
                  <RichText text={blockers.intro} />
                </p>
              )}
              <ul className="space-y-3">
                {blockers.points.map((p, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[15px] leading-relaxed text-stone-700"
                  >
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-medium text-amber-800">
                      {i + 1}
                    </span>
                    <RichText text={p} />
                  </li>
                ))}
              </ul>
            </Card>

            {guide.prerequisites.length > 0 && (
              <Card>
                <SectionTitle hint="Have these ready before you open any developer settings.">
                  What you&apos;ll need first
                </SectionTitle>
                <div className="space-y-2">
                  {guide.prerequisites.map((pre) => (
                    <Disclosure key={pre.id} summary={cleanText(pre.title)}>
                      <p className="text-[15px] leading-relaxed text-stone-600">
                        <RichText text={pre.detail} />
                      </p>
                      {sourceLinks(pre.evidenceIds)}
                    </Disclosure>
                  ))}
                </div>
              </Card>
            )}

            <Card>
              <SectionTitle>More details</SectionTitle>
              <div className="space-y-2">
                <Disclosure summary="Compare all login options">
                  <div className="space-y-4">
                    {guide.authenticationAssessment.pathComparison.map(
                      (path, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-stone-200 bg-white p-4"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-medium text-stone-900">
                              <RichText text={path.title} annotate={false} />
                            </p>
                            <span className="text-xs text-stone-500">
                              {PATH_APPLICABILITY_TEXT[path.applicability]}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                            <RichText text={path.summary} />
                          </p>
                          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                            {path.whenToChoose.length > 0 && (
                              <div>
                                <p className="text-stone-500">Good for</p>
                                <ul className="mt-1 space-y-1 text-stone-700">
                                  {path.whenToChoose.map((w, i) => (
                                    <li key={i}>
                                      <RichText text={w} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {path.tradeOffs.length > 0 && (
                              <div>
                                <p className="text-stone-500">Keep in mind</p>
                                <ul className="mt-1 space-y-1 text-stone-700">
                                  {path.tradeOffs.map((t, i) => (
                                    <li key={i}>
                                      <RichText text={t} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </Disclosure>

                <Disclosure summary="Can Composio handle the login for me?">
                  <p className="text-[15px] font-medium text-stone-800">
                    {
                      COMPOSIO_STATUS_TEXT[
                        guide.authenticationAssessment.composioManagedAuth
                          .status
                      ]
                    }
                  </p>
                  <ul className="mt-2 space-y-2 text-sm leading-relaxed text-stone-600">
                    {guide.authenticationAssessment.composioManagedAuth.conditionsAndQualifications.map(
                      (c, i) => (
                        <li key={i}>
                          <RichText text={c} />
                        </li>
                      )
                    )}
                  </ul>
                </Disclosure>

                <Disclosure summary="How long does it really take?">
                  <div className="space-y-3 text-sm leading-relaxed text-stone-600">
                    <p>
                      <span className="text-stone-500">Hands-on work: </span>
                      <RichText
                        text={guide.difficultyAndEffort.activeSetupTimeRange}
                      />
                    </p>
                    {guide.difficultyAndEffort.publishedApprovalTimeEstimate && (
                      <p>
                        <span className="text-stone-500">
                          Official review times:{" "}
                        </span>
                        <RichText
                          text={
                            guide.difficultyAndEffort
                              .publishedApprovalTimeEstimate
                          }
                        />
                      </p>
                    )}
                    {guide.difficultyAndEffort
                      .corroboratedRealWorldWaitNotes && (
                      <p>
                        <span className="text-stone-500">
                          What developers report:{" "}
                        </span>
                        <RichText
                          text={
                            guide.difficultyAndEffort
                              .corroboratedRealWorldWaitNotes
                          }
                        />
                      </p>
                    )}
                    {guide.difficultyAndEffort.preparationWork.length > 0 && (
                      <div>
                        <p className="text-stone-500">Preparation work</p>
                        <ul className="mt-1 list-disc space-y-1 pl-5">
                          {guide.difficultyAndEffort.preparationWork.map(
                            (w, i) => (
                              <li key={i}>
                                <RichText text={w} />
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                    {guide.difficultyAndEffort.externalDependencies.length >
                      0 && (
                      <div>
                        <p className="text-stone-500">
                          Who else may need to approve
                        </p>
                        <ul className="mt-1 space-y-2">
                          {guide.difficultyAndEffort.externalDependencies.map(
                            (dep, i) => (
                              <li key={i}>
                                <span className="font-medium text-stone-800">
                                  <RichText text={dep.dependency} />
                                </span>{" "}
                                — <RichText text={dep.blockingImpact} />
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </Disclosure>
              </div>
            </Card>

            {nextTabButton("setup", "Setup steps")}
          </div>
        )}

        {/* SETUP */}
        {activeTab === "setup" && (
          <div role="tabpanel" id="panel-setup" aria-labelledby="tab-setup">
            {guide.setupSteps.length === 0 ? (
              <Card>
                <p className="text-[15px] text-stone-600">
                  There are no setup steps for this app because we couldn&apos;t
                  find a public login method to follow. See the
                  recommendation on the Overview tab for what to do instead.
                </p>
              </Card>
            ) : (
              <ol className="relative space-y-6">
                {guide.setupSteps.map((step, idx) => (
                  <li key={step.id} className="relative flex gap-4 sm:gap-5">
                    <div className="flex flex-col items-center">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white">
                        {step.stepNumber}
                      </span>
                      {idx < guide.setupSteps.length - 1 && (
                        <span className="mt-2 w-px flex-1 bg-stone-200" />
                      )}
                    </div>
                    <Card className="flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-[17px] font-semibold text-stone-900">
                          <RichText text={step.title} annotate={false} />
                        </h3>
                        <span className="text-xs text-stone-400">
                          {RESPONSIBLE_LABELS[step.responsibleParty] ?? "You"} ·
                          about {cleanText(step.estimatedTime)}
                        </span>
                      </div>
                      <p className="mt-3 text-[15px] leading-[1.75] text-stone-700">
                        <RichText text={step.instructions} />
                      </p>

                      <div className="mt-4">
                        <Disclosure summary="Tips for this step">
                          <div className="space-y-3 text-sm leading-relaxed text-stone-600">
                            <p>
                              <span className="font-medium text-stone-800">
                                Why it matters:{" "}
                              </span>
                              <RichText text={step.whyItMatters} />
                            </p>
                            <p>
                              <span className="font-medium text-emerald-800">
                                How to check it worked:{" "}
                              </span>
                              <RichText text={step.completionCheck} />
                            </p>
                            <div>
                              <span className="font-medium text-amber-800">
                                Common mistakes:
                              </span>
                              <ul className="mt-1 list-disc space-y-1 pl-5">
                                {step.commonFailureCases.map((fc, i) => (
                                  <li key={i}>
                                    <RichText text={fc} />
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </Disclosure>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        {step.consoleOrDocUrl && (
                          <a
                            href={step.consoleOrDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline"
                          >
                            Open the page for this step
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      {sourceLinks(step.evidenceIds)}
                    </Card>
                  </li>
                ))}
              </ol>
            )}
            {nextTabButton("problems", "Common problems")}
          </div>
        )}

        {/* PROBLEMS */}
        {activeTab === "problems" && (
          <div
            role="tabpanel"
            id="panel-problems"
            aria-labelledby="tab-problems"
          >
            <p className="mb-5 text-[15px] text-stone-500">
              Real problems developers ran into, collected from official
              troubleshooting pages, bug reports, and developer forums. Tap one
              to see how to avoid it.
            </p>
            {guide.painPoints.length === 0 ? (
              <Card>
                <p className="text-[15px] text-stone-600">
                  We didn&apos;t find reliable reports of common problems for
                  this app.
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {guide.painPoints.map((pp) => {
                  const impact = IMPACT_LABELS[pp.severity] ?? IMPACT_LABELS.low;
                  return (
                    <details
                      key={pp.id}
                      data-testid={`pain-point-${pp.id}`}
                      className="group rounded-2xl border border-stone-200/80 bg-white"
                    >
                      <summary className="flex cursor-pointer list-none items-start gap-3 p-5 [&::-webkit-details-marker]:hidden">
                        <span
                          className={`mt-2 h-2 w-2 shrink-0 rounded-full ${impact.dot}`}
                        />
                        <span className="flex-1">
                          <span className="block text-[16px] font-medium leading-snug text-stone-900">
                            <RichText text={pp.title} annotate={false} />
                          </span>
                          <span className={`mt-1 block text-xs ${impact.text}`}>
                            {impact.label}
                            {pp.independentReportCount &&
                            pp.independentReportCount > 1
                              ? ` · seen in ${pp.independentReportCount} separate reports`
                              : ""}
                          </span>
                        </span>
                        <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="space-y-4 px-5 pb-5 pl-10 text-[15px] leading-relaxed text-stone-700">
                        <div>
                          <p className="text-sm text-stone-500">
                            What you&apos;ll see
                          </p>
                          <p className="mt-0.5">
                            <RichText text={pp.symptom} />
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-stone-500">
                            Why it happens
                          </p>
                          <p className="mt-0.5">
                            <RichText text={pp.likelyCause} />
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-50/70 p-4">
                          <p className="text-sm font-medium text-emerald-900">
                            How to avoid it
                          </p>
                          <p className="mt-0.5 text-emerald-950/80">
                            <RichText text={pp.prevention} />
                          </p>
                          <p className="mt-3 text-sm font-medium text-emerald-900">
                            If it already happened
                          </p>
                          <p className="mt-0.5 text-emerald-950/80">
                            <RichText text={pp.resolution} />
                          </p>
                        </div>
                        {sourceLinks(pp.evidenceIds)}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
            {nextTabButton("checklist", "Launch checklist")}
          </div>
        )}

        {/* CHECKLIST */}
        {activeTab === "checklist" && (
          <div
            role="tabpanel"
            id="panel-checklist"
            aria-labelledby="tab-checklist"
          >
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <SectionTitle hint="Tick each one as you confirm it. Your progress is saved in this browser.">
                  Before you go live
                </SectionTitle>
                <span
                  data-testid="checklist-progress"
                  className="text-sm text-stone-500"
                >
                  {completedCount} / {guide.launchChecklist.length} Verified
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-teal-500 transition-all"
                  style={{ width: `${checklistPercent}%` }}
                />
              </div>

              {guide.launchChecklist.length === 0 ? (
                <p className="mt-5 text-[15px] text-stone-600">
                  No checklist yet, because there&apos;s no confirmed setup path
                  for this app.
                </p>
              ) : (
                <ul className="mt-5 space-y-2">
                  {guide.launchChecklist.map((item) => {
                    const checked = Boolean(checkedItems[item.id]);
                    return (
                      <li key={item.id}>
                        <label
                          htmlFor={`check-${item.id}`}
                          className={`flex cursor-pointer gap-3 rounded-xl p-3.5 transition-colors ${
                            checked ? "bg-teal-50/60" : "hover:bg-stone-50"
                          }`}
                        >
                          <input
                            id={`check-${item.id}`}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleChecklistItem(item.id)}
                            className="mt-1 h-4 w-4 rounded border-stone-300 accent-teal-600"
                          />
                          <span>
                            <span
                              className={`block text-[15px] font-medium ${
                                checked
                                  ? "text-stone-500 line-through"
                                  : "text-stone-900"
                              }`}
                            >
                              <RichText text={item.label} annotate={false} />
                            </span>
                            <span className="mt-0.5 block text-sm leading-relaxed text-stone-500">
                              <RichText
                                text={item.verificationMethod}
                                annotate={false}
                              />
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            {nextTabButton("sources", "Sources & research")}
          </div>
        )}

        {/* SOURCES */}
        {activeTab === "sources" && (
          <div
            role="tabpanel"
            id="panel-sources"
            aria-labelledby="tab-sources"
            className="space-y-6"
          >
            <Card>
              <SectionTitle>How we researched this</SectionTitle>
              <div className="grid gap-6 text-sm leading-relaxed sm:grid-cols-2">
                <div>
                  <p className="font-medium text-stone-900">What we checked</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-stone-600">
                    {guide.agentResearchTrace.agentPreparedActions.map(
                      (a, i) => (
                        <li key={i}>
                          <RichText text={a} />
                        </li>
                      )
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-stone-900">
                    What you&apos;ll do in your own account
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-stone-600">
                    {guide.outcome.humanOnlyActions.map((a, i) => (
                      <li key={i}>
                        <RichText text={a} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {(guide.agentResearchTrace.unresolvedQuestions.length > 0 ||
                guide.outcome.limitations.length > 0 ||
                guide.outcome.missingInformationToProceed.length > 0) && (
                <div className="mt-6 rounded-xl bg-stone-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-stone-800">
                    <Info className="h-4 w-4 text-stone-500" />
                    What we couldn&apos;t confirm
                  </p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-stone-600">
                    {[
                      ...guide.agentResearchTrace.unresolvedQuestions,
                      ...guide.outcome.limitations,
                      ...guide.outcome.missingInformationToProceed,
                    ].map((q, i) => (
                      <li key={i}>
                        <RichText text={q} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <section id="evidence-and-sources">
              <Card>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle>
                    Sources ({guide.evidence.length})
                  </SectionTitle>
                  <div className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
                    {(
                      [
                        ["all", "All"],
                        ["official", "Official docs"],
                        ["community", "Developer reports"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setSourceFilter(key)}
                        className={`rounded-full px-3 py-1 ${
                          sourceFilter === key
                            ? "bg-white text-stone-900 shadow-sm"
                            : "text-stone-500"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <ul className="divide-y divide-stone-100">
                  {visibleSources.map((ev) => (
                    <li key={ev.id} className="py-3.5">
                      <a
                        href={ev.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-start gap-1.5 text-[15px] font-medium text-stone-800 hover:text-teal-700"
                      >
                        {cleanText(ev.title)}
                        <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-stone-400 group-hover:text-teal-600" />
                      </a>
                      <p className="mt-0.5 text-xs text-stone-400">
                        {SOURCE_TYPE_LABELS[ev.sourceType]} ·{" "}
                        {ev.publisherDomain}
                        {ev.publishedOrUpdatedAt
                          ? ` · ${ev.publishedOrUpdatedAt}`
                          : ""}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-stone-600">
                        <RichText text={ev.summaryOfContent} annotate={false} />
                      </p>
                    </li>
                  ))}
                </ul>

                {filteredSources.length > 6 && (
                  <button
                    type="button"
                    data-testid="toggle-all-evidence-btn"
                    onClick={() => setShowAllSources((v) => !v)}
                    className="mt-2 w-full rounded-xl py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
                  >
                    {showAllSources
                      ? "Show fewer sources"
                      : `Show all ${filteredSources.length} sources`}
                  </button>
                )}
              </Card>
            </section>
          </div>
        )}
      </div>

      {/* Next step */}
      <section
        id="your-next-step"
        aria-labelledby="heading-next-step"
        className="mt-12 rounded-2xl bg-teal-50/70 p-6 sm:p-8"
      >
        <p className="text-sm font-medium text-teal-700">Your next step</p>
        <h2
          id="heading-next-step"
          className="mt-1 text-xl font-semibold text-stone-900"
        >
          <RichText
            text={guide.outcome.recommendedNextStep.title}
            annotate={false}
          />
        </h2>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-stone-700">
          <RichText text={guide.outcome.recommendedNextStep.action} />
        </p>
        {guide.outcome.recommendedNextStep.targetUrl && (
          <a
            href={guide.outcome.recommendedNextStep.targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-800"
          >
            Open the developer page
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </section>

      {/* Feedback */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => setFeedbackOpen((o) => !o)}
          data-testid="toggle-feedback-btn"
          className="text-sm text-stone-400 underline underline-offset-4 hover:text-stone-700"
        >
          Something outdated or wrong? Let us know
        </button>
        {feedbackOpen && (
          <form
            onSubmit={handleSubmitFeedback}
            className="mx-auto mt-4 max-w-lg space-y-3 rounded-2xl border border-stone-200 bg-white p-5 text-left text-sm"
          >
            <select
              aria-label="What kind of issue?"
              value={feedbackType}
              onChange={(e) =>
                setFeedbackType(e.target.value as typeof feedbackType)
              }
              className="w-full rounded-lg border border-stone-200 px-3 py-2"
            >
              <option value="outdated_step">A step is outdated</option>
              <option value="incorrect_scope">A permission is wrong</option>
              <option value="new_pain_point">I hit a new problem</option>
              <option value="broken_source_link">A link is broken</option>
              <option value="other">Something else</option>
            </select>
            <textarea
              aria-label="What changed?"
              required
              minLength={5}
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="What changed or didn't work?"
              className="w-full rounded-lg border border-stone-200 px-3 py-2"
            />
            <input
              aria-label="Link (optional)"
              type="url"
              value={feedbackUrl}
              onChange={(e) => setFeedbackUrl(e.target.value)}
              placeholder="Link to the updated docs (optional)"
              className="w-full rounded-lg border border-stone-200 px-3 py-2"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs">
                {feedbackStatus === "submitted" && (
                  <span className="text-emerald-700">Thanks — saved.</span>
                )}
                {feedbackStatus === "error" && (
                  <span className="text-rose-600">{feedbackError}</span>
                )}
              </span>
              <button
                type="submit"
                disabled={feedbackStatus === "submitting"}
                className="rounded-full bg-stone-900 px-4 py-2 text-white disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
