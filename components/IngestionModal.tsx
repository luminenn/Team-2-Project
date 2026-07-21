'use client';

import React, { useState } from 'react';
import { CourseData } from '@/types/pocr';
import { parseImsccCartridge, parseCanvasJsonPayload } from '@/lib/parser/imsccParser';
import { X, Upload, FileCode, Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface IngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseIngested: (course: CourseData) => void;
}

export const IngestionModal: React.FC<IngestionModalProps> = ({
  isOpen,
  onClose,
  onCourseIngested
}) => {
  const [activeTab, setActiveTab] = useState<'cartridge' | 'json'>('cartridge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [jsonText, setJsonText] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const courseData = await parseImsccCartridge(file);
      onCourseIngested(courseData);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to parse Canvas cartridge.');
      setIsProcessing(false);
    }
  };

  const handleJsonSubmit = () => {
    if (!jsonText.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const courseData = parseCanvasJsonPayload(jsonText);
      onCourseIngested(courseData);
      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setErrorMessage('Invalid Canvas API JSON payload string. Please verify JSON format.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass-panel rounded-3xl border border-slate-800 p-6 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">
                Ingest Canvas LMS Course Content
              </h2>
              <p className="text-xs text-slate-400">
                Upload a Canvas `.imscc` export cartridge or paste Canvas API JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('cartridge')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'cartridge'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 inline mr-1.5" />
            Canvas Cartridge (.imscc / .zip)
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'json'
                ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 inline mr-1.5" />
            Canvas API JSON Payload
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Drag and Drop Upload */}
        {activeTab === 'cartridge' && (
          <div className="border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-2xl p-8 text-center bg-slate-900/40 transition">
            {isProcessing ? (
              <div className="py-6 space-y-3">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-200">
                  Parsing Canvas Cartridge & Analyzing HTML DOM...
                </p>
              </div>
            ) : (
              <label className="cursor-pointer space-y-3 block">
                <Upload className="w-10 h-10 text-blue-400 mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Click to select or drag `.imscc` file here
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Extracts pages, module objectives, headings, images & links for evaluation
                  </p>
                </div>
                <input
                  type="file"
                  accept=".imscc,.zip"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}

        {/* Tab 2: Canvas JSON Paste */}
        {activeTab === 'json' && (
          <div className="space-y-4">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"code": "SOC 101", "title": "Intro to Sociology", "modules": [...]}'
              rows={6}
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-2xl p-3 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleJsonSubmit}
              disabled={isProcessing || !jsonText.trim()}
              className="w-full py-2.5 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition shadow-md shadow-blue-600/20"
            >
              {isProcessing ? 'Ingesting JSON...' : 'Ingest Canvas JSON & Run Audit'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
