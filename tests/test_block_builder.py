"""
Tests for block_builder and llm_text_projection modules.

Covers:
- Selection: only matching context_scope types included
- Media exclusion: videos/images/PDFs → metadata only, never file bytes
- not_evaluable: missing requires → NotEvaluable returned
- Budget under: normal course → single block, no truncation
- Budget over: synthetically oversized → truncated with marker, still single block
- Text projection: HTML → clean text; tags/scripts/nav removed; link text preserved;
  placeholders tokenized; original html unchanged (a11y DOM intact)
- No test makes a network call or invokes any model.
"""
from __future__ import annotations

import pytest

from cvc_rubric.block_builder import (
    Block,
    NotEvaluable,
    build_block,
    count_tokens,
    evaluate_element_stub,
)
from cvc_rubric.llm_text_projection import html_to_llm_text, project_page_text
from cvc_rubric.models import (
    Assignment,
    CourseFile,
    CourseObject,
    Discussion,
    Module,
    Page,
    Quiz,
    Syllabus,
    Video,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_course(**kwargs) -> CourseObject:
    """Build a minimal CourseObject with specified fields."""
    defaults = {
        "course": {"title": "Test Course"},
        "modules": [],
        "pages": [],
        "assignments": [],
        "quizzes": [],
        "discussions": [],
        "files": [],
        "videos": [],
        "syllabus": None,
    }
    defaults.update(kwargs)
    return CourseObject.model_validate(defaults)


def _make_element(element_id="1.1", context_scope=None, requires=None):
    return {
        "id": element_id,
        "title": f"Element {element_id}",
        "context_scope": context_scope or ["syllabus", "pages"],
        "requires": requires or [],
    }


# ---------------------------------------------------------------------------
# Text Projection Tests
# ---------------------------------------------------------------------------

class TestHtmlToLlmText:
    def test_basic_html_strip(self):
        html = "<p>Hello <strong>world</strong></p>"
        result = html_to_llm_text(html)
        assert "Hello" in result
        assert "world" in result
        assert "<p>" not in result
        assert "<strong>" not in result

    def test_headings_preserved_as_text(self):
        html = "<h2>Section Title</h2><p>Content here.</p>"
        result = html_to_llm_text(html)
        assert "## Section Title" in result
        assert "Content here." in result

    def test_heading_levels(self):
        html = "<h1>One</h1><h3>Three</h3><h6>Six</h6>"
        result = html_to_llm_text(html)
        assert "# One" in result
        assert "### Three" in result
        assert "###### Six" in result

    def test_list_items_preserved(self):
        html = "<ul><li>Item A</li><li>Item B</li></ul>"
        result = html_to_llm_text(html)
        assert "- Item A" in result
        assert "- Item B" in result

    def test_link_text_preserved_not_url(self):
        html = '<a href="https://example.com/long/path">Click for details</a>'
        result = html_to_llm_text(html)
        assert "Click for details" in result
        assert "https://example.com" not in result

    def test_script_and_style_removed(self):
        html = "<script>alert('x')</script><style>.a{color:red}</style><p>Real content</p>"
        result = html_to_llm_text(html)
        assert "alert" not in result
        assert "color:red" not in result
        assert "Real content" in result

    def test_nav_removed(self):
        html = "<nav><a href='/'>Home</a></nav><p>Main content</p>"
        result = html_to_llm_text(html)
        assert "Home" not in result
        assert "Main content" in result

    def test_canvas_placeholders_replaced(self):
        html = '<a href="$IMS-CC-FILEBASE$/files/doc.pdf">Syllabus PDF</a>'
        result = html_to_llm_text(html)
        assert "$IMS-CC-FILEBASE$" not in result
        assert "Syllabus PDF" in result

    def test_placeholder_in_text(self):
        html = "<p>See $CANVAS_OBJECT_REFERENCE$/quizzes/123 for the quiz.</p>"
        result = html_to_llm_text(html)
        assert "$CANVAS_OBJECT_REFERENCE$" not in result
        assert "[course link]" in result

    def test_image_as_metadata(self):
        html = '<img src="photo.jpg" alt="Campus view">'
        result = html_to_llm_text(html)
        assert "[Image: Campus view]" in result
        assert "photo.jpg" not in result

    def test_image_no_alt(self):
        html = '<img src="decorative.png">'
        result = html_to_llm_text(html)
        assert "[Image]" in result

    def test_iframe_as_metadata(self):
        html = '<iframe src="https://youtube.com/embed/abc" title="Lecture 1"></iframe>'
        result = html_to_llm_text(html)
        assert "[Embedded: Lecture 1]" in result
        assert "youtube.com" not in result

    def test_video_element_as_metadata(self):
        html = '<video src="lecture.mp4"><track kind="captions" src="cc.vtt"></video>'
        result = html_to_llm_text(html)
        assert "[Video element]" in result
        assert "lecture.mp4" not in result

    def test_table_content_preserved(self):
        html = "<table><tr><th>Name</th><th>Score</th></tr><tr><td>Alice</td><td>95</td></tr></table>"
        result = html_to_llm_text(html)
        assert "Name" in result
        assert "Score" in result
        assert "Alice" in result
        assert "95" in result

    def test_empty_html(self):
        assert html_to_llm_text("") == ""
        assert html_to_llm_text("   ") == ""
        assert html_to_llm_text(None) == ""

    def test_whitespace_normalized(self):
        html = "<p>Too    many     spaces</p>"
        result = html_to_llm_text(html)
        assert "Too many spaces" in result
        assert "    " not in result

    def test_hidden_elements_removed(self):
        html = '<div aria-hidden="true">Hidden</div><p>Visible</p>'
        result = html_to_llm_text(html)
        assert "Hidden" not in result
        assert "Visible" in result

    def test_display_none_removed(self):
        html = '<div style="display:none">Gone</div><p>Here</p>'
        result = html_to_llm_text(html)
        assert "Gone" not in result
        assert "Here" in result


class TestProjectPageText:
    def test_prefers_html_over_fallback(self):
        html = "<p>HTML content</p>"
        fallback = "Fallback text"
        result = project_page_text(html, fallback)
        assert "HTML content" in result
        assert "Fallback" not in result

    def test_uses_fallback_when_no_html(self):
        result = project_page_text("", "Fallback text")
        assert "Fallback text" in result

    def test_empty_both(self):
        assert project_page_text("", "") == ""


# ---------------------------------------------------------------------------
# Block Builder Tests
# ---------------------------------------------------------------------------

class TestBuildBlockSelection:
    """Only matching context_scope types are included; irrelevant types excluded."""

    def test_syllabus_scope_includes_syllabus(self):
        course = _make_course(
            syllabus={"html": "<p>Syllabus content here</p>", "text": "Syllabus content here"},
            assignments=[{"id": "a1", "title": "HW1", "html": "<p>Do this</p>", "text": "Do this"}],
        )
        element = _make_element(context_scope=["syllabus"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert "Syllabus content here" in result.text
        assert "Do this" not in result.text
        assert "syllabus" in result.source_ids

    def test_assignments_scope_includes_assignments(self):
        course = _make_course(
            syllabus={"html": "<p>Syl</p>", "text": "Syl"},
            assignments=[{"id": "a1", "title": "HW1", "html": "<p>Assignment text</p>", "text": "Assignment text"}],
        )
        element = _make_element(context_scope=["assignments"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert "Assignment text" in result.text
        assert "Syl" not in result.text
        assert "a1" in result.source_ids

    def test_discussions_scope(self):
        course = _make_course(
            discussions=[{"id": "d1", "title": "Week 1 Discussion", "html": "<p>Discuss topic</p>", "text": "Discuss topic"}],
        )
        element = _make_element(context_scope=["discussions"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert "Discuss topic" in result.text
        assert "d1" in result.source_ids

    def test_multiple_scopes(self):
        course = _make_course(
            syllabus={"html": "<p>Syl</p>", "text": "Syl"},
            pages=[{"id": "p1", "title": "Page1", "html": "<p>Page content</p>", "text": "Page content"}],
        )
        element = _make_element(context_scope=["syllabus", "pages"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert "Syl" in result.text
        assert "Page content" in result.text

    def test_empty_scope_no_content(self):
        course = _make_course()
        element = _make_element(context_scope=["assignments"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert result.not_evaluable is True
        assert result.text == ""


class TestMediaExclusion:
    """Videos/images/PDFs → metadata only, never file bytes."""

    def test_videos_as_metadata(self):
        course = _make_course(
            videos=[
                {"url": "https://youtube.com/watch?v=abc", "source": "youtube", "page_id": "p1", "captions_declared": True},
                {"url": "https://vimeo.com/123", "source": "vimeo", "page_id": "p2", "captions_declared": False},
            ],
        )
        element = _make_element(context_scope=["videos"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert "youtube.com" in result.text
        assert "captions: yes" in result.text
        assert "captions: no" in result.text
        # No binary/base64 content
        assert "base64" not in result.text

    def test_files_as_metadata(self):
        course = _make_course(
            files=[
                {"name": "syllabus.pdf", "path": "/files/syllabus.pdf", "mime": "application/pdf", "size": 1024},
                {"name": "notes.docx", "path": "/files/notes.docx", "mime": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "size": 2048},
            ],
        )
        element = _make_element(context_scope=["files"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert "syllabus.pdf" in result.text
        assert "application/pdf" in result.text
        assert "notes.docx" in result.text
        # Only metadata — no file bytes
        assert len(result.text) < 500

    def test_images_in_html_as_metadata(self):
        html = '<p>See below:</p><img src="diagram.png" alt="Architecture diagram"><p>End.</p>'
        course = _make_course(
            pages=[{"id": "p1", "title": "Arch", "html": html, "text": ""}],
        )
        element = _make_element(context_scope=["pages"])
        result = build_block(element, course)
        assert "[Image: Architecture diagram]" in result.text
        assert "diagram.png" not in result.text


class TestNotEvaluable:
    """Element whose requires are missing → NotEvaluable, no block built."""

    def test_missing_syllabus_requires(self):
        course = _make_course(syllabus=None)
        element = _make_element(requires=["syllabus"])
        result = build_block(element, course)
        assert isinstance(result, NotEvaluable)
        assert "syllabus" in result.reason.lower()

    def test_missing_assignments_requires(self):
        course = _make_course(assignments=[])
        element = _make_element(requires=["assignments"])
        result = build_block(element, course)
        assert isinstance(result, NotEvaluable)
        assert "assignments" in result.reason.lower()

    def test_satisfied_requires(self):
        course = _make_course(
            syllabus={"html": "<p>Here</p>", "text": "Here"},
        )
        element = _make_element(requires=["syllabus"], context_scope=["syllabus"])
        result = build_block(element, course)
        assert isinstance(result, Block)
        assert not result.not_evaluable


class TestTokenBudget:
    """Budget under → no truncation; budget over → truncated with marker, still single block."""

    def test_under_budget_no_truncation(self):
        course = _make_course(
            syllabus={"html": "<p>Short syllabus content.</p>", "text": "Short syllabus content."},
        )
        element = _make_element(context_scope=["syllabus"])
        # Use a generous budget
        result = build_block(element, course, token_budget=100_000)
        assert isinstance(result, Block)
        assert not result.truncated
        assert result.truncation_note == ""
        assert result.token_count > 0
        assert result.token_count < 100_000

    def test_over_budget_truncated_single_block(self):
        # Create a synthetically large content
        big_text = "This is a repeated sentence for testing. " * 5000
        course = _make_course(
            syllabus={"html": f"<p>{big_text}</p>", "text": big_text},
        )
        element = _make_element(context_scope=["syllabus"])
        # Use a tiny budget to force truncation
        result = build_block(element, course, token_budget=100)
        assert isinstance(result, Block)
        assert result.truncated is True
        assert "truncated" in result.truncation_note.lower()
        assert "[...content truncated to fit context budget...]" in result.text
        # Still a single block (no sub-blocks)
        assert result.token_count == 100

    def test_no_sub_blocks_produced(self):
        """Even with large content, only one block is ever produced."""
        big_text = "Word " * 10000
        course = _make_course(
            pages=[
                {"id": "p1", "title": "Page 1", "html": f"<p>{big_text}</p>", "text": big_text},
                {"id": "p2", "title": "Page 2", "html": f"<p>{big_text}</p>", "text": big_text},
            ],
        )
        element = _make_element(context_scope=["pages"])
        result = build_block(element, course, token_budget=500)
        # Result is always a single Block, not a list
        assert isinstance(result, Block)
        assert result.truncated is True


class TestOriginalHtmlUnchanged:
    """The original html field is never modified by the text projection."""

    def test_html_field_unchanged(self):
        original_html = '<p>Policy: <a href="$IMS-CC-FILEBASE$/doc.pdf">Click here</a></p><img src="x.png" alt="test">'
        course = _make_course(
            pages=[{"id": "p1", "title": "Policies", "html": original_html, "text": ""}],
        )
        element = _make_element(context_scope=["pages"])

        # Build the block (which internally projects the html to text)
        result = build_block(element, course)

        # The block's text is the projection
        assert "$IMS-CC-FILEBASE$" not in result.text
        assert "<p>" not in result.text

        # But the original course object's html is UNCHANGED
        assert course.pages[0].html == original_html
        assert "$IMS-CC-FILEBASE$" in course.pages[0].html
        assert "<p>" in course.pages[0].html
        assert '<img src="x.png"' in course.pages[0].html

    def test_syllabus_html_unchanged(self):
        original_html = "<h1>Welcome</h1><script>tracking()</script><p>Content</p>"
        course = _make_course(
            syllabus={"html": original_html, "text": ""},
        )
        element = _make_element(context_scope=["syllabus"])
        result = build_block(element, course)

        # Projection is clean
        assert "<h1>" not in result.text
        assert "<script>" not in result.text
        assert "tracking" not in result.text

        # Original is untouched
        assert course.syllabus.html == original_html
        assert "<script>" in course.syllabus.html


class TestCountTokens:
    def test_empty_string(self):
        assert count_tokens("") == 0

    def test_known_text(self):
        # Rough sanity: "hello world" should be a small number of tokens
        tokens = count_tokens("hello world")
        assert 1 <= tokens <= 5

    def test_longer_text(self):
        text = "The quick brown fox jumps over the lazy dog. " * 100
        tokens = count_tokens(text)
        assert tokens > 100


class TestEvaluateElementStub:
    def test_stub_raises(self):
        block = Block(element_id="1.1", text="content", token_count=5)
        element = _make_element()
        with pytest.raises(NotImplementedError, match="Bedrock integration not yet implemented"):
            evaluate_element_stub(block, element)
