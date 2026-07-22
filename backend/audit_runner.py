"""
Wrapper that calls the existing CVC audit pipeline in-process.

This module is the single integration point between the web backend and the
CLI-based analysis engine. If the pipeline signature changes, only this file
needs updating.
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

# ---------------------------------------------------------------------------
# PIPELINE CALL — edit this section to match your real entry point
# ---------------------------------------------------------------------------


def run_audit(imscc_path: str) -> dict:
    """
    Run the full audit pipeline on a .imscc file and return the report dict.

    This calls the existing parser + analysis engine IN-PROCESS:
      1. parse_imscc(path) -> course_object_dict
      2. load into CourseObject
      3. run deterministic accessibility checks
      4. build report

    For semantic (LLM) checks, set only_deterministic=False below and ensure
    AWS credentials are configured. Currently defaults to deterministic-only
    for fast local testing.

    Returns the full report dict (meta, summary, rubric_findings,
    accessibility_findings, errors).
    """
    from cvc_rubric.parser import parse_imscc
    from cvc_rubric.loader import load_course_object
    from cvc_rubric.checks.deterministic import run_all
    from cvc_rubric.report_builder import build_report

    import time

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

    # Step 3: Run deterministic accessibility checks
    accessibility_findings = run_all(course)

    # Step 4: Build report
    # ---------------------------------------------------------------
    # To enable LLM-based semantic checks, uncomment the block below
    # and ensure config.json has valid AWS credentials / model_id.
    # ---------------------------------------------------------------
    rubric_findings = []  # empty when only_deterministic=True
    report_errors = []

    duration = time.monotonic() - start

    report = build_report(
        course_title=course.get_title(),
        rubric_version="2027.06",
        prompt_version="2027.06.1",
        duration_seconds=duration,
        rubric_findings=rubric_findings,
        accessibility_findings=accessibility_findings,
        errors=report_errors,
    )

    # Convert Pydantic model to dict for JSON serialisation
    return report.model_dump()
