"""Unit tests for course object loader."""
import json
import pytest
from pathlib import Path
from cvc_rubric.loader import load_course_object
from cvc_rubric.models import CourseObject

SAMPLE = Path(__file__).parent / "fixtures" / "sample_course.json"


def test_load_sample_course(tmp_path):
    course, warnings = load_course_object(str(SAMPLE))
    assert isinstance(course, CourseObject)
    assert course.get_title() == "Introduction to Psychology"


def test_sample_has_modules():
    course, _ = load_course_object(str(SAMPLE))
    assert len(course.modules) == 2


def test_sample_has_syllabus():
    course, _ = load_course_object(str(SAMPLE))
    assert course.syllabus is not None
    assert "PSYCH-101" in course.syllabus.text


def test_file_not_found():
    with pytest.raises(FileNotFoundError):
        load_course_object("nonexistent_file.json")


def test_invalid_json(tmp_path):
    bad = tmp_path / "bad.json"
    bad.write_text("{ not valid json }", encoding="utf-8")
    with pytest.raises(ValueError, match="Invalid JSON"):
        load_course_object(str(bad))


def test_non_object_json(tmp_path):
    arr = tmp_path / "arr.json"
    arr.write_text("[1, 2, 3]", encoding="utf-8")
    with pytest.raises(ValueError, match="JSON object"):
        load_course_object(str(arr))


def test_empty_course_object(tmp_path):
    empty = tmp_path / "empty.json"
    empty.write_text("{}", encoding="utf-8")
    course, warnings = load_course_object(str(empty))
    assert isinstance(course, CourseObject)
    assert course.modules == []
    assert course.pages == []
    assert course.get_title() == "Untitled Course"
    assert any("syllabus" in w.lower() for w in warnings)


def test_nulls_in_lists_handled(tmp_path):
    data = {
        "course": {"title": "Test"},
        "modules": None,
        "pages": None,
        "assignments": None,
    }
    f = tmp_path / "nulls.json"
    f.write_text(json.dumps(data), encoding="utf-8")
    course, _ = load_course_object(str(f))
    assert course.modules == []
    assert course.pages == []


def test_partial_module_items(tmp_path):
    data = {
        "course": {"title": "T"},
        "modules": [
            {"id": "m1", "title": "Module 1", "position": 1, "items": [None, {"id": "i1", "title": "Item 1", "type": "Page", "resource_id": "r1"}]}
        ]
    }
    f = tmp_path / "partial.json"
    f.write_text(json.dumps(data), encoding="utf-8")
    course, _ = load_course_object(str(f))
    # Should not crash; None item should be filtered
    assert len(course.modules) == 1
