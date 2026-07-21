'use client';

import React from 'react';
import { PocrSection, AlignmentStatus, CourseAuditReport } from '@/types/pocr';
import { LayoutGrid, FileText, Layers, Users, CheckSquare, Eye, Search, CheckCircle2, AlertTriangle, XCircle, Sparkles } from 'lucide-react';

interface RubricNavProps {
  activeSection: string;
  activeStatusFilter: string;
  searchQuery: string;
  report: CourseAuditReport;
  onSelectSection: (section: string) => void;
  onSelectStatusFilter: (status: string) => void;
  onSearchChange: (query: string) => void;
}

export const RubricNav: React.FC<RubricNavProps> = ({
  activeSection,
  activeStatusFilter,
  searchQuery,
  report,
  onSelectSection,
  onSelectStatusFilter,
  onSearchChange
}) => {

  const sections = [
    { id: 'ALL', name: 'All Rubric Standards', icon: LayoutGrid, count: report.evaluations.length },
    { id: 'Section 1', name: '1. Course Policies & Support', icon: FileText, count: report.evaluations.filter(e => e.section === 'Section 1').length },
    { id: 'Section 2', name: '2. Structure & Objectives', icon: Layers, count: report.evaluations.filter(e => e.section === 'Section 2').length },
    { id: 'Section 3', name: '3. RSI & Instructor Presence', icon: Users, count: report.evaluations.filter(e => e.section === 'Section 3').length },
    { id: 'Section 4', name: '4. Assessment & Rubrics', icon: CheckSquare, count: report.evaluations.filter(e => e.section === 'Section 4').length },
    { id: 'Accessibility Verification', name: '5. Accessibility Deep-Dive', icon: Eye, count: report.evaluations.filter(e => e.section === 'Accessibility Verification').length },
  ];

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
      
      {/* Course Summary Widget */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider text-[11px] font-mono">
            POCR Alignment Metrics
          </h2>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-semibold border border-blue-500/20">
            {report.overallScore}% Score
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="w-full h-2.5 rounded-full bg-slate-900 overflow-hidden flex">
            <div 
              style={{ width: `${(report.alignedCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-emerald-500 transition-all duration-500" 
              title={`${report.alignedCount} Aligned`}
            />
            <div 
              style={{ width: `${(report.approachingCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-amber-500 transition-all duration-500" 
              title={`${report.approachingCount} Approaching`}
            />
            <div 
              style={{ width: `${(report.incompleteCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-rose-500 transition-all duration-500" 
              title={`${report.incompleteCount} Incomplete`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{report.alignedCount} Aligned</span>
            <span>{report.approachingCount} Approaching</span>
            <span>{report.incompleteCount} Incomplete</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Aligned' ? 'ALL' : 'Aligned')}
            className={`p-2.5 rounded-xl border text-center transition-all ${
              activeStatusFilter === 'Aligned' 
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{report.alignedCount}</span>
            </div>
            <div className="text-[10px] mt-0.5 font-medium">Aligned</div>
          </button>

          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Approaching' ? 'ALL' : 'Approaching')}
            className={`p-2.5 rounded-xl border text-center transition-all ${
              activeStatusFilter === 'Approaching' 
                ? 'bg-amber-500/15 border-amber-500/50 text-amber-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-amber-400 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{report.approachingCount}</span>
            </div>
            <div className="text-[10px] mt-0.5 font-medium">Approaching</div>
          </button>

          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Incomplete' ? 'ALL' : 'Incomplete')}
            className={`p-2.5 rounded-xl border text-center transition-all ${
              activeStatusFilter === 'Incomplete' 
                ? 'bg-rose-500/15 border-rose-500/50 text-rose-300' 
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-rose-400 text-xs font-semibold">
              <XCircle className="w-3.5 h-3.5" />
              <span>{report.incompleteCount}</span>
            </div>
            <div className="text-[10px] mt-0.5 font-medium">Incomplete</div>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter standards or keywords..."
          className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500/60 transition"
        />
      </div>

      {/* Section Navigation List */}
      <div className="space-y-1">
        <h3 className="px-3 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-2">
          POCR Rubric Navigation
        </h3>
        
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                <span className="truncate">{sec.name}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                isActive ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-slate-400'
              }`}>
                {sec.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* CVC Info Banner */}
      <div className="glass-card rounded-2xl p-3.5 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-slate-200">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>CVC POCR Philosophy</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          POCR-Bot slashes manual verification time from 10 hours down to 2–3 hours. Focus your expertise on instructional coaching and equity.
        </p>
      </div>

    </aside>
  );
};
