'use client';

import React, { useState, useMemo } from 'react';
import { MOCK_COURSES } from '@/lib/data/mockCourses';
import { evaluateCourse } from '@/lib/pocr/evaluator';
import { CourseData, EvaluationResult } from '@/types/pocr';
import { Header } from '@/components/Header';
import { RubricNav } from '@/components/RubricNav';
import { StandardCard } from '@/components/StandardCard';
import { InspectorPanel } from '@/components/InspectorPanel';
import { IngestionModal } from '@/components/IngestionModal';
import { ExportModal } from '@/components/ExportModal';
import { CheckCircle2, AlertTriangle, XCircle, Sparkles, Filter, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [courses, setCourses] = useState<CourseData[]>(MOCK_COURSES);
  const [selectedCourse, setSelectedCourse] = useState<CourseData>(MOCK_COURSES[0]);
  const [activeSection, setActiveSection] = useState<string>('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationResult | null>(null);

  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // Run real-time POCR Evaluation Engine on selected course
  const report = useMemo(() => {
    return evaluateCourse(selectedCourse);
  }, [selectedCourse]);

  // Filter evaluation results by section, status pill, and search text
  const filteredEvaluations = useMemo(() => {
    return report.evaluations.filter(e => {
      // Section match
      if (activeSection !== 'ALL' && e.section !== activeSection) {
        return false;
      }
      // Status match
      if (activeStatusFilter !== 'ALL' && e.status !== activeStatusFilter) {
        return false;
      }
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesCode = e.standardCode.toLowerCase().includes(q);
        const matchesSummary = e.summary.toLowerCase().includes(q);
        const matchesFindings = e.findings.some(f => f.toLowerCase().includes(q));
        return matchesTitle || matchesCode || matchesSummary || matchesFindings;
      }
      return true;
    });
  }, [report, activeSection, activeStatusFilter, searchQuery]);

  const handleAddCourse = (newCourse: CourseData) => {
    setCourses(prev => [newCourse, ...prev]);
    setSelectedCourse(newCourse);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans">
      
      {/* Top Navigation Bar */}
      <Header
        courses={courses}
        selectedCourse={selectedCourse}
        report={report}
        onSelectCourse={setSelectedCourse}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row p-4 lg:p-8 gap-6 max-w-[1750px] mx-auto w-full">
        
        {/* Left Sidebar: Navigation & Metrics */}
        <RubricNav
          activeSection={activeSection}
          activeStatusFilter={activeStatusFilter}
          searchQuery={searchQuery}
          report={report}
          onSelectSection={setActiveSection}
          onSelectStatusFilter={setActiveStatusFilter}
          onSearchChange={setSearchQuery}
        />

        {/* Center Workspace: Standard Cards */}
        <main className="flex-1 space-y-6">
          
          {/* Header Banner */}
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

            {/* Quick Filter Status Chips */}
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

          {/* List of Evaluated POCR Standards */}
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

            {filteredEvaluations.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-slate-800 space-y-3">
                <Filter className="w-10 h-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-300">
                  No rubric standards match your current filter settings.
                </h4>
                <p className="text-xs text-slate-500">
                  Try clearing search keywords or selecting "All Standards".
                </p>
              </div>
            ) : (
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
            )}
          </div>

        </main>

        {/* Right Inspector Panel Drawer (When standard selected) */}
        {selectedEvaluation && (
          <InspectorPanel
            evaluation={selectedEvaluation}
            onClose={() => setSelectedEvaluation(null)}
          />
        )}

      </div>

      {/* Ingestion & Export Modals */}
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

    </div>
  );
}
