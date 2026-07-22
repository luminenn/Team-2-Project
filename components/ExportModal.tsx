'use client';

import React, { useState } from 'react';
import { CourseAuditReport } from '@/types/pocr';
import { X, FileDown, Printer, Check, Copy, ShieldCheck } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  report: CourseAuditReport;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  report,
  onClose
}) => {
  const [copiedMd, setCopiedMd] = useState(false);

  if (!isOpen) return null;

  const generateMarkdownReport = () => {
    let md = `# CVC POCR Audit Report: ${report.courseCode} - ${report.courseTitle}\n`;
    md += `**Instructor:** ${report.instructor}\n`;
    md += `**Audit Date:** ${report.auditTimestamp}\n`;
    md += `**Overall Alignment Score:** ${report.overallScore}% (${report.overallStatus})\n\n`;
    md += `## Rubric Alignment Overview (June 2027 Standards)\n`;
    md += `- **Exceptional Standards:** ${report.exceptionalCount}\n`;
    md += `- **Aligned Standards:** ${report.alignedCount}\n`;
    md += `- **Approaching Standards:** ${report.approachingCount}\n`;
    md += `- **Incomplete Standards:** ${report.incompleteCount}\n\n`;
    md += `---\n\n`;

    report.evaluations.forEach((evalItem) => {
      md += `### ${evalItem.standardCode}: ${evalItem.title}\n`;
      md += `**Status:** [${evalItem.status}] | **Section:** ${evalItem.section}\n\n`;
      md += `**Summary:** ${evalItem.summary}\n\n`;

      if (evalItem.findings.length > 0) {
        md += `**Audit Findings:**\n`;
        evalItem.findings.forEach(f => md += `- ${f}\n`);
        md += `\n`;
      }

      if (evalItem.remediationText) {
        md += `**AI Remediation Recommendation:**\n${evalItem.remediationText}\n\n`;
      }

      md += `---\n\n`;
    });

    return md;
  };

  const handleDownloadMarkdown = () => {
    const mdText = generateMarkdownReport();
    const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `POCR_Audit_${report.courseCode.replace(/\s+/g, '_')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(generateMarkdownReport());
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#6320EE] flex items-center justify-center text-white shadow-md shadow-purple-600/20 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-950">
                POCR Audit Report Export
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Official June 2027 CCC POCR Evaluation Document (All 19 Standards)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? 'Copied MD!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#6320EE] hover:bg-purple-700 text-white transition shadow-md"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download (.md)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-[#18181B] hover:bg-slate-800 text-white transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-950 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div id="printable-report" className="space-y-6 bg-slate-50 p-6 rounded-[24px] border border-slate-200 text-slate-800 font-sans max-h-[60vh] overflow-y-auto">
          
          <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-extrabold text-slate-950">
                {report.courseCode}: {report.courseTitle}
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Instructor: <strong className="text-slate-900">{report.instructor}</strong> • Audit Date: {report.auditTimestamp}
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-[#6320EE] font-mono">
                {report.overallScore}%
              </div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                {report.overallStatus} Status
              </div>
            </div>
          </div>

          {/* Metric Badges */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-center">
              <span className="block text-xl font-black text-[#6320EE] font-mono">{report.exceptionalCount}</span>
              <span className="text-[11px] font-bold text-purple-900">Exceptional</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="block text-xl font-black text-emerald-600 font-mono">{report.alignedCount}</span>
              <span className="text-[11px] font-bold text-emerald-900">Aligned</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-center">
              <span className="block text-xl font-black text-[#FF6B35] font-mono">{report.approachingCount}</span>
              <span className="text-[11px] font-bold text-amber-900">Approaching</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-center">
              <span className="block text-xl font-black text-rose-600 font-mono">{report.incompleteCount}</span>
              <span className="text-[11px] font-bold text-rose-900">Incomplete</span>
            </div>
          </div>

          {/* Itemized Standards */}
          <div className="space-y-4 pt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              POCR Standards Itemized Audit Details ({report.evaluations.length} Standards)
            </h2>

            {report.evaluations.map((evalItem) => (
              <div key={evalItem.standardId} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-950 font-extrabold">{evalItem.standardCode}: {evalItem.title}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black ${
                    evalItem.status === 'Exceptional' ? 'bg-[#6320EE] text-white' :
                    evalItem.status === 'Aligned' ? 'bg-emerald-500 text-white' :
                    evalItem.status === 'Approaching' ? 'bg-[#F8E14B] text-slate-950' :
                    'bg-[#FF6B35] text-white'
                  }`}>
                    {evalItem.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">{evalItem.summary}</p>
                {evalItem.remediationText && (
                  <div className="mt-2 p-3.5 rounded-2xl bg-slate-50 font-sans text-xs text-slate-800 border border-slate-200">
                    <strong className="text-[#6320EE] block mb-1 font-bold">AI Remediation Text:</strong>
                    <p className="whitespace-pre-wrap font-medium">{evalItem.remediationText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
};
