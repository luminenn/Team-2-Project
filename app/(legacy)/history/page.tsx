'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePocr } from '@/lib/context/PocrContext';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Download, 
  Zap, 
  BookOpen, 
  Calendar, 
  User, 
  FileText,
  FolderPlus,
  Plus
} from 'lucide-react';

export default function HistoryPage() {
  const { evaluationHistory, openCourseInAuditor, uploadedCourses, uploadCourse } = usePocr();
  const [statusFilter, setStatusFilter] = useState<'All' | 'Aligned' | 'Approaching Alignment' | 'Action Required'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const filteredHistory = evaluationHistory.filter((item) => {
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.courseCode.toLowerCase().includes(q) ||
        item.courseTitle.toLowerCase().includes(q) ||
        item.instructor.toLowerCase().includes(q) ||
        item.term.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aligned':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aligned
          </span>
        );
      case 'Approaching Alignment':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-[#F8E14B]/30 text-slate-900 border border-[#F8E14B]">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Approaching Alignment
          </span>
        );
      case 'Action Required':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5 text-rose-600" /> Action Required
          </span>
        );
      default:
        return null;
    }
  };

  const handleDownloadReport = (item: any) => {
    const reportText = `POCR COURSE AUDIT REPORT
----------------------------------
Course: ${item.courseCode} - ${item.courseTitle}
Instructor: ${item.instructor}
Term: ${item.term}
Audit Date: ${item.auditedDate}
Overall Status: ${item.status}
Compliance Score: ${item.score}%

SUMMARY OF STANDARDS:
- Total Evaluated Standards: ${item.totalStandards}
- Aligned: ${item.alignedCount}
- Approaching Alignment: ${item.approachingCount}
- Action Required: ${item.actionRequiredCount}

Certified by California Community Colleges (CCC) Peer Online Course Review system.
`;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `POCR_Audit_${item.courseCode.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(item.courseCode);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const course = await uploadCourse(files[0]);
        openCourseInAuditor(course.id);
      } catch (err) {
        console.error('File select error:', err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      {/* Header Banner */}
      <div className="bg-[#6320EE] rounded-[32px] p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl shadow-purple-600/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#F8E14B] uppercase tracking-wider mb-1">
            <History className="w-4 h-4 text-[#F8E14B]" />
            <span>Audit Archive & History</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Past Course Evaluations
          </h1>
          <p className="text-xs text-white/90 mt-1.5 font-medium max-w-xl">
            Access previous CCC POCR audit logs, review compliance score breakdowns, download formal audit reports, or re-open audits in the Auditor workspace.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-[160px]">
          <span className="block text-[10px] font-bold text-white/80 uppercase">Total Audits</span>
          <span className="text-3xl font-black text-[#F8E14B]">{evaluationHistory.length}</span>
        </div>
      </div>

      {downloadSuccess && (
        <div className="bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-between shadow-md">
          <span>Audit Report for {downloadSuccess} downloaded successfully!</span>
          <button onClick={() => setDownloadSuccess(null)} className="text-white hover:underline">Dismiss</button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
        {/* Filter Tags */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {(['All', 'Aligned', 'Approaching Alignment', 'Action Required'] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => setStatusFilter(tag)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                statusFilter === tag
                  ? 'bg-slate-950 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, course, instructor..."
            className="w-full bg-[#F4F4F6] text-xs text-slate-900 placeholder:text-slate-400 rounded-full pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-950/20 font-medium"
          />
        </div>
      </div>

      {/* Table & Cards View */}
      {evaluationHistory.length > 0 ? (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-[28px] p-6 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Course Information */}
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-lg bg-slate-950 text-white text-xs font-black tracking-wider">
                    {item.courseCode}
                  </span>
                  <h3 className="text-lg font-black text-slate-950">
                    {item.courseTitle}
                  </h3>
                  {getStatusBadge(item.status)}
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-600 font-medium flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> {item.instructor}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {item.term}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Audited: {item.auditedDate}
                  </span>
                </div>
              </div>

              {/* Scores & Breakdown */}
              <div className="flex items-center gap-6 border-t lg:border-t-0 border-slate-100 pt-4 lg:pt-0 shrink-0">
                <div className="text-center px-4">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Compliance Score</span>
                  <span className="text-2xl font-black text-[#6320EE]">{item.score}%</span>
                </div>

                <div className="text-xs font-bold space-y-1 text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Aligned: {item.alignedCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Approaching: {item.approachingCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Action Req: {item.actionRequiredCount}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0">
                <button
                  onClick={() => openCourseInAuditor(item.courseId)}
                  className="px-4 py-2.5 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-[#F8E14B]" /> Open Audit Report ➔
                </button>

                <button
                  onClick={() => handleDownloadReport(item)}
                  className="px-3.5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs border border-slate-300 transition flex items-center gap-1.5"
                  title="Download Report"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          ))}

          {filteredHistory.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-500 font-medium border border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              No evaluation history records match "{searchQuery}" with status "{statusFilter}".
            </div>
          )}
        </div>
      ) : (
        /* EMPTY STATE BANNER */
        <div className="bg-white rounded-[28px] p-12 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#6320EE] flex items-center justify-center mx-auto shadow-inner">
            <History className="w-8 h-8 text-[#6320EE]" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-lg font-black text-slate-950">No Course Audits Completed Yet</h4>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              When you upload and audit Canvas courses, their evaluation history, scores, and downloadable audit reports will appear here.
            </p>
          </div>
          <div className="pt-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-md transition">
              <FolderPlus className="w-4 h-4 text-[#F8E14B]" /> Upload Course to Audit (.imscc)
              <input
                type="file"
                accept=".imscc,.zip,.xml,.json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
