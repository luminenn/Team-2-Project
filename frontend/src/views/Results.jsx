import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getRunStatus } from '../api'

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

      {/* Summary Cards */}
      <section className="summary-cards" aria-label="Results summary">
        {summary && (
          <>
            {rubric_findings.length > 0 && (
              <>
                <SummaryCard label="Aligned" count={summary.aligned_count || 0} type="success" />
                <SummaryCard label="Approaching" count={summary.approaching_count || 0} type="warn" />
                <SummaryCard label="Incomplete" count={summary.incomplete_count || 0} type="danger" />
                <SummaryCard label="Not Evaluable" count={summary.not_evaluable_count || 0} type="muted" />
              </>
            )}
            <SummaryCard label="A11y Errors" count={summary.accessibility_errors || 0} type="danger" />
            <SummaryCard label="A11y Warnings" count={summary.accessibility_warnings || 0} type="warn" />
          </>
        )}
      </section>

      {/* Rubric Findings by Section */}
      {rubric_findings.length > 0 && (
        <section className="findings-section">
          <h2>Rubric Findings</h2>
          {Object.entries(rubricBySections).sort(([a], [b]) => a.localeCompare(b)).map(([sectionId, findings]) => (
            <CollapsibleSection
              key={sectionId}
              title={SECTION_MAP[sectionId] || `Section ${sectionId}`}
              expanded={expandedSections[`rubric-${sectionId}`] !== false}
              onToggle={() => toggleSection(`rubric-${sectionId}`)}
            >
              {findings.map((f) => (
                <RubricFindingCard key={f.element_id} finding={f} />
              ))}
            </CollapsibleSection>
          ))}
        </section>
      )}

      {/* Accessibility Findings */}
      {accessibility_findings.length > 0 && (
        <section className="findings-section">
          <h2>Accessibility Findings</h2>
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
      {finding.element_snippet && (
        <details className="snippet-details">
          <summary>Code snippet</summary>
          <code className="snippet">{finding.element_snippet}</code>
        </details>
      )}
    </div>
  )
}
