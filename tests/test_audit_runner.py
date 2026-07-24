"""
Tests for backend/audit_runner.py Bedrock/SemanticChecker integration.

Tests:
1. run_audit() with mocked Bedrock returns non-empty rubric_findings AND
   deterministic accessibility_findings.
2. Broken LLM setup (bad rubric_path / BedrockLLMClient constructor raising)
   still returns a complete report with deterministic findings intact and a
   ReportError present.
3. FastAPI end-to-end via TestClient: POST /audit with a small .imscc, mocked
   boto3, assert the completed run's report has both accessibility_findings and
   rubric_findings populated.

No real AWS calls are made — boto3 is always mocked.
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Ensure src/ is importable (mirroring backend/main.py)
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_imscc(tmp_path):
    """Build a minimal .imscc with content that triggers at least one a11y finding."""
    from tests.fixtures.imscc_builder import IMSCCBuilder

    builder = IMSCCBuilder(title="Integration Test Course")
    builder.set_syllabus(
        "<h2>Syllabus</h2>"
        "<p>Welcome to the course. Academic honesty policy applies.</p>"
        "<p>Contact: instructor@college.edu</p>"
        '<img src="photo.jpg">'  # missing alt → img-001 finding
    )
    builder.add_page(
        "p1", "Welcome",
        "<h2>Welcome</h2><p>Getting started instructions here.</p>"
    )
    builder.add_module("mod-1", "Orientation", position=1, item_ids=["p1"])
    path = builder.write(tmp_path / "test_course.imscc")
    return str(path)


def _mock_bedrock_response(element_id="1.1", rating="aligned"):
    """Build a dict mimicking a successful Bedrock LLM response."""
    return {
        "element_id": element_id,
        "rating": rating,
        "confidence": 0.85,
        "evidence_quotes": [
            {"quote": "Academic honesty policy applies.", "page_id": "syllabus", "page_title": "Syllabus"}
        ],
        "missing_items": [],
        "suggested_fix": "",
        "reasoning": "Policy found in syllabus.",
    }


def _make_mock_bedrock_client():
    """
    Create a mock that replaces BedrockLLMClient — its evaluate_element
    returns a valid RubricFinding for any element.
    """
    from cvc_rubric.models import RubricFinding, EvidenceQuote

    mock = MagicMock()
    mock._prompt_version = "2027.06.2"

    def fake_evaluate(element, context_text, truncation_note="", source_texts=None):
        return RubricFinding(
            element_id=element["id"],
            element_title=element.get("title", ""),
            rating="aligned",
            confidence=0.85,
            evidence_quotes=[EvidenceQuote(
                quote="Academic honesty policy applies.",
                page_id="syllabus",
                page_title="Syllabus",
            )],
            missing_items=[],
            suggested_fix="",
            reasoning="Policy found in syllabus.",
            prompt_version="2027.06.2",
        )

    mock.evaluate_element.side_effect = fake_evaluate
    return mock


# ---------------------------------------------------------------------------
# Test 1: run_audit() with mocked Bedrock returns both finding types
# ---------------------------------------------------------------------------

class TestRunAuditWithMockedBedrock:
    def test_returns_rubric_and_accessibility_findings(self, sample_imscc):
        """run_audit() should return non-empty rubric_findings AND accessibility_findings."""
        mock_client = _make_mock_bedrock_client()

        with patch("backend.audit_runner.BedrockLLMClient", return_value=mock_client):
            from backend.audit_runner import run_audit
            report = run_audit(sample_imscc)

        # Both types of findings present
        assert len(report["rubric_findings"]) > 0, "Expected non-empty rubric_findings"
        assert len(report["accessibility_findings"]) > 0, "Expected non-empty accessibility_findings"

        # Rubric findings have expected structure
        rf = report["rubric_findings"][0]
        assert "element_id" in rf
        assert "rating" in rf
        assert rf["rating"] in ("incomplete", "approaching", "aligned", "exceptional", "not_evaluable")

        # Accessibility findings still work
        af = report["accessibility_findings"][0]
        assert "check_id" in af
        assert "severity" in af

        # Meta has correct prompt_version
        assert report["meta"]["prompt_version"] == "2027.06.2"

    def test_rubric_findings_cover_all_elements(self, sample_imscc):
        """All 22 rubric elements should produce findings."""
        mock_client = _make_mock_bedrock_client()

        with patch("backend.audit_runner.BedrockLLMClient", return_value=mock_client):
            from backend.audit_runner import run_audit
            report = run_audit(sample_imscc)

        # 22 elements in the rubric
        assert len(report["rubric_findings"]) == 22


# ---------------------------------------------------------------------------
# Test 2: Broken LLM setup → graceful degradation
# ---------------------------------------------------------------------------

class TestBrokenLLMSetup:
    def test_bad_rubric_path_still_returns_report(self, sample_imscc):
        """If rubric.json can't be loaded, report still has deterministic findings + error."""
        with patch("backend.audit_runner._load_audit_config") as mock_cfg:
            mock_cfg.return_value = {
                "model_id": "global.anthropic.claude-sonnet-4-20250514-v1:0",
                "aws_region": "us-west-2",
                "rubric_path": "/nonexistent/rubric.json",
                "prompt_version": "2027.06.2",
                "cache_dir": ".cache",
                "cache_enabled": True,
                "concurrency": 1,
                "token_budget": 6000,
                "max_retries": 1,
                "retry_base_delay_seconds": 0.1,
            }
            from backend.audit_runner import run_audit
            report = run_audit(sample_imscc)

        # Deterministic findings still present
        assert len(report["accessibility_findings"]) > 0
        # rubric_findings empty (LLM couldn't start)
        assert report["rubric_findings"] == []
        # An error was recorded
        assert len(report["errors"]) > 0
        assert any("rubric" in e["message"].lower() or "not found" in e["message"].lower()
                   for e in report["errors"])

    def test_bedrock_client_constructor_raises(self, sample_imscc):
        """If BedrockLLMClient() raises, report still has deterministic findings + error."""
        with patch("backend.audit_runner.BedrockLLMClient",
                   side_effect=Exception("No AWS credentials configured")):
            from backend.audit_runner import run_audit
            report = run_audit(sample_imscc)

        # Deterministic findings still present
        assert len(report["accessibility_findings"]) > 0
        # rubric_findings empty
        assert report["rubric_findings"] == []
        # Error recorded
        assert len(report["errors"]) > 0
        assert any("credentials" in e["message"].lower() or "aws" in e["message"].lower()
                   for e in report["errors"])


