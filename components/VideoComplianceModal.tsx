'use client';

import React, { useState } from 'react';
import { X, Youtube, CheckCircle2, AlertTriangle, XCircle, Search, ExternalLink, HelpCircle } from 'lucide-react';

interface VideoResultItem {
  youtube_video_id?: string;
  provider?: string;
  original_url: string;
  found_in_locations: string[];
  status: string; // NON_COMPLIANT_MISSING_CAPTIONS | NON_COMPLIANT_AUTO_CAPTIONS | LIKELY_COMPLIANT | NEEDS_MANUAL_REVIEW
  flag_level: string;
  caption_details?: {
    has_captions: boolean;
    is_auto_generated: boolean;
    language: string;
  };
  recommendation: string;
}

interface VideoReportSummary {
  total_videos_found: number;
  youtube_videos: number;
  non_youtube_videos: number;
  cached_hits: number;
  api_queries_made: number;
  compliant_count: number;
  non_compliant_count: number;
  manual_review_count: number;
}

interface VideoComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData?: {
    summary: VideoReportSummary;
    results: VideoResultItem[];
  } | null;
}

export const VideoComplianceModal: React.FC<VideoComplianceModalProps> = ({
  isOpen,
  onClose,
  reportData
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  if (!isOpen) return null;

  // Fallback mock report if none provided
  const report = reportData || {
    summary: {
      total_videos_found: 4,
      youtube_videos: 3,
      non_youtube_videos: 1,
      cached_hits: 2,
      api_queries_made: 1,
      compliant_count: 1,
      non_compliant_count: 2,
      manual_review_count: 1
    },
    results: [
      {
        youtube_video_id: 'dQw4w9WgXcQ',
        original_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        found_in_locations: ['pages/module-1-overview.html', 'assignments/week-1-discussion.html'],
        status: 'NON_COMPLIANT_AUTO_CAPTIONS',
        flag_level: 'WARNING',
        caption_details: {
          has_captions: true,
          is_auto_generated: true,
          language: 'en'
        },
        recommendation: 'Replace or edit automatic speech recognition (ASR) captions with a verified human caption track.'
      },
      {
        youtube_video_id: 'abc123xyz89',
        original_url: 'https://www.youtube.com/embed/abc123xyz89',
        found_in_locations: ['pages/lecture-2.html'],
        status: 'NON_COMPLIANT_MISSING_CAPTIONS',
        flag_level: 'CRITICAL',
        caption_details: {
          has_captions: false,
          is_auto_generated: false,
          language: 'en'
        },
        recommendation: 'No closed captions detected. Add accurate human-edited closed captions or a transcript link.'
      },
      {
        youtube_video_id: 'yt_compliant_1',
        original_url: 'https://www.youtube.com/watch?v=yt_compliant_1?cc_load_policy=1',
        found_in_locations: ['pages/syllabus.html'],
        status: 'LIKELY_COMPLIANT',
        flag_level: 'INFO',
        caption_details: {
          has_captions: true,
          is_auto_generated: false,
          language: 'en'
        },
        recommendation: 'Manually verified human caption track detected.'
      },
      {
        provider: 'vimeo',
        original_url: 'https://vimeo.com/123456789',
        found_in_locations: ['pages/welcome.html'],
        status: 'NEEDS_MANUAL_REVIEW',
        flag_level: 'INFO',
        recommendation: 'Non-YouTube media source (VIMEO) detected. Manually verify caption accuracy in Vimeo.'
      }
    ]
  };

  const filteredResults = report.results.filter(r => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LIKELY_COMPLIANT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Likely Compliant
          </span>
        );
      case 'NON_COMPLIANT_AUTO_CAPTIONS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Auto-Generated Captions (ASR)
          </span>
        );
      case 'NON_COMPLIANT_MISSING_CAPTIONS':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Missing Captions
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <HelpCircle className="w-3.5 h-3.5" /> Needs Manual Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                YouTube & Video Caption Accessibility Report
              </h2>
              <p className="text-xs text-slate-400">
                FastAPI Batch Pipeline • WCAG 2.1 AA & June 2027 CVC POCR Standard 2.5
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
            <span className="block text-xl font-bold text-slate-100 font-mono">{report.summary.total_videos_found}</span>
            <span className="text-[11px] text-slate-400">Total Videos Scanned</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="block text-xl font-bold text-emerald-400 font-mono">{report.summary.compliant_count}</span>
            <span className="text-[11px] text-emerald-300">Compliant Captions</span>
          </div>
          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20">
            <span className="block text-xl font-bold text-rose-400 font-mono">{report.summary.non_compliant_count}</span>
            <span className="text-[11px] text-rose-300">Non-Compliant</span>
          </div>
          <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
            <span className="block text-xl font-bold text-blue-400 font-mono">{report.summary.manual_review_count}</span>
            <span className="text-[11px] text-blue-300">Manual Review</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="text-xs font-mono font-semibold uppercase text-slate-400 mr-2">Filter:</span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'ALL' ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40' : 'text-slate-400'
            }`}
          >
            All Videos ({report.results.length})
          </button>
          <button
            onClick={() => setFilterStatus('NON_COMPLIANT_AUTO_CAPTIONS')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'NON_COMPLIANT_AUTO_CAPTIONS' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400'
            }`}
          >
            Auto Captions (ASR)
          </button>
          <button
            onClick={() => setFilterStatus('NON_COMPLIANT_MISSING_CAPTIONS')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
              filterStatus === 'NON_COMPLIANT_MISSING_CAPTIONS' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400'
            }`}
          >
            Missing Captions
          </button>
        </div>

        {/* Results List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {filteredResults.map((res, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <Youtube className="w-4 h-4 text-rose-400 shrink-0" />
                  <a
                    href={res.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-blue-400 hover:underline truncate inline-flex items-center gap-1"
                  >
                    <span>{res.original_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {getStatusBadge(res.status)}
              </div>

              <div className="text-xs text-slate-300">
                <strong className="text-slate-400">Found in:</strong> {res.found_in_locations.join(', ')}
              </div>

              <div className="p-3 rounded-xl bg-slate-950 text-xs text-slate-200 border border-slate-850">
                <strong className="text-amber-400 block mb-1">Accessibility Recommendation:</strong>
                <p>{res.recommendation}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
