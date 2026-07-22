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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-white rounded-[32px] border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#6320EE] text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-950">
                Ingest Canvas LMS Course Content
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Upload a Canvas `.imscc` export cartridge or paste Canvas API JSON
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-950 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('cartridge')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition ${
              activeTab === 'cartridge'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 inline mr-1.5" />
            Canvas Cartridge (.imscc / .zip)
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2 rounded-full text-xs font-bold transition ${
              activeTab === 'json'
                ? 'bg-[#18181B] text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 inline mr-1.5" />
            Canvas API JSON Payload
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Drag and Drop Upload */}
        {activeTab === 'cartridge' && (
          <div className="border-2 border-dashed border-slate-300 hover:border-[#6320EE] rounded-[24px] p-8 text-center bg-slate-50 hover:bg-purple-50/30 transition">
            {isProcessing ? (
              <div className="py-6 space-y-3">
                <Loader2 className="w-8 h-8 text-[#6320EE] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-900">
                  Parsing Canvas Cartridge & Analyzing HTML DOM...
                </p>
              </div>
            ) : (
              <label className="cursor-pointer space-y-3 block">
                <Upload className="w-10 h-10 text-[#6320EE] mx-auto" />
                <div>
                  <p className="text-sm font-extrabold text-slate-950">
                    Click to select or drag `.imscc` file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1 font-medium">
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
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-[20px] p-4 focus:outline-none focus:ring-2 focus:ring-[#6320EE]"
            />
            <button
              onClick={handleJsonSubmit}
              disabled={isProcessing || !jsonText.trim()}
              className="w-full py-3 rounded-full font-bold text-xs bg-[#18181B] hover:bg-slate-800 disabled:opacity-50 text-white transition shadow-md"
            >
              {isProcessing ? 'Ingesting JSON...' : 'Ingest Canvas JSON & Run Audit'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
