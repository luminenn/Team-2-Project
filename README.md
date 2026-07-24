# CVC Dashboard (Critique, POCR review)

The reviewer dashboard for the CVC@ONE POCR AI review tool: an overview of every ingested course with pipeline progress, plus a full 25-standard rubric report per course. Built standalone so it can be merged into the existing Critique login project.

## Run

```bash
npm install
npm run dev
```

`/` redirects to `/dashboard`. Course data is display-only mock data in `lib/data/courses.ts`, shaped to match the backend's `types/pocr.ts` so swapping in real ingests later is a data-layer change only.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 (CSS-first tokens in `app/globals.css`) · GSAP + @gsap/react · next-themes (dark default) · lucide-react. No framer-motion: the 21st.dev animated grid background was rebuilt with GSAP in `components/ui/animated-grid-pattern.tsx` (wrapped by `components/ui/grid-backdrop.tsx`).

## Merging into the login project

The tokens, fonts, and conventions in this repo intentionally match the Critique design system (see `DESIGN.md`), so merging is mostly copying:

1. Copy `app/dashboard/`, `components/dashboard/`, `components/report/`, `components/ui/` (animated-grid-pattern, grid-backdrop, progress-bar), and `lib/` (types, status, motion, data) into the login project.
2. Append the additions to `app/globals.css`: the four `--status-*` tokens plus `--scrim` (both themes), their `@theme inline` color mappings, and the `shimmer` and `pulse-dot` keyframes with their reduced-motion guards. Everything else already exists there.
3. Keep the login project's `layout.tsx`, theme provider, and theme toggle; delete this repo's copies.
4. Protect the route: add `/dashboard/:path*` to the middleware matcher and the `authorized` callback, and guard the pages with `const session = await auth(); if (!session?.user) redirect("/")`.

---

# CVC Rubric Analysis Engine

Automated analysis of Canvas online courses against the **CVC Online Course Design Rubric (June 2027)**.
Combines deterministic HTML accessibility checks with LLM-based semantic rubric evaluation.

---

## Web App (Frontend + Backend)

A browser-based interface for uploading `.imscc` files and viewing audit results.

### Prerequisites

- Python 3.11+
- Node.js 18+
- pip dependencies installed: `pip install -e ".[dev]"` (from repo root)

### Running locally

**1. Start the backend** (from repo root):

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. Endpoints:
- `POST /audit` — upload `.imscc`, returns `{ run_id, status: "processing" }`
- `GET /history` — list all past runs
- `GET /history/{run_id}` — get full report or current status for one run

**2. Start the frontend** (in a second terminal, from repo root):

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend is the Next.js dashboard described above (the original Vite app was removed in the merge); the backend's CORS config already allows port 3000.

### How it works

1. Upload a `.imscc` file via the big circular button on the Home page
2. The backend saves the file, starts the audit pipeline in a background thread, and returns immediately
3. The frontend polls `GET /history/{run_id}` every 2 seconds until the run completes
4. Results display: summary cards at top, then collapsible sections for rubric findings and accessibility issues

### Where the pipeline is called

The single integration point is **`backend/audit_runner.py`** — the `run_audit(imscc_path)` function. It calls:

```python
from cvc_rubric.parser import parse_imscc        # Step 1: parse .imscc → dict
from cvc_rubric.loader import load_course_object  # Step 2: validate as CourseObject
from cvc_rubric.checks.deterministic import run_all  # Step 3: accessibility checks
from cvc_rubric.report_builder import build_report   # Step 4: build report
```

To enable LLM-based semantic rubric checks, uncomment the relevant block in `audit_runner.py` and ensure `config.json` has valid AWS credentials.

### Data persistence

Runs are stored in `backend/runs.db` (SQLite). The database is created automatically on first startup. Delete the file to reset history.

---

---

## Quick start

```bash
pip install -e ".[dev]"

# Parse a Canvas export into a course object JSON
parse course.imscc --out course_object.json

# Analyze a pre-parsed course object
analyze course_object.json --out report.json --only-deterministic

# Full pipeline: parse + analyze in one step
audit course.imscc --out report.json --only-deterministic
```

---

## IMSCC Parser

### What it does

`parse_imscc(path)` converts a Canvas `.imscc` export archive into a **course object dict**
that the analysis engine consumes.  The same dict can be written to disk as JSON and
re-analyzed later without re-parsing.

### Output contract

Every key below is **always present** in the returned dict.
Use empty arrays and `null` where data is genuinely absent — never omit a key.

