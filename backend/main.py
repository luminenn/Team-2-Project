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
    update_run_complete,
    update_run_error,
)
from backend.audit_runner import run_audit

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
    """Accept a .imscc upload, kick off background audit, return run_id."""
    # Validate file type
    filename = file.filename or ""
    if not filename.lower().endswith(".imscc"):
        raise HTTPException(
            status_code=400,
            detail="Only .imscc files are accepted. Please upload a Canvas Common Cartridge export.",
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
# Run with: uvicorn backend.main:app --reload --port 8000
# ---------------------------------------------------------------------------
