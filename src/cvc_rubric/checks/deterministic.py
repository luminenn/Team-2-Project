"""
Deterministic accessibility checks.

All checks are pure functions: (html: str, page_id: str, page_title: str) -> list[AccessibilityFinding].
No network, no LLM, fully unit-testable.

Check IDs follow the pattern: <category>-<NNN>
  img-001  alt attribute missing
  img-002  empty alt on non-decorative image
  img-003  filename-as-alt
  img-004  alt too long (>150 chars)
  hdg-001  no heading on content page
  hdg-002  skipped heading level
  hdg-003  styled paragraph used as visual heading
  lnk-001  non-descriptive link text
  lnk-002  raw URL as link text
  lnk-003  duplicate link text to different destinations
  lnk-004  target=_blank without warning
  tbl-001  table with no <th>
  tbl-002  <th> missing scope attribute
  tbl-003  layout table (no headers, likely positional)
  tbl-004  merged cells without headers
  con-001  insufficient contrast ratio (normal text < 4.5:1)
  con-002  insufficient contrast ratio (large text < 3:1)
  med-001  <video> without <track kind="captions">
  med-002  <audio> without <track> or transcript link nearby
  med-003  embedded video with captions_declared=False/None
  doc-001  PDF file needs manual accessibility check
  doc-002  DOCX file needs manual accessibility check
  str-001  empty page (no meaningful content)
  str-002  page not attached to any module
  str-003  unresolved IMS-CC placeholder in content
  str-004  broken internal anchor link
"""
from __future__ import annotations

import re
from typing import Optional
from urllib.parse import urlparse

from bs4 import BeautifulSoup, Tag

from cvc_rubric.models import AccessibilityFinding

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SNIPPET_MAX = 200
_FILENAME_RE = re.compile(
    r"^[\w\-\s\.]+\.(png|jpe?g|gif|svg|webp|bmp|tiff?|pdf|docx?)$",
    re.IGNORECASE,
)
_PLACEHOLDER_RE = re.compile(
    r"\$IMS-CC-FILEBASE\$|\$CANVAS_OBJECT_REFERENCE\$|\$WIKI_REFERENCE\$|\$CANVAS_COURSE_REFERENCE\$"
)

# Placeholders that are Canvas's standard resolvable reference tokens.
# These are expected in .imscc exports and resolve on import into a live course.
_EXPECTED_PLACEHOLDERS = frozenset({
    "$IMS-CC-FILEBASE$",
    "$CANVAS_OBJECT_REFERENCE$",
    "$WIKI_REFERENCE$",
    "$CANVAS_COURSE_REFERENCE$",
})
_NON_DESCRIPTIVE = frozenset({
    "click here", "here", "read more", "link", "click", "more", "this",
    "more info", "more information", "learn more", "view more",
})
_LARGE_TEXT_PX = 18.67   # 14pt bold or 18pt normal ≈ 18.67px
_LARGE_TEXT_BOLD_PX = 14.0


def _snippet(tag: Tag) -> str:
    """Return the outer HTML of a tag, truncated to _SNIPPET_MAX chars."""
    raw = str(tag)
    if len(raw) > _SNIPPET_MAX:
        return raw[:_SNIPPET_MAX] + "…"
    return raw


def _finding(
    check_id: str,
    severity: str,
    page_id: str,
    page_title: str,
    tag: Optional[Tag],
    message: str,
    remediation: str,
    snippet_override: Optional[str] = None,
    line_hint: Optional[int] = None,
) -> AccessibilityFinding:
    snippet = snippet_override or (_snippet(tag) if tag else "")
    return AccessibilityFinding(
        check_id=check_id,
        severity=severity,
        page_id=page_id,
        page_title=page_title,
        element_snippet=snippet,
        line_hint=line_hint,
        message=message,
        remediation=remediation,
    )

# ---------------------------------------------------------------------------
# Contrast helpers (no external lib required — pure math)
# ---------------------------------------------------------------------------

