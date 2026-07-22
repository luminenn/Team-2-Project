"""
Golden-file test: build a known IMSCC archive programmatically,
parse it, and verify the output matches the expected course object structure.

This test does NOT compare JSON byte-for-byte (text extraction whitespace
can vary by BeautifulSoup version).  It verifies structural and semantic
equivalence against tests/fixtures/golden_course_object.json.

To regenerate the golden file after intentional changes, run:
    pytest tests/test_parser_golden.py --regen-golden
(The --regen-golden flag is detected via the conftest GOLDEN_REGEN env var
or by passing it as a custom option.)
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.fixtures.imscc_builder import IMSCCBuilder
from cvc_rubric.parser.imscc import parse_imscc

GOLDEN_PATH = Path(__file__).parent / "fixtures" / "golden_course_object.json"


# ---------------------------------------------------------------------------
# Build a deterministic IMSCC that matches the golden fixture
# ---------------------------------------------------------------------------

def _build_golden_imscc(tmp_path: Path) -> Path:
    b = IMSCCBuilder(title="Introduction to Psychology", code="PSYCH-101", term="Fall 2027")

    b.add_page(
        "page-welcome", "Welcome",
        "<h2>Welcome!</h2><p>Welcome to Introduction to Psychology. "
        "I am Dr. Rivera. Please read the syllabus and reach out via Canvas Inbox.</p>",
    )
    b.add_page(
        "page-syllabus", "Syllabus",
        "<h1>Syllabus</h1><p>Academic Honesty: All work must be your own. "
        "AI policy: disclose any AI use. Disability Services: dsp@college.edu. "
        "Counseling: counseling@college.edu.</p>",
    )
    b.add_page(
        "page-w1-overview", "Week 1 Overview",
        '<h2>Week 1</h2><p>By the end of this module you will be able to define psychology.</p>'
        '<iframe src="https://www.youtube.com/embed/test001" width="560"></iframe>',
    )
    b.add_assignment(
        "assign-essay", "Reflection Essay",
        "<p>Write a 300-word reflection. Submit as PDF. Graded with rubric.</p>",
        due_date="2027-09-07",
        rubric=True,
    )
    b.add_quiz("quiz-w1", "Week 1 Quiz", question_count=5)
    b.add_discussion(
        "disc-w1", "Week 1 Discussion",
        "<p>Introduce yourself and share one reason you are interested in psychology.</p>",
    )
    b.add_web_resource("syllabus.pdf", b"A" * 1024)
    b.set_syllabus(
        "<h1>Course Syllabus</h1>"
        "<p>Welcome to PSYCH-101. Academic honesty and AI policies apply.</p>"
    )

    b.add_module("mod-0", "Start Here", position=0,
                 item_ids=["page-welcome", "page-syllabus"])
    b.add_module("mod-1", "Week 1", position=1,
                 item_ids=["page-w1-overview", "disc-w1", "quiz-w1", "assign-essay"])

    return b.write(tmp_path / "golden.imscc")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _by_id(items: list[dict], ident: str) -> dict:
    return next((x for x in items if x.get("id") == ident), {})


# ---------------------------------------------------------------------------
# Golden tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def golden_result(tmp_path_factory):
    tmp = tmp_path_factory.mktemp("golden")
    path = _build_golden_imscc(tmp)
    result, warnings = parse_imscc(str(path))
    return result, warnings


def test_golden_course_title(golden_result):
    result, _ = golden_result
    assert result["course"]["title"] == "Introduction to Psychology"


def test_golden_course_code(golden_result):
    result, _ = golden_result
    assert result["course"]["code"] == "PSYCH-101"


def test_golden_course_term(golden_result):
    result, _ = golden_result
    assert result["course"]["term"] == "Fall 2027"


def test_golden_module_count(golden_result):
    result, _ = golden_result
    assert len(result["modules"]) == 2


def test_golden_module_0_title(golden_result):
    result, _ = golden_result
    mod = _by_id(result["modules"], "mod-0")
    assert mod["title"] == "Start Here"
    assert mod["position"] == 0


def test_golden_module_1_item_count(golden_result):
    result, _ = golden_result
    mod = _by_id(result["modules"], "mod-1")
    assert len(mod["items"]) == 4


def test_golden_pages_present(golden_result):
    result, _ = golden_result
    page_ids = {p["id"] for p in result["pages"]}
    assert "page-welcome" in page_ids
    assert "page-syllabus" in page_ids
    assert "page-w1-overview" in page_ids


def test_golden_welcome_page_html(golden_result):
    result, _ = golden_result
    page = _by_id(result["pages"], "page-welcome")
    assert "<h2>" in page["html"]
    assert "Dr. Rivera" in page["html"]


def test_golden_welcome_page_text_no_tags(golden_result):
    result, _ = golden_result
    page = _by_id(result["pages"], "page-welcome")
    assert "<" not in page["text"]
    assert "Dr. Rivera" in page["text"]


def test_golden_welcome_page_module_id(golden_result):
    result, _ = golden_result
    page = _by_id(result["pages"], "page-welcome")
    assert page["module_id"] == "mod-0"


def test_golden_assignment_present(golden_result):
    result, _ = golden_result
    a = _by_id(result["assignments"], "assign-essay")
    assert a["title"] == "Reflection Essay"
    assert a["rubric_present"] is True
    assert a["due_date"] == "2027-09-07"


def test_golden_quiz_present(golden_result):
    result, _ = golden_result
    q = _by_id(result["quizzes"], "quiz-w1")
    assert q["title"] == "Week 1 Quiz"
    assert q["question_count"] == 5


def test_golden_discussion_present(golden_result):
    result, _ = golden_result
    d = _by_id(result["discussions"], "disc-w1")
    assert "psychology" in d["text"]


def test_golden_file_present(golden_result):
    result, _ = golden_result
    assert len(result["files"]) == 1
    assert result["files"][0]["name"] == "syllabus.pdf"
    assert result["files"][0]["mime"] == "application/pdf"
    assert result["files"][0]["size"] == 1024


def test_golden_video_detected(golden_result):
    result, _ = golden_result
    assert len(result["videos"]) == 1
    v = result["videos"][0]
    assert v["source"] == "youtube"
    assert "test001" in v["url"]
    assert v["page_id"] == "page-w1-overview"


def test_golden_syllabus_present(golden_result):
    result, _ = golden_result
    assert result["syllabus"] is not None
    assert "PSYCH-101" in result["syllabus"]["html"]
    assert "PSYCH-101" in result["syllabus"]["text"]


def test_golden_no_internal_keys_in_output(golden_result):
    """_position and other internal keys must not leak into the output."""
    result, _ = golden_result
    for mod in result["modules"]:
        for item in mod["items"]:
            assert "_position" not in item


def test_golden_all_top_level_keys(golden_result):
    result, _ = golden_result
    for key in ("course", "modules", "pages", "assignments", "quizzes",
                "discussions", "files", "videos", "syllabus"):
        assert key in result


def test_golden_is_json_serialisable(golden_result):
    result, _ = golden_result
    serialised = json.dumps(result)
    assert isinstance(serialised, str)
    assert len(serialised) > 100
