"use client";

import { useRef } from "react";
import { CircleAlert } from "lucide-react";
import { CourseRow } from "@/components/dashboard/course-row";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { IngestButton } from "@/components/dashboard/ingest-dialog";
import { useBackendReachable, useCourses } from "@/lib/course-store";
import { useCountUp, useReveal } from "@/lib/motion";
import { STATUS_ORDER } from "@/lib/status";
import type { AlignmentStatus, Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY: Record<AlignmentStatus, number> = {
  Incomplete: 0,
  Approaching: 1,
  Aligned: 2,
  Exceptional: 3,
};

function StatNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useCountUp(ref, value, { duration: 0.8, delay: 0.2 });
  return <span ref={ref}>{value}</span>;
}

function CourseGroup({
  heading,
  courses,
}: {
  heading: string;
  courses: Course[];
}) {
  if (courses.length === 0) return null;
  return (
    <div className="mt-10 first:mt-9">
      <h2
        data-reveal
        className="flex items-baseline gap-2 px-1 text-[13px] font-medium text-muted-foreground"
      >
        {heading}
        <span aria-hidden className="tabular-nums text-muted-foreground">
          {courses.length}
        </span>
        <span className="sr-only">
          , {courses.length} {courses.length === 1 ? "course" : "courses"}
        </span>
      </h2>
      <div className="mt-3 space-y-2.5">
        {courses.map((course) => (
          <CourseRow key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

export function DashboardView() {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  const courses = useCourses();
  const backendReachable = useBackendReachable();
  const sorted = [...courses].sort((a, b) => {
    if (a.report && b.report) {
      return (
        SEVERITY[a.report.overallStatus] - SEVERITY[b.report.overallStatus] ||
        a.report.overallScore - b.report.overallScore
      );
    }
    if (a.report) return -1;
    if (b.report) return 1;
    const failedFirst =
      Number(b.stage === "Failed") - Number(a.stage === "Failed");
    return failedFirst || b.progress - a.progress;
  });

  const needsAttention = sorted.filter(
    (c) =>
      c.report &&
      (c.report.overallStatus === "Incomplete" ||
        c.report.overallStatus === "Approaching"),
  );
  const aligned = sorted.filter(
    (c) =>
      c.report &&
      (c.report.overallStatus === "Aligned" ||
        c.report.overallStatus === "Exceptional"),
  );
  const processing = sorted.filter((c) => !c.report);
  const analyzing = processing.filter((c) => c.stage !== "Failed");
  const failedCount = processing.length - analyzing.length;

  const hasIncompleteCourse = needsAttention.some(
    (c) => c.report?.overallStatus === "Incomplete",
  );

  const aggregate: Record<AlignmentStatus, number> = {
    Exceptional: 0,
    Aligned: 0,
    Approaching: 0,
    Incomplete: 0,
  };
  for (const c of courses) {
    if (!c.report) continue;
    for (const s of STATUS_ORDER) aggregate[s] += c.report.statusCounts[s];
  }
  const auditedCount = courses.length - processing.length;
  const totalStandards = STATUS_ORDER.reduce((sum, s) => sum + aggregate[s], 0);

  return (
    <div ref={rootRef}>
      <section aria-labelledby="overview-heading">
        <div
          data-reveal
          className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5"
        >
          <div>
            <h1
              id="overview-heading"
              className="text-[30px] font-semibold tracking-tight sm:text-[34px]"
            >
              Course reviews
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              Fall 2026 cycle · {courses.length} courses in review
            </p>
            {backendReachable ? null : (
              <p
                role="status"
                className="mt-2 flex items-center gap-1.5 text-[12.5px] text-destructive-ink"
              >
                <CircleAlert aria-hidden className="size-3.5 shrink-0" />
                Analysis backend unreachable, so live runs may be out of date.
              </p>
            )}
          </div>
          <IngestButton />
        </div>

        <div
          data-reveal
          className="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6 border-t border-border pt-6"
        >
          <dl className="flex flex-wrap gap-y-4">
            <div className="pr-7 sm:pr-9">
              <dt className="text-[12px] font-medium text-muted-foreground">
                Needs attention
              </dt>
              <dd className="mt-2 flex items-center gap-2.5 text-[24px] font-semibold leading-none tracking-tight">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    needsAttention.length === 0
                      ? "bg-muted-foreground/40"
                      : hasIncompleteCourse
                        ? "bg-status-incomplete"
                        : "bg-status-approaching",
                  )}
                />
                <span className="tabular-nums">
                  <StatNumber value={needsAttention.length} />
                </span>
              </dd>
            </div>
            <div className="border-l border-border px-7 sm:px-9">
              <dt className="text-[12px] font-medium text-muted-foreground">
                Aligned
              </dt>
              <dd className="mt-2 flex items-center gap-2.5 text-[24px] font-semibold leading-none tracking-tight">
                <span
                  aria-hidden
                  className="size-2 shrink-0 rounded-full bg-status-aligned"
                />
                <span className="tabular-nums">
                  <StatNumber value={aligned.length} />
                </span>
              </dd>
            </div>
            <div className="border-l border-border px-7 sm:px-9">
              <dt className="text-[12px] font-medium text-muted-foreground">
                Analyzing
              </dt>
              <dd className="mt-2 flex items-center gap-2.5 text-[24px] font-semibold leading-none tracking-tight">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    analyzing.some((c) => c.stage !== "Queued")
                      ? "pulse-dot bg-foreground"
                      : "bg-muted-foreground/40",
                  )}
                />
                <span className="tabular-nums">
                  <StatNumber value={analyzing.length} />
                </span>
              </dd>
            </div>
            {failedCount > 0 ? (
              <div className="border-l border-border pl-7 sm:pl-9">
                <dt className="text-[12px] font-medium text-muted-foreground">
                  Failed
                </dt>
                <dd className="mt-2 flex items-center gap-2.5 text-[24px] font-semibold leading-none tracking-tight">
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full bg-destructive"
                  />
                  <span className="tabular-nums">
                    <StatNumber value={failedCount} />
                  </span>
                </dd>
              </div>
            ) : null}
          </dl>

          {totalStandards > 0 ? (
            <div className="w-full min-w-[260px] max-w-[440px] sm:w-auto sm:flex-1">
              <p className="flex items-baseline justify-between gap-4 text-[12px] font-medium text-muted-foreground">
                <span>
                  Standards across {auditedCount} audited{" "}
                  {auditedCount === 1 ? "course" : "courses"}
                </span>
                <span className="tabular-nums">{totalStandards}</span>
              </p>
              <DistributionBar counts={aggregate} showLegend className="mt-2.5" />
            </div>
          ) : null}
        </div>

        <CourseGroup heading="Needs attention" courses={needsAttention} />
        <CourseGroup heading="Aligned" courses={aligned} />
        <CourseGroup heading="In the pipeline" courses={processing} />
      </section>
    </div>
  );
}
