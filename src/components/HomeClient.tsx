"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Guide } from "@/lib/schema/guideSchema";
import {
  AmbiguityCandidate,
  searchGuidesLibrary,
} from "@/lib/research/providerIdentifier";
import {
  ResearchStageEvent,
  ResearchStageId,
} from "@/lib/research/agentOrchestrator";
import { RichText } from "@/components/RichText";
import {
  cleanText,
  DIFFICULTY_LABELS,
  getPlainIntro,
} from "@/lib/ui/glossary";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

interface HomeClientProps {
  initialGuides: Guide[];
  runtimeConfigStatus: {
    searchConfigured: boolean;
    modelConfigured: boolean;
    composioApiKeyConfigured: boolean;
    persistenceType: string;
  };
}

type Audience =
  | "multi_workspace_external"
  | "single_workspace_internal"
  | "personal_or_prototype";

const AUDIENCE_OPTIONS: { value: Audience; label: string }[] = [
  { value: "multi_workspace_external", label: "My customers" },
  { value: "single_workspace_internal", label: "Only my team" },
  { value: "personal_or_prototype", label: "Just me, testing" },
];

const STAGE_LABELS: Record<ResearchStageId, string> = {
  identifying_provider: "Figured out which app you meant",
  retrieving_official_docs: "Read the official developer docs",
  investigating_developer_problems: "Looked for problems other developers hit",
  cross_checking_findings: "Cross-checked what we found",
  assessing_auth_and_approvals: "Worked out the login setup and approvals",
  generating_and_validating_guide: "Wrote and double-checked the guide",
  saving_result: "Saved the guide",
};

const ACTIVE_STAGE_LABELS: Record<ResearchStageId, string> = {
  identifying_provider: "Figuring out which app you mean",
  retrieving_official_docs: "Reading the official developer docs",
  investigating_developer_problems: "Looking for problems other developers hit",
  cross_checking_findings: "Cross-checking what we found",
  assessing_auth_and_approvals: "Working out the login setup and approvals",
  generating_and_validating_guide: "Writing and double-checking the guide",
  saving_result: "Saving the guide",
};

const EXAMPLES = ["GitHub", "Gmail", "Spotify", "Discord", "Linear"];

function friendlyError(message: string): string {
  if (/SSRF|private|internal|unsafe/i.test(message)) {
    return "For safety, AuthPath only looks up public websites. Private or internal addresses are blocked (SSRF protection).";
  }
  return message;
}

// The response shape varies by status, so fields are checked one by one by the caller.
type InvestigationResponse = any;

async function readInvestigationStream(
  res: Response,
  onStage: (event: ResearchStageEvent) => void
): Promise<InvestigationResponse> {
  const isStream = (res.headers.get("content-type") ?? "").includes("ndjson");
  if (!isStream || !res.body) {
    return res.json();
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: InvestigationResponse = null;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const message = JSON.parse(line);
    if (message.type === "stage") onStage(message.event);
    if (message.type === "result") result = message.result;
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handleLine);
  }
  handleLine(buffer + decoder.decode());

  if (!result) {
    throw new Error("The research stream ended without a result.");
  }
  return result;
}

