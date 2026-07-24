"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronsDownUp,
  ChevronsUpDown,
  Flag,
  Printer,
  RotateCcw,
  Search,
} from "lucide-react";
import { DistributionBar } from "@/components/dashboard/distribution-bar";
import { PrintReport } from "@/components/report/print-report";
import { ReportPending } from "@/components/report/report-pending";
import { ScoreRing } from "@/components/report/score-ring";
import { SectionDiscussion } from "@/components/report/section-discussion";
import { StandardCard } from "@/components/report/standard-card";
import { StatusChip } from "@/components/report/status-chip";
import { listComments, type BackendComment } from "@/lib/api/backend";
import { requestRerun, useRerunRequested } from "@/lib/course-store";
import { useReveal } from "@/lib/motion";
import { STATUS_ORDER } from "@/lib/status";
import type { Course, PocrSection } from "@/lib/types";
import { cn } from "@/lib/utils";

const SECTION_FILTERS: {
  key: string;
  label: string;
  section?: PocrSection;
}[] = [
  { key: "ALL", label: "All standards" },
  { key: "s1", label: "Policies & Support", section: "Section 1" },
  { key: "s2", label: "Course Structure", section: "Section 2" },
  { key: "s3", label: "Interaction (RSI)", section: "Section 3" },
  { key: "s4", label: "Assessments", section: "Section 4" },
  {
    key: "a11y",
    label: "Accessibility",
    section: "Accessibility Verification",
  },
];

