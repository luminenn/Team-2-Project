'use client';

import React from 'react';
import { EvaluationResult } from '@/types/pocr';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Wrench, Sparkles, Award } from 'lucide-react';

interface StandardCardProps {
  evaluation: EvaluationResult;
  isSelected: boolean;
  onSelect: (evalItem: EvaluationResult) => void;
}

export const StandardCard: React.FC<StandardCardProps> = ({
  evaluation,
  isSelected,
  onSelect
}) => {
  const getStatusBadge = () => {
    switch (evaluation.status) {
      case 'Exceptional':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-[#6320EE] text-white shadow-sm">
            <Award className="w-3.5 h-3.5" /> Exceptional
          </span>
        );
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aligned
          </span>
        );
      case 'Approaching':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-[#F8E14B] text-slate-950 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-950" /> Approaching
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FF6B35] text-white shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> Incomplete
          </span>
        );
    }
  };

  return (
    <div
      className={`group rounded-[28px] p-6 border transition-all duration-200 bg-white ${
        isSelected
          ? 'border-[#6320EE] ring-2 ring-[#6320EE]/40 shadow-xl'
          : 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
            {evaluation.standardCode}
          </span>
          <span className="text-xs font-bold text-slate-500">
            {evaluation.section}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="mt-3 space-y-2">
        <h3 className="text-base font-extrabold text-slate-950 group-hover:text-[#6320EE] transition">
          {evaluation.title}
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          {evaluation.summary}
        </p>
      </div>

      {/* Impacted Canvas Items */}
      {evaluation.affectedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Flagged Canvas Items ({evaluation.affectedItems.length})
          </h4>
          <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
            {evaluation.affectedItems.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{item.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono font-medium">{item.location}</span>
                </div>
                {item.issueType && (
                  <p className="text-[11px] text-[#FF6B35] font-bold">
                    • {item.issueType}
                  </p>
                )}
                {item.snippet && (
                  <div className="mt-1 p-2 rounded-xl bg-white font-mono text-[11px] text-slate-700 truncate border border-slate-200">
                    <code>{item.snippet}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Remediate Action */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {evaluation.autoFixAvailable && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6320EE]">
              <Wrench className="w-3.5 h-3.5" /> AI Remediation Ready
            </span>
          )}
        </div>

        <button
          onClick={() => onSelect(evaluation)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-[#18181B] hover:bg-slate-800 text-white transition duration-150 shadow-sm"
        >
          <span>Inspect & Remediate</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
