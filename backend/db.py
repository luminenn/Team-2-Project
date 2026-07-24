"""SQLite persistence for audit runs."""
from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "runs.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    run_id       TEXT PRIMARY KEY,
    course_title TEXT NOT NULL DEFAULT '',
    created_at   TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'processing',
    error        TEXT,
    report_json  TEXT
);

CREATE TABLE IF NOT EXISTS comments (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id       TEXT NOT NULL,
    section_id   TEXT NOT NULL,
    text         TEXT NOT NULL,
    created_at   TEXT NOT NULL
);
"""


def init_db() -> None:
    """Create the runs table if it doesn't exist."""
    with _conn() as conn:
        conn.executescript(_SCHEMA)


@contextmanager
def _conn():
    conn = sqlite3.connect(str(DB_PATH), timeout=30)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def insert_run(run_id: str, created_at: str) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT INTO runs (run_id, created_at, status) VALUES (?, ?, 'processing')",
            (run_id, created_at),
        )


def update_run_complete(run_id: str, course_title: str, report: dict) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE runs SET status='complete', course_title=?, report_json=? WHERE run_id=?",
            (course_title, json.dumps(report, ensure_ascii=False), run_id),
        )


def update_run_error(run_id: str, error_msg: str) -> None:
    with _conn() as conn:
        conn.execute(
            "UPDATE runs SET status='error', error=? WHERE run_id=?",
            (error_msg, run_id),
        )


def get_run(run_id: str) -> Optional[dict]:
    with _conn() as conn:
        row = conn.execute("SELECT * FROM runs WHERE run_id=?", (run_id,)).fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def get_all_runs() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute("SELECT * FROM runs ORDER BY created_at DESC").fetchall()
    return [_row_to_dict(r) for r in rows]


def delete_run(run_id: str) -> bool:
    """Remove a run and its reviewer notes. False if no such run."""
    with _conn() as conn:
        cur = conn.execute("DELETE FROM runs WHERE run_id=?", (run_id,))
        if cur.rowcount == 0:
            return False
        conn.execute("DELETE FROM comments WHERE run_id=?", (run_id,))
    return True


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    if d.get("report_json"):
        d["report"] = json.loads(d["report_json"])
    else:
        d["report"] = None
    del d["report_json"]
    return d


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

def insert_comment(run_id: str, section_id: str, text: str, created_at: str) -> dict:
    with _conn() as conn:
        cursor = conn.execute(
            "INSERT INTO comments (run_id, section_id, text, created_at) VALUES (?, ?, ?, ?)",
            (run_id, section_id, text, created_at),
        )
        return {
            "id": cursor.lastrowid,
            "run_id": run_id,
            "section_id": section_id,
            "text": text,
            "created_at": created_at,
        }


def get_comments_for_run(run_id: str) -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, run_id, section_id, text, created_at FROM comments WHERE run_id=? ORDER BY created_at",
            (run_id,),
        ).fetchall()
    return [dict(r) for r in rows]
