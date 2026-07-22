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
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Likely Compliant (Manual)
          </span>
        );
      case 'NON_COMPLIANT_AUTO_CAPTIONS':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#F8E14B] text-slate-950 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" /> Auto Captions (ASR Only)
          </span>
        );
      case 'NON_COMPLIANT_MISSING_CAPTIONS':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FF6B35] text-white shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> Missing Captions
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
            <HelpCircle className="w-3.5 h-3.5 text-blue-700" /> Needs Manual Review
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FF6B35] text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
              <Youtube className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                YouTube & Video Caption Accessibility Report
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                FastAPI Batch Pipeline • WCAG 2.1 AA & June 2027 CVC POCR Standard 2.5
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-950 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block text-2xl font-black text-slate-950 font-mono">{report.summary.total_videos_found}</span>
            <span className="text-[11px] font-bold text-slate-500">Total Videos</span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="block text-2xl font-black text-emerald-600 font-mono">{report.summary.compliant_count}</span>
            <span className="text-[11px] font-bold text-emerald-800">Compliant</span>
          </div>
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="block text-2xl font-black text-[#FF6B35] font-mono">{report.summary.non_compliant_count}</span>
            <span className="text-[11px] font-bold text-amber-900">Non-Compliant</span>
          </div>
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <span className="block text-2xl font-black text-blue-600 font-mono">{report.summary.manual_review_count}</span>
            <span className="text-[11px] font-bold text-blue-900">Manual Review</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <span className="text-xs font-bold uppercase text-slate-500 mr-2">Filter:</span>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filterStatus === 'ALL' ? 'bg-[#18181B] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All Videos ({report.results.length})
          </button>
          <button
            onClick={() => setFilterStatus('NON_COMPLIANT_AUTO_CAPTIONS')}
            className={`px-4 py-1.5 rounded-full text-xs font-black transition ${
              filterStatus === 'NON_COMPLIANT_AUTO_CAPTIONS' ? 'bg-[#F8E14B] text-slate-950 shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Auto Captions (ASR Only)
          </button>
          <button
            onClick={() => setFilterStatus('NON_COMPLIANT_MISSING_CAPTIONS')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              filterStatus === 'NON_COMPLIANT_MISSING_CAPTIONS' ? 'bg-[#FF6B35] text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Missing Captions
          </button>
        </div>

        {/* Results List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {filteredResults.map((res, idx) => (
            <div key={idx} className="p-5 rounded-[24px] bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 truncate">
                  <Youtube className="w-4 h-4 text-[#FF6B35] shrink-0" />
                  <a
                    href={res.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono font-bold text-[#6320EE] hover:underline truncate inline-flex items-center gap-1"
                  >
                    <span>{res.original_url}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                {getStatusBadge(res.status)}
              </div>

              <div className="text-xs text-slate-700 font-medium">
                <strong className="text-slate-950 font-bold">Found in:</strong> {res.found_in_locations.join(', ')}
              </div>

              <div className="p-3.5 rounded-2xl bg-white text-xs text-slate-800 border border-slate-200">
                <strong className="text-[#FF6B35] block mb-1 font-bold">Accessibility Recommendation:</strong>
                <p className="font-medium">{res.recommendation}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