export function HomeClient({ initialGuides }: HomeClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");
  const [integrationGoal, setIntegrationGoal] = useState<string>("");
  const [intendedAudience, setIntendedAudience] = useState<Audience>(
    "multi_workspace_external"
  );
  const [showDetails, setShowDetails] = useState(false);

  const [searchError, setSearchError] = useState<string>("");
  const [matchedGuide, setMatchedGuide] = useState<Guide | null>(null);
  const [goalDiffersReason, setGoalDiffersReason] = useState<string>("");
  const [ambiguityQuestion, setAmbiguityQuestion] = useState<string>("");
  const [ambiguityCandidates, setAmbiguityCandidates] = useState<
    AmbiguityCandidate[]
  >([]);
  const [unfamiliarCandidateName, setUnfamiliarCandidateName] =
    useState<string>("");

  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [stages, setStages] = useState<ResearchStageEvent[]>([]);
  const [showStageDetails, setShowStageDetails] = useState(false);
  const [investigationError, setInvestigationError] = useState<string>("");
  const [generatedGuideResult, setGeneratedGuideResult] =
    useState<Guide | null>(null);

  const curatedGuides = initialGuides.filter(
    (g) => g.guideOrigin === "curated"
  );
  const generatedGuides = initialGuides.filter(
    (g) => g.guideOrigin === "generated"
  );

  const resetFeedbackStates = () => {
    setSearchError("");
    setMatchedGuide(null);
    setGoalDiffersReason("");
    setAmbiguityQuestion("");
    setAmbiguityCandidates([]);
    setUnfamiliarCandidateName("");
    setInvestigationError("");
    setGeneratedGuideResult(null);
    setStages([]);
    setShowStageDetails(false);
  };

  const handleSearchOrLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedbackStates();

    const trimmed = query.trim();
    if (!trimmed) {
      setSearchError(
        "Enter an application name (like GitHub or Spotify) or a website address."
      );
      return;
    }

    const localOutcome = searchGuidesLibrary(
      trimmed,
      initialGuides,
      integrationGoal,
      intendedAudience
    );

    if (localOutcome.identification.status === "invalid_input") {
      setSearchError(
        localOutcome.identification.errorMessage ??
          "That doesn't look like an app name or website."
      );
      return;
    }

    if (localOutcome.identification.status === "unsafe_url") {
      setSearchError(
        friendlyError(localOutcome.identification.errorMessage ?? "unsafe")
      );
      return;
    }

    if (localOutcome.identification.status === "ambiguous_provider") {
      setAmbiguityQuestion(
        localOutcome.identification.clarifyingQuestion ??
          "A few products share this name. Which one do you mean?"
      );
      setAmbiguityCandidates(
        localOutcome.identification.ambiguityCandidates ?? []
      );
      return;
    }

    if (localOutcome.identification.matchedGuide) {
      const matched = localOutcome.identification.matchedGuide;
      setMatchedGuide(matched);
      if (
        localOutcome.identification.goalDiffersMaterially &&
        localOutcome.identification.goalDifferenceReason
      ) {
        setGoalDiffersReason(localOutcome.identification.goalDifferenceReason);
      } else {
        router.push(`/guides/${matched.slug}`);
      }
      return;
    }

    setUnfamiliarCandidateName(
      localOutcome.identification.providerName ?? trimmed
    );
  };

  const executeLiveInvestigation = async (options?: {
    overrideQuery?: string;
    forceFresh?: boolean;
  }) => {
    const targetQuery = (options?.overrideQuery ?? query).trim();
    if (!targetQuery) {
      setSearchError("Enter an application name or website first.");
      return;
    }

    setIsInvestigating(true);
    setInvestigationError("");
    setGeneratedGuideResult(null);
    setStages([]);

    try {
      const res = await fetch("/api/investigate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: targetQuery,
          integrationGoal: integrationGoal.trim() || undefined,
          intendedAudience,
          forceFreshResearch: options?.forceFresh ?? false,
          stream: true,
        }),
      });

      const data = await readInvestigationStream(res, (event) =>
        setStages((prev) => {
          const idx = prev.findIndex((s) => s.stage === event.stage);
          if (idx < 0) return [...prev, event];
          const next = [...prev];
          next[idx] = event;
          return next;
        })
      );
      if (Array.isArray(data.stages) && data.stages.length > 0) {
        setStages(data.stages);
      }

      if (data.status === "ambiguous_clarification_needed") {
        setAmbiguityQuestion(
          data.clarifyingQuestion ?? "Which product do you mean?"
        );
        setAmbiguityCandidates(data.ambiguityCandidates ?? []);
        return;
      }

      if (data.status === "existing_guide_matched" && data.guide) {
        setMatchedGuide(data.guide);
        if (data.goalDiffersMaterially && data.goalDifferenceReason) {
          setGoalDiffersReason(data.goalDifferenceReason);
        }
        return;
      }

      if (
        data.status === "unsafe_url_rejected" ||
        data.status === "invalid_input" ||
        data.status === "research_failed"
      ) {
        setInvestigationError(
          friendlyError(
            data.errorMessage ?? "The research couldn't be completed."
          )
        );
        return;
      }

      if (
        (data.status === "generated_guide_saved" ||
          data.status === "partial_guide_saved") &&
        data.guide
      ) {
        setGeneratedGuideResult(data.guide);
        return;
      }

      setInvestigationError(
        data.errorMessage ?? "Something unexpected happened. Please try again."
      );
    } catch {
      setInvestigationError(
        "We couldn't reach the research service. Please try again."
      );
    } finally {
      setIsInvestigating(false);
    }
  };

  const completedStages = stages.filter((s) => s.status === "completed").length;
  const progressPercent =
    isInvestigating && stages.length === 0
      ? undefined
      : Math.round((completedStages / 7) * 100);
  const currentStage = isInvestigating
    ? [...stages].reverse().find((s) => s.status === "in_progress")
    : undefined;

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      {/* Hero */}
      <section
        id="investigate-panel"
        aria-labelledby="hero-heading"
        className="mx-auto max-w-2xl scroll-mt-20 pt-16 text-center sm:pt-24"
      >
        <h1
          id="hero-heading"
          className="text-3xl font-semibold leading-tight tracking-tight text-stone-900 sm:text-[2.6rem]"
        >
          Know what it actually takes to connect an external app.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-stone-500">
          Type any app or website. We&apos;ll tell you which login setup to
          use, how long it takes, and the problems other developers ran into.
        </p>

        <form onSubmit={handleSearchOrLookup} className="mt-9 text-left">
          <label htmlFor="app-search-input" className="sr-only">
            App name or website
          </label>
          <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_4px_24px_rgba(28,25,23,0.06)] focus-within:border-teal-400">
            <Search className="ml-3 h-5 w-5 shrink-0 text-stone-400" />
            <input
              id="app-search-input"
              data-testid="app-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try GitHub, Spotify, or any website…"
              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[16px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
            <button
              type="submit"
              data-testid="search-lookup-btn"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              Find guide
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
            {EXAMPLES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setQuery(item)}
                className="rounded-full border border-stone-200 bg-white/70 px-3 py-1 text-stone-600 hover:border-stone-300 hover:text-stone-900"
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              aria-expanded={showDetails}
              className="inline-flex items-center gap-1 px-2 py-1 text-stone-500 hover:text-teal-700"
            >
              {showDetails ? "Hide details" : "Add details (optional)"}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  showDetails ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          <div
            className={`mt-4 grid gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:grid-cols-2 ${
              showDetails ? "" : "hidden"
            }`}
          >
            <div>
              <label
                htmlFor="goal-input"
                className="block text-sm font-medium text-stone-700"
              >
                What do you want to do?
              </label>
              <input
                id="goal-input"
                data-testid="goal-input"
                type="text"
                value={integrationGoal}
                onChange={(e) => setIntegrationGoal(e.target.value)}
                placeholder="e.g. send emails, read issues"
                className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="audience-select"
                className="block text-sm font-medium text-stone-700"
              >
                Who will use it?
              </label>
              <select
                id="audience-select"
                data-testid="audience-select"
                value={intendedAudience}
                onChange={(e) =>
                  setIntendedAudience(e.target.value as Audience)
                }
                className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm focus:border-teal-400 focus:outline-none"
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Responses */}
        <div className="mt-6 space-y-4 text-left">
          {searchError && (
            <div
              role="alert"
              data-testid="search-error-banner"
              className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm leading-relaxed text-rose-900"
            >
              {searchError}
            </div>
          )}

          {ambiguityCandidates.length > 0 && (
            <div
              data-testid="ambiguity-clarification-box"
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <p className="font-medium text-stone-900">{ambiguityQuestion}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {ambiguityCandidates.map((cand) => (
                  <button
                    key={cand.id}
                    type="button"
                    data-testid={`ambiguity-option-${cand.id}`}
                    onClick={() => {
                      setQuery(cand.domain);
                      setAmbiguityCandidates([]);
                      setAmbiguityQuestion("");
                      setUnfamiliarCandidateName(cand.name);
                    }}
                    className="rounded-xl border border-stone-200 p-3.5 text-left hover:border-teal-400 hover:bg-teal-50/40"
                  >
                    <div className="font-medium text-stone-900">
                      {cand.name}
                    </div>
                    <div className="text-xs text-stone-400">{cand.domain}</div>
                    <p className="mt-1 text-sm text-stone-600">
                      {cand.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedGuide && (
            <div
              data-testid="matched-existing-guide-box"
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 font-medium text-stone-900">
                    <Check className="h-4 w-4 text-teal-600" />
                    We have a guide for {matchedGuide.applicationName}
                  </p>
                  {goalDiffersReason && (
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">
                      <span className="font-medium text-stone-800">
                        For your goal:{" "}
                      </span>
                      <RichText text={goalDiffersReason} />
                    </p>
                  )}
                </div>
                <Link
                  href={
                    goalDiffersReason
                      ? `/guides/${matchedGuide.slug}?goalNote=${encodeURIComponent(
                          goalDiffersReason
                        )}`
                      : `/guides/${matchedGuide.slug}`
                  }
                  data-testid="open-matched-guide-link"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
                >
                  Open guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}

          {unfamiliarCandidateName &&
            !isInvestigating &&
            !generatedGuideResult &&
            stages.length === 0 && (
              <div
                data-testid="unfamiliar-provider-prompt"
                className="rounded-2xl border border-stone-200 bg-white p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-stone-900">
                      We don&apos;t have a guide for {unfamiliarCandidateName}{" "}
                      yet
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-stone-500">
                      Our research agent can read the official docs and
                      developer forums and write one for you. It takes 3 to 6
                      minutes.
                    </p>
                  </div>
                  <button
                    type="button"
                    data-testid="confirm-live-research-btn"
                    onClick={() => executeLiveInvestigation()}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    <Sparkles className="h-4 w-4" />
                    Research it now
                  </button>
                </div>
              </div>
            )}

          {(isInvestigating || stages.length > 0) && (
            <div
              data-testid="research-progress-panel"
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium text-stone-900">
                  {isInvestigating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                      Researching {unfamiliarCandidateName || query}…
                    </>
                  ) : investigationError ? (
                    <>
                      <X className="h-4 w-4 text-rose-600" />
                      Research stopped
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 text-teal-600" />
                      Research finished
                    </>
                  )}
                </p>
                {!isInvestigating && stages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowStageDetails((v) => !v)}
                    className="text-sm text-stone-500 hover:text-teal-700"
                  >
                    {showStageDetails ? "Hide details" : "Show details"}
                  </button>
                )}
              </div>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                {progressPercent === undefined ? (
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-teal-400" />
                ) : (
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                )}
              </div>
              {isInvestigating && (
                <div className="mt-3 text-sm text-stone-500" aria-live="polite">
                  {currentStage ? (
                    <p data-testid="current-stage">
                      <span className="text-stone-700">
                        Step {Math.min(completedStages + 1, 7)} of 7:{" "}
                        {ACTIVE_STAGE_LABELS[currentStage.stage] ??
                          currentStage.label}
                      </span>
                      {currentStage.detail && (
                        <span className="block text-xs text-stone-400">
                          {cleanText(currentStage.detail)}
                        </span>
                      )}
                    </p>
                  ) : null}
                  <p className="mt-2">
                    Reading official docs, developer forums, and Composio&apos;s
                    catalog, then cross-checking everything. A full investigation
                    of a new app usually takes 3 to 6 minutes.
                  </p>
                </div>
              )}

              {showStageDetails && (
                <ul className="mt-4 space-y-2 text-sm">
                  {stages.map((st, idx) => (
                    <li
                      key={`${st.stage}-${idx}`}
                      className="flex items-start gap-2.5"
                    >
                      {st.status === "completed" ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                      ) : st.status === "failed" ? (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                      ) : (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-stone-300" />
                      )}
                      <span>
                        <span className="text-stone-800">
                          {STAGE_LABELS[st.stage] ?? st.label}
                        </span>
                        {st.detail && (
                          <span className="block text-xs text-stone-400">
                            {cleanText(st.detail)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {investigationError && (
                <div
                  role="alert"
                  data-testid="investigation-error-banner"
                  className="mt-4 rounded-xl bg-rose-50/70 p-4 text-sm text-rose-900"
                >
                  {investigationError}
                </div>
              )}

              {generatedGuideResult && (
                <div
                  data-testid="generated-guide-ready-banner"
                  className="mt-4 flex flex-col gap-3 rounded-xl bg-teal-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-teal-900">
                      Your {generatedGuideResult.applicationName} guide is
                      ready
                    </p>
                    <p className="mt-0.5 text-sm text-teal-900/70">
                      {cleanText(
                        generatedGuideResult.authenticationAssessment
                          .verdictHeadline
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/guides/${generatedGuideResult.slug}`}
                    data-testid="open-generated-guide-link"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
                  >
                    Open guide
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section
        aria-label="How it works"
        className="mx-auto mt-16 grid max-w-3xl gap-6 text-center sm:grid-cols-3"
      >
        {[
          {
            icon: Search,
            title: "Tell us the app",
            text: "Any app name or website.",
          },
          {
            icon: Sparkles,
            title: "We do the research",
            text: "Official docs plus real developer reports.",
          },
          {
            icon: ShieldCheck,
            title: "You get a clear plan",
            text: "Steps, wait times, and pitfalls — with sources.",
          },
        ].map((s) => (
          <div key={s.title}>
            <s.icon className="mx-auto h-5 w-5 text-teal-600" />
            <p className="mt-2 font-medium text-stone-800">{s.title}</p>
            <p className="mt-0.5 text-sm text-stone-500">{s.text}</p>
          </div>
        ))}
      </section>

      {/* Curated guides */}
      <section
        id="curated-library"
        aria-labelledby="heading-curated"
        className="mt-20 scroll-mt-20"
      >
        <h2
          id="heading-curated"
          className="text-xl font-semibold text-stone-900"
        >
          Ready-made guides
        </h2>
        <p className="mt-1 text-[15px] text-stone-500">
          Researched by hand and checked against official docs and developer
          reports.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {curatedGuides.map((guide) => {
            const intro = getPlainIntro(guide);
            return (
              <article
                key={guide.id}
                data-testid={`curated-card-${guide.slug}`}
                className="group flex flex-col justify-between rounded-2xl border border-stone-200/80 bg-white p-6 transition-shadow hover:shadow-[0_6px_24px_rgba(28,25,23,0.06)]"
              >
                <div>
                  <h3 className="text-lg font-semibold text-stone-900">
                    <Link href={`/guides/${guide.slug}`}>
                      {guide.applicationName}
                    </Link>
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
                    {intro.oneLiner}
                  </p>
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-stone-400">
                    <Clock className="h-3.5 w-3.5" />
                    {
                      DIFFICULTY_LABELS[
                        guide.difficultyAndEffort.difficultyCategory
                      ]
                    }
                  </span>
                  <Link
                    href={`/guides/${guide.slug}`}
                    data-testid={`open-guide-${guide.slug}`}
                    className="inline-flex items-center gap-1 font-medium text-teal-700 hover:text-teal-800"
                  >
                    Read guide
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {generatedGuides.length > 0 && (
        <section aria-labelledby="heading-generated" className="mt-14">
          <h2
            id="heading-generated"
            className="text-xl font-semibold text-stone-900"
          >
            Guides made by the research agent
          </h2>
          <p className="mt-1.5 text-[15px] text-stone-600">
            Written live from web research and not reviewed by a person.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {generatedGuides.map((gen) => (
              <Link
                key={gen.id}
                href={`/guides/${gen.slug}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-stone-200/80 bg-white px-4 py-3.5 text-[15px] font-medium text-stone-800 hover:border-teal-300"
              >
                {gen.applicationName}
                <ArrowRight className="h-4 w-4 text-stone-400" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
