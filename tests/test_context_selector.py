"""Unit tests for context selector and token budgeting."""
import pytest
from cvc_rubric.context_selector import build_context, estimate_all_contexts
from cvc_rubric.models import CourseObject, Module, Page, Syllabus, Assignment, Discussion
from pathlib import Path

SAMPLE_PATH = Path(__file__).parent / "fixtures" / "sample_course.json"


def _minimal_course(**kwargs) -> CourseObject:
    return CourseObject(**kwargs)


# ---------------------------------------------------------------------------
# Basic context assembly
# ---------------------------------------------------------------------------

def test_syllabus_scope_returns_syllabus():
    course = CourseObject(syllabus=Syllabus(html="<p>x</p>", text="Syllabus content here"))
    bundle = build_context(course, "1.1", ["syllabus"], token_budget=4000)
    assert any(p.page_id == "syllabus" for p in bundle.pages)


def test_pages_scope_returns_pages():
    course = CourseObject(
        modules=[Module(id="m1", title="M1", position=1, items=[])],
        pages=[
            Page(id="p1", title="Page 1", module_id="m1", html="<p>x</p>", text="Hello from page one"),
        ],
    )
    bundle = build_context(course, "2.1", ["pages"], token_budget=4000)
    assert any(p.page_id == "p1" for p in bundle.pages)


def test_modules_scope_returns_structure():
    course = CourseObject(
        modules=[
            Module(id="m1", title="Module 1", position=1, items=[]),
            Module(id="m2", title="Module 2", position=2, items=[]),
        ]
    )
    bundle = build_context(course, "2.1", ["modules"], token_budget=4000)
    assert len(bundle.pages) == 1  # single summary page
    assert "Module 1" in bundle.pages[0].content
    assert "Module 2" in bundle.pages[0].content


def test_assignments_scope_returns_assignments():
    course = CourseObject(
        assignments=[Assignment(id="a1", title="Essay", html="", text="Write an essay about X.")]
    )
    bundle = build_context(course, "4.1", ["assignments"], token_budget=4000)
    assert any(p.page_id == "a1" for p in bundle.pages)


def test_discussions_scope_returns_discussions():
    course = CourseObject(
        discussions=[Discussion(id="d1", title="Intro Discussion", html="", text="Introduce yourself.")]
    )
    bundle = build_context(course, "3.4", ["discussions"], token_budget=4000)
    assert any(p.page_id == "d1" for p in bundle.pages)


def test_empty_course_returns_empty_bundle():
    course = CourseObject()
    bundle = build_context(course, "1.1", ["syllabus", "pages"], token_budget=4000)
    assert bundle.pages == []
    assert bundle.estimated_tokens == 0


# ---------------------------------------------------------------------------
# Token budget enforcement
# ---------------------------------------------------------------------------

def test_tiny_budget_causes_truncation():
    # 5 tokens is less than any real page
    course = CourseObject(
        syllabus=Syllabus(html="", text="This is a long syllabus text that should exceed a tiny token budget by a lot.")
    )
    bundle = build_context(course, "1.1", ["syllabus"], token_budget=5)
    assert bundle.truncated is True
    assert bundle.truncation_note != ""


def test_large_budget_no_truncation():
    course = CourseObject(
        syllabus=Syllabus(html="", text="Short.")
    )
    bundle = build_context(course, "1.1", ["syllabus"], token_budget=10000)
    assert bundle.truncated is False


def test_estimated_tokens_is_positive_for_nonempty_course():
    course = CourseObject(
        syllabus=Syllabus(html="", text="Some syllabus content.")
    )
    bundle = build_context(course, "1.1", ["syllabus"], token_budget=4000)
    assert bundle.estimated_tokens > 0


def test_multi_scope_respects_priority():
    """Syllabus listed first should always appear before pages."""
    course = CourseObject(
        syllabus=Syllabus(html="", text="Syllabus text."),
        pages=[Page(id="p1", title="P1", module_id=None, html="", text="Page text.")],
    )
    bundle = build_context(course, "1.1", ["syllabus", "pages"], token_budget=4000)
    ids = [p.page_id for p in bundle.pages]
    assert ids.index("syllabus") < ids.index("p1")


def test_unknown_scope_silently_skipped():
    course = CourseObject(syllabus=Syllabus(html="", text="Syllabus."))
    # "nonexistent_scope" should not raise
    bundle = build_context(course, "1.1", ["nonexistent_scope", "syllabus"], token_budget=4000)
    assert any(p.page_id == "syllabus" for p in bundle.pages)


# ---------------------------------------------------------------------------
# Dry-run estimate
# ---------------------------------------------------------------------------

def test_estimate_all_contexts_returns_list():
    import json
    from cvc_rubric.loader import load_course_object
    course, _ = load_course_object(str(SAMPLE_PATH))
    # Minimal rubric elements
    elements = [
        {"id": "1.1", "title": "Course Policies", "context_scope": ["syllabus"]},
        {"id": "2.1", "title": "Structure", "context_scope": ["modules", "pages"]},
    ]
    estimates = estimate_all_contexts(course, elements, token_budget=4000)
    assert len(estimates) == 2
    assert all("element_id" in e for e in estimates)
    assert all("estimated_tokens" in e for e in estimates)


def test_estimate_tokens_positive_for_real_course():
    from cvc_rubric.loader import load_course_object
    course, _ = load_course_object(str(SAMPLE_PATH))
    elements = [{"id": "1.1", "title": "Course Policies", "context_scope": ["syllabus", "pages"]}]
    estimates = estimate_all_contexts(course, elements, token_budget=6000)
    assert estimates[0]["estimated_tokens"] > 0
