"""Tests for vid-001: video caption presence check."""
from __future__ import annotations

import pytest

from cvc_rubric.checks.captions import check_video_captions
from cvc_rubric.models import CourseObject, Video, Page


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _course_with_videos(videos: list[dict], pages: list[dict] = None) -> CourseObject:
    """Build a minimal CourseObject with the given videos."""
    video_objs = [Video(**v) for v in videos]
    page_objs = [Page(**p) for p in (pages or [])]
    return CourseObject(
        course={"title": "Test"},
        videos=video_objs,
        pages=page_objs,
    )


# ---------------------------------------------------------------------------
# Classification tests
# ---------------------------------------------------------------------------

class TestCaptionClassification:
    """vid-001 should classify based on captions_declared."""

    def test_captions_true_no_finding(self):
        """captions_declared=True → no finding (pass)."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/abc", "source": "youtube",
             "page_id": "p1", "captions_declared": True},
        ])
        findings = check_video_captions(course)
        assert findings == []

    def test_captions_false_is_error(self):
        """captions_declared=False → error."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/abc", "source": "youtube",
             "page_id": "p1", "captions_declared": False},
        ], pages=[{"id": "p1", "title": "Lecture 1"}])
        findings = check_video_captions(course)
        assert len(findings) == 1
        assert findings[0].check_id == "vid-001"
        assert findings[0].severity == "error"
        assert "no captions" in findings[0].message.lower()

    def test_captions_none_is_warning(self):
        """captions_declared=None → warning (undeterminable)."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/xyz", "source": "youtube",
             "page_id": "p1", "captions_declared": None},
        ], pages=[{"id": "p1", "title": "Week 1"}])
        findings = check_video_captions(course)
        assert len(findings) == 1
        assert findings[0].check_id == "vid-001"
        assert findings[0].severity == "warning"
        assert "could not be verified" in findings[0].message.lower()

    def test_error_includes_url(self):
        """Finding includes the video URL for faculty to locate it."""
        url = "https://vimeo.com/123456"
        course = _course_with_videos([
            {"url": url, "source": "vimeo", "page_id": "p1", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert url in findings[0].element_snippet

    def test_error_includes_source_platform(self):
        """Finding mentions the source platform."""
        course = _course_with_videos([
            {"url": "https://vimeo.com/999", "source": "vimeo",
             "page_id": "p1", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert "vimeo" in findings[0].message.lower()

    def test_error_remediation_mentions_captions(self):
        """Remediation for error tells faculty to add captions."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/v1", "source": "youtube",
             "page_id": "p1", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert "caption" in findings[0].remediation.lower() or "transcript" in findings[0].remediation.lower()

    def test_warning_remediation_mentions_manual_review(self):
        """Remediation for warning tells faculty to manually check."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/v1", "source": "youtube",
             "page_id": "p1", "captions_declared": None},
        ])
        findings = check_video_captions(course)
        assert "confirm" in findings[0].remediation.lower() or "manual" in findings[0].remediation.lower()


# ---------------------------------------------------------------------------
# Deduplication tests
# ---------------------------------------------------------------------------

class TestCaptionDedup:
    """Same video URL on multiple pages → reported once."""

    def test_same_url_three_pages_one_finding(self):
        """Same URL on 3 pages → 1 finding."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/shared", "source": "youtube",
             "page_id": "p1", "captions_declared": None},
            {"url": "https://youtube.com/embed/shared", "source": "youtube",
             "page_id": "p2", "captions_declared": None},
            {"url": "https://youtube.com/embed/shared", "source": "youtube",
             "page_id": "p3", "captions_declared": None},
        ], pages=[
            {"id": "p1", "title": "Page A"},
            {"id": "p2", "title": "Page B"},
            {"id": "p3", "title": "Page C"},
        ])
        findings = check_video_captions(course)
        assert len(findings) == 1
        assert findings[0].occurrences == 3
        assert len(findings[0].affected_pages) == 3

    def test_different_urls_separate_findings(self):
        """Different URLs → separate findings."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/v1", "source": "youtube",
             "page_id": "p1", "captions_declared": False},
            {"url": "https://vimeo.com/v2", "source": "vimeo",
             "page_id": "p2", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert len(findings) == 2

    def test_same_url_one_has_captions_passes(self):
        """If ANY occurrence of a URL declares captions=True, the URL passes."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/v1", "source": "youtube",
             "page_id": "p1", "captions_declared": None},
            {"url": "https://youtube.com/embed/v1", "source": "youtube",
             "page_id": "p2", "captions_declared": True},
        ])
        findings = check_video_captions(course)
        assert findings == []

    def test_single_occurrence_no_affected_pages_field(self):
        """Single occurrence → occurrences=None, affected_pages=None."""
        course = _course_with_videos([
            {"url": "https://youtube.com/embed/solo", "source": "youtube",
             "page_id": "p1", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert len(findings) == 1
        assert findings[0].occurrences is None
        assert findings[0].affected_pages is None


# ---------------------------------------------------------------------------
# Malformed input tests
# ---------------------------------------------------------------------------

class TestCaptionMalformed:
    """Graceful handling of missing/empty fields."""

    def test_empty_url_skipped(self):
        """Video with empty URL is silently skipped."""
        course = _course_with_videos([
            {"url": "", "source": "youtube", "page_id": "p1", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert findings == []

    def test_no_videos_empty_list(self):
        """Course with no videos → no findings."""
        course = CourseObject(course={"title": "Empty"})
        findings = check_video_captions(course)
        assert findings == []

    def test_missing_source_no_crash(self):
        """Video with empty source field doesn't crash."""
        course = _course_with_videos([
            {"url": "https://example.com/video.mp4", "source": "",
             "page_id": "p1", "captions_declared": False},
        ])
        findings = check_video_captions(course)
        assert len(findings) == 1
        assert findings[0].check_id == "vid-001"

    def test_missing_page_id_no_crash(self):
        """Video with empty page_id doesn't crash."""
        course = _course_with_videos([
            {"url": "https://example.com/v.mp4", "source": "html5",
             "page_id": "", "captions_declared": None},
        ])
        findings = check_video_captions(course)
        assert len(findings) == 1

    def test_none_captions_declared_field_missing(self):
        """Video model defaults captions_declared to None if not provided."""
        v = Video(url="https://youtube.com/embed/x", source="youtube", page_id="p1")
        assert v.captions_declared is None


# ---------------------------------------------------------------------------
# Integration: wired into run_all
# ---------------------------------------------------------------------------

class TestCaptionInRunAll:
    """vid-001 findings appear in the run_all output."""

    def test_vid001_in_run_all(self):
        from cvc_rubric.checks.deterministic import run_all
        course = CourseObject(
            course={"title": "Test"},
            videos=[Video(url="https://youtube.com/embed/test", source="youtube",
                          page_id="p1", captions_declared=False)],
            pages=[Page(id="p1", title="Lecture", html="<p>Content</p>", text="Content")],
        )
        findings = run_all(course)
        vid = [f for f in findings if f.check_id == "vid-001"]
        assert len(vid) >= 1
        assert vid[0].severity == "error"
