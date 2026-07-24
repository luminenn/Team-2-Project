/* Maps the FastAPI backend's run and report JSON onto the dashboard's
   Course / CourseAuditReport types so real audit runs render through the
   exact same UI as the demo data. */

import type {
  BackendAccessibilityFinding,
  BackendReport,
  BackendReportSummary,
  BackendRubricFinding,
  BackendRun,
  BackendRunListItem,
} from "@/lib/api/backend";
import type {
  AlignmentStatus,
  Course,
  CourseAuditReport,
  EvaluationResult,
  PocrSection,
} from "@/lib/types";

const RATING_TO_STATUS: Record<BackendRubricFinding["rating"], AlignmentStatus> =
  {
    exceptional: "Exceptional",
    aligned: "Aligned",
    approaching: "Approaching",
    incomplete: "Incomplete",
    not_evaluable: "Incomplete",
  };

const STATUS_SCORE: Record<AlignmentStatus, number> = {
  Exceptional: 97,
  Aligned: 88,
  Approaching: 62,
  Incomplete: 28,
};

/* Accessibility check families (check_id prefix) rolled up into rubric rows.
   The first three match items in lib/data/rubric.ts so their descriptions
   surface in the card; the rest are synthetic rows in the same section.
   Caption findings arrive under two prefixes: med-* from the media check and
   vid-* from the dedicated caption check. */
const A11Y_GROUPS: Record<string, { id: string; code: string; title: string }> =
  {
    img: { id: "A11Y-ALT", code: "Standard A11Y-1", title: "Alternative Text for Images" },
    lnk: { id: "A11Y-LINK", code: "Standard A11Y-2", title: "Descriptive Hyperlink Text" },
    con: { id: "A11Y-CONTRAST", code: "Standard A11Y-3", title: "Color Contrast & Accessible Inline Formatting" },
    med: { id: "A11Y-CAPTIONS", code: "Standard A11Y-4", title: "Video Captions" },
    vid: { id: "A11Y-CAPTIONS", code: "Standard A11Y-4", title: "Video Captions" },
    hdg: { id: "A11Y-HEADINGS", code: "Standard A11Y-5", title: "Heading Structure" },
    doc: { id: "A11Y-DOCS", code: "Standard A11Y-6", title: "Document Accessibility" },
    tbl: { id: "A11Y-TABLES", code: "Standard A11Y-7", title: "Table Structure" },
    str: { id: "A11Y-STRUCTURE", code: "Standard A11Y-8", title: "Content Structure" },
  };

const VIDEO_PREFIXES = ["med", "vid"];

function groupFor(prefix: string) {
  return (
    A11Y_GROUPS[prefix] ?? {
      id: `A11Y-${prefix.toUpperCase()}`,
      code: `Check ${prefix.toUpperCase()}`,
      title: "General Accessibility",
    }
  );
}

/* Groups that always get a row, even with zero findings, so a clean course
   still shows its accessibility checks passing. */
const ALWAYS_PRESENT_GROUPS = ["img", "lnk", "con"];

const MAX_LISTED_FINDINGS = 8;
const MAX_AFFECTED_ITEMS = 12;
const HOURS_SAVED_PER_STANDARD = 0.35;

function courseCodeFromTitle(title: string): string {
  const match = title.match(/^([A-Za-z]{2,5})[\s-]*(\d{2,4})/);
  return match ? `${match[1].toUpperCase()} ${match[2]}` : "IMSCC";
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function termFromDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Imported";
  const month = date.getMonth();
  const season = month <= 4 ? "Spring" : month <= 7 ? "Summer" : "Fall";
  return `${season} ${date.getFullYear()}`;
}

function firstLine(text: string | null): string {
  return (text ?? "").split("\n")[0].trim() || "The audit run failed.";
}

function sectionForId(sectionId: string, elementId: string): PocrSection {
  const id = sectionId || elementId.split(".")[0];
  return id === "1" || id === "2" || id === "3" || id === "4"
    ? (`Section ${id}` as PocrSection)
    : "Section 1";
}

