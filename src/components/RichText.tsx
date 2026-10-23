"use client";

import React, { Fragment, useId, useState } from "react";
import {
  cleanText,
  findTermForCode,
  findTermForMatch,
  GLOSSARY_SCAN_REGEX,
  GlossaryTerm,
} from "@/lib/ui/glossary";

function Term({
  term,
  children,
}: {
  term: GlossaryTerm;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label={`${term.label}: what does this mean?`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onBlur={() => setOpen(false)}
        className="inline cursor-help text-inherit underline decoration-teal-400/80 decoration-dotted decoration-2 underline-offset-4 hover:decoration-teal-600"
      >
        {children}
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute left-0 top-full z-50 mt-2 block w-72 max-w-[80vw] rounded-xl bg-stone-800 p-3.5 text-left text-[13px] font-normal leading-relaxed text-stone-100 shadow-xl"
        >
          <span className="mb-1 block font-semibold text-white">
            {term.label}
          </span>
          {term.definition}
        </span>
      )}
    </span>
  );
}

function annotatePlain(
  text: string,
  seen: Set<string>,
  keyPrefix: string
): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(GLOSSARY_SCAN_REGEX.source, "gi");
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    const matched = match[0];
    if (!matched) {
      regex.lastIndex++;
      continue;
    }
    const term = findTermForMatch(matched);
    if (!term || seen.has(term.key)) continue;
    seen.add(term.key);
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <Term key={`${keyPrefix}-${i++}`} term={term}>
        {matched}
      </Term>
    );
    lastIndex = match.index + matched.length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

interface RichTextProps {
  text: string;
  annotate?: boolean;
  className?: string;
}

/**
 * Renders guide text in plain, readable form:
 * removes internal research IDs, styles `code` as soft chips,
 * and explains technical terms on hover/tap the first time they appear.
 */
export function RichText({ text, annotate = true, className }: RichTextProps) {
  const cleaned = cleanText(text);
  const seen = new Set<string>();
  const parts = cleaned.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
          const inner = part.slice(2, -2);
          return (
            <strong key={idx} className="font-semibold text-stone-900">
              {annotate ? annotatePlain(inner, seen, `b${idx}`) : inner}
            </strong>
          );
        }
        part = part.replace(/\*\*/g, "");
        if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
          const code = part.slice(1, -1);
          const chip = (
            <code className="rounded-md bg-stone-100 px-1.5 py-0.5 font-mono text-[0.85em] text-stone-700">
              {code}
            </code>
          );
          const term = annotate ? findTermForCode(code) : undefined;
          if (term && !seen.has(term.key)) {
            seen.add(term.key);
            return (
              <Term key={idx} term={term}>
                {chip}
              </Term>
            );
          }
          return <Fragment key={idx}>{chip}</Fragment>;
        }
        return (
          <Fragment key={idx}>
            {annotate ? annotatePlain(part, seen, `t${idx}`) : part}
          </Fragment>
        );
      })}
    </span>
  );
}
