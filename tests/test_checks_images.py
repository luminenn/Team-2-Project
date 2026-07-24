"""Unit tests for image accessibility checks."""
import pytest
from cvc_rubric.checks.deterministic import check_images

PID = "page-1"
PT = "Test Page"


# ---------------------------------------------------------------------------
# img-001: missing alt attribute
# ---------------------------------------------------------------------------

def test_img_missing_alt_is_error():
    html = '<img src="diagram.png">'
    findings = check_images(html, PID, PT)
    ids = [f.check_id for f in findings]
    assert "img-001" in ids
    f = next(f for f in findings if f.check_id == "img-001")
    assert f.severity == "error"
    assert "diagram.png" in f.element_snippet


def test_img_with_alt_no_error():
    html = '<img src="diagram.png" alt="Diagram showing the water cycle">'
    findings = check_images(html, PID, PT)
    assert not any(f.check_id == "img-001" for f in findings)


def test_img_multiple_missing_alt():
    html = '<img src="a.png"><img src="b.png" alt="ok"><img src="c.png">'
    findings = check_images(html, PID, PT)
    img001 = [f for f in findings if f.check_id == "img-001"]
    assert len(img001) == 2


# ---------------------------------------------------------------------------
# img-002: empty alt on non-decorative image
# ---------------------------------------------------------------------------

def test_img_empty_alt_no_role_is_warning():
    html = '<img src="chart.png" alt="">'
    findings = check_images(html, PID, PT)
    ids = [f.check_id for f in findings]
    assert "img-002" in ids
    f = next(f for f in findings if f.check_id == "img-002")
    assert f.severity == "warning"


def test_img_empty_alt_with_presentation_role_no_warning():
    html = '<img src="divider.png" alt="" role="presentation">'
    findings = check_images(html, PID, PT)
    assert not any(f.check_id == "img-002" for f in findings)


def test_img_empty_alt_tracking_pixel_no_warning():
    html = '<img src="tracking-pixel.gif" alt="">'
    findings = check_images(html, PID, PT)
    assert not any(f.check_id == "img-002" for f in findings)


# ---------------------------------------------------------------------------
# img-003: filename as alt text
# ---------------------------------------------------------------------------

def test_img_filename_alt_is_error():
    html = '<img src="photo.jpg" alt="Screenshot 2024-01-15.png">'
    findings = check_images(html, PID, PT)
    ids = [f.check_id for f in findings]
    assert "img-003" in ids


def test_img_plain_filename_alt_is_error():
    html = '<img src="photo.jpg" alt="image1.png">'
    findings = check_images(html, PID, PT)
    assert any(f.check_id == "img-003" for f in findings)


def test_img_descriptive_alt_not_flagged():
    html = '<img src="photo.jpg" alt="Students collaborating in a library">'
    findings = check_images(html, PID, PT)
    assert not any(f.check_id == "img-003" for f in findings)


# ---------------------------------------------------------------------------
# img-004: alt text over 150 characters
# ---------------------------------------------------------------------------

def test_img_long_alt_is_warning():
    long_alt = "A" * 151
    html = f'<img src="x.png" alt="{long_alt}">'
    findings = check_images(html, PID, PT)
    assert any(f.check_id == "img-004" for f in findings)
    f = next(f for f in findings if f.check_id == "img-004")
    assert f.severity == "warning"


def test_img_exactly_150_chars_not_flagged():
    alt = "A" * 150
    html = f'<img src="x.png" alt="{alt}">'
    findings = check_images(html, PID, PT)
    assert not any(f.check_id == "img-004" for f in findings)


# ---------------------------------------------------------------------------
# No findings on clean HTML
# ---------------------------------------------------------------------------

def test_no_images_no_findings():
    html = "<p>Just text, no images here.</p>"
    assert check_images(html, PID, PT) == []


def test_empty_html_no_crash():
    assert check_images("", PID, PT) == []


def test_malformed_html_no_crash():
    assert check_images("<img <p> >> broken", PID, PT) is not None
