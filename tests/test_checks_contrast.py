"""Unit tests for contrast ratio checks."""
import pytest
from cvc_rubric.checks.deterministic import check_contrast, _contrast_ratio, _parse_css_color

PID = "page-1"
PT = "Test Page"


# ---------------------------------------------------------------------------
# Contrast math helpers
# ---------------------------------------------------------------------------

def test_black_on_white_is_21():
    ratio = _contrast_ratio((0, 0, 0), (255, 255, 255))
    assert abs(ratio - 21.0) < 0.1


def test_identical_colors_is_1():
    ratio = _contrast_ratio((100, 100, 100), (100, 100, 100))
    assert abs(ratio - 1.0) < 0.01


def test_parse_hex6():
    assert _parse_css_color("#ff0000") == (255, 0, 0)


def test_parse_hex3():
    assert _parse_css_color("#f00") == (255, 0, 0)


def test_parse_rgb():
    assert _parse_css_color("rgb(0, 128, 0)") == (0, 128, 0)


def test_parse_named_white():
    assert _parse_css_color("white") == (255, 255, 255)


def test_parse_named_black():
    assert _parse_css_color("black") == (0, 0, 0)


def test_parse_unknown_returns_none():
    assert _parse_css_color("transparent") is None


def test_parse_unknown_gradient_returns_none():
    assert _parse_css_color("linear-gradient(...)") is None


# ---------------------------------------------------------------------------
# con-001: normal text below 4.5:1
# ---------------------------------------------------------------------------

def test_low_contrast_normal_text_is_error():
    # Light gray on white: ~1.6:1
    html = '<p style="color: #aaaaaa; background-color: #ffffff;">Low contrast text</p>'
    findings = check_contrast(html, PID, PT)
    assert any(f.check_id == "con-001" for f in findings)
    f = next(f for f in findings if f.check_id == "con-001")
    assert f.severity == "error"
    assert "4.5" in f.message


def test_sufficient_contrast_normal_text_no_error():
    # Black on white: 21:1
    html = '<p style="color: #000000; background-color: #ffffff;">Good contrast</p>'
    findings = check_contrast(html, PID, PT)
    assert not any(f.check_id == "con-001" for f in findings)


def test_exactly_at_threshold_no_error():
    # Dark gray #595959 on white is ~7:1 — well above threshold
    html = '<p style="color: #595959; background-color: #ffffff;">Acceptable</p>'
    findings = check_contrast(html, PID, PT)
    assert not any(f.check_id == "con-001" for f in findings)


# ---------------------------------------------------------------------------
# con-002: large text below 3:1
# ---------------------------------------------------------------------------

def test_low_contrast_large_text_is_error():
    # ~1.6:1 contrast, large text
    html = (
        '<p style="color: #aaaaaa; background-color: #ffffff; '
        'font-size: 24px;">Large low-contrast text</p>'
    )
    findings = check_contrast(html, PID, PT)
    assert any(f.check_id == "con-002" for f in findings)


def test_medium_contrast_large_text_passes():
    # ~3.5:1, large text — passes 3:1 threshold
    html = (
        '<p style="color: #767676; background-color: #ffffff; '
        'font-size: 24px;">Acceptable large text</p>'
    )
    findings = check_contrast(html, PID, PT)
    assert not any(f.check_id == "con-002" for f in findings)


# ---------------------------------------------------------------------------
# Skip when colors not resolvable
# ---------------------------------------------------------------------------

def test_only_color_no_background_not_flagged():
    html = '<p style="color: #aaaaaa;">Text with only foreground color</p>'
    findings = check_contrast(html, PID, PT)
    assert findings == []


def test_unresolvable_color_value_not_flagged():
    html = '<p style="color: var(--brand); background-color: var(--bg);">CSS vars</p>'
    findings = check_contrast(html, PID, PT)
    assert findings == []


def test_no_inline_styles_no_findings():
    html = '<p class="styled-text">Externally styled text</p>'
    findings = check_contrast(html, PID, PT)
    assert findings == []


def test_empty_html_no_crash():
    assert check_contrast("", PID, PT) == []
