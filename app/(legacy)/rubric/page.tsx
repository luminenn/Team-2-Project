'use client';

import React, { useState } from 'react';
import { POCR_RUBRIC_ITEMS } from '@/lib/pocr/rubric';
import { PocrRubricItem } from '@/types/pocr';
import { 
  BookOpen, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  Award, 
  Layers,
  HelpCircle
} from 'lucide-react';

export default function RubricPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'Accessibility Verification': true,
    'Section 1': true,
    'Section 2': true,
    'Section 3': true,
    'Section 4': true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const expandAll = () => {
    setOpenSections({
      'Accessibility Verification': true,
      'Section 1': true,
      'Section 2': true,
      'Section 3': true,
      'Section 4': true,
    });
  };

  const collapseAll = () => {
    setOpenSections({
      'Accessibility Verification': false,
      'Section 1': false,
      'Section 2': false,
      'Section 3': false,
      'Section 4': false,
    });
  };

  const filteredItems = POCR_RUBRIC_ITEMS.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.standardCode.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.alignedCriteria.toLowerCase().includes(q) ||
      item.exceptionalCriteria.toLowerCase().includes(q)
    );
  });

  const sections: { key: string; title: string; subtitle: string; color: string }[] = [
    {
      key: 'Accessibility Verification',
      title: 'Accessibility Verification Expectations',
      subtitle: 'WCAG 2.1 AA Standards for Images, Links, and Color Contrast',
      color: 'bg-rose-500',
    },
    {
      key: 'Section 1',
      title: 'Section 1: Policies & Support',
      subtitle: 'Standards 1.1 - 1.6 (Course Policies, AI Policy, Student Resources)',
      color: 'bg-blue-600',
    },
    {
      key: 'Section 2',
      title: 'Section 2: Course Structure',
      subtitle: 'Standards 2.1 - 2.6 (Navigation, Objectives, Alignment, Multimedia)',
      color: 'bg-[#6320EE]',
    },
    {
      key: 'Section 3',
      title: 'Section 3: Regular & Substantive Interaction (RSI)',
      subtitle: 'Standards 3.1 - 3.4 (Instructor Welcome, Contact, Turnaround Times, Peer Interaction)',
      color: 'bg-emerald-600',
    },
    {
      key: 'Section 4',
      title: 'Section 4: Assessments',
      subtitle: 'Standards 4.1 - 4.6 (Variety, Rubrics, Instructions, Feedback, Self-Reflection)',
      color: 'bg-amber-500',
    },
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      {/* Top Banner */}
      <div className="bg-[#6320EE] rounded-[32px] p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl shadow-purple-600/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#F8E14B] uppercase tracking-wider mb-1">
            <BookOpen className="w-4 h-4 text-[#F8E14B]" />
            <span>2027 CCC CVC Course Design Rubric Reference</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Full CVC Rubric Standards & Guidance
          </h1>
          <p className="text-xs text-white/90 mt-1.5 font-medium max-w-2xl leading-relaxed">
            In-app interactive reference viewer for California Community Colleges Peer Online Course Review. Search standards by keyword or explore criteria for Aligned and Exceptional outcomes.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={expandAll}
            className="px-3.5 py-2 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-sm transition"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-sm transition"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-[24px] border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search rubric by keyword (e.g. 'AI', 'Syllabus', 'Captions', 'RSI')..."
            className="w-full bg-[#F4F4F6] text-xs text-slate-900 placeholder:text-slate-400 rounded-full pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 font-medium"
          />
        </div>

        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-slate-950 font-black">{filteredItems.length}</span> of {POCR_RUBRIC_ITEMS.length} Rubric Standards
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-5">
        {sections.map((sec) => {
          const sectionItems = filteredItems.filter((i) => i.section === sec.key);
          if (searchQuery && sectionItems.length === 0) return null;

          const isOpen = openSections[sec.key] ?? true;

          return (
            <div
              key={sec.key}
              className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden transition"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleSection(sec.key)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/80 transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-3.5 h-10 rounded-full ${sec.color}`} />
                  <div>
                    <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
                      {sec.title}
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        {sectionItems.length} Standards
                      </span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {sec.subtitle}
                    </p>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 transition">
                  {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </button>

              {/* Accordion Content */}
              {isOpen && (
                <div className="p-6 pt-0 space-y-4 border-t border-slate-100">
                  {sectionItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#F8F9FC] rounded-2xl p-5 border border-slate-200/80 space-y-3 hover:border-[#6320EE]/40 transition"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <span className="px-3 py-1 rounded-lg bg-slate-950 text-white font-black text-xs tracking-wider">
                            {item.standardCode}
                          </span>
                          <h3 className="text-base font-extrabold text-slate-950">
                            {item.title}
                          </h3>
                        </div>

                        {item.id === '1.3' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
                            ✨ June 2026 AI Requirement
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {item.description}
                      </p>

                      {/* Criteria Comparison Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* Aligned Criteria */}
                        <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                          <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Aligned Standard Expectations
                          </span>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            {item.alignedCriteria}
                          </p>
                        </div>

                        {/* Exceptional Criteria */}
                        <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200/80 space-y-1.5">
                          <span className="text-[11px] font-black text-purple-800 uppercase tracking-wider flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-purple-600" /> Exceptional Quality Practice
                          </span>
                          <p className="text-xs text-slate-800 leading-relaxed font-medium">
                            {item.exceptionalCriteria}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center text-slate-500 font-medium border border-slate-200">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No CVC Rubric standards found matching search query "{searchQuery}".
          </div>
        )}
      </div>
    </div>
  );
}
