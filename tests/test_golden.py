"""
Golden-file test: sample_course.json → deterministic findings only.

The expected findings are computed from the known properties of sample_course.json:
  - page-mod1-overview has an <img> missing alt (brain-diagram.png)
  - page-reading-1 has a target=_blank link without warning text
  - files contain syllabus.pdf and a .docx → doc-001 and doc-002
  - video captions_declared=False → med-003

We do NOT test exact counts — the golden values are check_id membership.
LLM calls are not made.
"""
import pytest
from pathlib import Path
from cvc_rubric.loader import load_course_object
from cvc_rubric.checks.deterministic import run_all

SAMPLE = Path(__file__).parent / "fixtures" / "sample_course.json"


@pytest.fixture(scope="module")
def findings():
    course, _ = load_course_object(str(SAMPLE))
    return run_all(course)


def test_findings_is_list(findings):
    assert isinstance(findings, list)


def test_missing_alt_detected(findings):
    """brain-diagram.png image in page-mod1-overview has no alt attribute."""
    img_errors = [f for f in findings if f.check_id == "img-001"]
    assert len(img_errors) >= 1, (
        f"Expected at least one img-001, got: {[f.element_snippet for f in img_errors]}"
    )


def test_blank_target_link_detected(findings):
    """page-reading-1 has target=_blank without new-tab warning."""
    lnk_warnings = [f for f in findings if f.check_id == "lnk-004"]
    assert len(lnk_warnings) >= 1


def test_pdf_document_flagged(findings):
    """syllabus.pdf should be flagged as doc-001."""
    doc_warns = [f for f in findings if f.check_id == "doc-001"]
    assert len(doc_warns) >= 1
    assert any("syllabus.pdf" in f.element_snippet for f in doc_warns)


def test_docx_document_flagged(findings):
    """cornell-note-template.docx should be flagged as doc-002."""
    doc_warns = [f for f in findings if f.check_id == "doc-002"]
    assert len(doc_warns) >= 1


def test_youtube_captions_not_declared(findings):
    """The YouTube embed with captions_declared=False should yield med-003."""
    med_warns = [f for f in findings if f.check_id == "med-003"]
    assert len(med_warns) >= 1


def test_severity_values_are_valid(findings):
    """All findings use a known severity level."""
    valid = {"error", "warning", "info"}
    for f in findings:
        assert f.severity in valid, f"Unknown severity: {f.severity} on {f.check_id}"


def test_element_snippets_truncated(findings):
    """No element_snippet exceeds 200 chars."""
    for f in findings:
        assert len(f.element_snippet) <= 200, (
            f"Snippet too long ({len(f.element_snippet)}) on {f.check_id}"
        )


def test_status_defaults_to_ai_suggested(findings):
    """All findings start with ai_suggested status."""
    for f in findings:
        assert f.status == "ai_suggested"


def test_no_crashes_on_full_run():
    """run_all must complete without raising."""
    course, _ = load_course_object(str(SAMPLE))
    result = run_all(course)
    assert result is not None
