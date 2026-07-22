'use client';

import React from 'react';
import { CourseAuditReport, CourseData } from '@/types/pocr';
import { ShieldCheck, Upload, FileDown, BookOpen, AlertTriangle, CheckCircle2, XCircle, Code, Youtube } from 'lucide-react';

interface HeaderProps {
  courses: CourseData[];
  selectedCourse: CourseData;
  report: CourseAuditReport;
  onSelectCourse: (course: CourseData) => void;
  onOpenIngestModal: () => void;
  onOpenExportModal: () => void;
  onOpenJsonModal?: () => void;
  onOpenVideoModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  courses,
  selectedCourse,
  report,
  onSelectCourse,
  onOpenIngestModal,
  onOpenExportModal,
  onOpenJsonModal,
  onOpenVideoModal
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Exceptional':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#6320EE] text-white shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> POCR Exceptional ({report.overallScore}%)
          </span>
        );
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500 text-white shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> POCR Aligned ({report.overallScore}%)
          </span>
        );
      case 'Approaching':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#F8E14B] text-slate-950 shadow-sm">
            <AlertTriangle className="w-3.5 h-3.5" /> Approaching ({report.overallScore}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#FF6B35] text-white shadow-sm">
            <XCircle className="w-3.5 h-3.5" /> Action Required ({report.overallScore}%)
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-4 lg:px-8 py-3.5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 max-w-[1750px] mx-auto">
        
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#6320EE] text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-950 flex items-center gap-2">
                POCR-Bot <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F8E14B] text-slate-950 font-black tracking-wider uppercase">v2.5 Video Pipeline</span>
              </h1>
              <span className="hidden sm:inline-block text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                June 2027 CCC Standard
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Peer Online Course Review AI Assistant • FastAPI YouTube Caption Batch Pipeline
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Course Selector */}
          <div className="relative flex items-center gap-2 bg-[#F4F4F6] border border-slate-300 rounded-full px-3.5 py-2 focus-within:ring-2 focus-within:ring-[#6320EE]/40">
            <BookOpen className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedCourse.id}
              onChange={(e) => {
                const found = courses.find(c => c.id === e.target.value);
                if (found) onSelectCourse(found);
              }}
              className="bg-transparent text-xs text-slate-950 focus:outline-none cursor-pointer pr-2 font-bold"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id} className="bg-white text-slate-950">
                  {c.code} — {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge */}
          {getStatusBadge(report.overallStatus)}

          {/* Video Compliance Modal Button */}
          {onOpenVideoModal && (
            <button
              onClick={onOpenVideoModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full bg-[#FF6B35] hover:bg-[#ff5a1f] text-white transition duration-150 shadow-sm"
            >
              <Youtube className="w-3.5 h-3.5 text-white" />
              Video Captions Report
            </button>
          )}

          {/* View Structural JSON */}
          {onOpenJsonModal && (
            <button
              onClick={onOpenJsonModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition duration-150"
            >
              <Code className="w-3.5 h-3.5 text-slate-600" />
              Structural JSON
            </button>
          )}

          {/* Ingest Canvas Button */}
          <button
            onClick={onOpenIngestModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-full bg-white hover:bg-slate-50 text-slate-950 border border-slate-300 transition duration-150 shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-[#6320EE]" />
            Ingest Canvas (.imscc)
          </button>

          {/* Export Report Button */}
          <button
            onClick={onOpenExportModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-full bg-[#18181B] hover:bg-slate-800 text-white transition duration-150 shadow-md"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export Audit Report
          </button>

        </div>
      </div>
    </header>
  );
};
