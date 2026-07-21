"""
Integration test — calls the real Bedrock model.
Gated behind the 'integration' pytest mark.

Run with:
  pytest -m integration tests/test_integration.py

Requires valid AWS credentials with bedrock:InvokeModel permission
and the model configured in config.json to be available in your region.
"""
import json
import time
import pytest
from pathlib import Path

SAMPLE_PATH = Path(__file__).parent / "fixtures" / "sample_course.json"
CONFIG_PATH = Path(__file__).parent.parent / "config.json"
RUBRIC_PATH = Path(__file__).parent.parent / "src" / "cvc_rubric" / "rubric.json"


@pytest.mark.integration
def test_full_rubric_run_against_real_model():
    """
    End-to-end: load sample course, run element 1.1 against real Bedrock,
    verify the finding structure is valid.
    """
    from cvc_rubric.loader import load_course_object
    from cvc_rubric.semantic_checker import SemanticChecker, load_rubric
    from cvc_rubric.llm_client import BedrockLLMClient, ResponseCache
    from cvc_rubric.models import RubricFinding

    cfg = {}
    if CONFIG_PATH.exists():
        cfg = json.loads(CONFIG_PATH.read_text())

    rubric = load_rubric(str(RUBRIC_PATH))
    course, _ = load_course_object(str(SAMPLE_PATH))

    cache = ResponseCache(
        cache_dir=cfg.get("cache_dir", ".cache"),
        enabled=True,
    )
    llm_client = BedrockLLMClient(
        model_id=cfg.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0"),
        aws_region=cfg.get("aws_region", "us-west-2"),
        cache=cache,
        max_retries=2,
        retry_base_delay=1.0,
        prompt_version=cfg.get("prompt_version", "2027.06.1"),
    )

    checker = SemanticChecker(
        rubric=rubric,
        llm_client=llm_client,
        token_budget=cfg.get("token_budget", 6000),
        concurrency=1,
        only_element="1.1",
    )

    start = time.monotonic()
    findings, errors = checker.run(course)
    elapsed = time.monotonic() - start

    assert len(findings) == 1, f"Expected 1 finding, got {len(findings)}"
    f = findings[0]

    assert isinstance(f, RubricFinding)
    assert f.element_id == "1.1"
    assert f.rating in ("incomplete", "approaching", "aligned", "exceptional", "not_evaluable")
    assert 0.0 <= f.confidence <= 1.0
    assert f.prompt_version == cfg.get("prompt_version", "2027.06.1")
    assert f.status == "ai_suggested"
    assert elapsed < 60, f"Integration test took too long: {elapsed:.1f}s"

    # If the model returned a non-incomplete rating, evidence must be present
    if f.rating not in ("incomplete", "not_evaluable"):
        assert len(f.evidence_quotes) > 0, (
            f"Non-incomplete rating '{f.rating}' has no evidence quotes"
        )

    # Errors list should be empty for this clean test case
    assert errors == [], f"Unexpected errors: {errors}"


@pytest.mark.integration
def test_deterministic_plus_single_semantic_element():
    """
    Run both deterministic checks and one LLM element end-to-end.
    Verify the combined output structure.
    """
    import time
    from cvc_rubric.loader import load_course_object
    from cvc_rubric.checks.deterministic import run_all
    from cvc_rubric.semantic_checker import SemanticChecker, load_rubric
    from cvc_rubric.llm_client import BedrockLLMClient, ResponseCache
    from cvc_rubric.report_builder import build_report

    cfg = {}
    if CONFIG_PATH.exists():
        cfg = json.loads(CONFIG_PATH.read_text())

    course, _ = load_course_object(str(SAMPLE_PATH))
    rubric = load_rubric(str(RUBRIC_PATH))

    # Deterministic
    a_findings = run_all(course)
    assert len(a_findings) > 0

    # Semantic (element 1.5 — Student Resources, has clear evidence in sample)
    cache = ResponseCache(cache_dir=cfg.get("cache_dir", ".cache"), enabled=True)
    llm = BedrockLLMClient(
        model_id=cfg.get("model_id", "anthropic.claude-3-5-sonnet-20241022-v2:0"),
        aws_region=cfg.get("aws_region", "us-west-2"),
        cache=cache,
        max_retries=2,
        retry_base_delay=1.0,
        prompt_version=cfg.get("prompt_version", "2027.06.1"),
    )
    checker = SemanticChecker(rubric=rubric, llm_client=llm, concurrency=1, only_element="1.5")
    r_findings, errors = checker.run(course)

    report = build_report(
        course_title=course.get_title(),
        rubric_version=rubric["version"],
        prompt_version=cfg.get("prompt_version", "2027.06.1"),
        duration_seconds=1.0,
        rubric_findings=r_findings,
        accessibility_findings=a_findings,
        errors=errors,
    )

    assert report.meta.course_title == "Introduction to Psychology"
    assert report.summary.accessibility_errors >= 0
    assert len(report.rubric_findings) == 1
    assert report.rubric_findings[0].element_id == "1.5"