```json
{
  "course": {
    "title": "string",
    "code":  "string",
    "term":  "string"
  },
  "modules": [
    {
      "id":       "string",
      "title":    "string",
      "position": "int",
      "items": [
        {
          "id":          "string",
          "title":       "string",
          "type":        "string",
          "resource_id": "string"
        }
      ]
    }
  ],
  "pages": [
    {
      "id":        "string",
      "title":     "string",
      "module_id": "string | null",
      "html":      "string",
      "text":      "string",
      "path":      "string"
    }
  ],
  "assignments": [
    {
      "id":             "string",
      "title":          "string",
      "html":           "string",
      "text":           "string",
      "rubric_present": "bool",
      "due_date":       "string | null"
    }
  ],
  "quizzes": [
    {
      "id":             "string",
      "title":          "string",
      "question_count": "int"
    }
  ],
  "discussions": [
    {
      "id":    "string",
      "title": "string",
      "html":  "string",
      "text":  "string"
    }
  ],
  "files": [
    {
      "name": "string",
      "path": "string",
      "mime": "string",
      "size": "int"
    }
  ],
  "videos": [
    {
      "url":               "string",
      "source":            "string",
      "page_id":           "string",
      "captions_declared": "bool | null"
    }
  ],
  "syllabus": {
    "html": "string",
    "text": "string"
  }
}
```

**Field notes**

| Field | Notes |
|---|---|
| `pages[].html` | Raw HTML with tags preserved — accessibility checks depend on tag/attribute structure |
| `pages[].text` | Plain-text extraction (no tags) for semantic/LLM checks |
| `videos[].captions_declared` | `true` if a `<track kind="captions">` is present; `null` for iframe embeds where it cannot be determined from HTML alone |
| `files` | Only files under `web_resources/` in the archive |
| `syllabus` | `null` if no syllabus resource, `course_settings/syllabus_body.html`, or page titled "syllabus" is found |

---

### Known gotchas

1. **`href` values are URL-encoded and relative.**
   The parser decodes them (`urllib.parse.unquote`) and resolves them against
   the archive root before reading.

2. **Canvas internal link placeholders are preserved as-is.**
   Strings like `$IMS-CC-FILEBASE$..` and `$CANVAS_OBJECT_REFERENCE$..` are
   kept in the HTML verbatim.  The analysis engine flags them as `str-003`
   findings.  Do not attempt to resolve them — the mapping is not available
   at parse time.

3. **`course_settings/module_meta.xml` takes precedence over the manifest tree.**
   Canvas exports include real module structure and item ordering here.
   If this file is absent (non-Canvas or minimal exports), the parser falls back
   to the `<organizations>` tree in `imsmanifest.xml` and emits a warning.

4. **Announcements and discussion topics use separate resource types.**
   `imsdt_xmlv1p1` / `discussiontopic` → `discussions[]`.
   These are never classified as pages.

5. **Empty or missing HTML files yield a page with `html: ""` and `text: ""`.**
   The parser emits a warning but does not skip the resource or crash.

6. **ZIP magic bytes, not extension, determine validity.**
   Faculty sometimes rename `.imscc` files.  Validation reads the first
   4 bytes (`PK\x03\x04`) before attempting to open the archive.

7. **Output is deterministic.**
   Resources are processed in sorted identifier order.  Given the same input
   archive, the output JSON is byte-identical across runs.

---

### Adapter interface

The parser sits behind an adapter boundary so future sources (Moodle `.mbz`,
Canvas REST API) are new adapters, not rewrites:

```python
from cvc_rubric.parser.adapter import CourseSourceAdapter

class MyAdapter(CourseSourceAdapter):
    def parse(self, path: str) -> tuple[dict, list[str]]:
        ...  # return (course_dict, warnings)
```

The analysis engine remains runnable standalone on any pre-existing course
object JSON — it has no dependency on the parser.

---

## CLI reference

```
analyze <course_object.json> [OPTIONS]
  --out PATH              Output report JSON (default: report.json)
  --only-deterministic    Skip LLM, run accessibility checks only
  --dry-run               Print token estimates, no LLM calls
  --no-cache              Disable on-disk response cache
  --element ID            Evaluate a single rubric element (e.g. 1.1)
  --config PATH           Config file (default: config.json)
  --markdown PATH         Also write a Markdown report
  --log-level LEVEL       DEBUG / INFO / WARNING

parse <course.imscc> [OPTIONS]
  --out PATH              Output course object JSON (default: course_object.json)
  --log-level LEVEL

audit <course.imscc> [OPTIONS]
  --out PATH              Output report JSON (default: report.json)
  --keep-intermediate     Keep the intermediate course object JSON
  --intermediate PATH     Path for the intermediate file
  [all analyze options]
```

---

## Running tests

```bash
# All fast tests (no LLM, no real .imscc required)
pytest -m "not integration and not golden"

# Parser unit + integration tests
pytest tests/test_parser_manifest.py tests/test_parser_videos.py \
       tests/test_parser_files.py tests/test_parser_malformed.py \
       tests/test_parser_golden.py tests/test_parser_integration.py

# LLM integration tests (requires AWS credentials)
pytest -m integration
```

---

## Configuration (`config.json`)

```json
{
  "model_id":                  "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "aws_region":                "us-west-2",
  "concurrency":               5,
  "token_budget":              6000,
  "max_retries":               3,
  "retry_base_delay_seconds":  2.0,
  "cache_enabled":             true,
  "cache_dir":                 ".cache",
  "prompt_version":            "2027.06.1",
  "rubric_path":               "src/cvc_rubric/rubric.json",
  "log_level":                 "INFO"
}
```
