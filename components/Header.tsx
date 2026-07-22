'use client';

import React from 'react';
import { CourseAuditReport, CourseData } from '@/types/pocr';
import { ShieldCheck, Upload, FileDown, BookOpen, AlertTriangle, CheckCircle2, XCircle, Code } from 'lucide-react';

interface HeaderProps {
  courses: CourseData[];
  selectedCourse: CourseData;
  report: CourseAuditReport;
  onSelectCourse: (course: CourseData) => void;
  onOpenIngestModal: () => void;
  onOpenExportModal: () => void;
  onOpenJsonModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  courses,
  selectedCourse,
  report,
  onSelectCourse,
  onOpenIngestModal,
  onOpenExportModal,
  onOpenJsonModal
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Exceptional':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> POCR Exceptional ({report.overallScore}%)
          </span>
        );
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> POCR Aligned ({report.overallScore}%)
          </span>
        );
      case 'Approaching':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Approaching Alignment ({report.overallScore}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5" /> Action Required ({report.overallScore}%)
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                POCR-Bot <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-medium border border-blue-500/30">v2.0 Structural</span>
              </h1>
              <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                June 2027 CCC Standard
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Peer Online Course Review AI Assistant • Full-Spec Canvas Parser Engine
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Course Selector */}
          <div className="relative flex items-center gap-2 bg-slate-900/90 border border-slate-750 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/50">
            <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCourse.id}
              onChange={(e) => {
                const found = courses.find(c => c.id === e.target.value);
                if (found) onSelectCourse(found);
              }}
              className="bg-transparent text-sm text-slate-200 focus:outline-none cursor-pointer pr-2 font-medium"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          {getStatusBadge(report.overallStatus)}

          {/* View Structural JSON */}
          {onOpenJsonModal && (
            <button
              onClick={onOpenJsonModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 transition duration-150"
            >
              <Code className="w-3.5 h-3.5 text-blue-400" />
              Structural JSON
            </button>
          )}

          {/* Ingest Canvas Button */}
          <button
            onClick={onOpenIngestModal}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 transition duration-150 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-blue-400" />
            Ingest Canvas (.imscc)
          </button>

          {/* Export Report Button */}
          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition duration-150 shadow-md shadow-blue-600/25"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Audit Report
          </button>

        </div>
      </div>
    </header>
  );
};
