/**
 * API client for the CVC backend.
 * Uses relative paths — Vite proxy forwards to localhost:8000 in dev.
 */

const BASE = ''

export async function uploadCourse(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/audit`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
    throw new Error(err.detail || `Upload failed (${res.status})`)
  }
  return res.json()
}

export async function getRunStatus(runId) {
  const res = await fetch(`${BASE}/history/${runId}`)
  if (!res.ok) throw new Error(`Failed to fetch run ${runId}`)
  return res.json()
}

export async function getHistory() {
  const res = await fetch(`${BASE}/history`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function postComment(runId, sectionId, text) {
  const res = await fetch(`${BASE}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId, section_id: sectionId, text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to save comment' }))
    throw new Error(err.detail || 'Failed to save comment')
  }
  return res.json()
}

export async function getComments(runId) {
  const res = await fetch(`${BASE}/comments/${runId}`)
  if (!res.ok) throw new Error('Failed to fetch comments')
  return res.json()
}
