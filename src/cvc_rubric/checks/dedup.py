"""
Reusable dedup/grouping utility for repetitive accessibility findings.

Groups findings that share the same (check_id, severity, message) into a
single representative finding with occurrence counts and affected-page lists.

Usage:
    from cvc_rubric.checks.dedup import deduplicate_findings
    findings = deduplicate_findings(raw_findings, config)
"""
from __future__ import annotations

from typing import Optional

from cvc_rubric.models import AccessibilityFinding


def deduplicate_findings(
    findings: list[AccessibilityFinding],
    *,
    group_check_ids: Optional[set[str]] = None,
    suppress_info_placeholders: bool = False,
    max_snippets_per_group: int = 3,
) -> list[AccessibilityFinding]:
    """
    Collapse repetitive findings into grouped entries.

    Parameters
    ----------
    findings : list of AccessibilityFinding
        Raw findings from all checks.
    group_check_ids : set of str, optional
        Which check_ids to group. If None, groups all checks that have
        duplicates (same check_id + severity + message).
    suppress_info_placeholders : bool
        If True, completely remove str-003 findings with severity='info'
        (the expected-cartridge-placeholder findings).
    max_snippets_per_group : int
        How many representative snippets to keep in a grouped finding.

    Returns
    -------
    list of AccessibilityFinding
        Deduplicated findings. Grouped entries have `occurrences` and
        `affected_pages` populated.
    """
    if suppress_info_placeholders:
        findings = [
            f for f in findings
            if not (f.check_id == "str-003" and f.severity == "info")
        ]

    # Default: group str-003 and str-002 (the most repetitive checks)
    if group_check_ids is None:
        group_check_ids = {"str-003", "str-002", "lnk-004", "hdg-001", "med-003"}

    # Partition: groupable vs pass-through
    groupable: list[AccessibilityFinding] = []
    passthrough: list[AccessibilityFinding] = []

    for f in findings:
        if f.check_id in group_check_ids:
            groupable.append(f)
        else:
            passthrough.append(f)

    # Group by (check_id, severity, message)
    groups: dict[tuple[str, str, str], list[AccessibilityFinding]] = {}
    for f in groupable:
        key = (f.check_id, f.severity, f.message)
        groups.setdefault(key, []).append(f)

    # Build grouped findings
    grouped_results: list[AccessibilityFinding] = []
    for (check_id, severity, message), members in groups.items():
        if len(members) == 1:
            # No grouping needed — pass through as-is
            grouped_results.append(members[0])
            continue

        # Collect affected pages
        page_counts: dict[str, dict] = {}
        for m in members:
            pid = m.page_id
            if pid not in page_counts:
                page_counts[pid] = {
                    "page_id": pid,
                    "page_title": m.page_title,
                    "count": 0,
                }
            page_counts[pid]["count"] += 1

        affected_pages = sorted(
            page_counts.values(), key=lambda p: -p["count"]
        )

        # Take representative snippets
        snippets = []
        for m in members[:max_snippets_per_group]:
            if m.element_snippet:
                snippets.append(m.element_snippet)
        snippet_text = " | ".join(snippets) if snippets else ""
        if len(members) > max_snippets_per_group:
            snippet_text += f" | ... and {len(members) - max_snippets_per_group} more"

        # Use first member as template
        rep = members[0]
        grouped_results.append(AccessibilityFinding(
            check_id=check_id,
            severity=severity,
            page_id=rep.page_id,
            page_title=f"{len(affected_pages)} pages affected",
            element_snippet=snippet_text[:200],
            line_hint=None,
            message=message,
            remediation=rep.remediation,
            status=rep.status,
            occurrences=len(members),
            affected_pages=affected_pages,
        ))

    # Combine: passthrough + grouped, sorted by severity then check_id
    result = passthrough + grouped_results
    severity_order = {"error": 0, "warning": 1, "info": 2}
    result.sort(key=lambda f: (severity_order.get(f.severity, 9), f.check_id))
    return result
