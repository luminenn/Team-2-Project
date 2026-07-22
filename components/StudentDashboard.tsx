'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrainFlameSvg } from './graphics/BrainFlameSvg';
import { 
  Settings, 
  Search, 
  Bell, 
  ArrowUpRight, 
  Plus, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Zap, 
  BarChart3, 
  BookOpen, 
  ShieldCheck,
  FolderPlus,
  Trash2,
  Layers,
  FileText,
  AlertCircle
} from 'lucide-react';
import { usePocr } from '@/lib/context/PocrContext';
import { evaluateCourse } from '@/lib/pocr/evaluator';

export const StudentDashboard: React.FC = () => {
  const router = useRouter();
  const { 
    uploadedCourses, 
    openCourseInAuditor, 
    deleteCourse, 
    userProfile, 
    uploadCourse, 
    isUploading 
  } = usePocr();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseModal, setSelectedCourseModal] = useState<any | null>(null);
  const [activeModalType, setActiveModalType] = useState<'readMore' | 'stats' | 'homework' | 'notifications' | null>(null);
  const [notificationDismissed, setNotificationDismissed] = useState(false);

  const filteredCourses = uploadedCourses.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.instructor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        await uploadCourse(files[0]);
        router.push('/auditor');
      } catch (err) {
        console.error('File select error:', err);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full">
      {/* Top Header Bar */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search uploaded courses..."
            className="w-full bg-[#EBEBEF] text-xs text-slate-900 placeholder:text-slate-400 rounded-full pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-950/20 font-medium transition"
          />
        </div>

        {/* Quick Actions & Top Right Icons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Primary Top-Right Button: Open POCR Auditor */}
          <Link
            href="/auditor"
            className="px-5 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition shadow-md flex items-center gap-2"
          >
            <Zap className="w-4 h-4 text-[#F8E14B]" />
            <span>Open POCR Auditor</span>
            <span className="text-[#F8E14B]">➔</span>
          </Link>

          <Link
            href="/rubric"
            className="w-10 h-10 rounded-full bg-[#EBEBEF] hover:bg-[#E2E2E6] flex items-center justify-center text-slate-700 transition"
            title="CVC Rubric Reference"
          >
            <BookOpen className="w-4 h-4" />
          </Link>

          <button 
            onClick={() => setActiveModalType('notifications')}
            className="w-10 h-10 rounded-full bg-[#EBEBEF] hover:bg-[#E2E2E6] flex items-center justify-center text-slate-700 transition relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {!notificationDismissed && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] absolute top-2 right-2 border-2 border-[#EBEBEF]" />
            )}
          </button>

          <Link
            href="/settings"
            className="w-10 h-10 rounded-full bg-[#EBEBEF] hover:bg-[#E2E2E6] flex items-center justify-center text-slate-700 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* CARDS GRID ROW (PURPLE BANNER + STATS + OFFERS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* 1. Primary Vibrant Purple Banner Card (5 cols) */}
        <div className="lg:col-span-5 bg-[#6320EE] rounded-[32px] p-7 text-white flex flex-col justify-between relative overflow-hidden min-h-[310px] shadow-xl shadow-purple-600/20 group">
          
          {/* Top Row: Read More & Arrow Button */}
          <div className="flex items-center justify-between z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F8E14B] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> CCC CVC Standard 2027
            </span>
            <button 
              onClick={() => setActiveModalType('readMore')}
              className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition group-hover:scale-105"
              title="Read standard guidelines"
            >
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>

          {/* Main Headline */}
          <div className="my-5 z-10 max-w-[280px]">
            <h2 className="text-3xl font-black tracking-tight leading-[1.12]">
              Canvas Cartridge Auditor.
            </h2>
            <p className="text-xs text-white/80 mt-2 leading-relaxed font-medium">
              Upload your Canvas .imscc course exports to evaluate accessibility, RSI, and course structure.
            </p>
          </div>

          {/* Bottom Action Button */}
          <div className="z-10 pt-2 flex items-center gap-3">
            <label className="cursor-pointer px-4 py-2 rounded-full bg-[#F8E14B] hover:bg-yellow-300 text-slate-950 font-black text-xs transition shadow">
              Upload .imscc Cartridge ➔
              <input
                type="file"
                accept=".imscc,.zip,.xml,.json"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Stylized Brain-Flame Graphic (Bottom Right) */}
          <div className="absolute -bottom-4 -right-4 z-0 pointer-events-none opacity-90 group-hover:scale-105 transition-transform duration-300">
            <BrainFlameSvg className="w-48 h-48 drop-shadow-lg" />
          </div>
        </div>

        {/* 2. Middle Stats Section (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4 justify-between">
          
          {/* Top: Statistics Pastel Blue Card */}
          <div className="bg-[#D0E2FF] rounded-[28px] p-6 flex items-center justify-between relative min-h-[145px] shadow-sm hover:shadow-md transition">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#1E3A8A] uppercase tracking-wider">Uploaded Courses</span>
              <div className="text-4xl font-black text-slate-950 tracking-tight">
                {uploadedCourses.length}
              </div>
              <p className="text-[11px] text-slate-700 font-medium">Active Canvas cartridges in store</p>
            </div>

            {/* Right Bar Chart Illustration */}
            <div className="flex items-end gap-1.5 h-16 mr-6">
              <div className="w-3 bg-slate-950 rounded-t-sm h-[35%]" />
              <div className="w-3 bg-slate-950 rounded-t-sm h-[50%]" />
              <div className="w-3 bg-slate-950 rounded-t-sm h-[70%]" />
              <div className="w-3 bg-slate-950 rounded-t-sm h-[85%]" />
              <div className="w-3 bg-[#6320EE] rounded-t-sm h-[100%]" />
            </div>

            <button 
              onClick={() => setActiveModalType('stats')}
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-950 absolute top-5 right-5 transition shadow-sm"
              title="View Statistics"
            >
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom: Homework Yellow Card + Plus Card */}
          <div className="grid grid-cols-12 gap-4">
            
            {/* Yellow Alignment Card (9 cols) */}
            <div className="col-span-9 bg-[#F8E14B] rounded-[28px] p-6 flex flex-col justify-between min-h-[145px] relative shadow-sm hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-950 uppercase tracking-wider">Compliance Status</span>
                <button 
                  onClick={() => setActiveModalType('homework')}
                  className="w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center text-slate-950 transition shadow-sm"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-950 tracking-tight mt-2">
                  {uploadedCourses.length > 0 ? 'Ready' : '0 Cartridges'}
                </div>
                <p className="text-[11px] font-bold text-slate-800 mt-1">CCC POCR Rubric Verification</p>
              </div>
            </div>

            {/* White Plus Button Card (3 cols) */}
            <Link 
              href="/auditor"
              className="col-span-3 bg-white hover:bg-slate-950 group rounded-[24px] flex flex-col items-center justify-center transition shadow-sm border border-slate-200"
              title="Start New Course Audit"
            >
              <Plus className="w-7 h-7 text-slate-950 group-hover:text-white transition" />
              <span className="text-[9px] font-extrabold text-slate-600 group-hover:text-[#F8E14B] uppercase mt-1">New</span>
            </Link>
          </div>

        </div>

        {/* 3. Right Dark Offers Card (3 cols) */}
        <div className="lg:col-span-3 bg-[#18181B] rounded-[32px] p-6 text-white flex flex-col justify-between min-h-[310px] shadow-xl border border-slate-800">
          
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#F8E14B]">Master Reviewer</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-200">
              Welcome back, <span className="text-[#F8E14B] font-bold">{userProfile.name}</span>. You have <span className="px-2 py-0.5 inline-flex items-center justify-center rounded-full bg-white text-slate-950 font-black text-xs">{uploadedCourses.length}</span> parsed course packages ready for review.
            </p>

            <div className="flex items-center -space-x-2 pt-2">
              <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Reviewer" className="w-9 h-9 rounded-full border-2 border-[#18181B] object-cover" />
              <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Reviewer" className="w-9 h-9 rounded-full border-2 border-[#18181B] object-cover" />
              <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Reviewer" className="w-9 h-9 rounded-full border-2 border-[#18181B] object-cover" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Link
              href="/history"
              className="w-full py-2.5 rounded-full bg-[#27272A] hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
            >
              <BarChart3 className="w-4 h-4 text-[#F8E14B]" /> View Evaluation History
            </Link>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DYNAMIC UPLOADED COURSES LIST / EMPTY STATE */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        
        {/* List Header */}
        <div className="flex items-center justify-between px-2">
          <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#6320EE]" />
            Uploaded Canvas Courses (.imscc)
          </h3>
          {uploadedCourses.length > 0 && (
            <div className="hidden sm:flex items-center gap-16 text-xs font-bold text-slate-400 pr-28 uppercase tracking-wider">
              <span>Modules</span>
              <span>POCR Score</span>
            </div>
          )}
        </div>

        {/* Dynamic Course Rows */}
        {uploadedCourses.length > 0 ? (
          <div className="space-y-3">
            {filteredCourses.map((course) => {
              const report = evaluateCourse(course);
              return (
                <div
                  key={course.id}
                  className="bg-[#EBEBEF] hover:bg-[#E2E2E6] transition-all rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-300/60 shadow-sm"
                >
                  {/* Left: Icon, Title, Code */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-sm shrink-0">
                      <FileText className="w-6 h-6 text-[#6320EE]" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-black text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-300 font-mono">
                          {course.code || 'CANVAS'}
                        </span>
                        <h4 className="text-base font-bold text-slate-950">
                          {course.title}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {report.overallStatus}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium">
                        Instructor: <strong>{course.instructor}</strong> • Term: {course.term} • Pages: {course.pages.length}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Modules Count & Score */}
                  <div className="flex items-center justify-between sm:justify-end gap-8 sm:gap-16 text-sm font-semibold text-slate-800">
                    <span className="font-bold text-slate-950 flex items-center gap-1">
                      <Layers className="w-4 h-4 text-slate-400" /> {course.modules.length} Modules
                    </span>
                    <span className="font-black text-[#6320EE] text-base">{report.overallScore}%</span>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCourseInAuditor(course.id)}
                        className="px-4 py-2 rounded-full bg-white hover:bg-slate-950 hover:text-white text-slate-950 font-bold text-xs border border-slate-300 transition duration-150 shadow-sm"
                      >
                        Audit
                      </button>
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="p-2 rounded-full bg-white hover:bg-rose-500 hover:text-white text-rose-500 transition border border-slate-300"
                        title="Delete course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE BANNER */
          <div className="bg-white rounded-[28px] p-8 lg:p-10 border border-slate-200 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-[#6320EE] flex items-center justify-center mx-auto shadow-inner">
              <FolderPlus className="w-8 h-8 text-[#6320EE]" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h4 className="text-lg font-black text-slate-950">No Canvas Courses Uploaded Yet</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Upload your first <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-900 font-bold">.imscc</code> Canvas cartridge to evaluate Accessibility, RSI, and Course Structure against the 2027 CCC CVC Rubric.
              </p>
            </div>
            <div className="pt-2">
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-md transition">
                <Plus className="w-4 h-4 text-[#F8E14B]" /> Upload First Course (.imscc)
                <input
                  type="file"
                  accept=".imscc,.zip,.xml,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS */}
      {/* ========================================================================= */}

      {/* Read More Modal */}
      {activeModalType === 'readMore' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-7 space-y-5 shadow-2xl animate-in zoom-in-95 border border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#6320EE] text-white flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-black text-slate-950">2027 CCC CVC Course Design Guidelines</h3>
              </div>
              <button onClick={() => setActiveModalType(null)} className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-950">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              The <strong>CCC POCR framework</strong> evaluates Canvas online courses across 5 critical dimensions:
            </p>

            <div className="space-y-2 border-l-2 border-[#6320EE] pl-4 py-1 text-xs text-slate-800">
              <p><strong>Section 1:</strong> Policies, Support & AI Standard 1.3.</p>
              <p><strong>Section 2:</strong> Course Structure, Objectives, Alignment & Multimedia.</p>
              <p><strong>Section 3:</strong> Regular & Substantive Interaction (RSI).</p>
              <p><strong>Section 4 & A11Y:</strong> Assessments, Rubrics, Alt Text, and Video Captions.</p>
            </div>

            <div className="flex gap-3 pt-3">
              <Link
                href="/rubric"
                onClick={() => setActiveModalType(null)}
                className="flex-1 py-3 rounded-full bg-[#6320EE] text-white font-bold text-xs text-center transition shadow-md"
              >
                Browse Interactive CVC Rubric ➔
              </Link>
              <button onClick={() => setActiveModalType(null)} className="px-5 py-3 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {activeModalType === 'stats' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#6320EE]" /> Course Store Statistics
              </h3>
              <button onClick={() => setActiveModalType(null)} className="p-1.5 rounded-full bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50 text-blue-900 text-xs space-y-2 font-semibold">
              <div className="flex justify-between"><span>Uploaded Courses:</span><span>{uploadedCourses.length}</span></div>
              <div className="flex justify-between"><span>Total Modules Extracted:</span><span>{uploadedCourses.reduce((acc, c) => acc + c.modules.length, 0)}</span></div>
              <div className="flex justify-between"><span>Total Pages Scanned:</span><span>{uploadedCourses.reduce((acc, c) => acc + c.pages.length, 0)}</span></div>
            </div>
            <button onClick={() => setActiveModalType(null)} className="w-full py-3 rounded-full bg-slate-950 text-white font-bold text-xs">
              Close Statistics
            </button>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {activeModalType === 'notifications' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-7 space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#FF6B35]" /> Review Notifications
              </h3>
              <button onClick={() => setActiveModalType(null)} className="p-1.5 rounded-full bg-slate-100 text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600 font-medium">
              {uploadedCourses.length > 0 
                ? `${uploadedCourses.length} Canvas courses are loaded and ready for audit.` 
                : 'No unread notifications. Upload a course package to begin.'}
            </p>
            <button 
              onClick={() => {
                setNotificationDismissed(true);
                setActiveModalType(null);
              }} 
              className="w-full py-3 rounded-full bg-slate-950 text-white font-bold text-xs"
            >
              Mark All as Read
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