function rubricFindingToEvaluation(f: BackendRubricFinding): EvaluationResult {
  const status = RATING_TO_STATUS[f.rating] ?? "Incomplete";
  const notEvaluable = f.rating === "not_evaluable";
  const summary = notEvaluable
    ? `This standard could not be assessed automatically${f.error_note ? ` (${f.error_note})` : ""}. Review it manually.`
    : f.reasoning || f.suggested_fix || "No analysis was returned for this standard.";
  return {
    standardId: f.element_id,
    standardCode: `Standard ${f.element_id}`,
    section: sectionForId(f.section_id, f.element_id),
    title: f.element_title,
    status,
    score: STATUS_SCORE[status],
    summary,
    findings: f.missing_items,
    affectedItems: f.evidence_quotes.slice(0, MAX_AFFECTED_ITEMS).map((q) => ({
      title: q.page_title || "Course content",
      location: q.page_title ? `Page: ${q.page_title}` : "Course content",
      snippet: q.quote,
    })),
    remediationText: f.suggested_fix || undefined,
  };
}

function a11yFindingsToEvaluations(
  findings: BackendAccessibilityFinding[],
): EvaluationResult[] {
  /* Keyed by group id, not check prefix: several prefixes roll up into one
     row (med-* and vid-* are both captions), and two rows sharing a
     standardId would collide as React keys and expand together. */
  type Bucket = {
    meta: { id: string; code: string; title: string };
    findings: BackendAccessibilityFinding[];
  };
  const byGroup = new Map<string, Bucket>();
  for (const prefix of ALWAYS_PRESENT_GROUPS) {
    const meta = groupFor(prefix);
    byGroup.set(meta.id, { meta, findings: [] });
  }
  for (const f of findings) {
    const meta = groupFor(f.check_id.split("-")[0]);
    const bucket = byGroup.get(meta.id);
    if (bucket) bucket.findings.push(f);
    else byGroup.set(meta.id, { meta, findings: [f] });
  }

  return Array.from(byGroup.values()).map(({ meta, findings: group }) => {
    const errors = group.filter((f) => f.severity === "error").length;
    const warnings = group.filter((f) => f.severity === "warning").length;
    const status: AlignmentStatus =
      errors > 0 ? "Incomplete" : warnings > 0 ? "Approaching" : "Aligned";
    const pages = new Set(
      group.map((f) => f.page_title).filter((title) => title !== ""),
    );
    const messages = Array.from(new Set(group.map((f) => f.message)));
    const hidden = Math.max(0, messages.length - MAX_LISTED_FINDINGS);
    /* The note about truncation belongs in the summary, not the findings
       list, which the card counts. */
    const summary =
      group.length === 0
        ? "Automated checks found no issues in this category."
        : `${group.length} automated ${group.length === 1 ? "finding" : "findings"} (${errors} errors, ${warnings} warnings)${pages.size > 0 ? ` across ${pages.size} ${pages.size === 1 ? "location" : "locations"}` : ""}.${hidden > 0 ? ` Showing the first ${MAX_LISTED_FINDINGS} of ${messages.length} distinct issues; the full set is in the exported report.` : ""}`;

    return {
      standardId: meta.id,
      standardCode: meta.code,
      section: "Accessibility Verification" as PocrSection,
      title: meta.title,
      status,
      score: STATUS_SCORE[status],
      summary,
      findings: messages.slice(0, MAX_LISTED_FINDINGS),
      affectedItems: group.slice(0, MAX_AFFECTED_ITEMS).map((f) => ({
        title: f.page_title || "Course files",
        location: `Check ${f.check_id}`,
        snippet: f.element_snippet,
      })),
      remediationText: group[0]?.remediation,
    };
  });
}

/* Mirrors the backend's scoring contract (report_builder.build_report): a
   standard the tool could not assess is not evidence of a defect, so it
   never decides the overall status. Unassessed rows still sit in the
   Incomplete bucket for display, hence the subtraction. */
