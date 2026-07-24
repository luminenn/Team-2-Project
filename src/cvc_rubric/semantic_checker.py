"""
Semantic checker: drives LLM evaluation of all rubric elements.

- Loads rubric.json
- For each element, checks requires[], builds context, calls LLM
- Parallelizes with asyncio + a semaphore (concurrency cap)
- Per-element failure isolation: exceptions → not_evaluable with error_note
- Dry-run mode: print token estimates and exit without calling LLM
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Optional

from cvc_rubric.context_selector import build_context, estimate_all_contexts
from cvc_rubric.llm_client import BedrockLLMClient, ResponseCache
from cvc_rubric.models import CourseObject, ReportError, RubricFinding

logger = logging.getLogger(__name__)


def load_rubric(rubric_path: str) -> dict:
    path = Path(rubric_path)
    if not path.exists():
        raise FileNotFoundError(f"Rubric file not found: {rubric_path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_rubric_prompts(prompts_path: Optional[str] = None) -> dict[str, dict]:
    """Load rubric_prompts.json and return a dict keyed by element ID."""
    if prompts_path is None:
        prompts_path = str(Path(__file__).parent / "rubric_prompts.json")
    path = Path(prompts_path)
    if not path.exists():
        logger.warning("rubric_prompts.json not found at %s — falling back to level descriptors", prompts_path)
        return {}
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("elements", {})


def _all_elements(rubric: dict) -> list[tuple[dict, dict]]:
    """Returns list of (section_dict, element_dict) pairs."""
    pairs = []
    for section in rubric.get("sections", []):
        for element in section.get("elements", []):
            pairs.append((section, element))
    return pairs


def _check_requires(element: dict, course: CourseObject) -> Optional[str]:
    """
    Returns a reason string if a required field is absent, else None.
    We never score a missing required input as 'incomplete'.
    """
    for req in element.get("requires", []):
        if req == "syllabus" and (not course.syllabus or not course.syllabus.text.strip()):
            return f"Required field '{req}' is absent from the course object."
    return None


def _build_source_texts(course: CourseObject) -> dict[str, str]:
    """Build {page_id: full_text} for evidence quote validation.
    
    Include both the raw text and a version with the title prepended,
    since the LLM sees content formatted as '### [id] Title\\nContent'
    and may quote across the title/content boundary.
    """
    texts: dict[str, str] = {}
    for p in (course.pages or []):
        if p.text:
            # Include raw text and title+text for matching
            texts[p.id] = f"{p.title} {p.text}" if p.title else p.text
    for a in (course.assignments or []):
        if a.text:
            texts[a.id] = f"{a.title} {a.text}" if a.title else a.text
    for d in (course.discussions or []):
        if d.text:
            texts[d.id] = f"{d.title} {d.text}" if d.title else d.text
    if course.syllabus and course.syllabus.text:
        texts["syllabus"] = course.syllabus.text
    return texts


class SemanticChecker:
    def __init__(
        self,
        rubric: dict,
        llm_client: BedrockLLMClient,
        token_budget: int = 6000,
        concurrency: int = 5,
        only_element: Optional[str] = None,
        rubric_prompts: Optional[dict[str, dict]] = None,
    ):
        self._rubric = rubric
        self._client = llm_client
        self._token_budget = token_budget
        self._concurrency = concurrency
        self._only_element = only_element
        self._prompts = rubric_prompts or {}

    def dry_run(self, course: CourseObject) -> None:
        """Print token estimates for all elements without calling the LLM."""
        pairs = _all_elements(self._rubric)
        elements = [e for (_, e) in pairs]
        if self._only_element:
            elements = [e for e in elements if e["id"] == self._only_element]
        estimates = estimate_all_contexts(course, elements, self._token_budget)
        total = 0
        print(f"\nDry-run token estimates (budget per element: {self._token_budget})\n")
        print(f"{'Element':<8} {'Title':<35} {'Tokens':>7} {'Truncated'}")
        print("-" * 65)
        for est in estimates:
            trunc = "YES" if est["truncated"] else ""
            print(f"{est['element_id']:<8} {est['element_title'][:34]:<35} "
                  f"{est['estimated_tokens']:>7} {trunc}")
            total += est["estimated_tokens"]
        print("-" * 65)
        print(f"{'TOTAL':<44} {total:>7}\n")
        if any(e["truncated"] for e in estimates):
            print("Warning: some elements will have truncated context. "
                  "Consider raising token_budget in config.json.\n")

    def run(self, course: CourseObject) -> tuple[list[RubricFinding], list[ReportError]]:
        """Run all elements synchronously via asyncio."""
        return asyncio.run(self._run_async(course))

    async def _run_async(
        self, course: CourseObject
    ) -> tuple[list[RubricFinding], list[ReportError]]:
        pairs = _all_elements(self._rubric)
        if self._only_element:
            pairs = [(s, e) for (s, e) in pairs if e["id"] == self._only_element]

        source_texts = _build_source_texts(course)
        sem = asyncio.Semaphore(self._concurrency)
        loop = asyncio.get_event_loop()

        tasks = [
            loop.create_task(
                self._evaluate_one(sem, section, element, course, source_texts)
            )
            for (section, element) in pairs
        ]
        results = await asyncio.gather(*tasks, return_exceptions=False)

        findings: list[RubricFinding] = []
        errors: list[ReportError] = []
        for item in results:
            if isinstance(item, RubricFinding):
                findings.append(item)
            elif isinstance(item, ReportError):
                errors.append(item)
        # Sort by element_id for stable output
        findings.sort(key=lambda f: f.element_id)
        return findings, errors

    async def _evaluate_one(
        self,
        sem: asyncio.Semaphore,
        section: dict,
        element: dict,
        course: CourseObject,
        source_texts: dict[str, str],
    ) -> RubricFinding | ReportError:
        element_id = element["id"]
        async with sem:
            try:
                return await asyncio.get_event_loop().run_in_executor(
                    None,
                    self._evaluate_sync,
                    section, element, course, source_texts,
                )
            except Exception as exc:
                logger.exception("[%s] unhandled exception in evaluation", element_id)
                return RubricFinding(
                    element_id=element_id,
                    element_title=element.get("title", ""),
                    section_id=section.get("id", ""),
                    section_title=section.get("title", ""),
                    rating="not_evaluable",
                    confidence=0.0,
                    error_note=f"Unhandled exception: {exc}",
                    prompt_version=self._client._prompt_version,
                )

    def _evaluate_sync(
        self,
        section: dict,
        element: dict,
        course: CourseObject,
        source_texts: dict[str, str],
    ) -> RubricFinding:
        element_id = element["id"]
        t0 = time.monotonic()

        # Inject evaluation_prompt from rubric_prompts.json if available
        if element_id in self._prompts and "evaluation_prompt" in self._prompts[element_id]:
            element = {**element, "evaluation_prompt": self._prompts[element_id]["evaluation_prompt"]}

        # Check requires[] — skip LLM if required content is absent
        missing_reason = _check_requires(element, course)
        if missing_reason:
            logger.info("[%s] skipping LLM — required content absent: %s", element_id, missing_reason)
            return RubricFinding(
                element_id=element_id,
                element_title=element.get("title", ""),
                section_id=section.get("id", ""),
                section_title=section.get("title", ""),
                rating="not_evaluable",
                confidence=0.0,
                error_note=missing_reason,
                prompt_version=self._client._prompt_version,
                latency_seconds=round(time.monotonic() - t0, 3),
            )

        # Build context
        bundle = build_context(
            course,
            element_id,
            element.get("context_scope", []),
            self._token_budget,
        )
        if bundle.truncated:
            logger.info("[%s] context truncated: %s", element_id, bundle.truncation_note)

        context_text = bundle.full_text()

        logger.info(
            "[%s] calling LLM (~%d tokens, %d context pages)",
            element_id, bundle.estimated_tokens, len(bundle.pages),
        )

        finding = self._client.evaluate_element(
            element,
            context_text,
            truncation_note=bundle.truncation_note,
            source_texts=source_texts,
        )
        # Attach section metadata
        finding.section_id = section.get("id", "")
        finding.section_title = section.get("title", "")

        logger.info(
            "[%s] rating=%s confidence=%.2f latency=%.2fs cache=%s",
            element_id, finding.rating, finding.confidence,
            finding.latency_seconds or 0, finding.cache_hit,
        )
        return finding
