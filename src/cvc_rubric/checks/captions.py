"""
Video caption presence check.

check_id: vid-001

Flags videos without captions based solely on data already in the parsed
course object (no network calls, no API lookups).

Logic:
  - captions_declared == True  → pass (no finding emitted)
  - captions_declared == False → error: "Video has no captions."
  - captions_declared == None  → warning: "Caption status could not be verified."

Deduplicates by video URL so the same video appearing on multiple pages
is reported once (with affected_pages metadata).

Future tiers (YouTube Data API, AWS Transcribe accuracy check) can layer on
top of this module by extending the logic after the presence check without
refactoring it.
"""
from __future__ import annotations

from typing import Optional

from cvc_rubric.models import AccessibilityFinding, CourseObject


def check_video_captions(course: CourseObject) -> list[AccessibilityFinding]:
    """
    Check caption presence for all videos in the course object.

    Returns a list of AccessibilityFinding (vid-001).
    Deduplicates by video URL — same URL on multiple pages → one finding.
    """
    findings: list[AccessibilityFinding] = []
    videos = course.videos or []

    if not videos:
        return findings

    # Build page_id → page_title lookup
    page_titles: dict[str, str] = {}
    for p in (course.pages or []):
        page_titles[p.id] = p.title
    for a in (course.assignments or []):
        page_titles[a.id] = a.title
    for d in (course.discussions or []):
        page_titles[d.id] = d.title
    page_titles["syllabus"] = "Syllabus"

    # Group videos by URL for deduplication
    # {url: {"source": str, "captions_declared": bool|None, "pages": [{page_id, page_title}]}}
    url_groups: dict[str, dict] = {}
    for v in videos:
        url = (v.url or "").strip()
        if not url:
            continue
        if url not in url_groups:
            url_groups[url] = {
                "source": v.source or "unknown",
                "captions_declared": v.captions_declared,
                "pages": [],
            }
        page_id = v.page_id or ""
        page_title = page_titles.get(page_id, page_id)
        url_groups[url]["pages"].append({
            "page_id": page_id,
            "page_title": page_title,
        })
        # If ANY occurrence declares captions, trust that
        if v.captions_declared is True:
            url_groups[url]["captions_declared"] = True
        elif v.captions_declared is False and url_groups[url]["captions_declared"] is None:
            url_groups[url]["captions_declared"] = False

    # Emit findings
    for url, group in sorted(url_groups.items()):
        declared = group["captions_declared"]
        source = group["source"]
        pages = group["pages"]
        page_id = pages[0]["page_id"] if pages else ""
        page_title = pages[0]["page_title"] if pages else ""

        if declared is True:
            # Captions confirmed present — pass, no finding
            continue

        elif declared is False:
            # Confirmed: no captions
            findings.append(_vid_finding(
                severity="error",
                page_id=page_id,
                page_title=page_title,
                url=url,
                source=source,
                pages=pages,
                message=(
                    f"Video has no captions. "
                    f"({source}: {_truncate_url(url)})"
                ),
                remediation=(
                    "Add a caption track or provide an accurate transcript. "
                    "For HTML5 video, add <track kind=\"captions\" src=\"...\" srclang=\"en\">. "
                    "For platform-hosted video, enable captions in the platform settings."
                ),
            ))

        else:
            # None — undeterminable (e.g. iframe embed)
            findings.append(_vid_finding(
                severity="warning",
                page_id=page_id,
                page_title=page_title,
                url=url,
                source=source,
                pages=pages,
                message=(
                    f"Caption status could not be verified from the export — "
                    f"manual review needed. ({source}: {_truncate_url(url)})"
                ),
                remediation=(
                    "Open the video and confirm captions are present and accurate. "
                    "For YouTube, check that closed captions are enabled and not "
                    "solely auto-generated without review."
                ),
            ))

    return findings


def _vid_finding(
    severity: str,
    page_id: str,
    page_title: str,
    url: str,
    source: str,
    pages: list[dict],
    message: str,
    remediation: str,
) -> AccessibilityFinding:
    """Build a vid-001 finding with dedup metadata."""
    snippet = f"{source}: {url[:180]}"
    affected = (
        [{"page_id": p["page_id"], "page_title": p["page_title"], "count": 1} for p in pages]
        if len(pages) > 1 else None
    )
    return AccessibilityFinding(
        check_id="vid-001",
        severity=severity,
        page_id=page_id,
        page_title=page_title if len(pages) == 1 else f"{len(pages)} pages",
        element_snippet=snippet,
        message=message,
        remediation=remediation,
        occurrences=len(pages) if len(pages) > 1 else None,
        affected_pages=affected,
    )


def _truncate_url(url: str, max_len: int = 60) -> str:
    if len(url) <= max_len:
        return url
    return url[:max_len - 3] + "..."
