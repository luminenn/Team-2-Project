"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import {
  ArrowRight,
  CircleAlert,
  CircleCheck,
  ClipboardList,
  FileText,
  Flag,
  Video,
} from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusChip } from "@/components/report/status-chip";
import { prefersReducedMotion, useCountUp } from "@/lib/motion";
import { STAGE_LABELS, STATUS_META } from "@/lib/status";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

/* Stretched-link row: the wrapper carries layout and the card treatment,
   an absolutely positioned link covers it (z-1), and the flag pill sits
   above it at z-2 so nothing nests inside an <a>. */
export function CourseRow({ course }: { course: Course }) {
  const report = course.report;
  const failed = course.stage === "Failed";
  const scoreRef = useRef<HTMLSpanElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);
  const flags = report
    ? report.statusCounts.Approaching + report.statusCounts.Incomplete
    : null;
  const hasIncomplete = (report?.statusCounts.Incomplete ?? 0) > 0;

  useCountUp(scoreRef, report?.overallScore ?? 0);

  const sweepSheen = () => {
    if (!sheenRef.current || prefersReducedMotion()) return;
    gsap.fromTo(
      sheenRef.current,
      { xPercent: -160, opacity: 1 },
      { xPercent: 480, duration: 0.75, ease: "power2.inOut", overwrite: true },
    );
  };

  return (
    <div
      data-reveal
      onPointerEnter={sweepSheen}
      className={cn(
        "group relative flex flex-col gap-4 rounded-2xl border px-5 shadow-[var(--shadow-card)] transition-[translate,border-color,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] has-[[data-row-link]:focus-visible]:ring-2 has-[[data-row-link]:focus-visible]:ring-ring has-[[data-row-link]:focus-visible]:ring-offset-2 has-[[data-row-link]:focus-visible]:ring-offset-background motion-reduce:transition-colors motion-reduce:hover:translate-y-0 md:px-7 lg:grid lg:grid-cols-[minmax(0,1fr)_172px_112px_172px_18px] lg:items-center lg:gap-x-8",
        report ? "py-5" : "py-4",
        hasIncomplete
          ? "border-status-incomplete/25 bg-[color-mix(in_oklab,var(--status-incomplete)_6%,var(--card))] hover:border-status-incomplete/40 hover:bg-[color-mix(in_oklab,var(--status-incomplete)_9%,var(--card))] dark:border-status-incomplete/30"
          : "border-border bg-card hover:border-foreground/15 hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--card))]",
      )}
    >
      <Link
        href={`/dashboard/${course.id}`}
        data-row-link
        aria-label={`${course.code}: ${course.title}`}
        className="absolute inset-0 z-[1] rounded-2xl focus-visible:outline-none"
      />

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="rounded-md border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
            {course.code}
          </span>
          {report ? (
            <StatusChip status={report.overallStatus} />
          ) : failed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium">
              <CircleAlert
                aria-hidden
                strokeWidth={2.25}
                className="size-3.5 text-destructive"
              />
              {STAGE_LABELS.Failed}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
              <span
                aria-hidden
                className={cn(
                  "size-2 rounded-full",
                  course.stage === "Queued"
                    ? "bg-muted-foreground/50"
                    : "pulse-dot bg-foreground",
                )}
              />
              {STAGE_LABELS[course.stage]}
            </span>
          )}
        </div>
        <h3
          className={cn(
            "mt-2.5 truncate font-semibold tracking-tight",
            report
              ? "text-[18px]"
              : cn("text-[16px]", !failed && "text-foreground/75"),
          )}
        >
          {course.title}
        </h3>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {report ? `Audited ${report.auditedAt}` : `Ingested ${course.ingestedAt}`}
        </p>
      </div>

      {failed ? (
        <p className="flex items-center text-[12.5px] leading-snug text-muted-foreground">
          Nothing extracted from the cartridge yet
        </p>
      ) : (
        <p className="flex items-center gap-4 text-[13px] tabular-nums text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText aria-hidden className="size-3.5" />
            {course.artifacts.pages}
            <span className="sr-only"> pages</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Video aria-hidden className="size-3.5" />
            {course.artifacts.videos}
            <span className="sr-only"> videos</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList aria-hidden className="size-3.5" />
            {course.artifacts.assignments}
            <span className="sr-only"> assignments</span>
          </span>
        </p>
      )}

      <p className="flex items-center">
        {failed ? (
          <span className="text-[12.5px] text-muted-foreground">
            Not analyzed
          </span>
        ) : flags === null ? (
          <span className="text-[12.5px] text-muted-foreground">
            Flags pending
          </span>
        ) : flags > 0 ? (
          <Link
            href={`/dashboard/${course.id}?status=${hasIncomplete ? "Incomplete" : "Approaching"}`}
            className={cn(
              "relative z-[2] inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums transition-colors before:absolute before:-inset-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              hasIncomplete
                ? "bg-status-incomplete/[0.13] hover:bg-status-incomplete/[0.18]"
                : "bg-status-approaching/[0.15] hover:bg-status-approaching/[0.25]",
            )}
          >
            <Flag
              aria-hidden
              strokeWidth={2.25}
              className={cn(
                "size-3.5",
                hasIncomplete
                  ? "text-status-incomplete"
                  : "text-status-approaching",
              )}
            />
            {flags} {flags === 1 ? "flag" : "flags"}
            <span className="sr-only">, view flagged standards in {course.code}</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] tabular-nums text-muted-foreground">
            <CircleCheck aria-hidden className="size-3.5 text-status-aligned" />
            0 flags
          </span>
        )}
      </p>

      <div>
        {report ? (
          <>
            <p className="flex items-baseline justify-between">
              <span
                className={cn(
                  "font-semibold leading-none tabular-nums tracking-tight",
                  hasIncomplete
                    ? "text-[30px] text-status-incomplete"
                    : "text-[26px]",
                )}
              >
                <span ref={scoreRef}>{report.overallScore}</span>
              </span>
              <span className="text-[11px] text-muted-foreground">of 100</span>
            </p>
            <div className="relative mt-2 overflow-hidden rounded-full">
              <ProgressBar
                value={report.overallScore}
                label={`${course.code} alignment score: ${report.overallScore} of 100`}
                fillClassName={STATUS_META[report.overallStatus].dot}
              />
              <span
                ref={sheenRef}
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 dark:via-white/25"
              />
            </div>
          </>
        ) : failed ? (
          <div className="flex flex-col items-start">
            <p className="text-[12.5px] font-medium">
              Failed while{" "}
              {STAGE_LABELS[course.failedAtStage ?? "Extracting"].toLowerCase()}
            </p>
            <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
              Ingest the cartridge again to retry
            </p>
          </div>
        ) : (
          <div>
            <p className="flex items-baseline justify-between">
              <span className="text-[12.5px] font-medium text-foreground/75">
                {course.stage === "Queued" ? "Waiting to start" : "In progress"}
              </span>
              <span className="text-[12px] tabular-nums text-muted-foreground">
                {course.progress}%
              </span>
            </p>
            <ProgressBar
              value={course.progress}
              label={`${course.code} analysis progress: ${course.progress} percent`}
              className="mt-2"
              shimmer={course.stage !== "Queued"}
            />
          </div>
        )}
      </div>

      <ArrowRight
        aria-hidden
        className="hidden size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 lg:block"
      />
    </div>
  );
}
