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
is reported once. Findings are collapsed into grouped summaries by outcome
(one group for errors, one for warnings) with per-video detail preserved
inside affected_pages.

---
FUTURE HOOK: To add transcript-based accuracy checking (e.g. AWS Transcribe
or a third-party transcript API), extend check_video_captions() with an
additional pass AFTER the presence check. Videos that pass presence (captions
confirmed present) would then be checked for accuracy. Do not mix the two
concerns in a single pass.
---
"""
from __future__ import annotations

from typing import Optional

from cvc_rubric.models import AccessibilityFinding, CourseObject


def check_video_captions(course: CourseObject) -> list[AccessibilityFinding]:
    """
    Check caption presence for all videos in the course object.

    Returns a list of AccessibilityFinding (vid-001).
    Deduplicates by video URL — same URL on multiple pages → one entry.
    Collapses all warnings into one grouped finding and all errors into
    another grouped finding, preserving per-video detail in affected_pages.
    """
    videos = course.videos or []
    if not videos:
        return []

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

    # Classify videos by outcome
    error_videos: list[dict] = []   # confirmed no captions
    warning_videos: list[dict] = [] # could not verify

    for url, group in sorted(url_groups.items()):
        declared = group["captions_declared"]
        source = group["source"]
        pages = group["pages"]

        if declared is True:
            # Captions confirmed present — pass
            continue
        elif declared is False:
            # Confirmed: no captions
            error_videos.append({
                "page_id": pages[0]["page_id"] if pages else "",
                "page_title": pages[0]["page_title"] if pages else "",
                "video_url": url,
                "source": source,
                "count": len(pages),
            })
        else:
            # None — undeterminable
            warning_videos.append({
                "page_id": pages[0]["page_id"] if pages else "",
                "page_title": pages[0]["page_title"] if pages else "",
                "video_url": url,
                "source": source,
                "count": len(pages),
            })

    # Build grouped findings
    findings: list[AccessibilityFinding] = []

    if error_videos:
        if len(error_videos) == 1:
            # Single error — emit as individual finding
            ev = error_videos[0]
            findings.append(AccessibilityFinding(
                check_id="vid-001",
                severity="error",
                page_id=ev["page_id"],
                page_title=ev["page_title"],
                element_snippet=f"{ev['source']}: {ev['video_url'][:180]}",
                message=(
                    f"Video has no captions. "
                    f"({ev['source']}: {_truncate_url(ev['video_url'])})"
                ),
                remediation=(
                    "Add a caption track or provide an accurate transcript. "
                    "For HTML5 video, add <track kind=\"captions\" src=\"...\" srclang=\"en\">. "
                    "For platform-hosted video, enable captions in the platform settings."
                ),
            ))
        else:
            # Multiple errors — collapse into one grouped finding
            findings.append(AccessibilityFinding(
                check_id="vid-001",
                severity="error",
                page_id=error_videos[0]["page_id"],
                page_title=f"{len(error_videos)} videos affected",
                element_snippet=_build_snippet(error_videos),
                message=(
                    f"{len(error_videos)} videos confirmed to have no captions — "
                    f"caption tracks must be added."
                ),
                remediation=(
                    "Add a caption track or provide an accurate transcript for each video. "
                    "For HTML5 video, add <track kind=\"captions\" src=\"...\" srclang=\"en\">. "
                    "For platform-hosted video, enable captions in the platform settings."
                ),
                occurrences=len(error_videos),
                affected_pages=error_videos,
            ))

    if warning_videos:
        if len(warning_videos) == 1:
            # Single warning — emit as individual finding
            wv = warning_videos[0]
            findings.append(AccessibilityFinding(
                check_id="vid-001",
                severity="warning",
                page_id=wv["page_id"],
                page_title=wv["page_title"],
                element_snippet=f"{wv['source']}: {wv['video_url'][:180]}",
                message=(
                    f"Caption status could not be verified — manual review needed. "
                    f"({wv['source']}: {_truncate_url(wv['video_url'])})"
                ),
                remediation=(
                    "Open the video and confirm captions are present and accurate. "
                    "For YouTube, check that closed captions are enabled and not "
                    "solely auto-generated without review."
                ),
            ))
        else:
            # Multiple warnings — collapse into one grouped finding
            findings.append(AccessibilityFinding(
                check_id="vid-001",
                severity="warning",
                page_id=warning_videos[0]["page_id"],
                page_title=f"{len(warning_videos)} videos affected",
                element_snippet=_build_snippet(warning_videos),
                message=(
                    f"{len(warning_videos)} videos could not be verified for captions — "
                    f"manual review needed."
                ),
                remediation=(
                    "Open each video and confirm captions are present and accurate. "
                    "For YouTube, check that closed captions are enabled and not "
                    "solely auto-generated without review."
                ),
                occurrences=len(warning_videos),
                affected_pages=warning_videos,
            ))

    return findings


def _build_snippet(videos: list[dict], max_shown: int = 3) -> str:
    """Build a representative snippet string from the first few videos."""
    parts = []
    for v in videos[:max_shown]:
        parts.append(f"{v['source']}: {v['video_url'][:60]}")
    snippet = " | ".join(parts)
    if len(videos) > max_shown:
        snippet += f" | ... and {len(videos) - max_shown} more"
    return snippet[:200]


def _truncate_url(url: str, max_len: int = 60) -> str:
    if len(url) <= max_len:
        return url
    return url[:max_len - 3] + "..."
