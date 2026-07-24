"""
Context selector: builds the text slice to feed each LLM call.

Rules:
- Each rubric element defines a context_scope list (e.g. ["syllabus", "pages"]).
- We assemble the relevant content from the course object, ordered by relevance.
- If the assembled context would exceed token_budget, we truncate by priority
  (syllabus first, then pages ordered by module position, etc.) and record a
  truncation note in the returned ContextBundle.
- Token counting uses tiktoken cl100k_base (a reasonable proxy for Claude tokens).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Optional

import tiktoken

from cvc_rubric.models import CourseObject

_ENCODER = tiktoken.get_encoding("cl100k_base")


def _count_tokens(text: str) -> int:
    return len(_ENCODER.encode(text))


@dataclass
class ContextPage:
    page_id: str
    page_title: str
    content: str  # text representation fed to the LLM


@dataclass
class ContextBundle:
    element_id: str
    pages: list[ContextPage] = field(default_factory=list)
    truncated: bool = False
    truncation_note: str = ""
    estimated_tokens: int = 0

    def full_text(self) -> str:
        parts = []
        for p in self.pages:
            parts.append(f"### [{p.page_id}] {p.page_title}\n{p.content}")
        return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Scope → extractor mapping
# ---------------------------------------------------------------------------

def _extract_syllabus(course: CourseObject) -> list[ContextPage]:
    if course.syllabus and course.syllabus.text.strip():
        return [ContextPage("syllabus", "Syllabus", course.syllabus.text.strip())]
    return []


def _extract_pages(course: CourseObject) -> list[ContextPage]:
    """All pages, ordered by module position then page order within module."""
    # Build a position map: module_id → position
    mod_pos = {m.id: m.position for m in (course.modules or [])}
    def sort_key(p):
        return (mod_pos.get(p.module_id or "", 9999), p.id)
    pages = sorted(course.pages or [], key=sort_key)
    return [
        ContextPage(p.id, p.title, p.text.strip())
        for p in pages
        if p.text.strip()
    ]


def _extract_modules(course: CourseObject) -> list[ContextPage]:
    """Module structure as a summary (titles + item titles)."""
    parts = []
    for m in sorted(course.modules or [], key=lambda x: x.position):
        item_titles = [i.title for i in (m.items or [])]
        summary = f"Module {m.position}: {m.title}\n  Items: {', '.join(item_titles) or '(none)'}"
        parts.append(summary)
    if not parts:
        return []
    return [ContextPage("modules", "Module Structure", "\n".join(parts))]


def _extract_assignments(course: CourseObject) -> list[ContextPage]:
    return [
        ContextPage(a.id, f"Assignment: {a.title}", a.text.strip())
        for a in (course.assignments or [])
        if a.text.strip()
    ]


def _extract_quizzes(course: CourseObject) -> list[ContextPage]:
    if not course.quizzes:
        return []
    lines = [f"- {q.title} ({q.question_count} questions)" for q in course.quizzes]
    return [ContextPage("quizzes", "Quizzes", "\n".join(lines))]


def _extract_discussions(course: CourseObject) -> list[ContextPage]:
    return [
        ContextPage(d.id, f"Discussion: {d.title}", d.text.strip())
        for d in (course.discussions or [])
        if d.text.strip()
    ]


def _extract_announcements(course: CourseObject) -> list[ContextPage]:
    """
    Announcements are not a top-level field in the course object spec,
    but welcome messages are often stored as pages titled "Welcome" or
    "Getting Started". Surface those pages for RSI elements.
    """
    keywords = ("welcome", "getting started", "start here", "announcement",
                 "orientation", "introduction", "first day", "before you begin")
    matches = [
        ContextPage(p.id, p.title, p.text.strip())
        for p in (course.pages or [])
        if any(kw in p.title.lower() for kw in keywords) and p.text.strip()
    ]
    return matches


_SCOPE_EXTRACTORS = {
    "syllabus": _extract_syllabus,
    "pages": _extract_pages,
    "modules": _extract_modules,
    "assignments": _extract_assignments,
    "quizzes": _extract_quizzes,
    "discussions": _extract_discussions,
    "announcements": _extract_announcements,
}

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_context(
    course: CourseObject,
    element_id: str,
    context_scope: list[str],
    token_budget: int = 6000,
) -> ContextBundle:
    """
    Assemble a ContextBundle for one rubric element.

    Priority within the bundle is the order of context_scope; the first scope
    is highest priority and is never truncated unless it alone exceeds the budget.
    """
    bundle = ContextBundle(element_id=element_id)
    remaining_budget = token_budget

    for scope in context_scope:
        extractor = _SCOPE_EXTRACTORS.get(scope)
        if extractor is None:
            continue
        scope_pages = extractor(course)
        for cp in scope_pages:
            tokens = _count_tokens(cp.content)
            if tokens <= remaining_budget:
                bundle.pages.append(cp)
                remaining_budget -= tokens
            else:
                # Truncate this page to fit remaining budget
                if remaining_budget > 100:
                    truncated_text = _truncate_to_tokens(cp.content, remaining_budget - 20)
                    bundle.pages.append(ContextPage(
                        cp.page_id,
                        cp.page_title,
                        truncated_text + "\n[...content truncated to fit token budget...]",
                    ))
                    remaining_budget = 0
                    bundle.truncated = True
                    bundle.truncation_note = (
                        f"Context truncated at '{cp.page_title}' (scope: {scope}) "
                        f"to fit within {token_budget}-token budget."
                    )
                else:
                    bundle.truncated = True
                    bundle.truncation_note = (
                        f"Content from scope '{scope}' omitted: "
                        f"token budget exhausted ({token_budget} tokens)."
                    )
                break  # stop adding pages from this scope
        if remaining_budget <= 0:
            break

    bundle.estimated_tokens = token_budget - remaining_budget
    return bundle


def _truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to at most max_tokens tokens, breaking on whitespace."""
    tokens = _ENCODER.encode(text)
    if len(tokens) <= max_tokens:
        return text
    truncated_tokens = tokens[:max_tokens]
    return _ENCODER.decode(truncated_tokens)


def estimate_all_contexts(
    course: CourseObject,
    rubric_elements: list[dict],
    token_budget: int,
) -> list[dict]:
    """
    Dry-run mode helper: returns a list of {element_id, estimated_tokens, truncated}
    dicts without calling the LLM.
    """
    results = []
    for element in rubric_elements:
        bundle = build_context(
            course,
            element["id"],
            element.get("context_scope", []),
            token_budget,
        )
        results.append({
            "element_id": element["id"],
            "element_title": element.get("title", ""),
            "estimated_tokens": bundle.estimated_tokens,
            "truncated": bundle.truncated,
            "truncation_note": bundle.truncation_note,
            "context_pages": [p.page_id for p in bundle.pages],
        })
    return results
