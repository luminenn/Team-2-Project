import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getHistory } from '../api'

export default function History() {
  const [runs, setRuns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then(setRuns)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="history-loading"><p>Loading history…</p></div>
  }

  if (runs.length === 0) {
    return (
      <div className="history-empty">
        <h2>No audit history yet</h2>
        <p>Upload a course file to get started.</p>
        <Link to="/" className="empty-cta">Go to Home</Link>
      </div>
    )
  }

  return (
    <div className="history-view">
      <h1>Audit History</h1>
      <div className="history-table" role="table" aria-label="Audit history">
        <div className="history-header" role="row">
          <span role="columnheader">Course</span>
          <span role="columnheader">Date</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Errors</span>
        </div>
        {runs.map((run) => (
          <Link
            key={run.run_id}
            to={run.status === 'complete' ? `/results/${run.run_id}` : '#'}
            className={`history-row ${run.status}`}
            role="row"
          >
            <span className="history-cell course-title">
              {run.course_title || 'Processing…'}
            </span>
            <span className="history-cell date">
              {run.created_at ? new Date(run.created_at).toLocaleString() : '—'}
            </span>
            <span className="history-cell status">
              <StatusBadge status={run.status} />
            </span>
            <span className="history-cell errors">
              {run.summary ? (run.summary.accessibility_errors || 0) : '—'}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const labels = {
    complete: 'Complete',
    processing: 'Processing',
    error: 'Failed',
  }
  return <span className={`status-badge ${status}`}>{labels[status] || status}</span>
}