function overallFromCounts(
  counts: Record<AlignmentStatus, number>,
  overallScore: number,
  notEvaluable = 0,
): AlignmentStatus {
  const assessedIncomplete = counts.Incomplete - notEvaluable;
  if (assessedIncomplete > 0) return "Incomplete";
  if (counts.Approaching > 2) return "Approaching";
  const assessed =
    counts.Exceptional + counts.Aligned + counts.Approaching + assessedIncomplete;
  if (assessed === 0) return "Incomplete";
  return overallScore >= 93 ? "Exceptional" : "Aligned";
}

/* A null alignment_score means the backend assessed nothing at all; a missing
   one means the report predates the field. Only the latter gets a derived
   score, so the dashboard card and the report page never disagree. */
function resolveScore(
  alignmentScore: number | null | undefined,
  derived: number,
): { score: number; unscored: boolean } {
  if (typeof alignmentScore === "number")
    return { score: alignmentScore, unscored: false };
  if (alignmentScore === null) return { score: 0, unscored: true };
  return { score: derived, unscored: false };
}

const AI_UNAVAILABLE_ISSUE =
  "AI rubric analysis was unavailable for this run, so only automated accessibility checks are included";

function countStatuses(
  evaluations: EvaluationResult[],
): Record<AlignmentStatus, number> {
  const counts: Record<AlignmentStatus, number> = {
    Exceptional: 0,
    Aligned: 0,
    Approaching: 0,
    Incomplete: 0,
  };
  for (const e of evaluations) counts[e.status] += 1;
  return counts;
}

export function reportToAuditReport(report: BackendReport): CourseAuditReport {
  const rubricEvaluations = report.rubric_findings.map(rubricFindingToEvaluation);
  const a11yEvaluations = a11yFindingsToEvaluations(
    report.accessibility_findings,
  );
  const evaluations = [...rubricEvaluations, ...a11yEvaluations];
  const counts = countStatuses(evaluations);

  const unassessed = new Set(
    report.rubric_findings
      .filter((f) => f.rating === "not_evaluable")
      .map((f) => f.element_id),
  );
  const assessed = evaluations.filter((e) => !unassessed.has(e.standardId));
  const derivedScore =
    assessed.length > 0
      ? Math.round(
          assessed.reduce((sum, e) => sum + e.score, 0) / assessed.length,
        )
      : 0;
  const { score: overallScore, unscored } = resolveScore(
    report.summary.alignment_score,
    derivedScore,
  );

  const captionFindings = report.accessibility_findings.filter((f) =>
    VIDEO_PREFIXES.includes(f.check_id.split("-")[0]),
  );
  const videosChecked = captionFindings.reduce(
    (sum, f) => sum + (f.occurrences ?? 1),
    0,
  );
  const videosMissingCaptions = captionFindings
    .filter((f) => f.severity === "error")
    .reduce((sum, f) => sum + (f.occurrences ?? 1), 0);

  const aiUnavailable =
    unscored ||
    (report.rubric_findings.length === 0 && report.errors.length > 0);
  const firstIncomplete = assessed.find((e) => e.status === "Incomplete");
  const firstApproaching = assessed.find((e) => e.status === "Approaching");
  const topIssue = aiUnavailable
    ? AI_UNAVAILABLE_ISSUE
    : firstIncomplete
      ? firstIncomplete.title
      : firstApproaching
        ? firstApproaching.title
        : "No blocking issues found";

  return {
    auditedAt: formatDateTime(report.meta.analyzed_at),
    overallScore,
    overallStatus: overallFromCounts(counts, overallScore, unassessed.size),
    statusCounts: counts,
    evaluations,
    videosChecked,
    videosMissingCaptions,
    reviewerHoursSaved: evaluations.length * HOURS_SAVED_PER_STANDARD,
    topIssue,
  };
}

/* The /history list only carries the summary, which is enough for the
   dashboard cards; the full evaluations load on the report page. */
