"""Unit tests for link accessibility checks."""
import pytest
from cvc_rubric.checks.deterministic import check_links

PID = "page-1"
PT = "Test Page"


# ---------------------------------------------------------------------------
# lnk-001: non-descriptive link text
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("text", [
    "click here", "here", "read more", "link", "Click Here", "READ MORE",
])
def test_non_descriptive_link_text_is_error(text):
    html = f'<a href="https://example.com">{text}</a>'
    findings = check_links(html, PID, PT)
    assert any(f.check_id == "lnk-001" for f in findings)
    f = next(f for f in findings if f.check_id == "lnk-001")
    assert f.severity == "error"


def test_descriptive_link_text_no_error():
    html = '<a href="https://example.com">Read the course syllabus</a>'
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-001" for f in findings)


# ---------------------------------------------------------------------------
# lnk-002: raw URL as link text
# ---------------------------------------------------------------------------

def test_raw_url_link_text_is_warning():
    html = '<a href="https://example.com">https://example.com/some/long/path</a>'
    findings = check_links(html, PID, PT)
    assert any(f.check_id == "lnk-002" for f in findings)
    f = next(f for f in findings if f.check_id == "lnk-002")
    assert f.severity == "warning"


def test_http_url_as_text_flagged():
    html = '<a href="http://old-site.edu">http://old-site.edu</a>'
    findings = check_links(html, PID, PT)
    assert any(f.check_id == "lnk-002" for f in findings)


def test_non_url_text_not_flagged_as_lnk002():
    html = '<a href="https://example.com">Library Resources</a>'
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-002" for f in findings)


# ---------------------------------------------------------------------------
# lnk-003: duplicate link text to different destinations
# ---------------------------------------------------------------------------

def test_duplicate_link_text_different_hrefs_is_warning():
    html = (
        '<a href="https://a.com">Download</a>'
        '<a href="https://b.com">Download</a>'
    )
    findings = check_links(html, PID, PT)
    assert any(f.check_id == "lnk-003" for f in findings)


def test_same_link_text_same_href_no_warning():
    html = (
        '<a href="https://a.com">Syllabus</a>'
        '<a href="https://a.com">Syllabus</a>'
    )
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-003" for f in findings)


def test_unique_link_texts_no_lnk003():
    html = (
        '<a href="https://a.com">Module 1</a>'
        '<a href="https://b.com">Module 2</a>'
    )
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-003" for f in findings)


# ---------------------------------------------------------------------------
# lnk-004: target=_blank without warning
# ---------------------------------------------------------------------------

def test_target_blank_without_warning_is_flagged():
    html = '<a href="https://example.com" target="_blank">External Resource</a>'
    findings = check_links(html, PID, PT)
    assert any(f.check_id == "lnk-004" for f in findings)


def test_target_blank_with_aria_label_new_tab_no_flag():
    html = (
        '<a href="https://example.com" target="_blank" '
        'aria-label="External Resource (opens in new tab)">External Resource</a>'
    )
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-004" for f in findings)


def test_target_blank_with_sr_only_span_no_flag():
    html = (
        '<a href="https://example.com" target="_blank">'
        'External Resource<span class="sr-only"> (opens in new tab)</span></a>'
    )
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-004" for f in findings)


def test_no_target_blank_no_lnk004():
    html = '<a href="https://example.com">Internal Link</a>'
    findings = check_links(html, PID, PT)
    assert not any(f.check_id == "lnk-004" for f in findings)


def test_empty_html_no_crash():
    assert check_links("", PID, PT) == []
