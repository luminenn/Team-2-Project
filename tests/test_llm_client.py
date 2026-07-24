"""
Unit tests for the LLM client.
All Bedrock calls are mocked — no network access.
"""
import json
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch, PropertyMock

from cvc_rubric.llm_client import BedrockLLMClient, ResponseCache, PROMPT_VERSION
from cvc_rubric.models import RubricFinding

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

ELEMENT_1_1 = {
    "id": "1.1",
    "title": "Course Policies",
    "context_scope": ["syllabus", "pages"],
    "requires": [],
    "levels": {
        "incomplete": "Required items not present.",
        "approaching": "May need revision.",
        "aligned": "Course policies clearly stated in multiple locations.",
        "exceptional": "Policies integrated within relevant units.",
    },
}

_VALID_RESPONSE = {
    "element_id": "1.1",
    "rating": "aligned",
    "confidence": 0.85,
    "evidence_quotes": [
        {
            "quote": "Academic Honesty: All submitted work must be your own.",
            "page_id": "syllabus",
            "page_title": "Syllabus",
        }
    ],
    "missing_items": [],
    "suggested_fix": "Add late submission policy to the syllabus.",
    "reasoning": "The course clearly states academic honesty and communication policies.",
}

_SOURCE_TEXTS = {
    "syllabus": (
        "Academic Honesty: All submitted work must be your own. "
        "Plagiarism will result in a zero."
    )
}


def _make_bedrock_response(data: dict) -> MagicMock:
    """Mock the boto3 bedrock-runtime invoke_model response."""
    body_text = json.dumps({
        "content": [{"type": "text", "text": json.dumps(data)}],
        "usage": {"input_tokens": 800, "output_tokens": 200},
    })
    mock_body = MagicMock()
    mock_body.read.return_value = body_text.encode()
    mock_response = MagicMock()
    mock_response.__getitem__ = lambda self, key: mock_body if key == "body" else {}
    mock_response.get = lambda key, default=None: mock_body if key == "body" else default
    # Make response["body"] work
    mock_response.__getitem__ = MagicMock(return_value=mock_body)
    return mock_response


@pytest.fixture
def cache(tmp_path):
    return ResponseCache(cache_dir=str(tmp_path / "cache"), enabled=True)


@pytest.fixture
def client(cache):
    with patch("boto3.client") as mock_boto:
        bedrock_mock = MagicMock()
        mock_boto.return_value = bedrock_mock
        c = BedrockLLMClient(
            model_id="anthropic.claude-3-5-sonnet-20241022-v2:0",
            aws_region="us-west-2",
            cache=cache,
            max_retries=1,
            retry_base_delay=0.0,
            prompt_version=PROMPT_VERSION,
        )
        c._client = bedrock_mock
        yield c, bedrock_mock


# ---------------------------------------------------------------------------
# Basic happy-path
# ---------------------------------------------------------------------------

def test_evaluate_returns_finding(client):
    c, bedrock = client
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    finding = c.evaluate_element(ELEMENT_1_1, "Some syllabus text", source_texts=_SOURCE_TEXTS)
    assert isinstance(finding, RubricFinding)
    assert finding.element_id == "1.1"
    assert finding.rating == "aligned"
    assert finding.confidence == pytest.approx(0.85)


def test_evidence_quote_validated_against_source(client):
    c, bedrock = client
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    finding = c.evaluate_element(ELEMENT_1_1, "Some text", source_texts=_SOURCE_TEXTS)
    # The quote "Academic Honesty: All submitted work must be your own." is in _SOURCE_TEXTS
    assert len(finding.evidence_quotes) == 1


def test_invalid_quote_stripped(client):
    c, bedrock = client
    response = dict(_VALID_RESPONSE)
    response["evidence_quotes"] = [
        {"quote": "This text does not exist anywhere in the course.", "page_id": "syllabus", "page_title": "Syllabus"}
    ]
    bedrock.invoke_model.return_value = _make_bedrock_response(response)
    finding = c.evaluate_element(ELEMENT_1_1, "Some text", source_texts=_SOURCE_TEXTS)
    # Quote should be stripped — falls back to not_evaluable for non-incomplete
    assert finding.rating == "not_evaluable" or finding.evidence_quotes == []


def test_prompt_version_stored_on_finding(client):
    c, bedrock = client
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    finding = c.evaluate_element(ELEMENT_1_1, "text", source_texts=_SOURCE_TEXTS)
    assert finding.prompt_version == PROMPT_VERSION


def test_tokens_recorded(client):
    c, bedrock = client
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    finding = c.evaluate_element(ELEMENT_1_1, "text", source_texts=_SOURCE_TEXTS)
    assert finding.tokens_used == 1000  # 800 + 200


