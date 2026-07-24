import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRunStatus, getComments, postComment } from '../api'

const SECTION_MAP = {
  '1': 'Policies & Support',
  '2': 'Course Structure',
  '3': 'Regular & Substantive Interaction',
  '4': 'Assessments',
}

const RATING_LABELS = {
  exceptional: 'Exceptional',
  aligned: 'Aligned',
  approaching: 'Approaching',
  incomplete: 'Incomplete',
  not_evaluable: 'Could not assess',
}

const SEVERITY_LABELS = {
  error: 'Error',
  warning: 'Warning',
  info: 'Info',
}

export default function Results() {
  const { runId } = useParams()
  const [run, setRun] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState({})
  const [comments, setComments] = useState({})

  useEffect(() => {
    let interval
    const fetchRun = async () => {
      try {
        const data = await getRunStatus(runId)
        setRun(data)
        if (data.status === 'complete' || data.status === 'error') {
          setLoading(false)
          clearInterval(interval)
        }
      } catch {
        setLoading(false)
      }
    }
    fetchRun()
    interval = setInterval(fetchRun, 2000)
    return () => clearInterval(interval)
  }, [runId])

  // Load existing comments
  useEffect(() => {
    if (!runId) return
    getComments(runId)
      .then((data) => {
        const grouped = {}
        for (const c of data) {
          if (!grouped[c.section_id]) grouped[c.section_id] = []
          grouped[c.section_id].push(c)
        }
        setComments(grouped)
      })
      .catch(() => {})
  }, [runId])

  const handleCommentAdded = useCallback((sectionId, comment) => {
    setComments((prev) => ({
      ...prev,
      [sectionId]: [...(prev[sectionId] || []), comment],
    }))
  }, [])

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  if (loading || !run) {
    return (
      <div className="results-loading">
        <div className="spinner small" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="spinner-svg"><circle cx="50" cy="50" r="40" /></svg>
        </div>
        <p aria-live="polite">Loading results…</p>
      </div>
    )
  }

  if (run.status === 'error') {
    return (
      <div className="results-error">
        <h2>Analysis Failed</h2>
        <p className="error-message">{run.error || 'An unexpected error occurred.'}</p>
        <Link to="/" className="retry-link">Try another file</Link>
      </div>
    )
  }

  const report = run.report
  if (!report) return <p>No report data available.</p>

  const { summary, rubric_findings = [], accessibility_findings = [] } = report
  const courseTitle = report.meta?.course_title || 'Course'

  // Group rubric findings by section
  const rubricBySections = {}
  for (const f of rubric_findings) {
    const sectionId = f.section_id || f.element_id?.split('.')[0] || '?'
    if (!rubricBySections[sectionId]) rubricBySections[sectionId] = []
    rubricBySections[sectionId].push(f)
  }

  // Group accessibility findings by severity
  const a11yErrors = accessibility_findings.filter((f) => f.severity === 'error')
  const a11yWarnings = accessibility_findings.filter((f) => f.severity === 'warning')
  const a11yInfo = accessibility_findings.filter((f) => f.severity === 'info')

  return (
    <div className="results-view">
      <header className="results-header">
        <h1>{courseTitle}</h1>
        <p className="results-meta">
          Analyzed {report.meta?.analyzed_at ? new Date(report.meta.analyzed_at).toLocaleString() : ''}
          {report.meta?.duration_seconds ? ` · ${report.meta.duration_seconds.toFixed(1)}s` : ''}
        </p>
      </header>

      {/* Alignment Score Circle */}
      {summary && <ScoreCircle score={summary.alignment_score} />}

      {/* Rubric Summary Cards */}
      {summary && rubric_findings.length > 0 && (
        <section className="summary-cards" aria-label="Rubric summary">
          <SummaryCard label="Aligned" count={(summary.aligned_count || 0) + (summary.exceptional_count || 0)} type="success" />
          <SummaryCard label="Approaching" count={summary.approaching_count || 0} type="warn" />
          <SummaryCard label="Incomplete" count={summary.incomplete_count || 0} type="danger" />
          <SummaryCard label="Not Evaluable" count={summary.not_evaluable_count || 0} type="muted" />
        </section>
      )}

      {/* Rubric Findings by Section */}
      {rubric_findings.length > 0 && (
        <section className="findings-section">
          <h2>Rubric Findings</h2>
          {Object.entries(rubricBySections).sort(([a], [b]) => a.localeCompare(b)).map(([sectionId, findings]) => (
            <div key={sectionId}>
              <CollapsibleSection
                title={SECTION_MAP[sectionId] || `Section ${sectionId}`}
                expanded={expandedSections[`rubric-${sectionId}`] !== false}
                onToggle={() => toggleSection(`rubric-${sectionId}`)}
              >
                {findings.map((f) => (
                  <RubricFindingCard key={f.element_id} finding={f} />
                ))}
              </CollapsibleSection>
              <CommentBox
                runId={runId}
                sectionId={sectionId}
                comments={comments[sectionId] || []}
                onCommentAdded={handleCommentAdded}
              />
            </div>
          ))}
        </section>
      )}

      {/* Accessibility Features Section */}
      {accessibility_findings.length > 0 && (
        <section className="findings-section">
          <h2>Accessibility Features</h2>
          <div className="summary-cards a11y-summary" aria-label="Accessibility summary">
            <SummaryCard label="A11y Errors" count={summary?.accessibility_errors || 0} type="danger" />
            <SummaryCard label="A11y Warnings" count={summary?.accessibility_warnings || 0} type="warn" />
          </div>
          {a11yErrors.length > 0 && (
            <CollapsibleSection
              title={`Errors (${a11yErrors.length})`}
              expanded={expandedSections['a11y-error'] !== false}
              onToggle={() => toggleSection('a11y-error')}
            >
              {a11yErrors.map((f, i) => <A11yFindingCard key={i} finding={f} />)}
            </CollapsibleSection>
          )}
          {a11yWarnings.length > 0 && (
            <CollapsibleSection
              title={`Warnings (${a11yWarnings.length})`}
              expanded={expandedSections['a11y-warning']}
              onToggle={() => toggleSection('a11y-warning')}
            >
              {a11yWarnings.map((f, i) => <A11yFindingCard key={i} finding={f} />)}
            </CollapsibleSection>
          )}
          {a11yInfo.length > 0 && (
            <CollapsibleSection
              title={`Info (${a11yInfo.length})`}
              expanded={expandedSections['a11y-info']}
              onToggle={() => toggleSection('a11y-info')}
            >
              {a11yInfo.map((f, i) => <A11yFindingCard key={i} finding={f} />)}
            </CollapsibleSection>
          )}
        </section>
      )}

      {accessibility_findings.length === 0 && rubric_findings.length === 0 && (
        <p className="no-findings">No findings to report.</p>
      )}
    </div>
  )
}

