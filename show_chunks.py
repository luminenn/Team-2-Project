"""
Show how the course is broken into chunks per rubric element.

Usage: python show_chunks.py [course.json]
Defaults to reports/aligned-introduction-to-public-speaking-export.json
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, "src")

from cvc_rubric.loader import load_course_object
from cvc_rubric.context_selector import build_context
from cvc_rubric.semantic_checker import load_rubric

# Load course
course_path = sys.argv[1] if len(sys.argv) > 1 else "reports/aligned-introduction-to-public-speaking-export.json"
print(f"Loading course: {course_path}\n")
course, _ = load_course_object(course_path)

# Load rubric for element definitions
rubric = load_rubric("src/cvc_rubric/rubric.json")

# Show course structure overview
print("=" * 70)
print(f"COURSE: {course.get_title()}")
print(f"  Modules: {len(course.modules)}")
print(f"  Pages: {len(course.pages)}")
print(f"  Assignments: {len(course.assignments)}")
print(f"  Discussions: {len(course.discussions)}")
print(f"  Quizzes: {len(course.quizzes)}")
print(f"  Videos: {len(course.videos)}")
print(f"  Files: {len(course.files)}")
print(f"  Syllabus: {'Yes' if course.syllabus and course.syllabus.text.strip() else 'No'}")
print("=" * 70)

# For each rubric element, show what content gets selected
print(f"\n{'='*70}")
print("CHUNKS PER RUBRIC ELEMENT (what gets sent to the LLM)")
print(f"{'='*70}\n")

for section in rubric["sections"]:
    print(f"\n--- Section {section['id']}: {section['title']} ---\n")
    for element in section["elements"]:
        eid = element["id"]
        title = element["title"]
        scope = element.get("context_scope", [])

        bundle = build_context(course, eid, scope, token_budget=100000)

        print(f"  Element {eid}: {title}")
        print(f"    Scope: {scope}")
        print(f"    Pages selected: {len(bundle.pages)}")
        print(f"    Estimated tokens: {bundle.estimated_tokens}")
        print(f"    Truncated: {bundle.truncated}")
        if bundle.pages:
            for p in bundle.pages[:5]:  # Show first 5
                preview = p.content[:100].replace("\n", " ")
                print(f"      [{p.page_id}] {p.page_title}: \"{preview}...\"")
            if len(bundle.pages) > 5:
                print(f"      ... and {len(bundle.pages) - 5} more")
        else:
            print(f"      (no content found for this scope)")
        print()