function summaryToLiteReport(
  summary: BackendReportSummary,
  auditedAt: string,
): CourseAuditReport {
  /* Accessibility errors become an Incomplete row on the report page, so the
     card counts them too; otherwise the same run reads Aligned here and
     Incomplete one click away. */
  const a11yErrors = summary.accessibility_errors;
  const counts: Record<AlignmentStatus, number> = {
    Exceptional: summary.exceptional_count,
    Aligned: summary.aligned_count,
    Approaching:
      summary.approaching_count + (summary.accessibility_warnings > 0 ? 1 : 0),
    Incomplete:
      summary.incomplete_count +
      summary.not_evaluable_count +
      (a11yErrors > 0 ? 1 : 0),
  };
  const rated =
    counts.Exceptional + counts.Aligned + counts.Approaching + counts.Incomplete;
  const derivedScore =
    rated > 0
      ? Math.round(
          (100 * (counts.Exceptional + counts.Aligned) +
            50 * counts.Approaching) /
            rated,
        )
      : 0;
  const { score: overallScore, unscored } = resolveScore(
    summary.alignment_score,
    derivedScore,
  );
  const total = rated + a11yErrors + summary.accessibility_warnings;

  return {
    auditedAt: formatDateTime(auditedAt),
    overallScore,
    overallStatus: overallFromCounts(
      counts,
      overallScore,
      summary.not_evaluable_count,
    ),
    statusCounts: counts,
    evaluations: [],
    videosChecked: 0,
    videosMissingCaptions: 0,
    reviewerHoursSaved: total * HOURS_SAVED_PER_STANDARD,
    topIssue: unscored
      ? AI_UNAVAILABLE_ISSUE
      : a11yErrors > 0
        ? `${a11yErrors} accessibility ${a11yErrors === 1 ? "error needs" : "errors need"} review`
        : "No blocking issues found",
  };
}

interface RunShape {
  run_id: string;
  course_title: string;
  created_at: string;
  status: BackendRunListItem["status"];
  error: string | null;
}

function baseCourse(run: RunShape, report?: CourseAuditReport): Course {
  const title = run.course_title || "Uploaded cartridge";
  const shared = {
    id: run.run_id,
    code: courseCodeFromTitle(run.course_title),
    title,
    instructor: "",
    term: termFromDate(run.created_at),
    ingestedAt: formatDateTime(run.created_at),
    artifacts: { pages: 0, videos: 0, assignments: 0, discussions: 0 },
  };

  if (run.status === "complete") {
    return {
      ...shared,
      stage: "Report ready",
      progress: 100,
      stageDetail: "Report ready for review",
      report,
    };
  }
  if (run.status === "error") {
    return {
      ...shared,
      stage: "Failed",
      progress: 0,
      stageDetail: "Analysis stopped",
      failedAtStage: "Analyzing",
      failureReason: firstLine(run.error),
    };
  }
  return {
    ...shared,
    stage: "Analyzing",
    /* The backend exposes no progress figure; the UI renders this run as
       indeterminate rather than showing an invented percentage. */
    progress: 0,
    stageDetail: "Running rubric and accessibility checks",
  };
}

export function runListItemToCourse(item: BackendRunListItem): Course {
  const report =
    item.status === "complete" && item.summary
      ? summaryToLiteReport(item.summary, item.created_at)
      : undefined;
  return baseCourse(item, report);
}

export function runToCourse(run: BackendRun): Course {
  const report =
    run.status === "complete" && run.report
      ? reportToAuditReport(run.report)
      : undefined;
  const course = baseCourse(run, report);

  if (run.report) {
    const pages = new Set<string>();
    for (const f of run.report.accessibility_findings) {
      if (f.page_id) pages.add(f.page_id);
      for (const ap of f.affected_pages ?? []) {
        if (ap.page_id) pages.add(ap.page_id);
      }
    }
    const videos = new Set<string>();
    for (const f of run.report.accessibility_findings) {
      if (!VIDEO_PREFIXES.includes(f.check_id.split("-")[0])) continue;
      for (const ap of f.affected_pages ?? []) {
        if (ap.video_url) videos.add(ap.video_url);
      }
      videos.add(f.element_snippet);
    }
    return {
      ...course,
      artifacts: {
        pages: pages.size,
        videos: videos.size,
        assignments: 0,
        discussions: 0,
      },
    };
  }
  return course;
}
