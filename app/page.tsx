'use client';

import React, { useState, useMemo } from 'react';
import { StudentDashboard } from '@/components/StudentDashboard';
import { LoginPage } from '@/components/LoginPage';
import { MOCK_COURSES } from '@/lib/data/mockCourses';
import { evaluateCourse } from '@/lib/pocr/evaluator';
import { CourseData, EvaluationResult } from '@/types/pocr';
import { CanvasStructuralCourse } from '@/types/imsccSchema';
import { Header } from '@/components/Header';
import { RubricNav } from '@/components/RubricNav';
import { StandardCard } from '@/components/StandardCard';
import { InspectorPanel } from '@/components/InspectorPanel';
import { IngestionModal } from '@/components/IngestionModal';
import { ExportModal } from '@/components/ExportModal';
import { JsonViewerModal } from '@/components/JsonViewerModal';
import { Sparkles, RefreshCw, LayoutDashboard, LogIn, ShieldCheck, ArrowLeft, Code } from 'lucide-react';

export default function Home() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'login' | 'pocr'>('dashboard');

  // POCR Auditor State
  const [courses, setCourses] = useState<CourseData[]>(MOCK_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<CourseData>(MOCK_COURSES[0]);
  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationResult | null>(null);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);
  const [currentStructuralJson, setCurrentStructuralJson] = useState<CanvasStructuralCourse | null>(null);

  const report = useMemo(() => {
    return evaluateCourse(selectedCourse);
  }, [selectedCourse]);

  const filteredEvaluations = useMemo(() => {
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

  const handleAddCourse = (newCourse: CourseData) => {
    setCourses(prev => [newCourse, ...prev]);
    setSelectedCourse(newCourse);
  };

  // Mock Structural JSON generator for selected course
  const activeStructuralJson: CanvasStructuralCourse = useMemo(() => {
    if (currentStructuralJson) return currentStructuralJson;
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
        embedded_media: [
          {
            type: 'image',
            url: '/images/mural.jpg',
            embed_code: '<img src="/images/mural.jpg" alt="Diverse mural" />',
            alt_text: 'Diverse mural depiction',
            has_caption_track_detected: false
          }
        ]
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
      file_assets: [
        {
          asset_id: 'asset-1',
          file_name: 'ETHN_Syllabus.pdf',
          file_type: 'pdf',
          file_path: '/documents/ETHN_Syllabus.pdf',
          extracted_text: 'Course Policies and Learning Objectives...',
          document_structure: {
            has_heading_tags: true,
            detected_headings: ['H1: Syllabus Overview', 'H2: Course Policies']
          }
        }
      ]
    };
  }, [selectedCourse, currentStructuralJson]);

  if (currentView === 'login') {
    return (
      <div className="relative">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-full border border-slate-700 shadow-lg">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white text-slate-950 flex items-center gap-1.5"
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard View
          </button>
          <button
            onClick={() => setCurrentView('pocr')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> POCR Auditor
          </button>
        </div>
        <LoginPage onLoginSuccess={() => setCurrentView('dashboard')} />
      </div>
    );
  }

  if (currentView === 'pocr') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
        
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-400">
          <button
            onClick={() => setCurrentView('dashboard')}
            className="inline-flex items-center gap-1.5 text-blue-400 hover:underline font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to Student Dashboard
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsJsonModalOpen(true)}
              className="text-blue-300 hover:underline inline-flex items-center gap-1 font-mono font-semibold"
            >
              <Code className="w-3.5 h-3.5" /> View Structural JSON Output
            </button>
            <button
              onClick={() => setCurrentView('login')}
              className="hover:text-slate-200 inline-flex items-center gap-1"
            >
              <LogIn className="w-3.5 h-3.5" /> Login Screen
            </button>
          </div>
        </div>

        <Header
          courses={courses}
          selectedCourse={selectedCourse}
          report={report}
          onSelectCourse={setSelectedCourse}
          onOpenIngestModal={() => setIsIngestModalOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenJsonModal={() => setIsJsonModalOpen(true)}
        />

        <div className="flex-1 flex flex-col lg:flex-row p-4 lg:p-8 gap-6 max-w-[1750px] mx-auto w-full">
          <RubricNav
            activeSection={activeSection}
            activeStatusFilter={activeStatusFilter}
            searchQuery={searchQuery}
            report={report}
            onSelectSection={setActiveSection}
            onSelectStatusFilter={setActiveStatusFilter}
            onSearchChange={setSearchQuery}
          />

          <main className="flex-1 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-blue-400 font-semibold mb-1">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                  <span>POCR AUDIT REPORT • {selectedCourse.code}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-100">
                  {selectedCourse.title}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Instructor: <strong className="text-slate-200">{selectedCourse.instructor}</strong> • Term: {selectedCourse.term}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    activeStatusFilter === 'ALL'
                      ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({report.evaluations.length})
                </button>
                <button
                  onClick={() => setActiveStatusFilter('Incomplete')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                    activeStatusFilter === 'Incomplete'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Action Required ({report.incompleteCount})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Evaluated Rubric Standards ({filteredEvaluations.length})
                </h3>
                {activeStatusFilter !== 'ALL' || activeSection !== 'ALL' || searchQuery ? (
                  <button
                    onClick={() => {
                      setActiveSection('ALL');
                      setActiveStatusFilter('ALL');
                      setSearchQuery('');
                    }}
                    className="text-xs text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear Filters
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredEvaluations.map((evalItem) => (
                  <StandardCard
                    key={evalItem.standardId}
                    evaluation={evalItem}
                    isSelected={selectedEvaluation?.standardId === evalItem.standardId}
                    onSelect={setSelectedEvaluation}
                  />
                ))}
              </div>
            </div>
          </main>

          {selectedEvaluation && (
            <InspectorPanel
              evaluation={selectedEvaluation}
              onClose={() => setSelectedEvaluation(null)}
            />
          )}
        </div>

        <IngestionModal
          isOpen={isIngestModalOpen}
          onClose={() => setIsIngestModalOpen(false)}
          onCourseIngested={handleAddCourse}
        />

        <ExportModal
          isOpen={isExportModalOpen}
          report={report}
          onClose={() => setIsExportModalOpen(false)}
        />

        <JsonViewerModal
          isOpen={isJsonModalOpen}
          structuralJson={activeStructuralJson}
          onClose={() => setIsJsonModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <StudentDashboard 
      onOpenPocrAuditor={() => setCurrentView('pocr')} 
      onOpenLogin={() => setCurrentView('login')}
    />
  );
}
