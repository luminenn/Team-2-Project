"""
Unit tests for the semantic checker.
LLM client is fully mocked — no network calls.
"""
import pytest
from unittest.mock import MagicMock, patch
from pathlib import Path

from cvc_rubric.models import CourseObject, RubricFinding, Syllabus
from cvc_rubric.semantic_checker import SemanticChecker, load_rubric

RUBRIC_PATH = Path(__file__).parent.parent / "src" / "cvc_rubric" / "rubric.json"
SAMPLE_PATH = Path(__file__).parent / "fixtures" / "sample_course.json"


@pytest.fixture
def rubric():
    return load_rubric(str(RUBRIC_PATH))


def _mock_finding(element_id: str, rating: str = "aligned") -> RubricFinding:
    return RubricFinding(
        element_id=element_id,
        element_title="Test",
        rating=rating,
        confidence=0.9,
        prompt_version="2027.06.1",
    )


def _make_mock_client(findings_by_id: dict[str, RubricFinding]) -> MagicMock:
    """Returns a mock BedrockLLMClient whose evaluate_element returns from findings_by_id."""
    mock = MagicMock()
    mock._prompt_version = "2027.06.1"

    def evaluate_element(element, context_text, truncation_note="", source_texts=None):
        eid = element["id"]
        return findings_by_id.get(eid, _mock_finding(eid, "not_evaluable"))

    mock.evaluate_element.side_effect = evaluate_element
    return mock


# ---------------------------------------------------------------------------
# load_rubric
# ---------------------------------------------------------------------------

def test_load_rubric_has_22_elements(rubric):
    total = sum(len(s["elements"]) for s in rubric["sections"])
    assert total == 22


def test_load_rubric_version(rubric):
    assert rubric["version"] == "2027.06"


def test_load_rubric_all_ids_present(rubric):
    expected = {
        "1.1", "1.2", "1.3", "1.4", "1.5", "1.6",
        "2.1", "2.2", "2.3", "2.4", "2.5", "2.6",
        "3.1", "3.2", "3.3", "3.4",
        "4.1", "4.2", "4.3", "4.4", "4.5", "4.6",
    }
    actual = {
        e["id"]
        for s in rubric["sections"]
        for e in s["elements"]
    }
    assert actual == expected


def test_load_rubric_file_not_found():
    with pytest.raises(FileNotFoundError):
        load_rubric("nonexistent.json")


# ---------------------------------------------------------------------------
# SemanticChecker.run with mocked LLM
# ---------------------------------------------------------------------------

@pytest.fixture
def course():
    from cvc_rubric.loader import load_course_object
    c, _ = load_course_object(str(SAMPLE_PATH))
    return c


def test_run_returns_22_findings(rubric, course):
    mock_client = _make_mock_client({})
    checker = SemanticChecker(rubric=rubric, llm_client=mock_client, concurrency=2)
    findings, errors = checker.run(course)
    assert len(findings) == 22


def test_findings_have_section_metadata(rubric, course):
    mock_client = _make_mock_client({})
    checker = SemanticChecker(rubric=rubric, llm_client=mock_client, concurrency=2)
    findings, _ = checker.run(course)
    for f in findings:
        assert f.section_id in ("1", "2", "3", "4"), f"Bad section_id on {f.element_id}"
        assert f.section_title != ""


def test_findings_sorted_by_element_id(rubric, course):
    mock_client = _make_mock_client({})
    checker = SemanticChecker(rubric=rubric, llm_client=mock_client, concurrency=2)
    findings, _ = checker.run(course)
    ids = [f.element_id for f in findings]
    assert ids == sorted(ids)


def test_single_element_filter(rubric, course):
    mock_client = _make_mock_client({"1.1": _mock_finding("1.1", "aligned")})
    checker = SemanticChecker(
        rubric=rubric, llm_client=mock_client,
        concurrency=1, only_element="1.1",
    )
    findings, _ = checker.run(course)
    assert len(findings) == 1
    assert findings[0].element_id == "1.1"


def test_per_element_exception_produces_not_evaluable(rubric, course):
    mock_client = MagicMock()
    mock_client._prompt_version = "2027.06.1"
    mock_client.evaluate_element.side_effect = RuntimeError("Simulated crash")

    checker = SemanticChecker(rubric=rubric, llm_client=mock_client, concurrency=2)
    findings, _ = checker.run(course)
    # All findings should be not_evaluable with error notes
    assert all(f.rating == "not_evaluable" for f in findings)
    assert all(f.error_note is not None for f in findings)


def test_missing_required_syllabus_not_scored(rubric):
    """Element with requires=['syllabus'] should be not_evaluable when syllabus absent."""
    # Create a course with no syllabus
    course = CourseObject()
    # Temporarily add requires=["syllabus"] to element 1.1
    rubric_copy = {
        **rubric,
        "sections": [
            {
                **rubric["sections"][0],
                "elements": [
                    {**rubric["sections"][0]["elements"][0], "requires": ["syllabus"]}
                ] + rubric["sections"][0]["elements"][1:]
            }
        ] + rubric["sections"][1:]
    }
    mock_client = MagicMock()
    mock_client._prompt_version = "2027.06.1"
    checker = SemanticChecker(
        rubric=rubric_copy, llm_client=mock_client,
        concurrency=1, only_element="1.1",
    )
    findings, _ = checker.run(course)
    assert findings[0].rating == "not_evaluable"
    # LLM should NOT have been called
    mock_client.evaluate_element.assert_not_called()


def test_status_defaults_to_ai_suggested(rubric, course):
    mock_client = _make_mock_client({})
    checker = SemanticChecker(rubric=rubric, llm_client=mock_client, concurrency=2)
    findings, _ = checker.run(course)
    assert all(f.status == "ai_suggested" for f in findings)
