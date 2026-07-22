'use client';

import React, { useState } from 'react';
import { CourseData } from '@/types/pocr';
import { usePocr } from '@/lib/context/PocrContext';
import { parseCanvasJsonPayload } from '@/lib/parser/imsccParser';
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
  const { uploadCourse, setSelectedCourse } = usePocr();
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
      const courseData = await uploadCourse(file);
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
      setSelectedCourse(courseData);
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
              <h3 className="text-xl font-black text-slate-950">Ingest Canvas Course Package</h3>
              <p className="text-xs text-slate-500 font-medium">Extract IMSCC cartridge file or Canvas Structural JSON</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 text-slate-500 hover:text-slate-950 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 p-1 bg-[#F4F4F6] rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('cartridge')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === 'cartridge' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <Upload className="w-4 h-4 text-[#6320EE]" /> .IMSCC Cartridge Package
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 ${
              activeTab === 'json' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <FileCode className="w-4 h-4 text-blue-500" /> Canvas API JSON Payload
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'cartridge' ? (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 hover:border-[#6320EE] rounded-3xl p-8 text-center space-y-4 transition bg-slate-50/50">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 text-[#6320EE] flex items-center justify-center mx-auto shadow-inner">
                {isProcessing ? <Loader2 className="w-7 h-7 animate-spin" /> : <Upload className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-950">
                  {isProcessing ? 'Parsing IMSCC Manifest...' : 'Drop your Canvas .imscc file here'}
                </p>
                <p className="text-xs text-slate-500 font-medium">Supports Canvas exported ZIP / IMSCC cartridges up to 500MB</p>
              </div>

              <label className="inline-block cursor-pointer px-5 py-2.5 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-md transition">
                Browse Files
                <input
                  type="file"
                  accept=".imscc,.zip,.xml"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Paste Canvas Structural JSON Payload</label>
              <textarea
                rows={6}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{ "course_metadata": { "title": "History 101" }, "modules": [...] }'
                className="w-full bg-[#F4F4F6] text-xs font-mono p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20"
              />
            </div>

            <button
              onClick={handleJsonSubmit}
              disabled={isProcessing || !jsonText.trim()}
              className="w-full py-3 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              Parse Structural JSON
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMessage}
          </div>
        )}

      </div>
    </div>
  );
};
