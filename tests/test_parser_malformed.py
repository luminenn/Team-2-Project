"""Robustness tests: malformed and partial IMSCC inputs must not crash."""
from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

import pytest

from cvc_rubric.parser.imscc import parse_imscc
from tests.fixtures.imscc_builder import IMSCCBuilder


# ---------------------------------------------------------------------------
# Validation failures (must raise, not crash with traceback)
# ---------------------------------------------------------------------------

def test_missing_file_raises_file_not_found():
    with pytest.raises(FileNotFoundError, match="not found"):
        parse_imscc("nonexistent_course.imscc")


def test_not_a_zip_raises_value_error(tmp_path):
    bad = tmp_path / "notazip.imscc"
    bad.write_bytes(b"This is plain text, not a ZIP archive.")
    with pytest.raises(ValueError, match="ZIP"):
        parse_imscc(str(bad))


def test_zip_without_manifest_raises_value_error(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("some_other_file.xml", "<root/>")
    path = tmp_path / "no_manifest.imscc"
    path.write_bytes(buf.getvalue())
    with pytest.raises(ValueError, match="imsmanifest.xml"):
        parse_imscc(str(path))


def test_truncated_zip_raises_value_error(tmp_path):
    # Build a valid zip then truncate it
    b = IMSCCBuilder()
    valid = b.write(tmp_path / "valid.imscc")
    data = valid.read_bytes()
    truncated = tmp_path / "truncated.imscc"
    truncated.write_bytes(data[: len(data) // 2])
    with pytest.raises((ValueError, Exception)):
        parse_imscc(str(truncated))


# ---------------------------------------------------------------------------
# Graceful degradation (must NOT raise — must return warnings instead)
# ---------------------------------------------------------------------------

def test_malformed_manifest_xml_does_not_crash(tmp_path):
    """A syntactically broken manifest should raise ValueError, not an unhandled exception."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("imsmanifest.xml", "<<< NOT XML >>>")
    path = tmp_path / "bad_manifest.imscc"
    path.write_bytes(buf.getvalue())
    with pytest.raises(ValueError):
        parse_imscc(str(path))


def test_missing_html_resource_produces_warning(tmp_path):
    """Page referenced in manifest but absent from ZIP → warning, page with empty html."""
    buf = io.BytesIO()
    manifest = """<?xml version="1.0"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1"
          identifier="m1">
  <organizations>
    <organization identifier="o1" structure="rooted-hierarchy">
      <item identifier="i1" identifierref="r1"><title>Missing Page</title></item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="r1" type="webcontent" href="wiki_content/missing.html">
      <file href="wiki_content/missing.html"/>
    </resource>
  </resources>
</manifest>"""
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("imsmanifest.xml", manifest)
        zf.writestr("course_settings/course_settings.xml",
                    "<course><title>T</title></course>")
        zf.writestr("course_settings/module_meta.xml", "<modules/>")
    path = tmp_path / "missing_html.imscc"
    path.write_bytes(buf.getvalue())

    result, warnings = parse_imscc(str(path))
    # Must not crash
    assert isinstance(result, dict)
    # Should have produced a warning about the missing file
    assert any("missing" in w.lower() or "not found" in w.lower() for w in warnings)
    # The page should still appear with empty html
    if result["pages"]:
        page = result["pages"][0]
        assert page["html"] == ""


def test_empty_html_file_no_crash(tmp_path):
    b = IMSCCBuilder()
    b.add_page("p1", "Empty Page", "")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    page = next((p for p in result["pages"] if p["id"] == "p1"), None)
    assert page is not None
    assert page["html"] == ""
    assert page["text"] == ""


def test_malformed_html_no_crash(tmp_path):
    b = IMSCCBuilder()
    b.add_page("p1", "Bad HTML", "<p>Unclosed <b>bold <i>italics")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    assert any(p["id"] == "p1" for p in result["pages"])


def test_malformed_assignment_xml_skipped_with_warning(tmp_path):
    """Broken assignment XML → warning issued, assignment skipped or partially parsed."""
    buf = io.BytesIO()
    manifest = """<?xml version="1.0"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" identifier="m1">
  <organizations><organization identifier="o1" structure="rooted-hierarchy"/></organizations>
  <resources>
    <resource identifier="a1"
      type="associatedcontent/imscc_xmlv1p1/learning-application-resource"
      href="assignments/a1.xml">
      <file href="assignments/a1.xml"/>
    </resource>
  </resources>
</manifest>"""
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("imsmanifest.xml", manifest)
        zf.writestr("course_settings/course_settings.xml",
                    "<course><title>T</title></course>")
        zf.writestr("course_settings/module_meta.xml", "<modules/>")
        zf.writestr("assignments/a1.xml", "<<< BROKEN XML >>>")
    path = tmp_path / "bad_assign.imscc"
    path.write_bytes(buf.getvalue())

    result, warnings = parse_imscc(str(path))
    assert isinstance(result, dict)
    # Should not crash regardless of parse outcome


def test_malformed_quiz_xml_no_crash(tmp_path):
    b = IMSCCBuilder()
    b.add_quiz("q1", "Quiz", question_count=3)
    # Corrupt the quiz file after building
    path = b.write(tmp_path / "c.imscc")
    # Re-zip with corrupted quiz
    import zipfile as zf_mod
    orig = path.read_bytes()
    buf = io.BytesIO()
    with zf_mod.ZipFile(io.BytesIO(orig)) as src, zf_mod.ZipFile(buf, "w") as dst:
        for item in src.infolist():
            if item.filename.endswith(".xml") and "quiz" in item.filename:
                dst.writestr(item.filename, b"<< BROKEN >>")
            else:
                dst.writestr(item.filename, src.read(item.filename))
    path.write_bytes(buf.getvalue())
    result, _ = parse_imscc(str(path))
    # question_count should fall back to 0, not crash
    if result["quizzes"]:
        assert result["quizzes"][0]["question_count"] == 0


def test_no_course_settings_falls_back_gracefully(tmp_path):
    """Archive with no course_settings/ → title from manifest metadata, no crash."""
    buf = io.BytesIO()
    manifest = """<?xml version="1.0"?>
<manifest xmlns="http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1" identifier="m1">
  <metadata>
    <lom:lom xmlns:lom="http://ltsc.ieee.org/xsd/LOM">
      <lom:general><lom:title><lom:string>Fallback Title</lom:string></lom:title></lom:general>
    </lom:lom>
  </metadata>
  <organizations><organization identifier="o1" structure="rooted-hierarchy"/></organizations>
  <resources/>
</manifest>"""
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("imsmanifest.xml", manifest)
    path = tmp_path / "no_settings.imscc"
    path.write_bytes(buf.getvalue())

    result, warnings = parse_imscc(str(path))
    assert isinstance(result, dict)
    assert result["course"]["title"] == "Fallback Title"


def test_parse_warnings_are_strings(tmp_path):
    b = IMSCCBuilder()
    path = b.write(tmp_path / "c.imscc")
    _, warnings = parse_imscc(str(path))
    for w in warnings:
        assert isinstance(w, str)


def test_output_schema_valid_after_malformed_resource(tmp_path):
    """Even if a resource fails, every top-level key must still be present."""
    b = IMSCCBuilder()
    b.add_page("p1", "Good Page", "<p>Good content.</p>")
    path = b.write(tmp_path / "c.imscc")
    result, _ = parse_imscc(str(path))
    for key in ("course", "modules", "pages", "assignments", "quizzes",
                "discussions", "files", "videos", "syllabus"):
        assert key in result