# ---------------------------------------------------------------------------
# Test 3: FastAPI end-to-end with TestClient
# ---------------------------------------------------------------------------

class TestFastAPIEndToEnd:
    def test_post_audit_returns_rubric_and_accessibility(self, sample_imscc):
        """POST /audit → completed run has both rubric_findings and accessibility_findings."""
        mock_client = _make_mock_bedrock_client()

        with patch("backend.audit_runner.BedrockLLMClient", return_value=mock_client):
            from fastapi.testclient import TestClient
            from backend.main import app

            client = TestClient(app)

            # Upload the .imscc file
            with open(sample_imscc, "rb") as f:
                response = client.post(
                    "/audit",
                    files={"file": ("test_course.imscc", f, "application/octet-stream")},
                )

            assert response.status_code == 202
            run_id = response.json()["run_id"]

            # Poll until complete (background thread)
            for _ in range(30):
                time.sleep(0.3)
                r = client.get(f"/history/{run_id}")
                if r.json()["status"] in ("complete", "error"):
                    break

            result = client.get(f"/history/{run_id}").json()
            assert result["status"] == "complete", f"Run failed: {result.get('error')}"

            report = result["report"]
            assert len(report["rubric_findings"]) > 0, "Expected rubric_findings"
            assert len(report["accessibility_findings"]) > 0, "Expected accessibility_findings"

            # Check structure
            rf = report["rubric_findings"][0]
            assert "element_id" in rf
            assert "rating" in rf
