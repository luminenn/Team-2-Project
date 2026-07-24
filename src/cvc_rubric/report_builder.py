"""
Report builder: assembles the final JSON report and Markdown summary.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Optional

from cvc_rubric.models import (
    AccessibilityFinding,
    Report,
    ReportError,
    ReportMeta,
    ReportSummary,
    RubricFinding,
)

_RATING_EMOJI = {
    "exceptional": "🌟",
    "aligned": "✅",
    "approaching": "⚠️",
    "incomplete": "❌",
    "not_evaluable": "⬜",
}

_SEVERITY_EMOJI = {
    "error": "🔴",
    "warning": "🟡",
    "info": "🔵",
}


def build_report(
    course_title: str,
    rubric_version: str,
    prompt_version: str,
    duration_seconds: float,
    rubric_findings: list[RubricFinding],
    accessibility_findings: list[AccessibilityFinding],
    errors: list[ReportError],
) -> Report:
    # Summary counts
    aligned_count = sum(1 for f in rubric_findings if f.rating == "aligned")
    approaching_count = sum(1 for f in rubric_findings if f.rating == "approaching")
    incomplete_count = sum(1 for f in rubric_findings if f.rating == "incomplete")
    exceptional_count = sum(1 for f in rubric_findings if f.rating == "exceptional")
    not_evaluable_count = sum(1 for f in rubric_findings if f.rating == "not_evaluable")

    # -----------------------------------------------------------------------
    # Alignment score calculation
    # Weights: Aligned/Exceptional = 100, Approaching = 50, Incomplete = 0
    # Not-evaluable is excluded from the denominator — courses aren't penalized
    # for content the tool couldn't assess.
    # -----------------------------------------------------------------------
    WEIGHT_ALIGNED = 100       # Points for aligned or exceptional
    WEIGHT_APPROACHING = 50    # Points for approaching
    WEIGHT_INCOMPLETE = 0      # Points for incomplete

    scored_items = aligned_count + exceptional_count + approaching_count + incomplete_count
    if scored_items > 0:
        raw_score = (
            (aligned_count + exceptional_count) * WEIGHT_ALIGNED
            + approaching_count * WEIGHT_APPROACHING
            + incomplete_count * WEIGHT_INCOMPLETE
        )
        alignment_score: Optional[int] = round(raw_score / scored_items)
    else:
        alignment_score = None  # All not-evaluable — display "N/A"

    summary = ReportSummary(
        exceptional_count=exceptional_count,
        aligned_count=aligned_count,
        approaching_count=approaching_count,
        incomplete_count=incomplete_count,
        not_evaluable_count=not_evaluable_count,
        alignment_score=alignment_score,
        accessibility_errors=sum(1 for f in accessibility_findings if f.severity == "error"),
        accessibility_warnings=sum(1 for f in accessibility_findings if f.severity == "warning"),
        accessibility_info=sum(1 for f in accessibility_findings if f.severity == "info"),
    )
    return Report(
        meta=ReportMeta(
            course_title=course_title,
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            rubric_version=rubric_version,
            prompt_version=prompt_version,
            duration_seconds=round(duration_seconds, 2),
        ),
        summary=summary,
        rubric_findings=rubric_findings,
        accessibility_findings=accessibility_findings,
        errors=errors,
    )


def write_json(report: Report, path: str) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(report.model_dump(), f, ensure_ascii=False, indent=2)


def write_markdown(report: Report, path: str) -> None:
    lines = _render_markdown(report)
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def _render_markdown(report: Report) -> list[str]:
    m = report.meta
    s = report.summary
    lines: list[str] = []

    # Header
    lines += [
        f"# CVC Course Design Rubric Report",
        f"",
        f"**Course:** {m.course_title}  ",
        f"**Analyzed:** {m.analyzed_at}  ",
        f"**Rubric Version:** {m.rubric_version}  ",
        f"**Prompt Version:** {m.prompt_version}  ",
        f"**Duration:** {m.duration_seconds:.1f}s  ",
        "",
    ]

    # Summary table
    lines += [
        "## Summary",
        "",
        "| Rating | Count |",
        "|--------|-------|",
        f"| 🌟 Exceptional | {s.exceptional_count} |",
        f"| ✅ Aligned | {s.aligned_count} |",
        f"| ⚠️ Approaching | {s.approaching_count} |",
        f"| ❌ Incomplete | {s.incomplete_count} |",
        f"| ⬜ Not Evaluable | {s.not_evaluable_count} |",
        "",
        f"**Accessibility findings:** "
        f"🔴 {s.accessibility_errors} errors, "
        f"🟡 {s.accessibility_warnings} warnings, "
        f"🔵 {s.accessibility_info} info",
        "",
    ]

    # Group rubric findings by section
    by_section: dict[str, list[RubricFinding]] = {}
    for f in report.rubric_findings:
        key = f.section_id or "?"
        by_section.setdefault(key, []).append(f)

    lines.append("---")
    lines.append("")
    lines.append("## Rubric Findings")
    lines.append("")

    for section_id in sorted(by_section.keys()):
        section_findings = by_section[section_id]
        section_title = section_findings[0].section_title if section_findings else section_id
        lines += [f"### Section {section_id}: {section_title}", ""]

        for f in sorted(section_findings, key=lambda x: x.element_id):
            emoji = _RATING_EMOJI.get(f.rating, "⬜")
            lines += [
                f"#### {emoji} {f.element_id} — {f.element_title}",
                "",
                f"**Rating:** {f.rating.capitalize()}  ",
                f"**Confidence:** {f.confidence:.0%}  ",
                f"**Status:** {f.status}  ",
            ]
            if f.prompt_version:
                lines.append(f"**Prompt version:** {f.prompt_version}  ")
            if f.cache_hit:
                lines.append(f"**Cache:** hit  ")
            if f.latency_seconds is not None:
                lines.append(f"**Latency:** {f.latency_seconds:.2f}s  ")
            lines.append("")

            if f.reasoning:
                lines += [f"**Reasoning:** {f.reasoning}", ""]

            if f.evidence_quotes:
                lines.append("**Evidence:**")
                for q in f.evidence_quotes:
                    lines.append(f'> "{q.quote}"')
                    if q.page_title:
                        lines.append(f'> — *{q.page_title}*')
                    lines.append("")

            if f.missing_items:
                lines.append("**Missing items:**")
                for item in f.missing_items:
                    lines.append(f"- {item}")
                lines.append("")

            if f.suggested_fix:
                lines += [f"**Suggested fix:** {f.suggested_fix}", ""]

            if f.error_note:
                lines += [f"*Note: {f.error_note}*", ""]

            lines.append("---")
            lines.append("")

    # Accessibility findings
    lines += ["## Accessibility Findings", ""]
    if not report.accessibility_findings:
        lines += ["*No accessibility issues found.*", ""]
    else:
        # Group by page
        by_page: dict[str, list[AccessibilityFinding]] = {}
        for f in report.accessibility_findings:
            key = f.page_id or "course-level"
            by_page.setdefault(key, []).append(f)

        for page_id in sorted(by_page.keys()):
            page_findings = by_page[page_id]
            page_title = page_findings[0].page_title or page_id
            lines += [f"### {page_title}", ""]
            for f in sorted(page_findings, key=lambda x: (x.severity, x.check_id)):
                sev = _SEVERITY_EMOJI.get(f.severity, "")
                lines += [
                    f"**{sev} [{f.check_id}]** {f.message}  ",
                    f"**Remediation:** {f.remediation}  ",
                ]
                if f.element_snippet:
                    lines += [f"```html", f"{f.element_snippet}", "```"]
                lines.append("")

    # Errors
    if report.errors:
        lines += ["## Processing Errors", ""]
        for e in report.errors:
            eid = f" (element {e.element_id})" if e.element_id else ""
            lines.append(f"- **{e.stage}**{eid}: {e.message}")
        lines.append("")

    return lines
