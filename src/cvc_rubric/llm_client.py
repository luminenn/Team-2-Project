"""
LLM client: Amazon Bedrock wrapper.

Responsibilities:
- Build the structured prompt for one rubric element
- Call Bedrock with JSON-mode output enforcement
- Retry on throttle with exponential backoff
- Cache responses on disk keyed by sha256(context + element_id + prompt_version)
- Return a parsed RubricFinding (or a not_evaluable finding on persistent failure)
"""
from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from pathlib import Path

# Load .env file if present (ensures credentials are available regardless of entry point)
_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
if _ENV_PATH.exists():
    with open(_ENV_PATH, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                _key = _key.strip()
                _val = _val.strip().strip('"').strip("'")
                if _key and _val:
                    os.environ.setdefault(_key, _val)
from pathlib import Path
from typing import Any, Optional

import boto3
from botocore.exceptions import ClientError

from cvc_rubric.models import EvidenceQuote, RubricFinding

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

PROMPT_VERSION = "2027.06.2"

_SYSTEM_PROMPT = """\
You are an expert peer reviewer for the California Virtual Campus (CVC) Online Course Design Rubric (June 2027 edition).
You will be given excerpts from an online course and asked to evaluate one rubric element.

RULES YOU MUST FOLLOW:
1. Rate the element as one of: incomplete | approaching | aligned | exceptional | not_evaluable
2. "exceptional" requires the element to FIRST satisfy everything in the "aligned" descriptor.
   Do not assign "exceptional" unless all "aligned" criteria are fully met.
3. Every rating OTHER than "incomplete" REQUIRES at least one evidence_quote drawn VERBATIM
   from the supplied course content. Do NOT paraphrase. Do NOT invent quotes.
4. If you cannot find supporting evidence in the provided content, rate the element as
   "not_evaluable" rather than guessing.
5. "suggested_fix" must be a concrete, actionable step — not a restatement of the rubric descriptor.
6. Your entire response must be valid JSON matching the schema below. No prose outside the JSON.

OUTPUT SCHEMA:
{
  "element_id": "<string>",
  "rating": "incomplete|approaching|aligned|exceptional|not_evaluable",
  "confidence": <float 0.0-1.0>,
  "evidence_quotes": [
    {"quote": "<verbatim excerpt>", "page_id": "<page id>", "page_title": "<page title>"}
  ],
  "missing_items": ["<what is absent or incomplete>"],
  "suggested_fix": "<concrete actionable improvement>",
  "reasoning": "<brief explanation of rating>"
}
"""


def _build_user_prompt(
    element: dict,
    context_text: str,
    truncation_note: str,
) -> str:
    # Prefer the detailed evaluation_prompt from rubric_prompts.json
    evaluation_prompt = element.get("evaluation_prompt")
    if evaluation_prompt:
        lines = [
            evaluation_prompt,
            "",
        ]
        if truncation_note:
            lines += [f"*Note: {truncation_note}*", ""]
        lines += [
            "### Course Content",
            context_text or "(no content available for this scope)",
            "",
            f"Evaluate element {element['id']} using only the content above. "
            "Respond with JSON only.",
        ]
        return "\n".join(lines)

    # Fallback: build from level descriptors (legacy path)
    levels = element.get("levels", {})
    lines = [
        f"## Rubric Element: {element['id']} — {element.get('title', '')}",
        "",
        "### Level Descriptors",
        f"- **Incomplete**: {levels.get('incomplete', '')}",
        f"- **Approaching**: {levels.get('approaching', '')}",
        f"- **Aligned**: {levels.get('aligned', '')}",
        f"- **Exceptional**: {levels.get('exceptional', '')}",
        "",
    ]
    if truncation_note:
        lines += [f"*Note: {truncation_note}*", ""]
    lines += [
        "### Course Content",
        context_text or "(no content available for this scope)",
        "",
        f"Evaluate element {element['id']} using only the content above. "
        "Respond with JSON only.",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

class ResponseCache:
    def __init__(self, cache_dir: str, enabled: bool = True):
        self._dir = Path(cache_dir)
        self._enabled = enabled
        if enabled:
            self._dir.mkdir(parents=True, exist_ok=True)

    def _key(self, context: str, element_id: str, prompt_version: str) -> str:
        payload = f"{element_id}:{prompt_version}:{context}"
        return hashlib.sha256(payload.encode()).hexdigest()

    def get(self, context: str, element_id: str, prompt_version: str) -> Optional[dict]:
        if not self._enabled:
            return None
        path = self._dir / f"{self._key(context, element_id, prompt_version)}.json"
        if path.exists():
            try:
                return json.loads(path.read_text(encoding="utf-8"))
            except Exception:
                return None
        return None

    def set(self, context: str, element_id: str, prompt_version: str, data: dict) -> None:
        if not self._enabled:
            return
        path = self._dir / f"{self._key(context, element_id, prompt_version)}.json"
        try:
            path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning("Cache write failed for %s: %s", element_id, e)

# ---------------------------------------------------------------------------
# Bedrock caller
# ---------------------------------------------------------------------------

_THROTTLE_CODES = {"ThrottlingException", "TooManyRequestsException", "ServiceUnavailableException"}
_VALID_RATINGS = {"incomplete", "approaching", "aligned", "exceptional", "not_evaluable"}


class BedrockLLMClient:
    def __init__(
        self,
        model_id: str,
        aws_region: str,
        cache: ResponseCache,
        max_retries: int = 3,
        retry_base_delay: float = 2.0,
        prompt_version: str = PROMPT_VERSION,
    ):
        self._model_id = model_id
        self._cache = cache
        self._max_retries = max_retries
        self._retry_base_delay = retry_base_delay
        self._prompt_version = prompt_version
        self._client = boto3.client("bedrock-runtime", region_name=aws_region)

    def evaluate_element(
        self,
        element: dict,
        context_text: str,
        truncation_note: str = "",
        source_texts: Optional[dict[str, str]] = None,
    ) -> RubricFinding:
        """
        Run one rubric element evaluation.

        source_texts: {page_id: full text} used to validate evidence quotes
                      via substring matching post-hoc.
        Returns a RubricFinding. Never raises.
        """
        element_id = element["id"]
        element_title = element.get("title", "")
        start = time.monotonic()

        # Cache check
        cached = self._cache.get(context_text, element_id, self._prompt_version)
        if cached is not None:
            logger.info("[%s] cache hit", element_id)
            finding = self._parse_response(
                cached, element, source_texts or {}, cache_hit=True,
                latency=time.monotonic() - start,
            )
            return finding

        user_prompt = _build_user_prompt(element, context_text, truncation_note)

        raw: Optional[dict] = None
        last_error: str = ""
        tokens_used: Optional[int] = None

        for attempt in range(self._max_retries + 1):
            try:
                response, tokens_used = self._call_bedrock(user_prompt)
                raw = response
                break
            except ClientError as e:
                code = e.response["Error"]["Code"]
                if code in _THROTTLE_CODES:
                    delay = self._retry_base_delay * (2 ** attempt)
                    logger.warning(
                        "[%s] throttled (attempt %d/%d), retrying in %.1fs",
                        element_id, attempt + 1, self._max_retries, delay,
                    )
                    time.sleep(delay)
                    last_error = f"Throttled: {code}"
                else:
                    last_error = f"Bedrock ClientError ({code}): {e}"
                    logger.error("[%s] %s", element_id, last_error)
                    break
            except Exception as e:
                last_error = f"Unexpected error: {e}"
                logger.error("[%s] %s", element_id, last_error)
                break

        latency = time.monotonic() - start

        if raw is None:
            return self._not_evaluable(element_id, element_title, last_error, latency)

        # Cache the raw response
        self._cache.set(context_text, element_id, self._prompt_version, raw)

        finding = self._parse_response(
            raw, element, source_texts or {},
            cache_hit=False, latency=latency, tokens_used=tokens_used,
        )

        # If non-incomplete rating has no evidence, retry once then downgrade
        if finding.rating not in ("incomplete", "not_evaluable") and not finding.evidence_quotes:
            logger.warning(
                "[%s] rating '%s' has no evidence quotes — retrying once",
                element_id, finding.rating,
            )
            # Invalidate cache entry and retry
            self._cache.set(context_text + "_retry", element_id, self._prompt_version, {})
            try:
                response2, tokens2 = self._call_bedrock(user_prompt)
                finding2 = self._parse_response(
                    response2, element, source_texts or {},
                    cache_hit=False, latency=time.monotonic() - start,
                    tokens_used=tokens2,
                )
                if finding2.evidence_quotes:
                    return finding2
            except Exception:
                pass
            # Still no evidence — downgrade
            finding.rating = "not_evaluable"
            finding.error_note = "Rating downgraded: non-incomplete rating produced no verifiable evidence quotes."

        return finding

    def _call_bedrock(self, user_prompt: str) -> tuple[dict, int]:
        """Call Bedrock Messages API. Returns (parsed_json_dict, token_count)."""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 1024,
            "system": _SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_prompt}],
        }
        response = self._client.invoke_model(
            modelId=self._model_id,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(body),
        )
        body_bytes = response["body"].read()
        outer = json.loads(body_bytes)
        # Extract text content
        content_blocks = outer.get("content", [])
        text = ""
        for block in content_blocks:
            if isinstance(block, dict) and block.get("type") == "text":
                text += block.get("text", "")
        tokens = outer.get("usage", {}).get("input_tokens", 0) + \
                 outer.get("usage", {}).get("output_tokens", 0)
        # Parse JSON from model text — strip markdown fences if present
        text = text.strip()
        if text.startswith("```"):
            text = re.sub(r"^```[a-z]*\n?", "", text)
            text = re.sub(r"\n?```$", "", text)
        parsed = json.loads(text)
        return parsed, tokens

    def _parse_response(
        self,
        raw: dict,
        element: dict,
        source_texts: dict[str, str],
        cache_hit: bool,
        latency: float,
        tokens_used: Optional[int] = None,
    ) -> RubricFinding:
        element_id = element["id"]
        element_title = element.get("title", "")

        rating = raw.get("rating", "not_evaluable")
        if rating not in _VALID_RATINGS:
            rating = "not_evaluable"

        confidence = float(raw.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))

        # Validate and filter evidence quotes
        raw_quotes = raw.get("evidence_quotes", []) or []
        valid_quotes: list[EvidenceQuote] = []
        for q in raw_quotes:
            if not isinstance(q, dict):
                continue
            quote_text = q.get("quote", "").strip()
            q_page_id = q.get("page_id", "")
            q_page_title = q.get("page_title", "")
            if not quote_text:
                continue
            # Substring match validation
            verified = False
            if source_texts:
                # Check against the specific page first, then all texts
                candidate_texts = []
                if q_page_id and q_page_id in source_texts:
                    candidate_texts.append(source_texts[q_page_id])
                candidate_texts.extend(source_texts.values())
                for src in candidate_texts:
                    if quote_text in src:
                        verified = True
                        break
                if not verified:
                    logger.warning(
                        "[%s] evidence quote failed substring validation, stripping: %r",
                        element_id, quote_text[:80],
                    )
                    continue
            valid_quotes.append(EvidenceQuote(
                quote=quote_text,
                page_id=q_page_id,
                page_title=q_page_title,
            ))

        return RubricFinding(
            element_id=element_id,
            element_title=element_title,
            rating=rating,
            confidence=confidence,
            evidence_quotes=valid_quotes,
            missing_items=raw.get("missing_items", []) or [],
            suggested_fix=raw.get("suggested_fix", "") or "",
            reasoning=raw.get("reasoning", "") or "",
            prompt_version=self._prompt_version,
            cache_hit=cache_hit,
            latency_seconds=round(latency, 3),
            tokens_used=tokens_used,
        )

    def _not_evaluable(
        self,
        element_id: str,
        element_title: str,
        error_note: str,
        latency: float,
    ) -> RubricFinding:
        return RubricFinding(
            element_id=element_id,
            element_title=element_title,
            rating="not_evaluable",
            confidence=0.0,
            prompt_version=self._prompt_version,
            latency_seconds=round(latency, 3),
            error_note=error_note,
        )


import re  # noqa: E402 (used in _call_bedrock)
