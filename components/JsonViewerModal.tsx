'use client';

import React, { useState } from 'react';
import { CanvasStructuralCourse } from '@/types/imsccSchema';
import { X, Copy, Check, FileCode, Download, Database } from 'lucide-react';

interface JsonViewerModalProps {
  isOpen: boolean;
  structuralJson: CanvasStructuralCourse | null;
  onClose: () => void;
}

export const JsonViewerModal: React.FC<JsonViewerModalProps> = ({
  isOpen,
  structuralJson,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !structuralJson) return null;

  const jsonString = JSON.stringify(structuralJson, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Canvas_Structural_${structuralJson.course_metadata.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-[32px] border border-slate-200 p-6 md:p-8 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#6320EE] text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Canvas Structural JSON Output Schema
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Full-spec extracted dataset for AI evaluation agents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-[#6320EE] hover:bg-purple-700 text-white transition shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.json)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-950 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope Metrics Bar */}
        <div className="grid grid-cols-5 gap-2.5 text-center text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <span className="block font-black text-[#6320EE] font-mono text-base">{structuralJson.modules.length}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Modules</span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
            <span className="block font-black text-emerald-600 font-mono text-base">{structuralJson.pages.length}</span>
            <span className="text-[10px] font-bold text-emerald-900 uppercase">Pages</span>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
            <span className="block font-black text-[#FF6B35] font-mono text-base">{structuralJson.assignments.length}</span>
            <span className="text-[10px] font-bold text-amber-900 uppercase">Assignments</span>
          </div>
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200">
            <span className="block font-black text-purple-600 font-mono text-base">{structuralJson.discussions.length}</span>
            <span className="text-[10px] font-bold text-purple-900 uppercase">Discussions</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200">
            <span className="block font-black text-slate-900 font-mono text-base">{structuralJson.file_assets.length}</span>
            <span className="text-[10px] font-bold text-slate-600 uppercase">Assets</span>
          </div>
        </div>

        {/* Syntax Code Container */}
        <div className="p-5 rounded-[24px] bg-slate-950 font-mono text-xs text-blue-300 border border-slate-800 max-h-[50vh] overflow-y-auto whitespace-pre shadow-sm">
          <code>{jsonString}</code>
        </div>

      </div>
    </div>
  );
};
