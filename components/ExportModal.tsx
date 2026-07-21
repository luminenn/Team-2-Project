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
    md += `## Alignment Overview\n`;
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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel rounded-3xl border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                POCR Audit Report Export
              </h2>
              <p className="text-xs text-slate-400">
                Official June 2026 CCC POCR Evaluation Document
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedMd ? 'Copied MD!' : 'Copy Markdown'}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Download (.md)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Formatted Report Preview */}
        <div id="printable-report" className="space-y-6 bg-slate-950/70 p-6 rounded-2xl border border-slate-800 text-slate-200 font-sans max-h-[60vh] overflow-y-auto">
          
          <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-100">
                {report.courseCode}: {report.courseTitle}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Instructor: <strong className="text-slate-200">{report.instructor}</strong> • Audit Date: {report.auditTimestamp}
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-blue-400 font-mono">
                {report.overallScore}%
              </div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {report.overallStatus} Status
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <span className="block text-lg font-bold text-emerald-400 font-mono">{report.alignedCount}</span>
              <span className="text-[11px] text-emerald-300">Aligned Standards</span>
            </div>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <span className="block text-lg font-bold text-amber-400 font-mono">{report.approachingCount}</span>
              <span className="text-[11px] text-amber-300">Approaching Standards</span>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
              <span className="block text-lg font-bold text-rose-400 font-mono">{report.incompleteCount}</span>
              <span className="text-[11px] text-rose-300">Incomplete Standards</span>
            </div>
          </div>

          {/* Detailed Item Breakdown */}
          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-mono font-semibold uppercase tracking-wider text-slate-400">
              POCR Standards Itemized Audit Details
            </h2>

            {report.evaluations.map((evalItem) => (
              <div key={evalItem.standardId} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-300 font-mono">{evalItem.standardCode}: {evalItem.title}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                    evalItem.status === 'Aligned' ? 'bg-emerald-500/20 text-emerald-400' :
                    evalItem.status === 'Approaching' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-rose-500/20 text-rose-400'
                  }`}>
                    {evalItem.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{evalItem.summary}</p>
                {evalItem.remediationText && (
                  <div className="mt-2 p-3 rounded bg-slate-950 font-sans text-xs text-slate-300 border border-slate-850">
                    <strong className="text-blue-400 block mb-1">AI Remediation Text:</strong>
                    <p className="whitespace-pre-wrap">{evalItem.remediationText}</p>
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