# ---------------------------------------------------------------------------
# Cache behavior
# ---------------------------------------------------------------------------

def test_cache_hit_on_second_call(client):
    c, bedrock = client
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    context = "Same context for both calls"
    finding1 = c.evaluate_element(ELEMENT_1_1, context, source_texts=_SOURCE_TEXTS)
    finding2 = c.evaluate_element(ELEMENT_1_1, context, source_texts=_SOURCE_TEXTS)
    assert bedrock.invoke_model.call_count == 1  # second call hit cache
    assert finding2.cache_hit is True


def test_no_cache_miss_on_different_context(client):
    c, bedrock = client
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    c.evaluate_element(ELEMENT_1_1, "Context A", source_texts=_SOURCE_TEXTS)
    c.evaluate_element(ELEMENT_1_1, "Context B", source_texts=_SOURCE_TEXTS)
    assert bedrock.invoke_model.call_count == 2


def test_cache_disabled_always_calls_bedrock(tmp_path, client):
    c, bedrock = client
    c._cache = ResponseCache(cache_dir=str(tmp_path), enabled=False)
    bedrock.invoke_model.return_value = _make_bedrock_response(_VALID_RESPONSE)
    context = "Same context"
    c.evaluate_element(ELEMENT_1_1, context, source_texts=_SOURCE_TEXTS)
    c.evaluate_element(ELEMENT_1_1, context, source_texts=_SOURCE_TEXTS)
    assert bedrock.invoke_model.call_count == 2


# ---------------------------------------------------------------------------
# Throttling retry
# ---------------------------------------------------------------------------

def test_throttle_retries_and_succeeds(client):
    from botocore.exceptions import ClientError
    c, bedrock = client
    throttle_error = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
        "InvokeModel",
    )
    bedrock.invoke_model.side_effect = [
        throttle_error,
        _make_bedrock_response(_VALID_RESPONSE),
    ]
    finding = c.evaluate_element(ELEMENT_1_1, "text", source_texts=_SOURCE_TEXTS)
    assert finding.rating == "aligned"
    assert bedrock.invoke_model.call_count == 2


def test_persistent_throttle_returns_not_evaluable(client):
    from botocore.exceptions import ClientError
    c, bedrock = client
    throttle_error = ClientError(
        {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
        "InvokeModel",
    )
    bedrock.invoke_model.side_effect = throttle_error
    finding = c.evaluate_element(ELEMENT_1_1, "text")
    assert finding.rating == "not_evaluable"
    assert finding.error_note is not None
    assert "Throttled" in finding.error_note


# ---------------------------------------------------------------------------
# Malformed model output
# ---------------------------------------------------------------------------

def test_invalid_rating_becomes_not_evaluable(client):
    c, bedrock = client
    bad_response = dict(_VALID_RESPONSE)
    bad_response["rating"] = "superb"  # not a valid rating
    bedrock.invoke_model.return_value = _make_bedrock_response(bad_response)
    finding = c.evaluate_element(ELEMENT_1_1, "text")
    assert finding.rating == "not_evaluable"


def test_non_json_response_returns_not_evaluable(client):
    c, bedrock = client
    body_text = json.dumps({
        "content": [{"type": "text", "text": "Sorry, I cannot help with that."}],
        "usage": {"input_tokens": 100, "output_tokens": 20},
    })
    mock_body = MagicMock()
    mock_body.read.return_value = body_text.encode()
    mock_resp = MagicMock()
    mock_resp.__getitem__ = MagicMock(return_value=mock_body)
    bedrock.invoke_model.return_value = mock_resp
    finding = c.evaluate_element(ELEMENT_1_1, "text")
    assert finding.rating == "not_evaluable"


def test_missing_confidence_defaults_to_zero(client):
    c, bedrock = client
    response = dict(_VALID_RESPONSE)
    del response["confidence"]
    bedrock.invoke_model.return_value = _make_bedrock_response(response)
    finding = c.evaluate_element(ELEMENT_1_1, "text", source_texts=_SOURCE_TEXTS)
    assert finding.confidence == 0.0


def test_exceptional_with_no_evidence_downgraded(client):
    c, bedrock = client
    # exceptional rating with no evidence quotes — retry won't help, downgrade to not_evaluable
    exceptional = dict(_VALID_RESPONSE)
    exceptional["rating"] = "exceptional"
    exceptional["evidence_quotes"] = []
    bedrock.invoke_model.return_value = _make_bedrock_response(exceptional)
    finding = c.evaluate_element(ELEMENT_1_1, "text", source_texts={})
    assert finding.rating == "not_evaluable"