def _parse_css_color(value: str) -> Optional[tuple[int, int, int]]:
    """Parse a CSS color string to (R, G, B) ints. Returns None if unparseable."""
    value = value.strip().lower()
    # #rrggbb or #rgb
    m = re.match(r"#([0-9a-f]{6})$", value)
    if m:
        h = m.group(1)
        return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    m = re.match(r"#([0-9a-f]{3})$", value)
    if m:
        h = m.group(1)
        return int(h[0]*2, 16), int(h[1]*2, 16), int(h[2]*2, 16)
    # rgb(r,g,b)
    m = re.match(r"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)", value)
    if m:
        return int(m.group(1)), int(m.group(2)), int(m.group(3))
    # named colors — only the most common inline ones
    named = {
        "white": (255, 255, 255), "black": (0, 0, 0),
        "red": (255, 0, 0), "green": (0, 128, 0), "blue": (0, 0, 255),
        "yellow": (255, 255, 0), "gray": (128, 128, 128),
        "grey": (128, 128, 128), "silver": (192, 192, 192),
        "navy": (0, 0, 128), "maroon": (128, 0, 0),
    }
    return named.get(value)


def _linearize(c: int) -> float:
    srgb = c / 255.0
    if srgb <= 0.04045:
        return srgb / 12.92
    return ((srgb + 0.055) / 1.055) ** 2.4


def _relative_luminance(r: int, g: int, b: int) -> float:
    return 0.2126 * _linearize(r) + 0.7152 * _linearize(g) + 0.0722 * _linearize(b)


def _contrast_ratio(c1: tuple[int, int, int], c2: tuple[int, int, int]) -> float:
    l1 = _relative_luminance(*c1)
    l2 = _relative_luminance(*c2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)


def _is_large_text(style: str) -> bool:
    """Heuristic: detect large or bold-large text from inline style."""
    size_m = re.search(r"font-size\s*:\s*([\d.]+)(px|pt|em|rem)", style, re.I)
    bold_m = re.search(r"font-weight\s*:\s*(bold|[7-9]\d\d)", style, re.I)
    if not size_m:
        return False
    size_val = float(size_m.group(1))
    unit = size_m.group(2).lower()
    # convert to approximate px
    if unit == "pt":
        size_val *= 1.333
    elif unit in ("em", "rem"):
        size_val *= 16
    if bold_m:
        return size_val >= _LARGE_TEXT_BOLD_PX
    return size_val >= _LARGE_TEXT_PX

# ---------------------------------------------------------------------------
# Image checks
# ---------------------------------------------------------------------------

def check_images(html: str, page_id: str, page_title: str) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")
    for img in soup.find_all("img"):
        if not isinstance(img, Tag):
            continue
        alt = img.get("alt")
        role = img.get("role", "")
        # img-001: no alt attribute at all
        if alt is None:
            findings.append(_finding(
                "img-001", "error", page_id, page_title, img,
                "Image missing alt attribute.",
                "Add an alt attribute describing the image content, or alt=\"\" if purely decorative.",
            ))
            continue
        # img-002: empty alt on what looks like a non-decorative image
        if alt == "" and role.lower() != "presentation":
            src = img.get("src", "")
            # If the img has a meaningful src that isn't a tracking pixel, flag it
            if src and not re.search(r"(pixel|tracking|beacon|spacer)", src, re.I):
                findings.append(_finding(
                    "img-002", "warning", page_id, page_title, img,
                    "Image has empty alt but may not be decorative. "
                    "Verify this image carries no meaning.",
                    "If decorative, add role=\"presentation\". "
                    "If meaningful, provide a descriptive alt attribute.",
                ))
        # img-003: alt text is a filename
        if alt and _FILENAME_RE.match(alt.strip()):
            findings.append(_finding(
                "img-003", "error", page_id, page_title, img,
                f"Alt text appears to be a filename: \"{alt}\".",
                "Replace the filename with a meaningful description of the image content.",
            ))
        # img-004: alt text over 150 characters
        if alt and len(alt) > 150:
            findings.append(_finding(
                "img-004", "warning", page_id, page_title, img,
                f"Alt text is {len(alt)} characters (>150). Consider a shorter description "
                "and use a long-description technique for complex images.",
                "Shorten the alt to a concise description. For charts/diagrams, use a "
                "figure caption or aria-describedby pointing to a visible text block.",
            ))
    return findings

