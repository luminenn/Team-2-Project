"""
Block builder: assembles rubric-element-relevant course content into
a single text block for LLM evaluation.

Design:
- Selects course objects by the element's context_scope
- Produces a clean LLM text projection (via llm_text_projection module)
- Applies a token budget guard: truncate-with-marker if over budget (single block always)
- Never splits into sub-blocks or aggregates across parts
- Media (videos, images, PDFs) enters only as lightweight text metadata, never file bytes

The original html/text fields remain untouched — accessibility checkers
continue to use the full DOM.

Token budget rationale (encoded as required by spec):
# With the target model's large context window (~200K tokens), a single course's
# per-element block is expected to fit comfortably with wide margin. The truncation
# guard is a safety net for pathological cases only. Per-object splitting and
# multi-part aggregation are deliberately out of scope and left as a documented
# future enhancement for extremely large courses.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import tiktoken

from cvc_rubric.llm_text_projection import project_page_text
from cvc_rubric.models import (
    Assignment,
    CourseFile,
    CourseObject,
    Discussion,
    Module,
    Page,
    Quiz,
    Syllabus,
    Video,
)

# ---------------------------------------------------------------------------
# Token counting
# ---------------------------------------------------------------------------

_ENCODER = tiktoken.get_encoding("cl100k_base")

# Default generous budget — target model has ~200K context window.
# A single element's course content should fit easily; this is a safety net.
DEFAULT_TOKEN_BUDGET = 100_000


def count_tokens(text: str) -> int:
    """Count tokens using cl100k_base encoding (proxy for Claude tokenization)."""
    if not text:
        return 0
    return len(_ENCODER.encode(text))


def _truncate_to_budget(text: str, max_tokens: int) -> str:
    """Truncate text to fit within max_tokens, breaking at token boundary."""
    tokens = _ENCODER.encode(text)
    if len(tokens) <= max_tokens:
        return text
    return _ENCODER.decode(tokens[:max_tokens])


# ---------------------------------------------------------------------------
# Block dataclass
# ---------------------------------------------------------------------------

@dataclass
class Block:
    """A single assembled text block for one rubric element."""
    element_id: str
    text: str
    source_ids: list[str] = field(default_factory=list)
    token_count: int = 0
    truncated: bool = False
    truncation_note: str = ""
    not_evaluable: bool = False
    not_evaluable_reason: str = ""


class NotEvaluable:
    """Sentinel indicating the element cannot be evaluated due to missing requires."""
    def __init__(self, element_id: str, reason: str):
        self.element_id = element_id
        self.reason = reason


# ---------------------------------------------------------------------------
# Content extractors (produce LLM text projections per scope)
# ---------------------------------------------------------------------------

@dataclass
class _ContentSlice:
    """One piece of content with its source ID and projected text."""
    source_id: str
    title: str
    text: str


def _extract_syllabus(course: CourseObject) -> list[_ContentSlice]:
    if course.syllabus and (course.syllabus.html.strip() or course.syllabus.text.strip()):
        projected = project_page_text(course.syllabus.html, course.syllabus.text)
        if projected:
            return [_ContentSlice("syllabus", "Syllabus", projected)]
    return []


def _extract_pages(course: CourseObject) -> list[_ContentSlice]:
    """Pages ordered by module position."""
    mod_pos = {m.id: m.position for m in (course.modules or [])}

    def sort_key(p: Page):
        return (mod_pos.get(p.module_id or "", 9999), p.id)

    pages = sorted(course.pages or [], key=sort_key)
    slices = []
    for p in pages:
        projected = project_page_text(p.html, p.text)
        if projected:
            slices.append(_ContentSlice(p.id, p.title, projected))
    return slices


def _extract_modules(course: CourseObject) -> list[_ContentSlice]:
    """Module structure summary (titles + item titles)."""
    parts = []
    for m in sorted(course.modules or [], key=lambda x: x.position):
        item_titles = [i.title for i in (m.items or [])]
        summary = f"Module {m.position}: {m.title}\n  Items: {', '.join(item_titles) or '(none)'}"
        parts.append(summary)
    if not parts:
        return []
    return [_ContentSlice("modules", "Module Structure", "\n".join(parts))]


def _extract_assignments(course: CourseObject) -> list[_ContentSlice]:
    slices = []
    for a in (course.assignments or []):
        projected = project_page_text(a.html, a.text)
        if projected:
            slices.append(_ContentSlice(a.id, f"Assignment: {a.title}", projected))
    return slices


def _extract_quizzes(course: CourseObject) -> list[_ContentSlice]:
    if not course.quizzes:
        return []
    lines = [f"- {q.title} ({q.question_count} questions)" for q in course.quizzes]
    return [_ContentSlice("quizzes", "Quizzes", "\n".join(lines))]


def _extract_discussions(course: CourseObject) -> list[_ContentSlice]:
    slices = []
    for d in (course.discussions or []):
        projected = project_page_text(d.html, d.text)
        if projected:
            slices.append(_ContentSlice(d.id, f"Discussion: {d.title}", projected))
    return slices


def _extract_announcements(course: CourseObject) -> list[_ContentSlice]:
    """
    Surface pages likely to be welcome/announcement content (for RSI elements).
    Canvas doesn't export announcements as a separate type in .imscc;
    they appear as pages with characteristic titles.
    """
    keywords = (
        "welcome", "getting started", "start here", "announcement",
        "orientation", "introduction", "first day", "before you begin",
    )
    slices = []
    for p in (course.pages or []):
        if any(kw in p.title.lower() for kw in keywords):
            projected = project_page_text(p.html, p.text)
            if projected:
                slices.append(_ContentSlice(p.id, p.title, projected))
    return slices


def _extract_videos(course: CourseObject) -> list[_ContentSlice]:
    """Videos as lightweight metadata only — never file bytes."""
    if not course.videos:
        return []
    lines = []
    for v in course.videos:
        captions = "yes" if v.captions_declared else ("no" if v.captions_declared is False else "unknown")
        lines.append(f"- Video: {v.url[:80]} (source: {v.source}, captions: {captions}, page: {v.page_id})")
    return [_ContentSlice("videos", "Video Inventory", "\n".join(lines))]


def _extract_files(course: CourseObject) -> list[_ContentSlice]:
    """Files as metadata only — never file bytes/base64."""
    if not course.files:
        return []
    lines = []
    for f in course.files:
        lines.append(f"- {f.name} ({f.mime or 'unknown type'}, {f.size} bytes)")
    return [_ContentSlice("files", "File Inventory", "\n".join(lines))]


_SCOPE_EXTRACTORS: dict[str, callable] = {
    "syllabus": _extract_syllabus,
    "pages": _extract_pages,
    "modules": _extract_modules,
    "assignments": _extract_assignments,
    "quizzes": _extract_quizzes,
    "discussions": _extract_discussions,
    "announcements": _extract_announcements,
    "videos": _extract_videos,
    "files": _extract_files,
}


# ---------------------------------------------------------------------------
# Requires check
# ---------------------------------------------------------------------------

def _check_requires(element: dict, course: CourseObject) -> Optional[str]:
    """
    Check if the element's requires[] are satisfied.
    Returns a reason string if a required input is absent, else None.
    """
    for req in element.get("requires", []):
        if req == "syllabus":
            if not course.syllabus or not (course.syllabus.html.strip() or course.syllabus.text.strip()):
                return f"Required input '{req}' is absent from the course."
        elif req == "pages":
            if not course.pages:
                return f"Required input '{req}' is absent from the course."
        elif req == "assignments":
            if not course.assignments:
                return f"Required input '{req}' is absent from the course."
        elif req == "discussions":
            if not course.discussions:
                return f"Required input '{req}' is absent from the course."
    return None


# ---------------------------------------------------------------------------
# Public API: build_block
# ---------------------------------------------------------------------------

def build_block(
    element: dict,
    course: CourseObject,
    token_budget: int = DEFAULT_TOKEN_BUDGET,
) -> Block | NotEvaluable:
    """
    Assemble a single text block for one rubric element.

    Args:
        element: A rubric element dict with at minimum 'id', 'context_scope', 'requires'.
        course: The parsed CourseObject.
        token_budget: Maximum tokens for the assembled block (generous default).

    Returns:
        Block with the assembled clean text, or NotEvaluable if requires are unmet.
    """
    element_id = element.get("id", "unknown")

    # Check requires — if missing, return not-evaluable signal
    missing = _check_requires(element, course)
    if missing:
        return NotEvaluable(element_id=element_id, reason=missing)

    # Select content by context_scope
    context_scope = element.get("context_scope", [])
    all_slices: list[_ContentSlice] = []
    seen_ids: set[str] = set()

    for scope in context_scope:
        extractor = _SCOPE_EXTRACTORS.get(scope)
        if extractor is None:
            continue
        slices = extractor(course)
        for s in slices:
            # Deduplicate (announcements extractor may overlap with pages)
            if s.source_id not in seen_ids:
                all_slices.append(s)
                seen_ids.add(s.source_id)

    if not all_slices:
        return Block(
            element_id=element_id,
            text="",
            source_ids=[],
            token_count=0,
            truncated=False,
            not_evaluable=True,
            not_evaluable_reason="No content found matching the element's context_scope.",
        )

    # Assemble the full text block with section headers
    parts = []
    source_ids = []
    for s in all_slices:
        parts.append(f"### [{s.source_id}] {s.title}\n{s.text}")
        source_ids.append(s.source_id)

    full_text = "\n\n".join(parts)

    # Token budget guard
    token_count = count_tokens(full_text)
    truncated = False
    truncation_note = ""

    if token_count > token_budget:
        # Truncate to budget — single block, no splitting
        full_text = _truncate_to_budget(full_text, token_budget)
        full_text += "\n\n[...content truncated to fit context budget...]"
        token_count = token_budget
        truncated = True
        truncation_note = (
            f"Content truncated to fit within {token_budget}-token budget. "
            f"Some course content may not be represented."
        )

    return Block(
        element_id=element_id,
        text=full_text,
        source_ids=source_ids,
        token_count=token_count,
        truncated=truncated,
        truncation_note=truncation_note,
    )


# ---------------------------------------------------------------------------
# Stub: hand-off to Bedrock semantic checker
# ---------------------------------------------------------------------------

def evaluate_element_stub(block: Block, element: dict) -> None:
    """
    Stub hand-off point for Bedrock integration.

    # TODO: send to Bedrock semantic checker
    # This is where the assembled block.text would be passed to the LLM
    # along with the element's evaluation_prompt from rubric_prompts.json.
    # The LLM would return a structured RubricFinding (rating, evidence, etc.).
    #
    # Integration steps (future task):
    # 1. Load evaluation_prompt for element from rubric_prompts.json
    # 2. Build the full prompt: evaluation_prompt + block.text
    # 3. Call Bedrock with the prompt
    # 4. Parse response into RubricFinding
    # 5. Validate evidence quotes against source texts
    """
    raise NotImplementedError(
        "Bedrock integration not yet implemented. "
        "This stub marks where the block would be sent to the LLM."
    )
