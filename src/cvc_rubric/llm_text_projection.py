"""
LLM text projection: non-destructive clean text from HTML.

Produces a separate text representation of course content for LLM consumption.
This does NOT modify the original html/text fields used by accessibility checkers.

Design:
- Strip all HTML tags, scripts, styles, nav chrome
- Preserve meaningful structure: headings as text lines, list items, link text
- Replace Canvas placeholders with readable short tokens
- Normalize whitespace; drop empty/duplicate runs
- Keep all instructional content, policies, instructions (lossless of meaning)
"""
from __future__ import annotations

import re
from typing import Optional

from bs4 import BeautifulSoup, NavigableString, Tag


# ---------------------------------------------------------------------------
# Canvas placeholder normalization
# ---------------------------------------------------------------------------

_PLACEHOLDER_MAP = {
    "$IMS-CC-FILEBASE$": "[file link]",
    "$CANVAS_OBJECT_REFERENCE$": "[course link]",
    "$WIKI_REFERENCE$": "[page link]",
    "$CANVAS_COURSE_REFERENCE$": "[course link]",
}

_PLACEHOLDER_RE = re.compile(
    r"\$IMS-CC-FILEBASE\$|\$CANVAS_OBJECT_REFERENCE\$"
    r"|\$WIKI_REFERENCE\$|\$CANVAS_COURSE_REFERENCE\$"
)


def _replace_placeholders(text: str) -> str:
    """Replace Canvas IMS-CC placeholders with short readable tokens."""
    return _PLACEHOLDER_RE.sub(
        lambda m: _PLACEHOLDER_MAP.get(m.group(0), "[link]"), text
    )


# ---------------------------------------------------------------------------
# HTML to clean text
# ---------------------------------------------------------------------------

_BLOCK_TAGS = frozenset({
    "p", "div", "section", "article", "aside", "main", "header", "footer",
    "blockquote", "pre", "figure", "figcaption", "details", "summary",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "dl", "dt", "dd",
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    "br", "hr",
})

_HEADING_TAGS = frozenset({"h1", "h2", "h3", "h4", "h5", "h6"})

_WHITESPACE_RUN = re.compile(r"[ \t]+")
_BLANK_LINES = re.compile(r"\n{3,}")


def html_to_llm_text(html: str) -> str:
    """
    Convert HTML to a clean text projection suitable for LLM input.

    This is a non-destructive fork: the original html remains untouched
    for accessibility checkers that need the full DOM.

    Returns clean text preserving:
    - Heading structure (as "## Heading Text" lines)
    - List items (as "- item" lines)
    - Link text (descriptive text only, not raw hrefs)
    - Table content (as readable rows)
    - Paragraph breaks
    """
    if not html or not html.strip():
        return ""

    soup = BeautifulSoup(html, "lxml")

    # Remove script, style, nav, and hidden elements entirely
    for tag in soup.find_all(["script", "style", "nav", "noscript"]):
        tag.decompose()

    # Remove elements with aria-hidden="true" or display:none
    for tag in soup.find_all(True):
        if not isinstance(tag, Tag):
            continue
        if tag.get("aria-hidden") == "true":
            tag.decompose()
            continue
        style = tag.get("style", "")
        if "display:none" in style.replace(" ", "") or "display: none" in style:
            tag.decompose()

    # Walk the tree and build text
    lines: list[str] = []
    _walk(soup, lines)

    text = "\n".join(lines)

    # Replace Canvas placeholders
    text = _replace_placeholders(text)

    # Normalize whitespace
    # Collapse multiple spaces on a line to one
    text = _WHITESPACE_RUN.sub(" ", text)
    # Collapse 3+ blank lines to 2
    text = _BLANK_LINES.sub("\n\n", text)
    # Strip leading/trailing whitespace from each line
    text = "\n".join(line.strip() for line in text.split("\n"))
    # Final trim
    text = text.strip()

    return text


def _walk(element, lines: list[str]) -> None:
    """Recursively walk a BeautifulSoup element tree, appending text lines."""
    if isinstance(element, NavigableString):
        text = str(element)
        if text.strip():
            lines.append(text.strip())
        return

    if not isinstance(element, Tag):
        return

    tag_name = element.name

    # Skip the document wrapper tags
    if tag_name in ("[document]", "html", "body"):
        for child in element.children:
            _walk(child, lines)
        return

    # Headings → "## Heading Text"
    if tag_name in _HEADING_TAGS:
        level = int(tag_name[1])
        heading_text = element.get_text(separator=" ", strip=True)
        if heading_text:
            prefix = "#" * level
            lines.append(f"\n{prefix} {heading_text}\n")
        return

    # Links → preserve link text (not URL)
    if tag_name == "a":
        link_text = element.get_text(separator=" ", strip=True)
        if link_text:
            # If the link text IS a URL, keep it short
            href = element.get("href", "")
            if link_text.startswith("http") and href:
                lines.append(f"[{link_text[:60]}]")
            else:
                lines.append(link_text)
        return

    # Images → represent as metadata only
    if tag_name == "img":
        alt = element.get("alt", "")
        if alt:
            lines.append(f"[Image: {alt}]")
        else:
            lines.append("[Image]")
        return

    # Iframes (embedded video etc.) → metadata only
    if tag_name == "iframe":
        src = element.get("src", "")
        title = element.get("title", "")
        label = title or "embedded content"
        lines.append(f"[Embedded: {label}]")
        return

    # Video/audio → metadata only
    if tag_name in ("video", "audio"):
        lines.append(f"[{tag_name.capitalize()} element]")
        return

    # List items
    if tag_name == "li":
        item_text = element.get_text(separator=" ", strip=True)
        if item_text:
            lines.append(f"- {item_text}")
        return

    # Table rows → join cells with " | "
    if tag_name == "tr":
        cells = element.find_all(["th", "td"])
        cell_texts = [c.get_text(separator=" ", strip=True) for c in cells]
        row_text = " | ".join(cell_texts)
        if row_text.strip():
            lines.append(row_text)
        return

    # Block-level tags → add a blank line before/after
    if tag_name in _BLOCK_TAGS:
        lines.append("")
        for child in element.children:
            _walk(child, lines)
        lines.append("")
        return

    # Inline and other tags → recurse into children
    for child in element.children:
        _walk(child, lines)


# ---------------------------------------------------------------------------
# Convenience: project a whole course object's content fields
# ---------------------------------------------------------------------------

def project_page_text(html: str, fallback_text: str = "") -> str:
    """
    Produce LLM text projection for a single page/assignment/discussion.
    Uses html if available, otherwise falls back to existing text field.
    """
    if html and html.strip():
        return html_to_llm_text(html)
    if fallback_text and fallback_text.strip():
        return _replace_placeholders(fallback_text.strip())
    return ""
