'use client';

import React, { useState } from 'react';
import { EvaluationResult } from '@/types/pocr';
import { X, Copy, Check, Sparkles, BookOpen, AlertCircle, Wrench, FileCode, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface InspectorPanelProps {
  evaluation: EvaluationResult | null;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  evaluation,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'remediation' | 'code' | 'guidance'>('remediation');

  if (!evaluation) return null;

  const handleCopy = () => {
    const textToCopy = activeTab === 'code' && evaluation.remediationCode
      ? evaluation.remediationCode
      : evaluation.remediationText;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (evaluation.status) {
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" /> Aligned
          </span>
        );
      case 'Approaching':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-4 h-4" /> Approaching
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-4 h-4" /> Action Required
          </span>
        );
    }
  };

  return (
    <aside className="w-full lg:w-[480px] shrink-0 glass-panel border-l border-slate-800 h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-900/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {evaluation.standardCode}
            </span>
            <span className="text-xs text-slate-400">{evaluation.section}</span>
          </div>
          <h2 className="text-base font-bold text-slate-100">
            {evaluation.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-800 px-5 bg-slate-900/40">
        <button
          onClick={() => setActiveTab('remediation')}
          className={`flex items-center gap-2 py-3 px-1 text-xs font-semibold border-b-2 transition ${
            activeTab === 'remediation'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Remediation Text
        </button>
        {evaluation.remediationCode && (
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'code'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Canvas HTML Fix
          </button>
        )}
        <button
          onClick={() => setActiveTab('guidance')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'guidance'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          CVC Rubric Guidance
        </button>
      </div>

      {/* Main Inspector Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Status & Summary Card */}
        <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              Audit Status
            </span>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {evaluation.summary}
          </p>
        </div>

        {/* Tab Content 1: Remediation Text */}
        {activeTab === 'remediation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>Suggested Remediation Content</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Remediation Text'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap">
              {evaluation.remediationText}
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Copy and paste this text directly into your Canvas course syllabus, module page, or assignment description.
            </p>
          </div>
        )}

        {/* Tab Content 2: HTML Code Fix */}
        {activeTab === 'code' && evaluation.remediationCode && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <span>Accessible HTML Snippet</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied HTML!' : 'Copy HTML Code'}</span>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-emerald-300 border border-slate-800 overflow-x-auto whitespace-pre">
              <code>{evaluation.remediationCode}</code>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              * Switch Canvas Rich Content Editor to HTML View and paste this corrected tag snippet.
            </p>
          </div>
        )}

        {/* Tab Content 3: CVC Guidance */}
        {activeTab === 'guidance' && (
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              Official June 2026 CCC POCR Standard Guidance
            </h4>
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
              Official CCC CVC rubric requirement: Ensure course materials provide transparent instructional scaffolding, equitable learning access, and full WCAG 2.1 AA accessibility compliance.
            </div>
          </div>
        )}

        {/* Affected Canvas Items Breakdown */}
        {evaluation.affectedItems.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              Impacted Canvas Items ({evaluation.affectedItems.length})
            </h4>

            <div className="space-y-2">
              {evaluation.affectedItems.map((item, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
                    <span>{item.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{item.location}</span>
                  </div>
                  {item.issueType && (
                    <p className="text-xs text-rose-300 font-medium">
                      • {item.issueType}
                    </p>
                  )}
                  {item.snippet && (
                    <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-slate-400 border border-slate-850 overflow-x-auto">
                      <code>{item.snippet}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </aside>
  );
};