export function ReportView({
  course,
  runId,
}: {
  course: Course;
  runId?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(new Set());
  const [comments, setComments] = useState<BackendComment[]>([]);
  const rerunRequested = useRerunRequested(course.id);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    listComments(runId)
      .then((loaded) => {
        if (!cancelled) setComments(loaded);
      })
      .catch(() => {
        /* Backend unavailable: notes stay empty and posting will surface
           its own error. */
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  const report = course.report;
  const evaluations = useMemo(() => report?.evaluations ?? [], [report]);

  const sectionKey = SECTION_FILTERS.some(
    (f) => f.key === searchParams.get("section"),
  )
    ? (searchParams.get("section") as string)
    : "ALL";
  const statusParam = STATUS_ORDER.some(
    (s) => s === searchParams.get("status"),
  )
    ? (searchParams.get("status") as string)
    : "ALL";

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "ALL") params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const activeSection = SECTION_FILTERS.find((f) => f.key === sectionKey);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return evaluations.filter((e) => {
      if (activeSection?.section && e.section !== activeSection.section)
        return false;
      if (statusParam !== "ALL" && e.status !== statusParam) return false;
      if (q) {
        return (
          e.title.toLowerCase().includes(q) ||
          e.standardCode.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.findings.some((f) => f.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [evaluations, activeSection, statusParam, query]);

  const sectionStats = useMemo(
    () =>
      SECTION_FILTERS.map((f) => {
        const inSection = f.section
          ? evaluations.filter((e) => e.section === f.section)
          : evaluations;
        return {
          ...f,
          total: inSection.length,
          flagged: inSection.filter(
            (e) => e.status === "Approaching" || e.status === "Incomplete",
          ).length,
        };
      }),
    [evaluations],
  );

  if (!report) return <ReportPending course={course} />;

  const hasActiveFilters =
    sectionKey !== "ALL" || statusParam !== "ALL" || query.trim() !== "";
  const flagged =
    report.statusCounts.Approaching + report.statusCounts.Incomplete;
  const hasIncomplete = report.statusCounts.Incomplete > 0;
  const allOpen =
    filtered.length > 0 && filtered.every((e) => openIds.has(e.standardId));

  const clearFilters = () => {
    setQuery("");
    router.replace(pathname, { scroll: false });
  };

  const toggleCard = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const visible = filtered.map((e) => e.standardId);
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (allOpen) for (const id of visible) next.delete(id);
      else for (const id of visible) next.add(id);
      return next;
    });
  };

  const sectionGroups =
    sectionKey === "ALL"
      ? SECTION_FILTERS.filter((f) => f.section)
          .map((f) => ({
            key: f.key,
            label: f.label,
            items: filtered.filter((e) => e.section === f.section),
          }))
          .filter((g) => g.items.length > 0)
      : null;

  return (
    <div ref={rootRef}>
      <div className="print:hidden">
        <div data-reveal className="flex flex-wrap items-center gap-x-5">
          <Link
            href="/dashboard"
            className="-my-3 inline-flex items-center gap-1.5 rounded-lg py-3 text-[13px] font-medium text-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowLeft aria-hidden className="size-3.5" />
            All courses
          </Link>
          <a
            href="#standards-list"
            className="sr-only focus:not-sr-only focus:absolute focus:left-5 focus:top-5 focus:z-50 focus:rounded-xl focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
          >
            Skip to standards list
          </a>
        </div>

        <header className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div data-reveal className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md border border-border bg-foreground/[0.04] px-2 py-0.5 text-[11px] font-semibold tracking-wide text-muted-foreground">
                {course.code}
              </span>
              <StatusChip status={report.overallStatus} />
            </div>
            <h1 className="mt-3 text-[28px] font-semibold leading-[1.1] tracking-tight sm:text-[34px]">
              {course.title}
            </h1>
            <p className="mt-2 text-sm text-foreground/70">
              {course.term} · Audited {report.auditedAt}
            </p>
            {flagged > 0 ? (
              <p className="mt-5 max-w-[58ch] rounded-xl border border-border bg-foreground/[0.04] px-4 py-3 text-[13.5px] leading-relaxed">
                <Flag
                  aria-hidden
                  strokeWidth={2.25}
                  className={cn(
                    "mr-2 inline size-3.5 -translate-y-px",
                    hasIncomplete
                      ? "text-status-incomplete"
                      : "text-status-approaching",
                  )}
                />
                <span className="font-semibold">Start here:</span>{" "}
                {report.topIssue}.
              </p>
            ) : null}
          </div>

          <div
            data-reveal
            className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-6"
          >
            <div className="w-[236px]">
              <p className="text-[12px] font-medium text-muted-foreground">
                {evaluations.length} standards
              </p>
              <DistributionBar
                counts={report.statusCounts}
                showLegend
                className="mt-2"
                activeStatus={statusParam}
                onFilter={(s) => setParam("status", s)}
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-foreground/[0.06] px-5 text-[13.5px] font-medium transition-colors hover:bg-foreground/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Printer aria-hidden className="size-4" />
                  Export report
                </button>
                {/* A real run keeps no cartridge to re-analyze, so the button
                    would queue nothing and is left out for those. */}
                {course.source === "backend" ? null : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rerunRequested) requestRerun(course.id);
                      }}
                      aria-disabled={rerunRequested}
                      className={cn(
                        "inline-flex h-11 items-center gap-2 rounded-full border border-border bg-foreground/[0.06] px-5 text-[13.5px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        rerunRequested
                          ? "cursor-default text-muted-foreground"
                          : "cursor-pointer hover:bg-foreground/[0.1]",
                      )}
                    >
                      {rerunRequested ? (
                        <Check
                          aria-hidden
                          className="size-4 text-status-aligned"
                        />
                      ) : (
                        <RotateCcw aria-hidden className="size-4" />
                      )}
                      {rerunRequested ? "Re-analysis queued" : "Re-run analysis"}
                    </button>
                    <span role="status" className="sr-only">
                      {rerunRequested
                        ? `Re-analysis queued for ${course.code}. The current report stays available until the new one is ready.`
                        : null}
                    </span>
                  </>
                )}
              </div>
            </div>
            <ScoreRing
              score={report.overallScore}
              status={report.overallStatus}
              size={136}
              strokeWidth={8}
            />
          </div>
        </header>

        <div className="mt-12 flex flex-col gap-8 lg:flex-row">
          <aside
            data-reveal
            className="shrink-0 lg:sticky lg:top-6 lg:w-[236px] lg:self-start"
          >
            <div className="relative">
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-[15px] -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search standards and findings"
                placeholder="Search standards"
                className="h-11 w-full rounded-xl border border-border bg-foreground/[0.04] pl-9 pr-3 text-[13.5px] text-foreground transition-colors placeholder:text-foreground/70 focus-visible:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              />
            </div>

            <nav aria-label="Rubric sections" className="mt-4">
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {sectionStats.map((f) => {
                  const active = sectionKey === f.key;
                  return (
                    <li key={f.key} className="lg:w-full">
                      <button
                        type="button"
                        onClick={() => setParam("section", f.key)}
                        aria-pressed={active}
                        className={cn(
                          "flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3.5 text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full lg:justify-between",
                          active
                            ? "bg-foreground/[0.07] font-medium text-foreground"
                            : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                        )}
                      >
                        <span>{f.label}</span>
                        <span className="flex items-center gap-1.5 text-[12px] tabular-nums">
                          {f.flagged > 0 ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                              <span
                                aria-hidden
                                className="size-1.5 rounded-full bg-status-approaching"
                              />
                              <span aria-label={`${f.flagged} flagged`}>
                                {f.flagged}
                              </span>
                            </span>
                          ) : null}
                          <span className="text-muted-foreground">
                            {f.total}
                            <span className="sr-only"> standards</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="mt-5 border-t border-border pt-5">
              <p className="text-[12px] font-medium text-muted-foreground">
                Filter by status
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {(["ALL", ...STATUS_ORDER] as const).map((s) => {
                  const active = statusParam === s;
                  const count =
                    s === "ALL"
                      ? evaluations.length
                      : report.statusCounts[s];
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setParam("status", s)}
                      aria-pressed={active}
                      className={cn(
                        "flex h-11 cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 text-[13.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-full",
                        active
                          ? "bg-foreground/[0.07] font-medium text-foreground"
                          : "text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {s !== "ALL" ? (
                          <span
                            aria-hidden
                            className={cn(
                              "size-1.5 rounded-full",
                              s === "Exceptional" && "bg-status-exceptional",
                              s === "Aligned" && "bg-status-aligned",
                              s === "Approaching" && "bg-status-approaching",
                              s === "Incomplete" && "bg-status-incomplete",
                            )}
                          />
                        ) : null}
                        {s === "ALL" ? "All statuses" : s}
                      </span>
                      <span className="text-[12px] tabular-nums text-muted-foreground">
                        {count}
                        <span className="sr-only"> standards</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          <section
            id="standards-list"
            tabIndex={-1}
            aria-labelledby="standards-heading"
            data-reveal
            className="min-w-0 flex-1 focus-visible:outline-none"
          >
            <h2 id="standards-heading" className="sr-only">
              Evaluated rubric standards
            </h2>
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 pb-3">
              <p aria-live="polite" className="text-[13px] text-muted-foreground">
                <span className="tabular-nums">{filtered.length}</span> of{" "}
                <span className="tabular-nums">{evaluations.length}</span>{" "}
                standards shown
              </p>
              <div className="flex items-center gap-5">
                {filtered.length > 1 ? (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="-my-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {allOpen ? (
                      <ChevronsDownUp aria-hidden className="size-3.5" />
                    ) : (
                      <ChevronsUpDown aria-hidden className="size-3.5" />
                    )}
                    {allOpen ? "Collapse all" : "Expand all"}
                  </button>
                ) : null}
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="-my-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <RotateCcw aria-hidden className="size-3.5" />
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
                {sectionGroups ? (
                  sectionGroups.map((group) => (
                    <div key={group.key}>
                      <h3 className="border-b border-border bg-foreground/[0.02] px-5 py-2 text-[12px] font-medium text-muted-foreground sm:px-6">
                        {group.label}
                        <span aria-hidden className="ml-2 tabular-nums">
                          {group.items.length}
                        </span>
                        <span className="sr-only">
                          , {group.items.length}{" "}
                          {group.items.length === 1 ? "standard" : "standards"}
                        </span>
                      </h3>
                      {group.items.map((evaluation) => (
                        <StandardCard
                          key={evaluation.standardId}
                          evaluation={evaluation}
                          open={openIds.has(evaluation.standardId)}
                          onToggle={() => toggleCard(evaluation.standardId)}
                        />
                      ))}
                      {runId ? (
                        <SectionDiscussion
                          runId={runId}
                          sectionId={group.key}
                          label={group.label}
                          comments={comments}
                          onPosted={(comment) =>
                            setComments((prev) => [...prev, comment])
                          }
                        />
                      ) : null}
                    </div>
                  ))
                ) : (
                  <>
                    {filtered.map((evaluation) => (
                      <StandardCard
                        key={evaluation.standardId}
                        evaluation={evaluation}
                        open={openIds.has(evaluation.standardId)}
                        onToggle={() => toggleCard(evaluation.standardId)}
                      />
                    ))}
                    {runId && activeSection?.section ? (
                      <SectionDiscussion
                        runId={runId}
                        sectionId={activeSection.key}
                        label={activeSection.label}
                        comments={comments}
                        onPosted={(comment) =>
                          setComments((prev) => [...prev, comment])
                        }
                      />
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card px-6 py-14 text-center shadow-[var(--shadow-card)]">
                <p className="text-[14px] font-medium">
                  No standards match these filters.
                </p>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Try a different section, status, or search term.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-foreground/[0.06] px-4 text-[13.5px] font-medium transition-colors hover:bg-foreground/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <RotateCcw aria-hidden className="size-4" />
                  Reset filters
                </button>
              </div>
            )}

            <p className="mt-4 px-1 text-[12px] leading-relaxed text-muted-foreground">
              Automated audit: {report.videosChecked} videos checked,{" "}
              {report.videosMissingCaptions} missing captions, ~
              {report.reviewerHoursSaved.toFixed(1)} reviewer hours saved by
              the mechanical checks.
            </p>
          </section>
        </div>
      </div>

      <PrintReport course={course} report={report} />
    </div>
  );
}
