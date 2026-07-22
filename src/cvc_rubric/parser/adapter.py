"""
Abstract adapter interface for course object sources.

Any source that produces a course object dict — IMSCC, Moodle .mbz,
Canvas REST API, etc. — should subclass CourseSourceAdapter and implement
parse().  The analysis engine only ever sees the dict; it has no knowledge
of where it came from.

Usage
-----
    class IMSCCAdapter(CourseSourceAdapter):
        def parse(self, path: str) -> tuple[dict, list[str]]:
            ...

    adapter = IMSCCAdapter()
    course_dict, warnings = adapter.parse("course.imscc")
"""
from __future__ import annotations

from abc import ABC, abstractmethod


class CourseSourceAdapter(ABC):
    """
    Base class for all course-object sources.

    Subclasses must implement :meth:`parse`.  They may optionally override
    :meth:`validate` to add source-specific pre-flight checks.
    """

    @abstractmethod
    def parse(self, path: str) -> tuple[dict, list[str]]:
        """
        Parse a course source at *path* and return a 2-tuple:

        - ``course_dict``: a plain Python dict matching the CourseObject
          schema (see ``models.py``).  Every top-level key must be present;
          use empty lists / ``null`` where data is absent.
        - ``warnings``: a list of human-readable non-fatal warning strings
          collected during parsing.

        Raises
        ------
        FileNotFoundError
            If *path* does not exist.
        ValueError
            If *path* exists but cannot be parsed as this source type
            (e.g. not a ZIP, missing manifest).
        """

    def validate(self, path: str) -> None:
        """
        Optional pre-flight validation.  Raises ``ValueError`` with a
        descriptive message on failure.  Called by :meth:`parse` before
        extraction begins.  Default implementation is a no-op.
        """
