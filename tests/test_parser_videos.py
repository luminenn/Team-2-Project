"""Unit tests for video discovery."""
from __future__ import annotations

from pathlib import Path

import pytest

from cvc_rubric.parser.imscc import _discover_videos, parse_imscc
from tests.fixtures.imscc_builder import IMSCCBuilder


# ---------------------------------------------------------------------------
# _discover_videos unit tests (no ZIP needed)
# ---------------------------------------------------------------------------

def test_youtube_iframe_detected():
    html = '<iframe src="https://www.youtube.com/embed/abc123" width="560"></iframe>'
    videos = _discover_videos(html, "page-1")
    assert len(videos) == 1
    assert videos[0]["source"] == "youtube"
    assert videos[0]["page_id"] == "page-1"
    assert "abc123" in videos[0]["url"]


def test_vimeo_iframe_detected():
    html = '<iframe src="https://vimeo.com/123456789"></iframe>'
    videos = _discover_videos(html, "page-2")
    assert len(videos) == 1
    assert videos[0]["source"] == "vimeo"


def test_kaltura_iframe_detected():
    html = '<iframe src="https://cdnapisec.kaltura.com/p/123/sp/12300/embedIframeJs/uiconf_id/abc"></iframe>'
    videos = _discover_videos(html, "p3")
    assert len(videos) == 1
    assert videos[0]["source"] == "kaltura"


def test_canvas_studio_iframe_detected():
    html = '<iframe src="https://canvas.instructure.com/media_objects/xyz"></iframe>'
    videos = _discover_videos(html, "p4")
    assert len(videos) == 1
    assert videos[0]["source"] == "canvas_studio"


def test_html5_video_with_captions():
    html = (
        '<video src="lecture.mp4">'
        '<track kind="captions" src="lecture.vtt" srclang="en">'
        '</video>'
    )
    videos = _discover_videos(html, "p5")
    assert len(videos) == 1
    assert videos[0]["source"] == "html5"
    assert videos[0]["captions_declared"] is True


def test_html5_video_without_captions():
    html = '<video src="lecture.mp4"></video>'
    videos = _discover_videos(html, "p6")
    assert len(videos) == 1
    assert videos[0]["captions_declared"] is False


def test_iframe_not_video_platform_ignored():
    html = '<iframe src="https://docs.google.com/forms/embed"></iframe>'
    videos = _discover_videos(html, "p7")
    assert videos == []


def test_no_video_elements():
    html = "<p>Just text with no media.</p>"
    assert _discover_videos(html, "p8") == []


def test_empty_html():
    assert _discover_videos("", "p9") == []


def test_multiple_videos_same_page():
    html = (
        '<iframe src="https://www.youtube.com/embed/v1"></iframe>'
        '<iframe src="https://vimeo.com/111"></iframe>'
    )
    videos = _discover_videos(html, "p10")
    assert len(videos) == 2
    sources = {v["source"] for v in videos}
    assert "youtube" in sources
    assert "vimeo" in sources


def test_iframe_captions_declared_none_for_embeds():
    html = '<iframe src="https://www.youtube.com/embed/abc"></iframe>'
    videos = _discover_videos(html, "p11")
    # For iframe embeds we cannot determine captions from HTML alone
    assert videos[0]["captions_declared"] is None


# ---------------------------------------------------------------------------
# Integration: videos surfaced in full parse
# ---------------------------------------------------------------------------

def test_videos_in_parse_output(tmp_path):
    b = IMSCCBuilder()
    html = '<iframe src="https://www.youtube.com/embed/test123"></iframe>'
    b.add_page("p1", "Lecture", html)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert len(result["videos"]) >= 1
    v = result["videos"][0]
    assert v["source"] == "youtube"
    assert v["page_id"] == "p1"
    assert "test123" in v["url"]


def test_duplicate_video_same_url_deduplicated(tmp_path):
    b = IMSCCBuilder()
    # Same URL on the same page twice
    html = (
        '<iframe src="https://www.youtube.com/embed/same"></iframe>'
        '<iframe src="https://www.youtube.com/embed/same"></iframe>'
    )
    b.add_page("p1", "Lecture", html)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    urls = [v["url"] for v in result["videos"]]
    assert urls.count("https://www.youtube.com/embed/same") == 1


def test_same_video_different_pages_both_kept(tmp_path):
    b = IMSCCBuilder()
    b.add_page("p1", "Week 1", '<iframe src="https://www.youtube.com/embed/shared"></iframe>')
    b.add_page("p2", "Week 2", '<iframe src="https://www.youtube.com/embed/shared"></iframe>')
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    # Same URL but different page_ids — both should be kept
    assert len(result["videos"]) == 2


def test_video_in_assignment_html(tmp_path):
    b = IMSCCBuilder()
    b.add_assignment(
        "a1", "Lecture Review",
        '<iframe src="https://vimeo.com/999999"></iframe>',
    )
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert any(v["source"] == "vimeo" for v in result["videos"])
