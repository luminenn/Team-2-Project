"""
Pydantic models for the course object input contract and all output findings.
Every field is Optional with a safe default — we never crash on malformed input.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Input: Course Object (as produced by the .imscc parser)
# ---------------------------------------------------------------------------

class CourseItem(BaseModel):
    id: str = ""
    title: str = ""
    type: str = ""
    resource_id: str = ""


class Module(BaseModel):
    id: str = ""
    title: str = ""
    position: int = 0
    items: list[CourseItem] = Field(default_factory=list)

    @field_validator("items", mode="before")
    @classmethod
    def coerce_items(cls, v: Any) -> list[dict]:
        if not isinstance(v, list):
            return []
        return [i for i in v if isinstance(i, dict)]


class Page(BaseModel):
    id: str = ""
    title: str = ""
    module_id: Optional[str] = None
    html: str = ""
    text: str = ""
    path: str = ""


class Assignment(BaseModel):
    id: str = ""
    title: str = ""
    html: str = ""
    text: str = ""
    rubric_present: bool = False
    due_date: Optional[str] = None


class Quiz(BaseModel):
    id: str = ""
    title: str = ""
    question_count: int = 0


class Discussion(BaseModel):
    id: str = ""
    title: str = ""
    html: str = ""
    text: str = ""


class CourseFile(BaseModel):
    name: str = ""
    path: str = ""
    mime: str = ""
    size: int = 0


class Video(BaseModel):
    url: str = ""
    source: str = ""
    page_id: str = ""
    captions_declared: Optional[bool] = None


class Syllabus(BaseModel):
    html: str = ""
    text: str = ""


class CourseObject(BaseModel):
    course: dict[str, Any] = Field(default_factory=dict)
    modules: list[Module] = Field(default_factory=list)
    pages: list[Page] = Field(default_factory=list)
    assignments: list[Assignment] = Field(default_factory=list)
    quizzes: list[Quiz] = Field(default_factory=list)
    discussions: list[Discussion] = Field(default_factory=list)
    files: list[CourseFile] = Field(default_factory=list)
    videos: list[Video] = Field(default_factory=list)
    syllabus: Optional[Syllabus] = None

    @field_validator("modules", "pages", "assignments", "quizzes",
                     "discussions", "files", "videos", mode="before")
    @classmethod
    def coerce_list(cls, v: Any) -> list:
        if not isinstance(v, list):
            return []
        return v

    @field_validator("syllabus", mode="before")
    @classmethod
    def coerce_syllabus(cls, v: Any) -> Optional[dict]:
        if isinstance(v, dict):
            return v
        # Already a Syllabus instance (e.g. passed directly in tests)
        if hasattr(v, "html") and hasattr(v, "text"):
            return {"html": v.html, "text": v.text}
        return None

    @model_validator(mode="before")
    @classmethod
    def ensure_dict(cls, v: Any) -> Any:
        if not isinstance(v, dict):
            return {}
        return v

    def get_title(self) -> str:
        if isinstance(self.course, dict):
            return self.course.get("title", "Untitled Course")
        return "Untitled Course"

    def page_by_id(self, page_id: str) -> Optional[Page]:
        for p in self.pages:
            if p.id == page_id:
                return p
        return None

    def pages_in_module(self, module_id: str) -> list[Page]:
        return [p for p in self.pages if p.module_id == module_id]

    def module_ids(self) -> set[str]:
        return {m.id for m in self.modules}


# ---------------------------------------------------------------------------
# Output: Accessibility (deterministic) findings
# ---------------------------------------------------------------------------

AccessibilitySeverity = Literal["error", "warning", "info"]
FindingStatus = Literal["ai_suggested", "reviewer_confirmed", "reviewer_rejected", "faculty_addressed"]


class AccessibilityFinding(BaseModel):
    check_id: str
    severity: AccessibilitySeverity
    page_id: str
    page_title: str
    element_snippet: str  # truncated to ~200 chars
    line_hint: Optional[int] = None
    message: str
    remediation: str
    status: FindingStatus = "ai_suggested"
    # Grouping fields (populated by dedup post-processing; backward-compatible)
    # UI can surface these for grouped findings — e.g. "47 occurrences across 12 pages"
    occurrences: Optional[int] = None
    affected_pages: Optional[list[dict]] = None  # [{"page_id": str, "page_title": str, "count": int}]


# ---------------------------------------------------------------------------
# Output: Rubric (semantic) findings
# ---------------------------------------------------------------------------

RubricRating = Literal["incomplete", "approaching", "aligned", "exceptional", "not_evaluable"]


class EvidenceQuote(BaseModel):
    quote: str
    page_id: str
    page_title: str


class RubricFinding(BaseModel):
    element_id: str
    element_title: str = ""
    section_id: str = ""
    section_title: str = ""
    rating: RubricRating
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    evidence_quotes: list[EvidenceQuote] = Field(default_factory=list)
    missing_items: list[str] = Field(default_factory=list)
    suggested_fix: str = ""
    reasoning: str = ""
    prompt_version: str = ""
    cache_hit: bool = False
    latency_seconds: Optional[float] = None
    tokens_used: Optional[int] = None
    error_note: Optional[str] = None
    status: FindingStatus = "ai_suggested"


# ---------------------------------------------------------------------------
# Output: Report envelope
# ---------------------------------------------------------------------------

class ReportMeta(BaseModel):
    course_title: str
    analyzed_at: str
    rubric_version: str
    prompt_version: str
    duration_seconds: float


class ReportSummary(BaseModel):
    exceptional_count: int = 0
    aligned_count: int = 0
    approaching_count: int = 0
    incomplete_count: int = 0
    not_evaluable_count: int = 0
    alignment_score: Optional[int] = None  # 0-100 or None if all not-evaluable
    accessibility_errors: int = 0
    accessibility_warnings: int = 0
    accessibility_info: int = 0


class ReportError(BaseModel):
    stage: str
    element_id: Optional[str] = None
    message: str


class Report(BaseModel):
    meta: ReportMeta
    summary: ReportSummary
    rubric_findings: list[RubricFinding] = Field(default_factory=list)
    accessibility_findings: list[AccessibilityFinding] = Field(default_factory=list)
    errors: list[ReportError] = Field(default_factory=list)