/* ---------- Score Circle ---------- */

function ScoreCircle({ score }) {
  const isNA = score === null || score === undefined
  const displayText = isNA ? 'N/A' : `${score}%`
  const ariaLabel = isNA
    ? 'Course alignment score: not available'
    : `Course alignment score: ${score} percent`

  let colorClass = 'score-muted'
  if (!isNA) {
    if (score >= 80) colorClass = 'score-green'
    else if (score >= 50) colorClass = 'score-amber'
    else colorClass = 'score-red'
  }

  // SVG circle params
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const progress = isNA ? 0 : score / 100
  const offset = circumference * (1 - progress)

  return (
    <div className="score-circle-wrapper" aria-label={ariaLabel} role="img">
      <svg className="score-circle-svg" viewBox="0 0 180 180" width="180" height="180">
        <circle
          className="score-circle-bg"
          cx="90" cy="90" r={radius}
          fill="none" strokeWidth="12"
        />
        {!isNA && (
          <circle
            className={`score-circle-fg ${colorClass}`}
            cx="90" cy="90" r={radius}
            fill="none" strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 90 90)"
          />
        )}
      </svg>
      <div className={`score-circle-text ${colorClass}`}>
        <span className="score-value">{displayText}</span>
      </div>
      <p className="score-label">Course Alignment</p>
    </div>
  )
}