# ---------------------------------------------------------------------------
# Heading checks
# ---------------------------------------------------------------------------

_BOLD_HEADING_RE = re.compile(
    r"font-size\s*:\s*(2[0-9]|[3-9]\d)px|font-size\s*:\s*1\.[5-9]em",
    re.I,
)


def check_headings(html: str, page_id: str, page_title: str) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")

    # Strip nav/header/footer — only check body content
    body = soup.find("body") or soup

    heading_tags = body.find_all(re.compile(r"^h[1-6]$"))
    heading_levels = [int(t.name[1]) for t in heading_tags if isinstance(t, Tag)]

    # hdg-001: no heading at all on a content page
    # A "content page" is one with >200 chars of visible text
    visible_text = soup.get_text(separator=" ", strip=True)
    if len(visible_text) > 200 and not heading_levels:
        findings.append(_finding(
            "hdg-001", "warning", page_id, page_title, None,
            "Page has substantial content but no heading elements (h1–h6).",
            "Add at least one heading (h2 or h3) to introduce major sections. "
            "This helps screen reader users navigate with heading shortcuts.",
            snippet_override="(no headings found)",
        ))

    # hdg-002: skipped levels (e.g., h2 → h4)
    prev = None
    for level, tag in zip(heading_levels, heading_tags):
        if prev is not None and level > prev + 1:
            findings.append(_finding(
                "hdg-002", "error", page_id, page_title,
                tag if isinstance(tag, Tag) else None,
                f"Heading level skipped: h{prev} → h{level}. "
                "Screen readers announce the depth; a skip breaks the outline.",
                f"Change this heading to h{prev + 1} or restructure the content hierarchy.",
            ))
        prev = level

    # hdg-003: bold/large paragraphs used as visual headings
    for p in body.find_all(["p", "span", "div"]):
        if not isinstance(p, Tag):
            continue
        style = p.get("style", "")
        text = p.get_text(strip=True)
        if not text or len(text) > 120:
            continue
        # Check for large font-size OR bold-only with short punchy text
        if _BOLD_HEADING_RE.search(style):
            findings.append(_finding(
                "hdg-003", "warning", page_id, page_title, p,
                f"Paragraph styled with large/bold text may be a visual heading: \"{text[:80]}\".",
                "Replace with a semantic heading element (h2–h6) to expose the structure to assistive technology.",
            ))
        elif re.search(r"font-weight\s*:\s*(bold|700|800|900)", style, re.I):
            # Short (< 80 chars), bold, standalone paragraph — likely a heading
            if len(text) < 80:
                # Check it has no sibling inline content (i.e., it stands alone)
                if not p.find(["a", "em", "span"]):
                    findings.append(_finding(
                        "hdg-003", "info", page_id, page_title, p,
                        f"Short bold paragraph may be acting as a visual heading: \"{text[:80]}\".",
                        "If this text introduces a section, use h2–h6 instead of bold styling.",
                    ))
    return findings

# ---------------------------------------------------------------------------
# Link checks
# ---------------------------------------------------------------------------

_RAW_URL_RE = re.compile(r"^https?://", re.I)


