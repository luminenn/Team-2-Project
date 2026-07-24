import { MapPin, Wrench } from "lucide-react";
import { POCR_RUBRIC_ITEMS } from "@/lib/data/rubric";
import { STATUS_META, STATUS_ORDER } from "@/lib/status";
import type {
  Course,
  CourseAuditReport,
  EvaluationResult,
  PocrSection,
} from "@/lib/types";
import { cn } from "@/lib/utils";

/* The document that actually gets filed with a POCR committee. Screen-only
   chrome (nav, filters, accordions) is print:hidden in the interactive view;
   this renders the complete report, every standard expanded, professor-first:
   what to fix leads, audit metadata closes. Light tokens are forced by the
   @media print block in globals.css. */

const SECTION_ORDER: PocrSection[] = [
  "Section 1",
  "Section 2",
  "Section 3",
  "Section 4",
  "Accessibility Verification",
];

function sectionTitle(section: PocrSection): string {
  return (
    POCR_RUBRIC_ITEMS.find((item) => item.section === section)?.sectionTitle ??
    section
  );
}

function PrintStandard({ evaluation }: { evaluation: EvaluationResult }) {
  const meta = STATUS_META[evaluation.status];
  const Icon = meta.icon;
  const rubricItem = POCR_RUBRIC_ITEMS.find(
    (item) => item.id === evaluation.standardId,
  );

  return (
    <article className="break-inside-avoid border-b border-border py-4 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[13px] font-semibold">
          <span className="mr-3 font-medium text-muted-foreground">
            {evaluation.standardCode}
          </span>
          {evaluation.title}
        </p>
        <p className="flex shrink-0 items-center gap-1.5 text-[12px]">
          <Icon
            aria-hidden
            strokeWidth={2.25}
            className={cn("size-3.5", meta.iconColor)}
          />
          <span className="font-medium">{evaluation.status}</span>
          <span className="tabular-nums text-muted-foreground">
            · {evaluation.score} of 100
          </span>
        </p>
      </div>

      <p className="mt-1.5 max-w-[78ch] text-[12px] leading-relaxed">
        {evaluation.summary}
      </p>

      {evaluation.findings.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {evaluation.findings.map((finding, index) => (
            <li
              key={`${index}-${finding}`}
              className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
            >
              <span
                aria-hidden
                className="mt-[6px] size-1 shrink-0 rounded-full bg-muted-foreground"
              />
              {finding}
            </li>
          ))}
        </ul>
      ) : null}

      {evaluation.affectedItems.length > 0 ? (
        <div className="mt-2.5 space-y-1.5">
          {evaluation.affectedItems.map((item, index) => (
            <div key={`${index}-${item.title}`} className="rounded-lg border border-border px-3 py-2">
              <p className="flex items-center gap-1.5 text-[12px] font-medium">
                <MapPin aria-hidden className="size-3 shrink-0 text-muted-foreground" />
                {item.title}
                <span className="font-normal text-muted-foreground">
                  · {item.location}
                </span>
              </p>
              {item.snippet ? (
                <code className="mt-1 block whitespace-pre-wrap break-words rounded bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
                  {item.snippet}
                </code>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {evaluation.remediationText || evaluation.remediationCode ? (
        <div className="mt-2.5 rounded-lg border border-border px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <Wrench aria-hidden className="size-3" />
            Suggested fix
          </p>
          {evaluation.remediationText ? (
            <p className="mt-1 max-w-[78ch] text-[12px] leading-relaxed text-muted-foreground">
              {evaluation.remediationText}
            </p>
          ) : null}
          {evaluation.remediationCode ? (
            <pre className="mt-1.5 whitespace-pre-wrap break-words rounded bg-muted px-2.5 py-2 font-mono text-[11px] leading-relaxed">
              {evaluation.remediationCode}
            </pre>
          ) : null}
        </div>
      ) : null}

      {evaluation.status === "Aligned" && rubricItem ? (
        <p className="mt-2 max-w-[78ch] text-[11.5px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Path to exceptional:</span>{" "}
          {rubricItem.exceptionalCriteria}
        </p>
      ) : null}
    </article>
  );
}

export function PrintReport({
  course,
  report,
}: {
  course: Course;
  report: CourseAuditReport;
}) {
  const flagged =
    report.statusCounts.Approaching + report.statusCounts.Incomplete;

  return (
    <div className="hidden text-foreground print:block">
      <header className="border-b-2 border-foreground pb-4">
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground">
          SONIQ · POCR alignment report
        </p>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-tight">
          {course.title}
        </h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {course.code} · {course.term} · Audited {report.auditedAt}
        </p>
        <p className="mt-3 text-[13px]">
          <span className="font-semibold">
            {report.overallStatus}, {report.overallScore} of 100.
          </span>{" "}
          {STATUS_ORDER.filter((s) => report.statusCounts[s] > 0)
            .map((s) => `${report.statusCounts[s]} ${s.toLowerCase()}`)
            .join(", ")}{" "}
          across {report.evaluations.length} standards.
        </p>
        {flagged > 0 ? (
          <p className="mt-1.5 max-w-[78ch] text-[13px]">
            <span className="font-semibold">Start here:</span> {report.topIssue}.
          </p>
        ) : null}
      </header>

      {SECTION_ORDER.map((section) => {
        const inSection = report.evaluations.filter(
          (e) => e.section === section,
        );
        if (inSection.length === 0) return null;
        return (
          <section key={section} className="mt-6">
            <h2 className="break-after-avoid text-[14px] font-semibold tracking-tight">
              {sectionTitle(section)}
            </h2>
            <div className="mt-1">
              {inSection.map((evaluation) => (
                <PrintStandard
                  key={evaluation.standardId}
                  evaluation={evaluation}
                />
              ))}
            </div>
          </section>
        );
      })}

      <footer className="mt-8 border-t border-border pt-3 text-[11px] text-muted-foreground">
        Generated by SONIQ for the {course.term} POCR cycle. Audit metadata:{" "}
        {report.videosChecked} videos checked, {report.videosMissingCaptions}{" "}
        missing captions, ~{report.reviewerHoursSaved.toFixed(1)} reviewer hours
        saved by automated checks.
      </footer>
    </div>
  );
}
