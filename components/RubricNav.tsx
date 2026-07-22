'use client';

import React from 'react';
import { CourseAuditReport } from '@/types/pocr';
import { LayoutGrid, FileText, Layers, Users, CheckSquare, Eye, Search, CheckCircle2, AlertTriangle, XCircle, Award } from 'lucide-react';

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
    { id: 'ALL', name: 'All 19 POCR Standards', icon: LayoutGrid, count: report.evaluations.length },
    { id: 'Section 1', name: '1. Policies & Support (1.1-1.6)', icon: FileText, count: report.evaluations.filter(e => e.section === 'Section 1').length },
    { id: 'Section 2', name: '2. Course Structure (2.1-2.6)', icon: Layers, count: report.evaluations.filter(e => e.section === 'Section 2').length },
    { id: 'Section 3', name: '3. RSI Interaction (3.1-3.4)', icon: Users, count: report.evaluations.filter(e => e.section === 'Section 3').length },
    { id: 'Section 4', name: '4. Assessments (4.1-4.6)', icon: CheckSquare, count: report.evaluations.filter(e => e.section === 'Section 4').length },
    { id: 'Accessibility Verification', name: '5. Accessibility Verification', icon: Eye, count: report.evaluations.filter(e => e.section === 'Accessibility Verification').length },
  ];

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
      
      {/* Metrics Summary Widget */}
      <div className="bg-white rounded-[28px] p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-950 uppercase tracking-wider">
            CCC June 2027 Rubric Metrics
          </h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#6320EE] text-white font-extrabold shadow-sm">
            {report.overallScore}% Score
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex shadow-inner p-0.5">
            <div 
              style={{ width: `${(report.exceptionalCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-[#6320EE] rounded-l-full transition-all duration-500" 
              title={`${report.exceptionalCount} Exceptional`}
            />
            <div 
              style={{ width: `${(report.alignedCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-emerald-500 transition-all duration-500" 
              title={`${report.alignedCount} Aligned`}
            />
            <div 
              style={{ width: `${(report.approachingCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-[#F8E14B] transition-all duration-500" 
              title={`${report.approachingCount} Approaching`}
            />
            <div 
              style={{ width: `${(report.incompleteCount / report.evaluations.length) * 100}%` }} 
              className="h-full bg-[#FF6B35] rounded-r-full transition-all duration-500" 
              title={`${report.incompleteCount} Incomplete`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <span className="text-[#6320EE] font-bold">{report.exceptionalCount} Exceptional</span>
            <span className="text-emerald-600 font-bold">{report.alignedCount} Aligned</span>
            <span className="text-[#FF6B35] font-bold">{report.incompleteCount} Action Req</span>
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Exceptional' ? 'ALL' : 'Exceptional')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              activeStatusFilter === 'Exceptional' 
                ? 'bg-[#6320EE] text-white border-[#6320EE] shadow-sm font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              <span>{report.exceptionalCount}</span>
            </div>
            <div className="text-[9px] mt-0.5 font-bold truncate uppercase">Exceptional</div>
          </button>

          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Aligned' ? 'ALL' : 'Aligned')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              activeStatusFilter === 'Aligned' 
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{report.alignedCount}</span>
            </div>
            <div className="text-[9px] mt-0.5 font-bold truncate uppercase">Aligned</div>
          </button>

          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Approaching' ? 'ALL' : 'Approaching')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              activeStatusFilter === 'Approaching' 
                ? 'bg-[#F8E14B] text-slate-950 border-yellow-400 shadow-sm font-black' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{report.approachingCount}</span>
            </div>
            <div className="text-[9px] mt-0.5 font-bold truncate uppercase">Approach</div>
          </button>

          <button
            onClick={() => onSelectStatusFilter(activeStatusFilter === 'Incomplete' ? 'ALL' : 'Incomplete')}
            className={`p-2 rounded-2xl border text-center transition-all ${
              activeStatusFilter === 'Incomplete' 
                ? 'bg-[#FF6B35] text-white border-[#FF6B35] shadow-sm font-bold' 
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-xs font-bold">
              <XCircle className="w-3.5 h-3.5" />
              <span>{report.incompleteCount}</span>
            </div>
            <div className="text-[9px] mt-0.5 font-bold truncate uppercase">Action</div>
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter 19 standards or keywords..."
          className="w-full bg-[#EBEBEF] text-slate-950 placeholder:text-slate-400 rounded-full pl-10 pr-4 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#6320EE]/40 transition border border-slate-300/80"
        />
      </div>

      {/* Section Navigation List */}
      <div className="space-y-1.5">
        <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          POCR Rubric Sections
        </h3>
        
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => onSelectSection(sec.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-[#18181B] text-white shadow-md'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#F8E14B]' : 'text-slate-400'}`} />
                <span className="truncate">{sec.name}</span>
              </div>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
              }`}>
                {sec.count}
              </span>
            </button>
          );
        })}
      </div>

    </aside>
  );
};
