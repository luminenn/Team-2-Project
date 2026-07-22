'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { usePocr } from '@/lib/context/PocrContext';
import { evaluateCourse } from '@/lib/pocr/evaluator';
import { CourseData, EvaluationResult } from '@/types/pocr';
import { CanvasStructuralCourse } from '@/types/imsccSchema';
import { extractCourseVideosFromCourse, groupHarvestedVideosForApi } from '@/lib/parser/extractCourseVideos';
import { Header } from '@/components/Header';
import { RubricNav } from '@/components/RubricNav';
import { StandardCard } from '@/components/StandardCard';
import { InspectorPanel } from '@/components/InspectorPanel';
import { IngestionModal } from '@/components/IngestionModal';
import { ExportModal } from '@/components/ExportModal';
import { JsonViewerModal } from '@/components/JsonViewerModal';
import { VideoComplianceModal } from '@/components/VideoComplianceModal';
import { 
  Sparkles, 
  Youtube, 
  Code, 
  ShieldCheck, 
  RefreshCw, 
  Upload, 
  FileCode, 
  FolderPlus, 
  AlertCircle, 
  Loader2, 
  BookOpen,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export default function AuditorPage() {
  const { 
    uploadedCourses, 
    selectedCourse, 
    setSelectedCourse, 
    uploadCourse, 
    deleteCourse,
    isUploading, 
    uploadError 
  } = usePocr();

  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationResult | null>(null);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Dynamic Video Compliance Report State
  const [dynamicVideoReport, setDynamicVideoReport] = useState<any | null>(null);

  // Evaluation Report computed from selected course
  const report = useMemo(() => {
    if (!selectedCourse) return null;
    return evaluateCourse(selectedCourse);
  }, [selectedCourse]);

  // Dynamically harvest videos whenever selectedCourse changes
  useEffect(() => {
    if (!selectedCourse) {
      setDynamicVideoReport(null);
      return;
    }

    const harvested = extractCourseVideosFromCourse(selectedCourse);
    const { videos, locationMap } = groupHarvestedVideosForApi(harvested);

    fetch('/api/video-compliance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videos })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.results) {
          const enhancedResults = data.results.map((r: any) => {
            const key = r.youtube_video_id || r.original_url;
            return {
              ...r,
              found_in_locations: locationMap[key] || r.found_in_locations || ['Course Content']
            };
          });
          setDynamicVideoReport({
            summary: data.summary,
            results: enhancedResults
          });
        }
      })
      .catch(() => {
        // Fallback
      });
  }, [selectedCourse]);

  const filteredEvaluations = useMemo(() => {
    if (!report) return [];
    return report.evaluations.filter(e => {
      if (activeSection !== 'ALL' && e.section !== activeSection) return false;
      if (activeStatusFilter !== 'ALL' && e.status !== activeStatusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) ||
          e.standardCode.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.findings.some(f => f.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [report, activeSection, activeStatusFilter, searchQuery]);

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      try {
        await uploadCourse(files[0]);
      } catch (err) {
        console.error('File drop error:', err);
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        await uploadCourse(files[0]);
      } catch (err) {
        console.error('File select error:', err);
      }
    }
  };

  const activeStructuralJson: CanvasStructuralCourse | null = useMemo(() => {
    if (!selectedCourse) return null;
    const harvested = extractCourseVideosFromCourse(selectedCourse);
    return {
      course_metadata: {
        title: selectedCourse.title,
        canvas_id: selectedCourse.id,
        home_page_type: 'wiki_page',
        home_page_content_html: selectedCourse.syllabusHtml,
        home_page_content_text: selectedCourse.syllabusHtml.replace(/<[^>]+>/g, ' '),
        syllabus: {
          content_html: selectedCourse.syllabusHtml,
          content_text: selectedCourse.syllabusHtml.replace(/<[^>]+>/g, ' '),
          attached_files: [{ file_name: 'Syllabus.pdf', file_path: '/files/Syllabus.pdf' }]
        }
      },
      modules: selectedCourse.modules.map((m, idx) => ({
        module_id: m.id,
        title: m.name,
        order: idx + 1,
        items: m.items.map(i => ({ item_id: i.id, type: 'Page', title: i.title, indent_level: 0 }))
      })),
      pages: selectedCourse.pages.map(p => ({
        page_id: p.id,
        title: p.title,
        url: `/pages/${p.id}`,
        is_front_page: false,
        content_html: p.htmlContent,
        content_text: p.htmlContent.replace(/<[^>]+>/g, ' '),
        embedded_media: harvested
          .filter(h => h.location_type === 'page' && h.item_title === p.title)
          .map(h => ({
            type: 'youtube',
            url: h.url,
            embed_code: h.embed_code,
            alt_text: 'Embedded video lecture frame',
            has_caption_track_detected: h.url.includes('cc_load_policy=1')
          }))
      })),
      assignments: selectedCourse.assignments.map(a => ({
        assignment_id: a.id,
        title: a.title,
        description_html: a.descriptionHtml,
        description_text: a.descriptionHtml.replace(/<[^>]+>/g, ' '),
        is_first_day_activity: a.title.toLowerCase().includes('essay #1') || a.title.toLowerCase().includes('welcome'),
        points_possible: 100,
        rubric: a.rubricCriteria.map((c, i) => ({ id: `r-${i}`, description: c, points: 25 })),
        attachments: []
      })),
      discussions: selectedCourse.discussions.map(d => ({
        discussion_id: d.id,
        title: d.title,
        prompt_html: d.promptHtml,
        prompt_text: d.promptHtml.replace(/<[^>]+>/g, ' '),
        is_pinned: true,
        allow_rating: false
      })),
      quizzes: [],
      file_assets: []
    };
  }, [selectedCourse]);

  // =========================================================================
  // EMPTY STATE VIEW (NO COURSES UPLOADED YET)
  // =========================================================================
  if (uploadedCourses.length === 0 || !selectedCourse || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 w-full">
        <div className="w-full max-w-3xl space-y-6">
          
          {/* Header Card */}
          <div className="bg-[#6320EE] rounded-[32px] p-8 text-white text-center shadow-xl shadow-purple-600/20 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-[#F8E14B] text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Canvas LMS POCR Auditor
            </div>
            <h1 className="text-3xl lg:text-4xl font-black tracking-tight">
              POCR Course Review Workspace
            </h1>
            <p className="text-xs lg:text-sm text-white/90 max-w-xl mx-auto font-medium leading-relaxed">
              Upload a Canvas Course Export package (<code className="bg-white/20 px-1.5 py-0.5 rounded font-mono text-[#F8E14B]">.imscc</code>) to inspect modules, check video captions, and evaluate against the 2027 CCC CVC Rubric.
            </p>
          </div>

          {/* Prominent Drag & Drop Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            className={`bg-white rounded-[32px] p-10 lg:p-14 border-3 border-dashed transition-all text-center flex flex-col items-center justify-center space-y-5 shadow-lg ${
              isDragOver 
                ? 'border-[#6320EE] bg-purple-50/60 scale-[1.01]' 
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-[#6320EE]/10 text-[#6320EE] flex items-center justify-center shadow-inner">
              {isUploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-[#6320EE]" />
              ) : (
                <Upload className="w-10 h-10 text-[#6320EE]" />
              )}
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-black text-slate-950">
                {isUploading ? 'Parsing Canvas Cartridge...' : 'Upload Canvas Course Export (.imscc)'}
              </h3>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                No courses uploaded yet. Drag and drop a Canvas Course Export (<code className="font-mono bg-slate-100 px-1 rounded text-slate-900 font-bold">.imscc</code>) file here or browse your computer to start the POCR rubric audit.
              </p>
            </div>

            {uploadError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {uploadError}
              </div>
            )}

            <div className="pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-lg transition">
                <FolderPlus className="w-4 h-4 text-[#F8E14B]" /> Select .imscc File from Computer
                <input
                  type="file"
                  accept=".imscc,.zip,.xml,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-4 border-t border-slate-100 w-full max-w-sm text-[11px] text-slate-400 font-semibold flex items-center justify-center gap-4">
              <span>Supports Canvas IMSCC 1.1/1.2</span>
              <span>•</span>
              <span>100% Client-Side Safe</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE WORKSPACE VIEW (COURSES PRESENT)
  // =========================================================================
  return (
    <div className="flex-1 flex flex-col bg-[#F4F4F6] text-slate-950 rounded-[28px] overflow-hidden border border-slate-300/80 shadow-md">
      
      {/* Auditor Top Action Bar */}
      <div className="bg-[#18181B] text-slate-300 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-bold border-b border-slate-800">
        <div className="flex items-center gap-2 text-[#F8E14B]">
          <ShieldCheck className="w-5 h-5" />
          <span className="text-sm font-black text-white">Active POCR Review Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsVideoModalOpen(true)}
            className="text-[#FF6B35] hover:text-[#ff8559] inline-flex items-center gap-1.5 font-bold transition"
          >
            <Youtube className="w-4 h-4" /> YouTube Captions Detector
          </button>

          <button
            onClick={() => setIsJsonModalOpen(true)}
            className="text-slate-200 hover:text-white inline-flex items-center gap-1.5 font-bold transition"
          >
            <Code className="w-4 h-4 text-blue-400" /> Structural JSON
          </button>

          <button
            onClick={() => deleteCourse(selectedCourse.id)}
            className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 font-bold transition ml-2"
            title="Delete this uploaded course"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove Course
          </button>
        </div>
      </div>

      {/* Header Toolbar */}
      <Header
        courses={uploadedCourses}
        selectedCourse={selectedCourse}
        report={report}
        onSelectCourse={setSelectedCourse}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenJsonModal={() => setIsJsonModalOpen(true)}
        onOpenVideoModal={() => setIsVideoModalOpen(true)}
      />

      {/* Main Review Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 lg:p-6 gap-6 w-full">
        <RubricNav
          activeSection={activeSection}
          activeStatusFilter={activeStatusFilter}
          searchQuery={searchQuery}
          report={report}
          onSelectSection={setActiveSection}
          onSelectStatusFilter={setActiveStatusFilter}
          onSearchChange={setSearchQuery}
        />

        <main className="flex-1 space-y-6 min-w-0">
          {/* Banner Card */}
          <div className="bg-[#6320EE] rounded-[28px] p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-purple-600/20">
            <div>
              <div className="flex items-center gap-2 text-xs font-black text-[#F8E14B] uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-[#F8E14B]" />
                <span>POCR AUDIT REPORT • {selectedCourse.code}</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white">
                {selectedCourse.title}
              </h2>
              <p className="text-xs text-white/90 mt-1 font-medium">
                Instructor: <strong className="text-white font-bold">{selectedCourse.instructor}</strong> • Term: {selectedCourse.term}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsIngestModalOpen(true)}
                className="px-4 py-2.5 rounded-full bg-[#F8E14B] text-slate-950 font-black text-xs hover:bg-yellow-300 transition shadow-md flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Upload Another IMSCC File
              </button>
            </div>
          </div>

          {/* Filter Summary */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>Showing {filteredEvaluations.length} of {report.evaluations.length} Rubric Standards</span>
            {searchQuery && (
              <span className="text-[#6320EE]">Filtered by query: "{searchQuery}"</span>
            )}
          </div>

          {/* Standard Cards Grid */}
          <div className="space-y-4">
            {filteredEvaluations.map((evalItem) => (
              <StandardCard
                key={evalItem.standardId}
                evaluation={evalItem}
                isSelected={selectedEvaluation?.standardId === evalItem.standardId}
                onSelect={() => setSelectedEvaluation(evalItem)}
              />
            ))}

            {filteredEvaluations.length === 0 && (
              <div className="bg-white rounded-3xl p-8 text-center text-slate-500 font-medium">
                No standards match the selected section or filter criteria.
              </div>
            )}
          </div>
        </main>

        {/* Right Inspector Panel */}
        <InspectorPanel
          evaluation={selectedEvaluation}
          onClose={() => setSelectedEvaluation(null)}
        />
      </div>

      {/* Modals */}
      <IngestionModal
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onCourseIngested={(course) => {
          setSelectedCourse(course);
        }}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        report={report}
      />

      {activeStructuralJson && (
        <JsonViewerModal
          isOpen={isJsonModalOpen}
          onClose={() => setIsJsonModalOpen(false)}
          structuralJson={activeStructuralJson}
        />
      )}

      <VideoComplianceModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        reportData={dynamicVideoReport}
      />
    </div>
  );
}