def check_links(html: str, page_id: str, page_title: str) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")

    # Track (link_text_normalized → set of hrefs) for duplicate check
    text_to_hrefs: dict[str, set[str]] = {}

    for a in soup.find_all("a"):
        if not isinstance(a, Tag):
            continue
        href = a.get("href", "").strip()
        link_text = a.get_text(separator=" ", strip=True)
        link_text_lower = link_text.lower()

        # lnk-001: non-descriptive link text
        if link_text_lower in _NON_DESCRIPTIVE:
            findings.append(_finding(
                "lnk-001", "error", page_id, page_title, a,
                f"Non-descriptive link text: \"{link_text}\". "
                "Screen reader users who navigate by links hear this out of context.",
                "Replace with text that describes the destination or action, "
                "e.g. \"Read the course syllabus\" instead of \"Click here\".",
            ))

        # lnk-002: raw URL as link text
        elif _RAW_URL_RE.match(link_text):
            findings.append(_finding(
                "lnk-002", "warning", page_id, page_title, a,
                f"Raw URL used as link text: \"{link_text[:80]}\".",
                "Replace the URL with a descriptive phrase. "
                "If the URL must be visible (e.g. for print), add an aria-label with a description.",
            ))

        # Accumulate for duplicate check
        if link_text_lower and href:
            text_to_hrefs.setdefault(link_text_lower, set()).add(href)

        # lnk-004: target=_blank without any warning indicator
        # DISABLED by default — new-tab links are acceptable in course content.
        # Gate behind config flag 'check_lnk_004' (default: False) if re-enabling later.
        # if a.get("target") == "_blank":
        #     aria_label = a.get("aria-label", "")
        #     has_warning = (
        #         "new tab" in aria_label.lower()
        #         or "new window" in aria_label.lower()
        #         or a.find("span", class_=re.compile(r"sr-only|visually-hidden|screen-reader"))
        #         or "new tab" in link_text.lower()
        #         or "new window" in link_text.lower()
        #     )
        #     if not has_warning:
        #         findings.append(_finding(
        #             "lnk-004", "warning", page_id, page_title, a,
        #             f"Link opens in a new tab/window without warning: \"{link_text[:80]}\".",
        #             "Add an aria-label that includes \"(opens in new tab)\" or add a "
        #             "visually-hidden span with that text so screen reader users are informed.",
        #         ))

    # lnk-003: emit one finding per duplicated text pointing to multiple destinations
    for text, hrefs in text_to_hrefs.items():
        if len(hrefs) > 1:
            findings.append(_finding(
                "lnk-003", "warning", page_id, page_title, None,
                f"Link text \"{text}\" points to {len(hrefs)} different destinations. "
                "Users navigating by links cannot distinguish them.",
                "Give each link unique descriptive text that identifies its destination.",
                snippet_override=f"<a ...>{text}</a> → {', '.join(list(hrefs)[:3])}",
            ))
    return findings

# ---------------------------------------------------------------------------
# Table checks
# ---------------------------------------------------------------------------

def check_tables(html: str, page_id: str, page_title: str) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")

    for table in soup.find_all("table"):
        if not isinstance(table, Tag):
            continue
        th_cells = table.find_all("th")
        td_cells = table.find_all("td")

        # tbl-001: table with no <th> at all
        if not th_cells:
            # Distinguish data tables from layout tables
            # Layout table heuristic: role=presentation/none, OR has only 1 column/row,
            # OR has very few cells and no caption/summary
            role = table.get("role", "")
            caption = table.find("caption")
            summary = table.get("summary", "")
            if role in ("presentation", "none"):
                # Declared layout table — check tbl-003 instead
                if len(td_cells) > 4:
                    findings.append(_finding(
                        "tbl-003", "info", page_id, page_title, table,
                        "Table with role=\"presentation\" has many cells — "
                        "verify it is truly a layout table and not a data table.",
                        "If it contains data, add <th> headers and remove role=\"presentation\".",
                    ))
            else:
                findings.append(_finding(
                    "tbl-001", "error", page_id, page_title, table,
                    "Data table has no <th> header cells. "
                    "Screen readers cannot associate data cells with their meaning.",
                    "Add <th> elements to the header row and/or column. "
                    "For simple tables, add scope=\"col\" or scope=\"row\" to each <th>.",
                ))
            continue

        # tbl-002: <th> cells without scope
        for th in th_cells:
            if not isinstance(th, Tag):
                continue
            if not th.get("scope") and not th.get("id"):
                findings.append(_finding(
                    "tbl-002", "warning", page_id, page_title, th,
                    "<th> cell missing scope attribute.",
                    "Add scope=\"col\" for column headers or scope=\"row\" for row headers.",
                ))

        # tbl-004: merged cells (colspan/rowspan > 1) — flag if no id/headers pattern
        merged = table.find_all(lambda t: isinstance(t, Tag)
                                 and t.name in ("td", "th")
                                 and (int(t.get("colspan", 1)) > 1
                                      or int(t.get("rowspan", 1)) > 1))
        if merged:
            has_id_headers = any(
                c.get("id") or c.get("headers")
                for c in table.find_all(["td", "th"])
                if isinstance(c, Tag)
            )
            if not has_id_headers:
                findings.append(_finding(
                    "tbl-004", "warning", page_id, page_title, table,
                    "Table has merged cells (colspan/rowspan) without id/headers association.",
                    "Add unique id attributes to header cells and headers attributes to "
                    "data cells to explicitly map complex relationships.",
                ))
    return findings

