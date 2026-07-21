'use client';

import React from 'react';
import { EvaluationResult } from '@/types/pocr';
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight, Code, AlertCircle, Wrench } from 'lucide-react';

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
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Aligned
          </span>
        );
      case 'Approaching':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Approaching
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Incomplete
          </span>
        );
    }
  };

  return (
    <div
      className={`group glass-card rounded-2xl p-5 border transition-all duration-200 ${
        isSelected
          ? 'border-blue-500/80 bg-slate-900/90 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/40'
          : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {evaluation.standardCode}
          </span>
          <span className="text-xs font-medium text-slate-400">
            {evaluation.section}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="mt-3 space-y-2">
        <h3 className="text-base font-semibold text-slate-100 group-hover:text-blue-300 transition">
          {evaluation.title}
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          {evaluation.summary}
        </p>
      </div>

      {/* Affected Canvas Items Summary */}
      {evaluation.affectedItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Flagged Items ({evaluation.affectedItems.length})
          </h4>
          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {evaluation.affectedItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between font-medium text-slate-200">
                  <span>{item.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{item.location}</span>
                </div>
                {item.issueType && (
                  <p className="text-[11px] text-rose-300/90 font-medium">
                    • {item.issueType}
                  </p>
                )}
                {item.snippet && (
                  <div className="mt-1 p-1.5 rounded bg-slate-900 font-mono text-[11px] text-slate-400 truncate border border-slate-800">
                    <code>{item.snippet}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer / Remediate Action */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {evaluation.autoFixAvailable && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400">
              <Wrench className="w-3 h-3" /> AI Remediation Ready
            </span>
          )}
        </div>

        <button
          onClick={() => onSelect(evaluation)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition duration-150"
        >
          <span>Inspect & Remediate</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
