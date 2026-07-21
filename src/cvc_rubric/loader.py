"""
Course object loader: reads JSON from disk, validates via Pydantic.
Returns a (CourseObject, list[str]) tuple where the second element is
any non-fatal parse warnings.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from pydantic import ValidationError

from cvc_rubric.models import CourseObject

logger = logging.getLogger(__name__)


def load_course_object(path: str) -> tuple[CourseObject, list[str]]:
    """
    Load and validate a course object JSON file.
    Returns (CourseObject, warnings).
    Raises ValueError on completely unreadable input.
    """
    warnings: list[str] = []
    raw_path = Path(path)

    if not raw_path.exists():
        raise FileNotFoundError(f"Course object file not found: {path}")

    try:
        with open(raw_path, encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in course object file: {e}") from e

    if not isinstance(data, dict):
        raise ValueError(f"Course object must be a JSON object, got {type(data).__name__}")

    try:
        course = CourseObject.model_validate(data)
    except ValidationError as e:
        # Pydantic v2: try to recover by passing through anyway
        warnings.append(f"Course object had validation issues (continuing with best-effort parse): {e}")
        try:
            course = CourseObject.model_construct(**{
                k: v for k, v in data.items()
                if k in CourseObject.model_fields
            })
        except Exception:
            course = CourseObject()

    # Soft warnings for missing common fields
    if not course.syllabus:
        warnings.append("No syllabus found in course object — elements requiring syllabus will be not_evaluable.")
    if not course.modules:
        warnings.append("No modules found — structure-related elements may have limited context.")
    if not course.pages:
        warnings.append("No pages found — most rubric elements will have minimal context.")

    return course, warnings
