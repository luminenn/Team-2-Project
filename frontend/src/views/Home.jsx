import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadCourse, getRunStatus } from '../api'

export default function Home() {
  const [state, setState] = useState('idle') // idle | uploading | processing | error
  const [error, setError] = useState('')
  const [statusText, setStatusText] = useState('')
  const fileInputRef = useRef(null)
  const navigate = useNavigate()

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.imscc')) {
      setError('Please upload a .imscc file (Canvas Common Cartridge export).')
      setState('error')
      return
    }

    setError('')
    setState('uploading')
    setStatusText('Uploading course file…')

    try {
      const { run_id } = await uploadCourse(file)
      setState('processing')
      setStatusText('Analyzing…')
      pollForResult(run_id)
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.')
      setState('error')
    }
  }, [])

  const pollForResult = useCallback((runId) => {
    const interval = setInterval(async () => {
      try {
        const run = await getRunStatus(runId)
        if (run.status === 'complete') {
          clearInterval(interval)
          navigate(`/results/${runId}`)
        } else if (run.status === 'error') {
          clearInterval(interval)
          setError(run.error || 'Analysis failed. Please try a different file.')
          setState('error')
        } else {
          setStatusText('Analyzing against rubric…')
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, 2000)
  }, [navigate])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer?.files?.[0]
    handleFile(file)
  }, [handleFile])

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleClick = () => {
    if (state === 'uploading' || state === 'processing') return
    fileInputRef.current?.click()
  }

  const handleInputChange = (e) => {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  const handleRetry = () => {
    setState('idle')
    setError('')
    setStatusText('')
  }

  const isLoading = state === 'uploading' || state === 'processing'

  return (
    <div className="home-view">
      <div
        className={`upload-zone ${isLoading ? 'loading' : ''} ${state === 'error' ? 'has-error' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="button"
        tabIndex={0}
        aria-label="Upload course file"
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
      >
        {isLoading ? (
          <div className="spinner" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="spinner-svg">
              <circle cx="50" cy="50" r="40" />
            </svg>
          </div>
        ) : (
          <div className="upload-icon" aria-hidden="true">
            <svg viewBox="0 0 100 100" className="plus-svg">
              <line x1="50" y1="25" x2="50" y2="75" />
              <line x1="25" y1="50" x2="75" y2="50" />
            </svg>
          </div>
        )}
      </div>

      <div className="upload-label" aria-live="polite" aria-atomic="true">
        {state === 'idle' && <p>Upload course file</p>}
        {isLoading && <p className="status-text">{statusText}</p>}
        {state === 'error' && (
          <div className="error-state">
            <p className="error-message">{error}</p>
            <button className="retry-btn" onClick={handleRetry}>Try again</button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".imscc"
        onChange={handleInputChange}
        className="visually-hidden"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  )
}
