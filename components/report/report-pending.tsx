"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CircleAlert, X } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useLiveCourse } from "@/lib/course-store";
import { useReveal } from "@/lib/motion";
import { PIPELINE_STAGES, STAGE_LABELS } from "@/lib/status";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const SKELETON_ROWS = 4;

export function ReportPending({ course }: { course: Course }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  const live = useLiveCourse(course);
  const failed = live.stage === "Failed";
  const failedIndex = failed
    ? PIPELINE_STAGES.indexOf(live.failedAtStage ?? "Extracting")
    : -1;
  const currentIndex = failed
    ? failedIndex
    : PIPELINE_STAGES.indexOf(live.stage);

  const artifactEntries = [
    { label: "pages discovered", value: live.artifacts.pages },
    { label: "videos discovered", value: live.artifacts.videos },
    { label: "assignments discovered", value: live.artifacts.assignments },
    { label: "discussions discovered", value: live.artifacts.discussions },
  ];

  return (
    <div ref={rootRef}>
      <Link
        href="/dashboard"
        data-reveal
        className="-my-3 inline-flex items-center gap-1.5 rounded-lg py-3 text-[13px] font-medium text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        All courses
      </Link>

      <header data-reveal className="mt-5">
        <span className="rounded-md border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
          {live.code}
        </span>
        <h1 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-tight sm:text-[34px]">
          {live.title}
        </h1>
        <p className="mt-2 text-sm text-foreground/70">
          {live.term} · Ingested {live.ingestedAt}
        </p>
      </header>

      <section
        data-reveal
        aria-label="Analysis progress"
        className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
      >
        <ol className="flex flex-col gap-5 sm:flex-row sm:gap-2">
          {PIPELINE_STAGES.map((stage, i) => {
            const state = failed
              ? i < failedIndex
                ? "done"
                : i === failedIndex
                  ? "failed"
                  : "todo"
              : i < currentIndex
                ? "done"
                : i === currentIndex
                  ? "active"
                  : "todo";
            return (
              <li
                key={stage}
                className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2.5 sm:text-center"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    state === "done" && "bg-foreground text-background",
                    state === "active" &&
                      "border-2 border-foreground bg-background",
                    state === "failed" &&
                      "border-2 border-destructive bg-background text-destructive",
                    state === "todo" && "border border-border bg-background",
                  )}
                >
                  {state === "done" ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : state === "failed" ? (
                    <X className="size-3.5" strokeWidth={3} />
                  ) : state === "active" ? (
                    <span className="pulse-dot size-2 rounded-full bg-foreground" />
                  ) : null}
                </span>
                <span
                  className={cn(
                    "text-[12.5px]",
                    state === "active" || state === "failed"
                      ? "font-semibold"
                      : state === "done"
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {STAGE_LABELS[stage]}
                  {state === "active" ? (
                    <span className="sr-only"> (current stage)</span>
                  ) : state === "failed" ? (
                    <span className="sr-only"> (failed at this stage)</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>

        {failed ? (
          <div className="mt-8 rounded-xl border border-destructive/25 bg-[color-mix(in_oklab,var(--destructive)_6%,var(--card))] p-5">
            <h2 className="flex items-center gap-2 text-[14px] font-semibold tracking-tight">
              <CircleAlert
                aria-hidden
                strokeWidth={2.25}
                className="size-4 text-destructive"
              />
              {STAGE_LABELS[live.failedAtStage ?? "Extracting"]} stopped
            </h2>
            <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed">
              {live.failureReason}
            </p>
            <p className="mt-1.5 max-w-[68ch] text-[12.5px] leading-relaxed text-muted-foreground">
              Nothing was analyzed, and no partial report was produced. The
              uploaded cartridge is not retained after a run, so ingest it again
              to try another analysis.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-[14px] font-semibold text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <ArrowLeft aria-hidden className="size-4" />
              Back to ingest
            </Link>
          </div>
        ) : (
          <div className="mt-8">
            {/* No percentage: the backend reports only that a run is in
                flight, never how far along it is. */}
            <ProgressBar
              value={40}
              indeterminate
              label={`${live.code} analysis in progress`}
              shimmer
            />
            <p className="mt-2.5 text-[12.5px] text-muted-foreground">
              {live.stageDetail}
            </p>
          </div>
        )}
      </section>

      {failed ? null : live.stage === "Queued" ? (
        <p data-reveal className="mt-6 text-[13.5px] leading-relaxed text-muted-foreground">
          The cartridge is uploaded and waiting for an analysis slot. Artifact
          counts appear as soon as extraction begins.
        </p>
      ) : (
        <dl
          data-reveal
          aria-label="Artifacts discovered so far"
          className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {artifactEntries.map((entry) => (
            <div
              key={entry.label}
              className="flex flex-col-reverse gap-1 rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-card)]"
            >
              <dt className="text-[12px] text-muted-foreground">
                {entry.label}
              </dt>
              <dd className="text-[24px] font-semibold leading-none tabular-nums tracking-tight">
                {entry.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <section data-reveal aria-labelledby="pending-report-heading" className="mt-12">
        <h2
          id="pending-report-heading"
          className="text-[15px] font-semibold tracking-tight"
        >
          Rubric report
        </h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {failed
            ? "The 25-standard report unlocks after a successful analysis."
            : "The 25-standard report unlocks the moment analysis completes."}
        </p>
        <div className="mt-4 space-y-2" aria-hidden>
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-[52px] rounded-xl border border-border bg-foreground/[0.02]",
                !failed && "skeleton-shimmer",
              )}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