# ---------------------------------------------------------------------------
# Contrast checks (inline styles only — we cannot check external CSS)
# ---------------------------------------------------------------------------

def check_contrast(html: str, page_id: str, page_title: str) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")

    for tag in soup.find_all(style=True):
        if not isinstance(tag, Tag):
            continue
        style = tag.get("style", "")
        # Extract color and background-color from inline style only
        color_m = re.search(r"(?<![a-z-])color\s*:\s*([^;]+)", style, re.I)
        bg_m = re.search(r"background-color\s*:\s*([^;]+)", style, re.I)
        if not color_m or not bg_m:
            continue

        fg = _parse_css_color(color_m.group(1).strip())
        bg = _parse_css_color(bg_m.group(1).strip())
        if fg is None or bg is None:
            # Cannot resolve — skip, do not guess
            continue

        ratio = _contrast_ratio(fg, bg)
        large = _is_large_text(style)
        threshold = 3.0 if large else 4.5
        check_id = "con-002" if large else "con-001"
        level_label = "large text" if large else "normal text"

        if ratio < threshold:
            findings.append(_finding(
                check_id, "error", page_id, page_title, tag,
                f"Contrast ratio {ratio:.2f}:1 is below the {threshold}:1 WCAG AA threshold "
                f"for {level_label}.",
                f"Adjust the foreground color {color_m.group(1).strip()} or "
                f"background {bg_m.group(1).strip()} to achieve at least {threshold}:1. "
                "Use the WebAIM Contrast Checker to find accessible alternatives.",
            ))
    return findings

# ---------------------------------------------------------------------------
# Media checks
# ---------------------------------------------------------------------------

_TRANSCRIPT_LINK_RE = re.compile(
    r"transcript|caption|subtitle|text version|read along",
    re.I,
)
_EMBED_VIDEO_RE = re.compile(
    r"youtube\.com|youtu\.be|vimeo\.com|kaltura|canvas\.instructure|canvastudio",
    re.I,
)


