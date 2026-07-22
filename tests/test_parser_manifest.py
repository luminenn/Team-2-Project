"""Unit tests for manifest and module parsing."""
from __future__ import annotations

from pathlib import Path

import pytest

from tests.fixtures.imscc_builder import IMSCCBuilder
from cvc_rubric.parser.imscc import parse_imscc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build(tmp_path: Path, **kwargs) -> Path:
    b = IMSCCBuilder(**kwargs)
    b.add_page("p1", "Welcome", "<h1>Hello</h1><p>Welcome to the course.</p>")
    b.add_page("p2", "Week 1 Overview", "<h2>Week 1</h2><p>Content here.</p>")
    b.add_module("mod-0", "Start Here", position=0, item_ids=["p1"])
    b.add_module("mod-1", "Week 1", position=1, item_ids=["p2"])
    return b.write(tmp_path / "course.imscc")


# ---------------------------------------------------------------------------
# Course metadata
# ---------------------------------------------------------------------------

def test_course_title(tmp_path):
    path = _build(tmp_path, title="Intro to Biology", code="BIO-101", term="Spring 2027")
    result, warnings = parse_imscc(str(path))
    assert result["course"]["title"] == "Intro to Biology"


def test_course_code(tmp_path):
    path = _build(tmp_path, code="BIO-101")
    result, _ = parse_imscc(str(path))
    assert result["course"]["code"] == "BIO-101"


def test_course_term(tmp_path):
    path = _build(tmp_path, term="Spring 2027")
    result, _ = parse_imscc(str(path))
    assert result["course"]["term"] == "Spring 2027"


# ---------------------------------------------------------------------------
# Top-level keys always present
# ---------------------------------------------------------------------------

def test_all_keys_present(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    required = ["course", "modules", "pages", "assignments", "quizzes",
                "discussions", "files", "videos", "syllabus"]
    for key in required:
        assert key in result, f"Missing key: {key}"


def test_empty_lists_not_omitted(tmp_path):
    b = IMSCCBuilder()
    path = b.write(tmp_path / "empty.imscc")
    result, _ = parse_imscc(str(path))
    assert result["assignments"] == []
    assert result["quizzes"] == []
    assert result["discussions"] == []
    assert result["files"] == []
    assert result["videos"] == []


# ---------------------------------------------------------------------------
# Module structure
# ---------------------------------------------------------------------------

def test_module_count(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    assert len(result["modules"]) == 2


def test_module_positions_ordered(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    positions = [m["position"] for m in result["modules"]]
    assert positions == sorted(positions)


def test_module_has_required_keys(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    for mod in result["modules"]:
        assert "id" in mod
        assert "title" in mod
        assert "position" in mod
        assert "items" in mod


def test_module_items_have_required_keys(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    for mod in result["modules"]:
        for item in mod["items"]:
            assert "id" in item
            assert "title" in item
            assert "type" in item
            assert "resource_id" in item
            # internal _position key must NOT be in output
            assert "_position" not in item


def test_module_item_resource_id_matches_page(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    all_item_rids = {
        item["resource_id"]
        for mod in result["modules"]
        for item in mod["items"]
    }
    page_ids = {p["id"] for p in result["pages"]}
    # Every item resource_id that looks like a page should exist in pages
    assert all_item_rids & page_ids  # at least some overlap


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

def test_pages_extracted(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    assert len(result["pages"]) == 2


def test_page_has_required_keys(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    for page in result["pages"]:
        for key in ("id", "title", "module_id", "html", "text", "path"):
            assert key in page


def test_page_html_preserved(tmp_path):
    b = IMSCCBuilder()
    b.add_page("p1", "Test", "<h2>Hello</h2><p>World</p>")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    page = next(p for p in result["pages"] if p["id"] == "p1")
    assert "<h2>" in page["html"]
    assert "<p>" in page["html"]


def test_page_text_is_plain(tmp_path):
    b = IMSCCBuilder()
    b.add_page("p1", "Test", "<h2>Hello</h2><p>World</p>")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    page = next(p for p in result["pages"] if p["id"] == "p1")
    assert "<h2>" not in page["text"]
    assert "Hello" in page["text"]
    assert "World" in page["text"]


def test_page_module_id_assigned(tmp_path):
    path = _build(tmp_path)
    result, _ = parse_imscc(str(path))
    # p1 should be in mod-0, p2 in mod-1
    p1 = next(p for p in result["pages"] if p["id"] == "p1")
    p2 = next(p for p in result["pages"] if p["id"] == "p2")
    assert p1["module_id"] == "mod-0"
    assert p2["module_id"] == "mod-1"


# ---------------------------------------------------------------------------
# Assignments
# ---------------------------------------------------------------------------

def test_assignment_extracted(tmp_path):
    b = IMSCCBuilder()
    b.add_assignment("a1", "Essay", "<p>Write an essay.</p>", due_date="2027-09-01")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert len(result["assignments"]) == 1
    a = result["assignments"][0]
    assert a["id"] == "a1"
    assert a["title"] == "Essay"
    assert a["due_date"] == "2027-09-01"


def test_assignment_rubric_present(tmp_path):
    b = IMSCCBuilder()
    b.add_assignment("a1", "Essay", "<p>Write.</p>", rubric=True)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["assignments"][0]["rubric_present"] is True


def test_assignment_rubric_absent(tmp_path):
    b = IMSCCBuilder()
    b.add_assignment("a1", "Essay", "<p>Write.</p>", rubric=False)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["assignments"][0]["rubric_present"] is False


# ---------------------------------------------------------------------------
# Quizzes
# ---------------------------------------------------------------------------

def test_quiz_extracted(tmp_path):
    b = IMSCCBuilder()
    b.add_quiz("q1", "Quiz 1", question_count=5)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert len(result["quizzes"]) == 1
    assert result["quizzes"][0]["question_count"] == 5


# ---------------------------------------------------------------------------
# Discussions
# ---------------------------------------------------------------------------

def test_discussion_extracted(tmp_path):
    b = IMSCCBuilder()
    b.add_discussion("d1", "Intro Discussion", "<p>Introduce yourself.</p>")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert len(result["discussions"]) == 1
    assert result["discussions"][0]["id"] == "d1"


# ---------------------------------------------------------------------------
# Syllabus
# ---------------------------------------------------------------------------

def test_syllabus_from_course_settings(tmp_path):
    b = IMSCCBuilder()
    b.set_syllabus("<h1>Syllabus</h1><p>Course policies here.</p>")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["syllabus"] is not None
    assert "<h1>Syllabus</h1>" in result["syllabus"]["html"]
    assert "Syllabus" in result["syllabus"]["text"]


def test_syllabus_null_when_absent(tmp_path):
    b = IMSCCBuilder()
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["syllabus"] is None


# ---------------------------------------------------------------------------
# Determinism
# ---------------------------------------------------------------------------

def test_output_is_deterministic(tmp_path):
    import json
    path = _build(tmp_path)
    r1, _ = parse_imscc(str(path))
    r2, _ = parse_imscc(str(path))
    assert json.dumps(r1, sort_keys=True) == json.dumps(r2, sort_keys=True)
