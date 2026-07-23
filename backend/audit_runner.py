"""
Wrapper that calls the existing CVC audit pipeline in-process.

This module is the single integration point between the web backend and the
CLI-based analysis engine. It runs BOTH deterministic accessibility checks
AND LLM-based semantic rubric checks on every call.

If the LLM setup fails (missing credentials, bad config, etc.), the run
still completes with deterministic findings intact and a ReportError describing
the failure. run_audit() never raises due to LLM/config problems.
"""
from __future__ import annotations

import json
import logging
import os
import tempfile
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Load .env file if present (reliable credential injection on Windows)
# ---------------------------------------------------------------------------
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
if _ENV_PATH.exists():
    logger.info("Loading credentials from .env file")
    with open(_ENV_PATH, encoding="utf-8") as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith("#") and "=" in _line:
                _key, _, _val = _line.partition("=")
                _key = _key.strip()
                _val = _val.strip().strip('"').strip("'")
                if _key and _val:
                    os.environ.setdefault(_key, _val)

# ---------------------------------------------------------------------------
# Config loading (mirrors cli.py's approach)
# ---------------------------------------------------------------------------

_CONFIG_PATH = Path(__file__).resolve().parent.parent / "config.json"


def _load_audit_config() -> dict[str, Any]:
    """Load config.json from the project root."""
    if not _CONFIG_PATH.exists():
        logger.warning("config.json not found at %s, using defaults", _CONFIG_PATH)
        return {}
    with open(_CONFIG_PATH, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Lazy import of Bedrock client (avoids import errors if boto3 is missing
# from polluting the deterministic-only path)
# ---------------------------------------------------------------------------

# These are imported at call time inside _run_semantic_checks so that
# import-time failures don't prevent deterministic checks from running.
BedrockLLMClient = None  # type: ignore[assignment]
_bedrock_imported = False


def _ensure_bedrock_imports():
    """Lazily import the Bedrock client module."""
    global BedrockLLMClient, _bedrock_imported
    if _bedrock_imported:
        return
    from cvc_rubric.llm_client import BedrockLLMClient as _Cls  # noqa: N811
    BedrockLLMClient = _Cls
    _bedrock_imported = True


# ---------------------------------------------------------------------------
# PIPELINE CALL
# ---------------------------------------------------------------------------


def run_audit(imscc_path: str) -> dict:
    """
    Run the full audit pipeline on a .imscc file and return the report dict.

    Runs BOTH:
      1. Deterministic accessibility checks (always)
      2. LLM semantic rubric checks (best-effort; failures degrade gracefully)

    Returns the full report dict (meta, summary, rubric_findings,
    accessibility_findings, errors).
    """
    from cvc_rubric.parser import parse_imscc
    from cvc_rubric.loader import load_course_object
    from cvc_rubric.checks.deterministic import run_all
    from cvc_rubric.report_builder import build_report
    from cvc_rubric.models import ReportError

    start = time.monotonic()

    # Step 1: Parse the IMSCC
    course_dict, parse_warnings = parse_imscc(imscc_path)

    # Step 2: Write intermediate JSON and load as CourseObject
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".json", delete=False, encoding="utf-8"
    )
    json.dump(course_dict, tmp, ensure_ascii=False)
    tmp.close()

    try:
        course, load_warnings = load_course_object(tmp.name)
    finally:
        Path(tmp.name).unlink(missing_ok=True)

    # Step 3: Run deterministic accessibility checks (always succeeds)
    accessibility_findings = run_all(course)

    # Step 4: Run LLM semantic rubric checks (best-effort)
    rubric_findings, report_errors = _run_semantic_checks(course)

    # Step 5: Build report
    cfg = _load_audit_config()
    duration = time.monotonic() - start

    report = build_report(
        course_title=course.get_title(),
        rubric_version="2027.06",
        prompt_version=cfg.get("prompt_version", "2027.06.2"),
        duration_seconds=duration,
        rubric_findings=rubric_findings,
        accessibility_findings=accessibility_findings,
        errors=report_errors,
    )

    return report.model_dump()


def _run_semantic_checks(course) -> tuple[list, list]:
    """
    Attempt to run LLM-based semantic rubric checks.

    If anything in the setup fails (missing credentials, bad config, missing
    rubric files, etc.), returns ([], [ReportError]) so the run still completes.

    Per-element LLM failures are handled inside llm_client.py (they degrade to
    not_evaluable findings) — no extra handling needed here for those.
    """
    from cvc_rubric.models import ReportError

    try:
        cfg = _load_audit_config()

        # Load rubric
        from cvc_rubric.semantic_checker import load_rubric, load_rubric_prompts, SemanticChecker

        rubric_path = cfg.get("rubric_path", "src/cvc_rubric/rubric.json")
        rubric = load_rubric(rubric_path)

        # Load rubric prompts
        rubric_prompts = load_rubric_prompts(cfg.get("rubric_prompts_path"))

        # Build cache
        from cvc_rubric.llm_client import ResponseCache
        cache = ResponseCache(
            cache_dir=cfg.get("cache_dir", ".cache"),
            enabled=cfg.get("cache_enabled", True),
        )

        # Build Bedrock client
        _ensure_bedrock_imports()
        model_id = cfg.get("model_id", "global.anthropic.claude-sonnet-4-20250514-v1:0")
        aws_region = cfg.get("aws_region", "us-west-2")

        llm_client = BedrockLLMClient(
            model_id=model_id,
            aws_region=aws_region,
            cache=cache,
            max_retries=int(cfg.get("max_retries", 3)),
            retry_base_delay=float(cfg.get("retry_base_delay_seconds", 2.0)),
            prompt_version=cfg.get("prompt_version", "2027.06.2"),
        )

        # Build checker and run
        checker = SemanticChecker(
            rubric=rubric,
            llm_client=llm_client,
            token_budget=int(cfg.get("token_budget", 6000)),
            concurrency=int(cfg.get("concurrency", 5)),
            rubric_prompts=rubric_prompts,
        )

        logger.info(
            "Starting semantic checks: model=%s region=%s concurrency=%s",
            model_id, aws_region, cfg.get("concurrency", 5),
        )

        rubric_findings, errors = checker.run(course)

        # Convert ReportError objects if checker returned raw errors
        report_errors = []
        for e in errors:
            if isinstance(e, ReportError):
                report_errors.append(e)
            else:
                report_errors.append(ReportError(stage="semantic", message=str(e)))

        return rubric_findings, report_errors

    except FileNotFoundError as exc:
        msg = f"Semantic checker setup failed — file not found: {exc}"
        logger.error(msg)
        return [], [ReportError(stage="semantic_setup", message=msg)]

    except ImportError as exc:
        msg = f"Semantic checker setup failed — missing dependency: {exc}"
        logger.error(msg)
        return [], [ReportError(stage="semantic_setup", message=msg)]

    except Exception as exc:
        # Catch-all: credentials missing, Bedrock access denied, ARN issues, etc.
        msg = f"Semantic checker setup failed: {type(exc).__name__}: {exc}"
        logger.error(msg, exc_info=True)

        # Surface helpful message for common ARN/inference-profile issues
        exc_str = str(exc).lower()
        if "accessdenied" in exc_str or "not authorized" in exc_str:
            msg += (
                "\n\nHint: If using a cross-region inference profile ID "
                "(e.g. 'global.anthropic.claude-sonnet-4-20250514-v1:0'), "
                "your IAM policy may require the full ARN instead of the short "
                "profile ID. Check your Bedrock model access configuration."
            )
        elif "validationexception" in exc_str and "model" in exc_str:
            msg += (
                "\n\nHint: The model ID or inference profile may need to be "
                "specified as a full ARN depending on your account's Bedrock "
                "access configuration."
            )

        return [], [ReportError(stage="semantic_setup", message=msg)]