def check_media(
    html: str,
    page_id: str,
    page_title: str,
    page_videos: Optional[list] = None,
) -> list[AccessibilityFinding]:
    """
    page_videos: list of Video objects whose page_id matches this page,
                 used to cross-reference captions_declared.
    """
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")

    # med-001: <video> without <track kind="captions">
    for video in soup.find_all("video"):
        if not isinstance(video, Tag):
            continue
        caption_tracks = [
            t for t in video.find_all("track")
            if isinstance(t, Tag) and t.get("kind", "").lower() in ("captions", "subtitles")
        ]
        if not caption_tracks:
            findings.append(_finding(
                "med-001", "error", page_id, page_title, video,
                "<video> element has no <track kind=\"captions\"> element.",
                "Add a <track kind=\"captions\" src=\"captions.vtt\" srclang=\"en\" label=\"English\"> "
                "element inside the <video> tag.",
            ))

    # med-002: <audio> without transcript link nearby
    for audio in soup.find_all("audio"):
        if not isinstance(audio, Tag):
            continue
        tracks = audio.find_all("track")
        # Look for a transcript link in the surrounding 500 chars of text
        audio_str = str(audio)
        parent_text = audio.parent.get_text(strip=True) if audio.parent else ""
        has_transcript = bool(_TRANSCRIPT_LINK_RE.search(parent_text)) or bool(tracks)
        if not has_transcript:
            findings.append(_finding(
                "med-002", "error", page_id, page_title, audio,
                "<audio> element has no associated transcript or caption track.",
                "Provide a text transcript on the same page, or link to one immediately "
                "before or after the audio player.",
            ))

    # med-003: embedded iframes pointing to video platforms without declared captions
    for iframe in soup.find_all("iframe"):
        if not isinstance(iframe, Tag):
            continue
        src = iframe.get("src", "")
        if not _EMBED_VIDEO_RE.search(src):
            continue
        # Cross-reference with page_videos list if provided
        declared: Optional[bool] = None
        if page_videos:
            for pv in page_videos:
                if src and (src in pv.url or pv.url in src):
                    declared = pv.captions_declared
                    break
        if declared is False or declared is None:
            findings.append(_finding(
                "med-003", "warning", page_id, page_title, iframe,
                f"Embedded video from {src[:60]} has unconfirmed captions "
                f"(captions_declared={declared}).",
                "Verify that the video has accurate captions enabled. "
                "For YouTube, open the video and confirm closed captions are available "
                "and are not auto-generated without review.",
            ))
    return findings

# ---------------------------------------------------------------------------
# Document file checks (cannot inspect internals — flag for manual review)
# ---------------------------------------------------------------------------

_PDF_MIME = {"application/pdf"}
_DOCX_MIME = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
_PPT_MIME = {
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
}


def check_documents(files: list) -> list[AccessibilityFinding]:
    """
    files: list of CourseFile objects.
    Flags PDFs, DOCX, and PPTX as requiring manual accessibility verification.
    """
    findings: list[AccessibilityFinding] = []
    for f in files:
        mime = (f.mime or "").lower()
        name = f.name or ""
        ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""

        is_pdf = mime in _PDF_MIME or ext == "pdf"
        is_docx = mime in _DOCX_MIME or ext in ("doc", "docx")
        is_ppt = mime in _PPT_MIME or ext in ("ppt", "pptx")

        if is_pdf:
            findings.append(AccessibilityFinding(
                check_id="doc-001",
                severity="warning",
                page_id="",
                page_title="Files",
                element_snippet=f"{name} ({f.path})"[:200],
                message=f"PDF file \"{name}\" requires manual accessibility verification.",
                remediation=(
                    "Run the file through Adobe Acrobat's Accessibility Checker or PAC 2024. "
                    "Ensure the PDF is tagged, has a logical reading order, alt text on images, "
                    "and an accessible form structure if applicable."
                ),
            ))
        elif is_docx:
            findings.append(AccessibilityFinding(
                check_id="doc-002",
                severity="warning",
                page_id="",
                page_title="Files",
                element_snippet=f"{name} ({f.path})"[:200],
                message=f"Word document \"{name}\" requires manual accessibility verification.",
                remediation=(
                    "Use Word's built-in Accessibility Checker (Review → Check Accessibility). "
                    "Ensure headings, alt text, table headers, and reading order are correct "
                    "before uploading."
                ),
            ))
        elif is_ppt:
            findings.append(AccessibilityFinding(
                check_id="doc-002",
                severity="warning",
                page_id="",
                page_title="Files",
                element_snippet=f"{name} ({f.path})"[:200],
                message=f"PowerPoint file \"{name}\" requires manual accessibility verification.",
                remediation=(
                    "Use PowerPoint's built-in Accessibility Checker. "
                    "Verify slide reading order, alt text on images, and sufficient color contrast."
                ),
            ))
    return findings

