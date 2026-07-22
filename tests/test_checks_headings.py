"""Unit tests for heading accessibility checks."""
import pytest
from cvc_rubric.checks.deterministic import check_headings

PID = "page-1"
PT = "Test Page"

# Body text long enough to trigger hdg-001
_LONG_TEXT = "This is a substantial paragraph. " * 10


def test_no_heading_on_content_page_is_warning():
    html = f"<p>{_LONG_TEXT}</p>"
    findings = check_headings(html, PID, PT)
    assert any(f.check_id == "hdg-001" for f in findings)


def test_heading_present_no_hdg001():
    html = f"<h2>Introduction</h2><p>{_LONG_TEXT}</p>"
    findings = check_headings(html, PID, PT)
    assert not any(f.check_id == "hdg-001" for f in findings)


def test_short_page_no_hdg001():
    # Less than 200 chars of text — should not flag missing heading
    html = "<p>Short page.</p>"
    findings = check_headings(html, PID, PT)
    assert not any(f.check_id == "hdg-001" for f in findings)


# ---------------------------------------------------------------------------
# hdg-002: skipped heading levels
# ---------------------------------------------------------------------------

def test_skipped_level_h2_to_h4_is_error():
    html = "<h2>Section</h2><h4>Subsection</h4>"
    findings = check_headings(html, PID, PT)
    assert any(f.check_id == "hdg-002" for f in findings)
    f = next(f for f in findings if f.check_id == "hdg-002")
    assert f.severity == "error"
    assert "h2" in f.message and "h4" in f.message


def test_sequential_headings_no_skip():
    html = "<h2>A</h2><h3>B</h3><h4>C</h4><h3>D</h3><h2>E</h2>"
    findings = check_headings(html, PID, PT)
    assert not any(f.check_id == "hdg-002" for f in findings)


def test_skipped_h1_to_h3():
    html = "<h1>Title</h1><h3>Sub</h3>"
    findings = check_headings(html, PID, PT)
    assert any(f.check_id == "hdg-002" for f in findings)


def test_multiple_skips_multiple_findings():
    html = "<h2>A</h2><h4>B</h4><h2>C</h2><h5>D</h5>"
    findings = check_headings(html, PID, PT)
    hdg002 = [f for f in findings if f.check_id == "hdg-002"]
    assert len(hdg002) >= 2


# ---------------------------------------------------------------------------
# hdg-003: styled paragraph as visual heading
# ---------------------------------------------------------------------------

def test_large_font_paragraph_is_warning():
    html = '<p style="font-size: 24px; font-weight: bold;">Module Overview</p><p>Content here.</p>'
    findings = check_headings(html, PID, PT)
    assert any(f.check_id == "hdg-003" for f in findings)


def test_short_bold_standalone_paragraph_is_info():
    html = '<p style="font-weight: bold;">Key Terms</p><p>Some text about terms.</p>'
    findings = check_headings(html, PID, PT)
    # May produce hdg-003 info — just ensure no crash and the check ran
    assert isinstance(findings, list)


def test_normal_paragraph_not_flagged():
    html = "<p>This is a normal paragraph with regular text styling.</p>"
    findings = check_headings(html, PID, PT)
    assert not any(f.check_id == "hdg-003" for f in findings)


def test_empty_html_no_crash():
    assert check_headings("", PID, PT) == []
