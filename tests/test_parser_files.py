"""Unit tests for file inventory."""
from __future__ import annotations

from pathlib import Path

import pytest

from cvc_rubric.parser.imscc import _infer_mime, _inventory_files, parse_imscc
from tests.fixtures.imscc_builder import IMSCCBuilder


# ---------------------------------------------------------------------------
# _infer_mime unit tests
# ---------------------------------------------------------------------------

def test_mime_pdf():
    assert _infer_mime("lecture.pdf") == "application/pdf"


def test_mime_docx():
    assert _infer_mime("essay.docx") == (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


def test_mime_doc():
    assert _infer_mime("old.doc") == "application/msword"


def test_mime_pptx():
    assert _infer_mime("slides.pptx") == (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    )


def test_mime_png():
    assert _infer_mime("diagram.png") == "image/png"


def test_mime_jpg():
    assert _infer_mime("photo.jpg") == "image/jpeg"


def test_mime_jpeg():
    assert _infer_mime("photo.jpeg") == "image/jpeg"


def test_mime_mp4():
    assert _infer_mime("video.mp4") == "video/mp4"


def test_mime_unknown_extension():
    mime = _infer_mime("file.xyz123")
    assert mime == "application/octet-stream"


def test_mime_case_insensitive():
    assert _infer_mime("NOTES.PDF") == "application/pdf"
    assert _infer_mime("Image.PNG") == "image/png"


# ---------------------------------------------------------------------------
# Integration: file inventory in parse output
# ---------------------------------------------------------------------------

def test_web_resources_inventoried(tmp_path):
    b = IMSCCBuilder()
    b.add_web_resource("syllabus.pdf", b"PDF content here")
    b.add_web_resource("template.docx", b"DOCX content here")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert len(result["files"]) == 2


def test_file_has_required_keys(tmp_path):
    b = IMSCCBuilder()
    b.add_web_resource("notes.pdf", b"data")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    f = result["files"][0]
    assert "name" in f
    assert "path" in f
    assert "mime" in f
    assert "size" in f


def test_file_name_correct(tmp_path):
    b = IMSCCBuilder()
    b.add_web_resource("rubric.pdf", b"x" * 100)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["files"][0]["name"] == "rubric.pdf"


def test_file_path_starts_with_slash(tmp_path):
    b = IMSCCBuilder()
    b.add_web_resource("img.png", b"png")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["files"][0]["path"].startswith("/")


def test_file_mime_inferred(tmp_path):
    b = IMSCCBuilder()
    b.add_web_resource("deck.pptx", b"pptx data")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert "presentation" in result["files"][0]["mime"]


def test_file_size_correct(tmp_path):
    content = b"A" * 512
    b = IMSCCBuilder()
    b.add_web_resource("data.pdf", content)
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["files"][0]["size"] == 512


def test_no_files_returns_empty_list(tmp_path):
    b = IMSCCBuilder()
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert result["files"] == []


def test_files_sorted_by_path(tmp_path):
    b = IMSCCBuilder()
    b.add_web_resource("z_last.pdf", b"z")
    b.add_web_resource("a_first.pdf", b"a")
    b.add_web_resource("m_middle.pdf", b"m")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    paths = [f["path"] for f in result["files"]]
    assert paths == sorted(paths)


def test_non_web_resource_files_excluded(tmp_path):
    """Files outside web_resources/ should not appear in the inventory."""
    b = IMSCCBuilder()
    b.add_page("p1", "Page", "<p>Content</p>")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    # wiki_content/p1.html should NOT appear as a file
    names = [f["name"] for f in result["files"]]
    assert "p1.html" not in names