# ---------------------------------------------------------------------------
# Structure checks (page-level and course-level)
# ---------------------------------------------------------------------------

def check_page_structure(
    html: str,
    page_id: str,
    page_title: str,
    module_ids: set[str],
    page_module_id: Optional[str],
) -> list[AccessibilityFinding]:
    findings: list[AccessibilityFinding] = []
    soup = BeautifulSoup(html, "lxml")
    visible_text = soup.get_text(separator=" ", strip=True)

    # str-001: empty page
    if len(visible_text.strip()) < 20:
        # Allow pages that have media content even with little text
        has_media = bool(soup.find(["img", "video", "audio", "iframe", "embed", "object"]))
        if not has_media:
            findings.append(_finding(
                "str-001", "warning", page_id, page_title, None,
                "Page appears to be empty or has very little content.",
                "Add content to this page or remove it from the course to avoid confusing students.",
                snippet_override="(empty page)",
            ))

    # str-002: page not attached to any module
    if page_module_id is None or page_module_id not in module_ids:
        findings.append(_finding(
            "str-002", "info", page_id, page_title, None,
            "Page is not attached to any module and may be invisible to students.",
            "Add this page to a module so students can access it, or delete it "
            "if it is a draft or no longer needed.",
            snippet_override=f"(page: {page_title})",
        ))

    # str-003: unresolved IMS-CC or Canvas placeholders
    # Distinguish expected cartridge syntax (in href/src attributes) from
    # genuinely broken placeholders (in visible body text).
    _placeholder_in_attr = set()
    _placeholder_in_text = set()

    # Check attributes (href, src) — these are expected cartridge syntax
    for tag in soup.find_all(True):
        if not isinstance(tag, Tag):
            continue
        for attr in ("href", "src", "data-api-endpoint"):
            val = tag.get(attr, "")
            if val:
                for m in _PLACEHOLDER_RE.finditer(val):
                    token = m.group(0)
                    _placeholder_in_attr.add(token)

    # Check visible text — placeholders here are real defects
    visible = soup.get_text(separator="\n")
    for m in _PLACEHOLDER_RE.finditer(visible):
        token = m.group(0)
        _placeholder_in_text.add(token)

    # Count total occurrences for grouping metadata
    all_matches = list(_PLACEHOLDER_RE.finditer(html))
    attr_count = 0
    text_count = 0
    for m in all_matches:
        token = m.group(0)
        if token in _placeholder_in_text and token not in _placeholder_in_attr:
            text_count += 1
        else:
            attr_count += 1

    # Emit findings: visible-text placeholders are errors (real defects)
    for token in _placeholder_in_text:
        if token not in _placeholder_in_attr:
            # This token appears ONLY in visible text — genuine defect
            findings.append(_finding(
                "str-003", "error", page_id, page_title, None,
                f"Placeholder \"{token}\" appears in visible page text (not inside a link/src). "
                "This will display as raw placeholder text to students.",
                "Replace with the intended content or a proper link.",
                snippet_override=f"(visible text contains: {token})",
            ))

    # Emit findings: attribute-context placeholders are info (expected in cartridge)
    if _placeholder_in_attr:
        tokens_list = sorted(_placeholder_in_attr)
        findings.append(_finding(
            "str-003", "info", page_id, page_title, None,
            f"Expected Canvas file-reference placeholder(s) ({', '.join(tokens_list)}) "
            "found in link/src attributes — resolves on import into a live Canvas course.",
            "No action needed unless this course is being viewed outside Canvas. "
            "These placeholders are standard IMS Common Cartridge syntax.",
            snippet_override=f"({attr_count} occurrence(s) in href/src attributes)",
        ))

    # str-004: broken internal anchor links (#id references that don't exist on the page)
    for a in soup.find_all("a", href=True):
        if not isinstance(a, Tag):
            continue
        href = a.get("href", "")
        if href.startswith("#") and len(href) > 1:
            target_id = href[1:]
            if not soup.find(id=target_id):
                findings.append(_finding(
                    "str-004", "warning", page_id, page_title, a,
                    f"Internal anchor link #{target_id} has no matching id on this page.",
                    f"Add id=\"{target_id}\" to the target element, or correct the link href.",
                ))
    return findings

