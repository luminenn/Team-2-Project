'use client';

import React, { useState } from 'react';
import { EvaluationResult } from '@/types/pocr';
import { X, Copy, Check, Sparkles, BookOpen, FileCode, CheckCircle2, AlertTriangle, XCircle, Award } from 'lucide-react';

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
      case 'Exceptional':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#6320EE] text-white shadow-sm">
            <Award className="w-4 h-4 text-white" /> Exceptional
          </span>
        );
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-white" /> Aligned
          </span>
        );
      case 'Approaching':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#F8E14B] text-slate-950 shadow-sm">
            <AlertTriangle className="w-4 h-4 text-slate-950" /> Approaching
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FF6B35] text-white shadow-sm">
            <XCircle className="w-4 h-4 text-white" /> Action Required
          </span>
        );
    }
  };

  return (
    <aside className="w-full lg:w-[500px] shrink-0 bg-white border-l border-slate-200 h-full flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 shadow-2xl">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
              {evaluation.standardCode}
            </span>
            <span className="text-xs font-bold text-slate-500">{evaluation.section}</span>
          </div>
          <h2 className="text-base font-extrabold text-slate-950">
            {evaluation.title}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-950 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-slate-200 px-5 bg-white">
        <button
          onClick={() => setActiveTab('remediation')}
          className={`flex items-center gap-2 py-3.5 px-2 text-xs font-bold border-b-2 transition ${
            activeTab === 'remediation'
              ? 'border-[#6320EE] text-[#6320EE]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Remediation Text
        </button>
        {evaluation.remediationCode && (
          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition ${
              activeTab === 'code'
                ? 'border-[#6320EE] text-[#6320EE]'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Canvas HTML Fix
          </button>
        )}
        <button
          onClick={() => setActiveTab('guidance')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition ${
            activeTab === 'guidance'
              ? 'border-[#6320EE] text-[#6320EE]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          CVC Rubric Guidance
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#F4F4F6]">
        
        {/* Status & Summary */}
        <div className="bg-white rounded-[24px] p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Audit Status
            </span>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed font-medium">
            {evaluation.summary}
          </p>
        </div>

        {/* Tab 1: AI Remediation */}
        {activeTab === 'remediation' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Sparkles className="w-4 h-4 text-[#6320EE]" />
                <span>Suggested Remediation Content</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#6320EE] hover:bg-purple-700 text-white transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-yellow-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy Remediation Text'}</span>
              </button>
            </div>

            <div className="p-5 rounded-[24px] bg-white border border-slate-200 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap shadow-sm">
              {evaluation.remediationText}
            </div>

            <p className="text-[11px] text-slate-500 italic font-medium">
              * Copy and paste this text directly into your Canvas course syllabus, module page, or assignment description.
            </p>
          </div>
        )}

        {/* Tab 2: HTML Fix */}
        {activeTab === 'code' && evaluation.remediationCode && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <FileCode className="w-4 h-4 text-emerald-600" />
                <span>Accessible HTML Snippet</span>
              </div>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied HTML!' : 'Copy HTML Code'}</span>
              </button>
            </div>

            <div className="p-5 rounded-[24px] bg-slate-950 font-mono text-xs text-emerald-300 border border-slate-800 overflow-x-auto whitespace-pre shadow-sm">
              <code>{evaluation.remediationCode}</code>
            </div>

            <p className="text-[11px] text-slate-500 italic font-medium">
              * Switch Canvas Rich Content Editor to HTML View and paste this corrected tag snippet.
            </p>
          </div>
        )}

        {/* Tab 3: Official CVC Rubric Guidance */}
        {activeTab === 'guidance' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#6320EE]" />
              June 2027 CCC POCR Official Rubric Criteria
            </h4>

            {evaluation.exceptionalGuidance && (
              <div className="p-5 rounded-[24px] bg-[#6320EE]/10 border border-[#6320EE]/30 text-xs text-purple-950 space-y-2">
                <span className="font-extrabold text-[#6320EE] block flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Exceptional Level Standard:
                </span>
                <p className="leading-relaxed font-medium">{evaluation.exceptionalGuidance}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </aside>
  );
};
