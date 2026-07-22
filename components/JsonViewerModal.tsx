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
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Canvas Structural JSON Output Schema
              </h2>
              <p className="text-xs text-slate-400">
                Full-spec extracted dataset for AI evaluation agents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download (.json)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scope Metrics Bar */}
        <div className="grid grid-cols-5 gap-2 text-center text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="block font-bold text-blue-400">{structuralJson.modules.length}</span>
            <span className="text-[10px] text-slate-400">Modules</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="block font-bold text-emerald-400">{structuralJson.pages.length}</span>
            <span className="text-[10px] text-slate-400">Pages</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="block font-bold text-amber-400">{structuralJson.assignments.length}</span>
            <span className="text-[10px] text-slate-400">Assignments</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="block font-bold text-purple-400">{structuralJson.discussions.length}</span>
            <span className="text-[10px] text-slate-400">Discussions</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="block font-bold text-rose-400">{structuralJson.file_assets.length}</span>
            <span className="text-[10px] text-slate-400">File Assets</span>
          </div>
        </div>

        {/* Syntax Code Container */}
        <div className="p-4 rounded-2xl bg-slate-950 font-mono text-xs text-blue-300 border border-slate-800 max-h-[50vh] overflow-y-auto whitespace-pre">
          <code>{jsonString}</code>
        </div>

      </div>
    </div>
  );
};
