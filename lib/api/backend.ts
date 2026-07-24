/* Typed client for the FastAPI audit backend (backend/main.py).
   Browser calls go through the /api/backend proxy configured in
   next.config.ts so no CORS or hardcoded origins reach the client;
   server components call the backend origin directly. */

export type BackendRunStatus = "processing" | "complete" | "error";
export type BackendRating =
  | "incomplete"
  | "approaching"
  | "aligned"
  | "exceptional"
  | "not_evaluable";
export type BackendSeverity = "error" | "warning" | "info";

export interface BackendEvidenceQuote {
  quote: string;
  page_id: string;
  page_title: string;
}

export interface BackendRubricFinding {
  element_id: string;
  element_title: string;
  section_id: string;
  section_title: string;
  rating: BackendRating;
  confidence: number;
  evidence_quotes: BackendEvidenceQuote[];
  missing_items: string[];
  suggested_fix: string;
  reasoning: string;
  error_note: string | null;
}

export interface BackendAffectedPage {
  page_id?: string;
  page_title?: string;
  video_url?: string;
  count?: number;
}

export interface BackendAccessibilityFinding {
  check_id: string;
  severity: BackendSeverity;
  page_id: string;
  page_title: string;
  element_snippet: string;
  message: string;
  remediation: string;
  occurrences?: number | null;
  affected_pages?: BackendAffectedPage[] | null;
}

export interface BackendReportSummary {
  exceptional_count: number;
  aligned_count: number;
  approaching_count: number;
  incomplete_count: number;
  not_evaluable_count: number;
  alignment_score?: number | null;
  accessibility_errors: number;
  accessibility_warnings: number;
  accessibility_info: number;
}

export interface BackendReport {
  meta: {
    course_title: string;
    analyzed_at: string;
    rubric_version: string;
    prompt_version: string;
    duration_seconds: number;
  };
  summary: BackendReportSummary;
  rubric_findings: BackendRubricFinding[];
  accessibility_findings: BackendAccessibilityFinding[];
  errors: { stage: string; element_id?: string | null; message: string }[];
}

export interface BackendRunListItem {
  run_id: string;
  course_title: string;
  created_at: string;
  status: BackendRunStatus;
  error: string | null;
  summary: BackendReportSummary | null;
}

export interface BackendRun {
  run_id: string;
  course_title: string;
  created_at: string;
  status: BackendRunStatus;
  error: string | null;
  report: BackendReport | null;
}

export interface BackendComment {
  id: number;
  run_id: string;
  section_id: string;
  text: string;
  created_at: string;
}

function apiBase(): string {
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL ?? "http://localhost:8001";
  }
  return "/api/backend";
}

/* Cartridges run to hundreds of megabytes, and Next buffers a proxied body
   in memory before forwarding it, so uploads go straight to the backend
   (its CORS config already allows this origin). Everything else stays on
   the same-origin proxy. */
function uploadBase(): string {
  if (typeof window === "undefined") {
    return process.env.BACKEND_URL ?? "http://localhost:8001";
  }
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8001";
}

async function throwDetail(res: Response, fallback: string): Promise<never> {
  const detail = await res
    .json()
    .then((body: { detail?: string }) => body.detail)
    .catch(() => undefined);
  throw new Error(detail || `${fallback} (${res.status})`);
}

export async function startAudit(file: File): Promise<{ run_id: string }> {
  const form = new FormData();
  form.append("file", file);
  let res: Response;
  try {
    res = await fetch(`${uploadBase()}/audit`, { method: "POST", body: form });
  } catch {
    throw new Error(
      "Could not reach the analysis backend. Check that it is running, then try again.",
    );
  }
  if (!res.ok) await throwDetail(res, "Upload failed");
  return res.json();
}

export async function listRuns(): Promise<BackendRunListItem[]> {
  const res = await fetch(`${apiBase()}/history`, { cache: "no-store" });
  if (!res.ok) await throwDetail(res, "Could not load audit history");
  return res.json();
}

export async function getRun(runId: string): Promise<BackendRun | null> {
  const res = await fetch(`${apiBase()}/history/${runId}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) await throwDetail(res, "Could not load audit run");
  return res.json();
}

export async function deleteRun(runId: string): Promise<void> {
  const res = await fetch(`${apiBase()}/history/${runId}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 404) {
    await throwDetail(res, "Could not delete this audit");
  }
}

export async function listComments(runId: string): Promise<BackendComment[]> {
  const res = await fetch(`${apiBase()}/comments/${runId}`, {
    cache: "no-store",
  });
  if (!res.ok) await throwDetail(res, "Could not load comments");
  return res.json();
}

export async function postComment(
  runId: string,
  sectionId: string,
  text: string,
): Promise<BackendComment> {
  const res = await fetch(`${apiBase()}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ run_id: runId, section_id: sectionId, text }),
  });
  if (!res.ok) await throwDetail(res, "Could not save comment");
  return res.json();
}