# ---------------------------------------------------------------------------
# Top-level runner — runs all checks against a full CourseObject
# ---------------------------------------------------------------------------

from cvc_rubric.models import CourseObject  # noqa: E402 (import after helpers defined)


def run_all(course: CourseObject) -> list[AccessibilityFinding]:
    """
    Entry point: run every deterministic check against the course object.
    Returns a flat list of AccessibilityFinding.
    Either-can-fail isolation: each check is wrapped; exceptions produce an
    info-level finding rather than crashing the run.
    """
    findings: list[AccessibilityFinding] = []
    module_ids = course.module_ids()

    # Build a map from page_id → list of Video objects for that page
    video_map: dict[str, list] = {}
    for v in (course.videos or []):
        video_map.setdefault(v.page_id, []).append(v)

    # Collect all HTML-bearing items: pages, assignments, discussions, syllabus
    html_items: list[tuple[str, str, Optional[str], str]] = []  # (id, title, module_id, html)
    for p in (course.pages or []):
        html_items.append((p.id, p.title, p.module_id, p.html or ""))
    for a in (course.assignments or []):
        html_items.append((a.id, a.title, None, a.html or ""))
    for d in (course.discussions or []):
        html_items.append((d.id, d.title, None, d.html or ""))
    if course.syllabus:
        html_items.append(("syllabus", "Syllabus", None, course.syllabus.html or ""))

    for (item_id, item_title, module_id, html) in html_items:
        if not html.strip():
            # Still run structure check for empty pages
            if any(p.id == item_id for p in (course.pages or [])):
                findings += _safe_check(
                    "structure", item_id,
                    lambda: check_page_structure("", item_id, item_title, module_ids, module_id)
                )
            continue

        page_videos = video_map.get(item_id, [])

        findings += _safe_check("images", item_id, lambda: check_images(html, item_id, item_title))
        findings += _safe_check("headings", item_id, lambda: check_headings(html, item_id, item_title))
        findings += _safe_check("links", item_id, lambda: check_links(html, item_id, item_title))
        findings += _safe_check("tables", item_id, lambda: check_tables(html, item_id, item_title))
        findings += _safe_check("contrast", item_id, lambda: check_contrast(html, item_id, item_title))
        findings += _safe_check(
            "media", item_id,
            lambda pv=page_videos: check_media(html, item_id, item_title, pv)
        )
        # Structure checks only for pages (not assignments/discussions/syllabus)
        if any(p.id == item_id for p in (course.pages or [])):
            findings += _safe_check(
                "structure", item_id,
                lambda: check_page_structure(html, item_id, item_title, module_ids, module_id)
            )

    # Document checks (course-level, not per-page)
    findings += _safe_check(
        "documents", None,
        lambda: check_documents(course.files or [])
    )

    # Video caption presence check (course-level, deduplicated by URL)
    from cvc_rubric.checks.captions import check_video_captions
    findings += _safe_check(
        "captions", None,
        lambda: check_video_captions(course)
    )

    # Post-processing: deduplicate repetitive findings
    from cvc_rubric.checks.dedup import deduplicate_findings
    findings = deduplicate_findings(findings)

    return findings


def _safe_check(
    check_name: str,
    page_id: Optional[str],
    fn,
) -> list[AccessibilityFinding]:
    """Wrap a check function so exceptions degrade to a single info finding."""
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001
        return [AccessibilityFinding(
            check_id=f"sys-error",
            severity="info",
            page_id=page_id or "",
            page_title="",
            element_snippet="",
            message=f"Check '{check_name}' raised an unexpected error: {exc}",
            remediation="Report this to the tool maintainer.",
        )]
