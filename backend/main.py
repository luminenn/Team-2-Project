"""
FastAPI backend for the CVC Course Auditor.

Endpoints:
  POST /audit        — upload .imscc, start background audit, return run_id
  GET  /history      — list all past runs (most recent first)
  GET  /history/{id} — get a single run's full report or current status
"""
from __future__ import annotations

import os
import sys
import tempfile
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure the src/ package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from backend.db import (
    get_all_runs,
    get_run,
    init_db,
    insert_run,
    insert_comment,
    get_comments_for_run,
    update_run_complete,
    update_run_error,
)
from backend.audit_runner import run_audit, run_audit_json

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="CVC Course Auditor", version="0.1.0")

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Background executor — avoid blocking the event loop
_executor = ThreadPoolExecutor(max_workers=2)


@app.on_event("startup")
def _startup() -> None:
    init_db()


# ---------------------------------------------------------------------------
# POST /audit
# ---------------------------------------------------------------------------

@app.post("/audit")
async def start_audit(file: UploadFile = File(...)) -> JSONResponse:
    """Accept a .imscc or .json course export, kick off background audit, return run_id."""
    # Validate file type
    filename = file.filename or ""
    lower_name = filename.lower()
    if not (lower_name.endswith(".imscc") or lower_name.endswith(".json")):
        raise HTTPException(
            status_code=400,
            detail="Only .imscc or .json files are accepted. Upload a Canvas export (.imscc) or a pre-parsed course JSON.",
        )

    # Save upload to a temp file
    tmp_dir = tempfile.mkdtemp(prefix="cvc_audit_")
    tmp_path = os.path.join(tmp_dir, filename)
    content = await file.read()
    with open(tmp_path, "wb") as f:
        f.write(content)

    # Generate run
    run_id = uuid.uuid4().hex[:12]
    created_at = datetime.now(timezone.utc).isoformat()
    insert_run(run_id, created_at)

    # Submit to background thread
    _executor.submit(_run_audit_task, run_id, tmp_path)

    return JSONResponse(
        status_code=202,
        content={"run_id": run_id, "status": "processing"},
    )


def _run_audit_task(run_id: str, imscc_path: str) -> None:
    """Execute the audit pipeline in a background thread."""
    try:
        if imscc_path.lower().endswith(".json"):
            report = run_audit_json(imscc_path)
        else:
            report = run_audit(imscc_path)
        course_title = report.get("meta", {}).get("course_title", "Unknown Course")
        update_run_complete(run_id, course_title, report)
    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {exc}\n{traceback.format_exc()}"
        update_run_error(run_id, error_msg)
    finally:
        # Cleanup temp file
        try:
            Path(imscc_path).unlink(missing_ok=True)
            Path(imscc_path).parent.rmdir()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# GET /history
# ---------------------------------------------------------------------------

@app.get("/history")
def list_history() -> list[dict]:
    """Return all past runs, most recent first, with summary info."""
    runs = get_all_runs()
    results = []
    for run in runs:
        summary = None
        if run.get("report"):
            summary = run["report"].get("summary")
        results.append({
            "run_id": run["run_id"],
            "course_title": run["course_title"],
            "created_at": run["created_at"],
            "status": run["status"],
            "error": run.get("error"),
            "summary": summary,
        })
    return results


# ---------------------------------------------------------------------------
# GET /history/{run_id}
# ---------------------------------------------------------------------------

@app.get("/history/{run_id}")
def get_history_item(run_id: str) -> dict:
    """Return the full report for one run, or its current status."""
    run = get_run(run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found.")
    return run


# ---------------------------------------------------------------------------
# POST /comments
# ---------------------------------------------------------------------------

from pydantic import BaseModel as _BaseModel


class CommentRequest(_BaseModel):
    run_id: str
    section_id: str
    text: str


@app.post("/comments")
def post_comment(req: CommentRequest) -> dict:
    """Store a comment for a rubric section within a run."""
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Comment text cannot be empty.")
    created_at = datetime.now(timezone.utc).isoformat()
    comment = insert_comment(req.run_id, req.section_id, text, created_at)
    return comment


# ---------------------------------------------------------------------------
# GET /comments/{run_id}
# ---------------------------------------------------------------------------

@app.get("/comments/{run_id}")
def get_comments(run_id: str) -> list[dict]:
    """Return all comments for a given run."""
    return get_comments_for_run(run_id)


# ---------------------------------------------------------------------------
# Run with: uvicorn backend.main:app --reload --port 8001
# ---------------------------------------------------------------------------
