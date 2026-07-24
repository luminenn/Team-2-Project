"""Unit tests for media and structure accessibility checks."""
import pytest
from cvc_rubric.checks.deterministic import (
    check_media,
    check_page_structure,
    check_documents,
)
from cvc_rubric.models import CourseFile, Video

PID = "page-1"
PT = "Test Page"


# ---------------------------------------------------------------------------
# med-001: <video> without <track>
# ---------------------------------------------------------------------------

def test_video_without_track_is_error():
    html = '<video src="lecture.mp4" controls></video>'
    findings = check_media(html, PID, PT)
    assert any(f.check_id == "med-001" for f in findings)
    f = next(f for f in findings if f.check_id == "med-001")
    assert f.severity == "error"


def test_video_with_captions_track_no_error():
    html = (
        '<video src="lecture.mp4" controls>'
        '<track kind="captions" src="captions.vtt" srclang="en" label="English">'
        '</video>'
    )
    findings = check_media(html, PID, PT)
    assert not any(f.check_id == "med-001" for f in findings)


def test_video_with_subtitles_track_accepted():
    html = (
        '<video src="lecture.mp4" controls>'
        '<track kind="subtitles" src="sub.vtt" srclang="en">'
        '</video>'
    )
    findings = check_media(html, PID, PT)
    assert not any(f.check_id == "med-001" for f in findings)


def test_video_with_descriptions_only_still_flagged():
    html = (
        '<video src="lecture.mp4" controls>'
        '<track kind="descriptions" src="desc.vtt" srclang="en">'
        '</video>'
    )
    findings = check_media(html, PID, PT)
    assert any(f.check_id == "med-001" for f in findings)


# ---------------------------------------------------------------------------
# med-002: <audio> without transcript
# ---------------------------------------------------------------------------

def test_audio_without_transcript_is_error():
    html = '<audio src="podcast.mp3" controls></audio>'
    findings = check_media(html, PID, PT)
    assert any(f.check_id == "med-002" for f in findings)


def test_audio_with_transcript_keyword_nearby_no_error():
    html = (
        '<audio src="podcast.mp3" controls></audio>'
        '<p>Read the <a href="transcript.html">transcript</a> of this audio.</p>'
    )
    findings = check_media(html, PID, PT)
    assert not any(f.check_id == "med-002" for f in findings)


# ---------------------------------------------------------------------------
# med-003: embedded video with captions_declared=False/None
# ---------------------------------------------------------------------------

def test_youtube_embed_no_captions_declared_is_warning():
    html = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    findings = check_media(html, PID, PT, page_videos=[])
    assert any(f.check_id == "med-003" for f in findings)


def test_youtube_embed_captions_declared_true_no_warning():
    html = '<iframe src="https://www.youtube.com/embed/abc123"></iframe>'
    video = Video(url="https://www.youtube.com/embed/abc123", source="youtube",
                  page_id=PID, captions_declared=True)
    findings = check_media(html, PID, PT, page_videos=[video])
    assert not any(f.check_id == "med-003" for f in findings)


def test_non_video_iframe_not_flagged():
    html = '<iframe src="https://docs.google.com/forms/embed/xyz"></iframe>'
    findings = check_media(html, PID, PT)
    assert not any(f.check_id == "med-003" for f in findings)


def test_no_media_no_findings():
    html = "<p>Text only page.</p>"
    assert check_media(html, PID, PT) == []


# ---------------------------------------------------------------------------
# Document checks
# ---------------------------------------------------------------------------

def test_pdf_file_flagged_for_manual_review():
    files = [CourseFile(name="syllabus.pdf", path="/files/syllabus.pdf", mime="application/pdf", size=100000)]
    findings = check_documents(files)
    assert any(f.check_id == "doc-001" for f in findings)
    f = next(f for f in findings if f.check_id == "doc-001")
    assert f.severity == "warning"
    assert "syllabus.pdf" in f.message


def test_docx_file_flagged():
    files = [CourseFile(name="assignment.docx", path="/files/assignment.docx",
                        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        size=50000)]
    findings = check_documents(files)
    assert any(f.check_id == "doc-002" for f in findings)


def test_image_file_not_flagged():
    files = [CourseFile(name="banner.jpg", path="/files/banner.jpg", mime="image/jpeg", size=20000)]
    findings = check_documents(files)
    assert findings == []


def test_empty_files_list():
    assert check_documents([]) == []


# ---------------------------------------------------------------------------
# Structure checks
# ---------------------------------------------------------------------------

MODULE_IDS = {"mod-1", "mod-2"}


def test_empty_page_is_warning():
    findings = check_page_structure("", PID, PT, MODULE_IDS, "mod-1")
    assert any(f.check_id == "str-001" for f in findings)


def test_page_with_image_not_flagged_as_empty():
    html = '<img src="x.png" alt="Chart">'
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert not any(f.check_id == "str-001" for f in findings)


def test_page_not_in_module_is_info():
    html = "<p>Some content on this page.</p>"
    findings = check_page_structure(html, PID, PT, MODULE_IDS, None)
    assert any(f.check_id == "str-002" for f in findings)
    f = next(f for f in findings if f.check_id == "str-002")
    assert f.severity == "info"


def test_page_in_valid_module_no_str002():
    html = "<p>Some content.</p>"
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert not any(f.check_id == "str-002" for f in findings)


def test_ims_placeholder_is_error():
    html = '<p>Download this file: $IMS-CC-FILEBASE$/readings/chapter1.pdf</p>'
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert any(f.check_id == "str-003" for f in findings)
    f = next(f for f in findings if f.check_id == "str-003")
    assert f.severity == "error"


def test_canvas_reference_placeholder_flagged():
    html = '<p>See $CANVAS_OBJECT_REFERENCE$/assignments/123</p>'
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert any(f.check_id == "str-003" for f in findings)


def test_broken_anchor_link_is_warning():
    html = '<p>Jump to <a href="#section-that-does-not-exist">Section 3</a></p>'
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert any(f.check_id == "str-004" for f in findings)


def test_valid_anchor_link_no_warning():
    html = '<p><a href="#intro">Introduction</a></p><h2 id="intro">Introduction</h2>'
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert not any(f.check_id == "str-004" for f in findings)


def test_no_issues_clean_page():
    html = "<h2>Module Overview</h2><p>Here is what we will cover this week.</p>"
    findings = check_page_structure(html, PID, PT, MODULE_IDS, "mod-1")
    assert not any(f.check_id in ("str-001", "str-002", "str-003", "str-004") for f in findings)
