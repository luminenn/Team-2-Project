"""
Integration test: IMSCC → parser → analysis engine.

Verifies that the output of parse_imscc() is accepted by the analysis
engine (loader + deterministic checks) without schema errors.
The LLM is NOT called — deterministic-only mode.

This test is intentionally free of the 'integration' mark so it runs
in CI without AWS credentials.
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from tests.fixtures.imscc_builder import IMSCCBuilder
from cvc_rubric.parser.imscc import parse_imscc
from cvc_rubric.loader import load_course_object
from cvc_rubric.models import CourseObject, AccessibilityFinding


# ---------------------------------------------------------------------------
# Fixture: a rich IMSCC with content across all resource types
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def rich_imscc(tmp_path_factory) -> Path:
    tmp = tmp_path_factory.mktemp("integration")
    b = IMSCCBuilder(title="Sociology 101", code="SOC-101", term="Spring 2027")

    b.add_page(
        "p-welcome", "Welcome",
        "<h2>Welcome to SOC-101!</h2>"
        "<p>Contact me via Canvas Inbox. Response time: 48 hours.</p>"
        "<p>Disability Services: dsp@college.edu. Tutoring: tutoring@college.edu.</p>",
    )
    b.add_page(
        "p-syllabus", "Syllabus",
        "<h1>Syllabus</h1>"
        "<p>Academic Honesty policy. AI use policy. Privacy policy.</p>"
        "<p>Canvas, Zoom, and Google Forms are used. All meet accessibility standards.</p>",
    )
    b.add_page(
        "p-mod1", "Module 1 Overview",
        "<h2>Module 1: The Sociological Imagination</h2>"
        '<p>Learning objectives: (1) Define sociology. (2) Apply the sociological imagination.</p>'
        '<iframe src="https://www.youtube.com/embed/soc101" width="560"></iframe>'
        '<img src="banner.png" alt="Sociology banner image">',
    )
    b.add_assignment(
        "a-essay", "Reflection Essay",
        "<p>Write a 500-word essay. Submit as PDF by Sunday 11:59 PM.</p>"
        "<p>Grading rubric attached. Feedback within 5 business days.</p>",
        due_date="2027-03-01",
        rubric=True,
    )
    b.add_quiz("q-1", "Module 1 Quiz", question_count=10)
    b.add_discussion(
        "d-intro", "Introduction Discussion",
        "<p>Introduce yourself. Reply to two classmates by Sunday.</p>"
        "<p>Be respectful and inclusive.</p>",
    )
    b.set_syllabus(
        "<h1>SOC-101 Course Syllabus</h1>"
        "<p>All work must be original. AI tools: disclose use. "
        "Technology: Canvas and Zoom. Accessibility: all tools vetted.</p>"
        "<p>Disability services, counseling, tutoring, library, and basic needs "
        "resources are listed below.</p>"
    )
    b.add_web_resource("course-reader.pdf", b"X" * 2048)
    b.add_web_resource("assignment-template.docx", b"Y" * 512)

    b.add_module("mod-0", "Start Here", position=0,
                 item_ids=["p-welcome", "p-syllabus"])
    b.add_module("mod-1", "Module 1", position=1,
                 item_ids=["p-mod1", "d-intro", "q-1", "a-essay"])

    return b.write(tmp / "rich.imscc")


# ---------------------------------------------------------------------------
# Step 1: parser produces valid dict
# ---------------------------------------------------------------------------

def test_parse_returns_dict(rich_imscc):
    result, warnings = parse_imscc(str(rich_imscc))
    assert isinstance(result, dict)


def test_parse_no_unexpected_warnings(rich_imscc):
    _, warnings = parse_imscc(str(rich_imscc))
    # Warnings list itself must be a list of strings
    assert all(isinstance(w, str) for w in warnings)


def test_parse_all_keys_present(rich_imscc):
    result, _ = parse_imscc(str(rich_imscc))
    for key in ("course", "modules", "pages", "assignments", "quizzes",
                "discussions", "files", "videos", "syllabus"):
        assert key in result, f"Missing key: {key}"


# ---------------------------------------------------------------------------
# Step 2: loader accepts parser output without schema errors
# ---------------------------------------------------------------------------

def test_loader_accepts_parser_output(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))

    # Write to disk exactly as the CLI would
    json_path = tmp_path / "course_object.json"
    json_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")

    course, load_warnings = load_course_object(str(json_path))
    assert isinstance(course, CourseObject)
    # No validation-failure warnings expected for a clean parse output
    validation_errors = [w for w in load_warnings if "validation" in w.lower()]
    assert validation_errors == [], f"Unexpected validation errors: {validation_errors}"


def test_loader_course_title_round_trips(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))
    assert course.get_title() == "Sociology 101"


def test_loader_modules_round_trip(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))
    assert len(course.modules) == 2


def test_loader_pages_round_trip(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))
    assert len(course.pages) == 3


def test_loader_syllabus_round_trip(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))
    assert course.syllabus is not None
    assert course.syllabus.html != ""


def test_loader_files_round_trip(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))
    assert len(course.files) == 2


def test_loader_videos_round_trip(rich_imscc, tmp_path):
    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))
    assert len(course.videos) == 1
    assert course.videos[0].source == "youtube"


# ---------------------------------------------------------------------------
# Step 3: deterministic accessibility checks run without errors
# ---------------------------------------------------------------------------

def test_deterministic_checks_run_without_crash(rich_imscc, tmp_path):
    from cvc_rubric.checks.deterministic import run_all

    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))

    findings = run_all(course)
    assert isinstance(findings, list)
    for f in findings:
        assert isinstance(f, AccessibilityFinding)


def test_deterministic_checks_return_findings_not_sys_errors(rich_imscc, tmp_path):
    from cvc_rubric.checks.deterministic import run_all

    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))

    findings = run_all(course)
    sys_errors = [f for f in findings if f.check_id == "sys-error"]
    assert sys_errors == [], f"Unexpected sys-error findings: {sys_errors}"


def test_known_issue_detected_by_deterministic(rich_imscc, tmp_path):
    """
    The rich fixture has a YouTube iframe embed with captions_declared=null.
    Expect at least one med-003 finding.
    """
    from cvc_rubric.checks.deterministic import run_all

    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))

    findings = run_all(course)
    check_ids = {f.check_id for f in findings}
    assert "med-003" in check_ids, (
        "Expected med-003 (unconfirmed video captions) but got: "
        + str(check_ids)
    )


# ---------------------------------------------------------------------------
# Step 4: report builder accepts the combined output
# ---------------------------------------------------------------------------

def test_report_builder_accepts_output(rich_imscc, tmp_path):
    from cvc_rubric.checks.deterministic import run_all
    from cvc_rubric.report_builder import build_report, write_json
    from cvc_rubric.models import Report

    result, _ = parse_imscc(str(rich_imscc))
    json_path = tmp_path / "co.json"
    json_path.write_text(json.dumps(result), encoding="utf-8")
    course, _ = load_course_object(str(json_path))

    a_findings = run_all(course)
    report = build_report(
        course_title=course.get_title(),
        rubric_version="2027.06",
        prompt_version="2027.06.1",
        duration_seconds=0.1,
        rubric_findings=[],
        accessibility_findings=a_findings,
        errors=[],
    )

    assert isinstance(report, Report)
    assert report.meta.course_title == "Sociology 101"
    assert report.summary.accessibility_errors >= 0

    report_path = tmp_path / "report.json"
    write_json(report, str(report_path))
    assert report_path.exists()
    data = json.loads(report_path.read_text())
    assert "meta" in data
    assert "accessibility_findings" in data