/* ---------- Comment Box ---------- */

function CommentBox({ runId, sectionId, comments, onCommentAdded }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    setError('')
    try {
      const saved = await postComment(runId, sectionId, trimmed)
      onCommentAdded(sectionId, saved)
      setText('')
    } catch (err) {
      setError(err.message || 'Failed to send. Try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="comment-box">
      {comments.length > 0 && (
        <div className="comment-list">
          {comments.map((c) => (
            <div key={c.id} className="comment-item">
              <p className="comment-text">{c.text}</p>
              <span className="comment-time">{new Date(c.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <form className="comment-input-row" onSubmit={handleSubmit}>
        <label htmlFor={`comment-${sectionId}`} className="visually-hidden">
          Add a comment for {SECTION_MAP[sectionId] || `Section ${sectionId}`}
        </label>
        <input
          id={`comment-${sectionId}`}
          type="text"
          className="comment-input"
          placeholder="Add a note about this section…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          type="submit"
          className="comment-send-btn"
          aria-label="Send comment"
          disabled={sending || !text.trim()}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
      {error && <p className="comment-error">{error}</p>}
    </div>
  )
}

/* ---------- Shared components ---------- */

function SummaryCard({ label, count, type }) {
  return (
    <div className={`summary-card ${type}`}>
      <span className="summary-count">{count}</span>
      <span className="summary-label">{label}</span>
    </div>
  )
}

function CollapsibleSection({ title, expanded, onToggle, children }) {
  return (
    <div className="collapsible-section">
      <button
        className="collapsible-header"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="collapsible-title">{title}</span>
        <span className="collapsible-chevron">{expanded ? '▾' : '▸'}</span>
      </button>
      {expanded && <div className="collapsible-body">{children}</div>}
    </div>
  )
}

function RubricFindingCard({ finding }) {
  const rating = finding.rating || 'not_evaluable'
  return (
    <div className={`finding-card rubric-card rating-${rating}`}>
      <div className="finding-header">
        <span className="finding-element">{finding.element_id} — {finding.element_title}</span>
        <span className={`rating-badge ${rating}`}>{RATING_LABELS[rating] || rating}</span>
      </div>
      {finding.suggested_fix && (
        <div className="suggested-fix">
          <strong>Suggested fix:</strong> {finding.suggested_fix}
        </div>
      )}
      {finding.missing_items?.length > 0 && (
        <div className="missing-items">
          <strong>Missing:</strong> {finding.missing_items.join('; ')}
        </div>
      )}
      {finding.evidence_quotes?.length > 0 && (
        <details className="evidence-details">
          <summary>Evidence ({finding.evidence_quotes.length})</summary>
          <ul>
            {finding.evidence_quotes.map((eq, i) => (
              <li key={i}><q>{eq.quote}</q> — <em>{eq.page_title}</em></li>
            ))}
          </ul>
        </details>
      )}
      {finding.reasoning && (
        <details className="reasoning-details">
          <summary>Reasoning</summary>
          <p>{finding.reasoning}</p>
        </details>
      )}
    </div>
  )
}

function A11yFindingCard({ finding }) {
  return (
    <div className={`finding-card a11y-card severity-${finding.severity}`}>
      <div className="finding-header">
        <span className="finding-check-id">{finding.check_id}</span>
        <span className="finding-page">{finding.page_title}</span>
        <span className={`severity-badge ${finding.severity}`}>
          {SEVERITY_LABELS[finding.severity]}
        </span>
      </div>
      <p className="finding-message">{finding.message}</p>
      {finding.remediation && (
        <div className="suggested-fix">
          <strong>Fix:</strong> {finding.remediation}
        </div>
      )}
      {finding.occurrences && (
        <p className="finding-occurrences">{finding.occurrences} occurrences</p>
      )}
      {finding.affected_pages?.length > 0 && (
        <details className="affected-details">
          <summary>Affected items ({finding.affected_pages.length})</summary>
          <ul>
            {finding.affected_pages.map((ap, i) => (
              <li key={i}>{ap.page_title || ap.video_url || ap.page_id}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
