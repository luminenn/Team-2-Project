'use client';

import React, { useState } from 'react';
import { StarLogoSvg } from './graphics/StarLogoSvg';
import { BrainFlameSvg } from './graphics/BrainFlameSvg';
import { 
  LayoutGrid, MessageSquare, Folder, ShoppingBag, BarChart3, Settings, 
  Moon, Search, SlidersHorizontal, Bell, ArrowUpRight, Plus, Compass, 
  RotateCw, Sun, ChevronRight, X
} from 'lucide-react';

interface StudentDashboardProps {
  onOpenPocrAuditor?: () => void;
  onOpenLogin?: () => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
  onOpenPocrAuditor,
  onOpenLogin
}) => {
  const [activeTab, setActiveTab] = useState('grid');
  const [selectedCourseModal, setSelectedCourseModal] = useState<any | null>(null);

  const courses = [
    {
      id: 1,
      title: 'Graphic Design',
      tag: 'MEDIUM',
      tagBg: 'bg-[#FF6B35] text-white',
      date: '12.05.2023',
      duration: '142h',
      icon: Settings,
      description: 'Master vector illustrations, visual composition, brand identity systems, and typography.'
    },
    {
      id: 2,
      title: 'Product Management',
      tag: 'JUNIOR',
      tagBg: 'bg-[#F8E14B] text-slate-950',
      date: '22.06.2023',
      duration: '262h',
      icon: RotateCw,
      description: 'Learn roadmap strategy, user story mapping, agile sprints, metrics tracking, and product market fit.'
    },
    {
      id: 3,
      title: 'UI/UX Design',
      tag: 'BEGINNER',
      tagBg: 'bg-[#D0E2FF] text-[#1E3A8A]',
      date: '17.07.2023',
      duration: '184h',
      icon: Compass,
      description: 'Design intuitive wireframes, interactive Figma prototypes, usability testing, and design systems.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#E5E5E7] p-3 sm:p-6 font-sans text-slate-900 flex items-center justify-center">
      <div className="w-full max-w-[1440px] bg-[#F4F4F6] rounded-[36px] shadow-2xl border border-slate-300/80 p-4 sm:p-6 flex flex-col md:flex-row gap-6 min-h-[860px]">
        
        {/* ========================================================================= */}
        {/* SLIM LEFT SIDEBAR */}
        {/* ========================================================================= */}
        <aside className="w-full md:w-20 bg-[#18181B] rounded-[28px] p-4 flex flex-row md:flex-col items-center justify-between shrink-0 shadow-lg">
          
          {/* Top Star Logo */}
          <div className="w-12 h-12 rounded-2xl bg-white text-slate-950 flex items-center justify-center shadow-md">
            <StarLogoSvg className="w-6 h-6 text-slate-950" />
          </div>

          {/* Center Navigation Icons */}
          <div className="flex md:flex-col items-center gap-5 my-4 md:my-0">
            <button
              onClick={() => setActiveTab('grid')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                activeTab === 'grid' ? 'bg-[#27272A] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                activeTab === 'chat' ? 'bg-[#27272A] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('folder')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                activeTab === 'folder' ? 'bg-[#27272A] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('shop')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                activeTab === 'shop' ? 'bg-[#27272A] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('stats')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                activeTab === 'stats' ? 'bg-[#27272A] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition ${
                activeTab === 'settings' ? 'bg-[#27272A] text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Moon Dark Mode Icon Button */}
          <button
            onClick={onOpenLogin}
            title="Toggle View / Login Page"
            className="w-12 h-12 rounded-full bg-[#27272A] hover:bg-[#3F3F46] text-slate-300 hover:text-white flex items-center justify-center transition shadow-inner"
          >
            <Moon className="w-5 h-5 fill-slate-300" />
          </button>
        </aside>

        {/* ========================================================================= */}
        {/* MAIN WORKSPACE CONTENT */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col gap-6">
          
          {/* Top Header Bar */}
          <header className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-[#EBEBEF] text-xs text-slate-900 placeholder:text-slate-400 rounded-full pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-950/20 font-medium"
              />
            </div>

            {/* Quick Actions & Top Right Icons */}
            <div className="flex items-center gap-3">
              
              {/* Optional POCR Auditor Switcher */}
              {onOpenPocrAuditor && (
                <button
                  onClick={onOpenPocrAuditor}
                  className="px-4 py-2.5 rounded-full bg-slate-950 hover:bg-slate-800 text-white text-xs font-semibold transition shadow-sm mr-2"
                >
                  Open POCR Auditor ➔
                </button>
              )}

              <button className="w-10 h-10 rounded-full bg-[#EBEBEF] hover:bg-[#E2E2E6] flex items-center justify-center text-slate-700 transition">
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              <button className="w-10 h-10 rounded-full bg-[#EBEBEF] hover:bg-[#E2E2E6] flex items-center justify-center text-slate-700 transition relative">
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-[#FF6B35] absolute top-2.5 right-2.5" />
              </button>

              <button className="w-10 h-10 rounded-full bg-[#EBEBEF] hover:bg-[#E2E2E6] flex items-center justify-center text-slate-700 transition">
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* ========================================================================= */}
          {/* CARDS GRID ROW (PURPLE BANNER + STATS + OFFERS) */}
          {/* ========================================================================= */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* 1. Primary Vibrant Purple Banner Card (5 cols) */}
            <div className="lg:col-span-5 bg-[#6320EE] rounded-[32px] p-7 text-white flex flex-col justify-between relative overflow-hidden min-h-[300px] shadow-xl shadow-purple-600/20">
              
              {/* Top Row: Read More & Arrow Button */}
              <div className="flex items-center justify-between z-10">
                <span className="text-xs font-medium tracking-wide text-white/90">
                  Read more
                </span>
                <button className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white transition">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Main Headline */}
              <div className="my-6 z-10 max-w-[240px]">
                <h2 className="text-3xl font-bold tracking-tight leading-[1.15]">
                  Curriculum is going to be very hot.
                </h2>
              </div>

              {/* Stylized Brain-Flame Graphic (Bottom Right) */}
              <div className="absolute -bottom-2 -right-2 z-0 pointer-events-none">
                <BrainFlameSvg className="w-44 h-44 drop-shadow-md" />
              </div>
            </div>

            {/* 2. Middle Stats Section (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4 justify-between">
              
              {/* Top: 32h Statistics Pastel Blue Card */}
              <div className="bg-[#D0E2FF] rounded-[28px] p-6 flex items-center justify-between relative min-h-[140px] shadow-sm">
                <div className="space-y-4">
                  <span className="text-xs font-semibold text-slate-700">Statistics</span>
                  <div className="text-4xl font-extrabold text-slate-950 tracking-tight">
                    32h
                  </div>
                </div>

                {/* Right Bar Chart Illustration */}
                <div className="flex items-end gap-1.5 h-16 mr-8">
                  <div className="w-3 bg-slate-950 rounded-t-sm h-[30%]" />
                  <div className="w-3 bg-slate-950 rounded-t-sm h-[45%]" />
                  <div className="w-3 bg-slate-950 rounded-t-sm h-[65%]" />
                  <div className="w-3 bg-slate-950 rounded-t-sm h-[80%]" />
                  <div className="w-3 bg-slate-950 rounded-t-sm h-[100%]" />
                </div>

                <button className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-950 absolute top-5 right-5 transition">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {/* Bottom: Homework Yellow Card + Plus Card */}
              <div className="grid grid-cols-12 gap-4">
                
                {/* Yellow Homework Card (9 cols) */}
                <div className="col-span-9 bg-[#F8E14B] rounded-[28px] p-6 flex flex-col justify-between min-h-[140px] relative shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">Homework</span>
                    <button className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-slate-950 transition">
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-4xl font-extrabold text-slate-950 tracking-tight mt-3">
                    +80%
                  </div>
                </div>

                {/* White Plus Button Card (3 cols) */}
                <button className="col-span-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-[24px] flex items-center justify-center transition shadow-sm">
                  <Plus className="w-6 h-6 text-slate-950" />
                </button>
              </div>

            </div>

            {/* 3. Right Dark Offers Card (3 cols) */}
            <div className="lg:col-span-3 bg-[#18181B] rounded-[32px] p-6 text-white flex flex-col justify-between min-h-[300px] shadow-xl">
              
              {/* Copy Heading */}
              <div className="space-y-4 pt-1">
                <p className="text-sm font-medium leading-relaxed text-slate-200">
                  Until August <span className="w-6 h-6 inline-flex items-center justify-center rounded-full bg-white text-slate-950 font-bold text-xs">6</span> choose a discount curriculum. The best <span className="px-2 py-0.5 inline-flex items-center justify-center rounded-full bg-white text-slate-950 font-bold text-xs">12</span> tutors will always help you.
                </p>

                {/* Avatar Stack */}
                <div className="flex items-center -space-x-2 pt-2">
                  <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Tutor" className="w-9 h-9 rounded-full border-2 border-[#18181B] object-cover" />
                  <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Tutor" className="w-9 h-9 rounded-full border-2 border-[#18181B] object-cover" />
                  <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Tutor" className="w-9 h-9 rounded-full border-2 border-[#18181B] object-cover" />
                </div>
              </div>

              {/* Bottom Metadata */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-4 border-t border-slate-800 font-medium">
                <span>Course start</span>
                <span className="text-slate-200 font-mono">06/08/2023</span>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* UPCOMING COURSES SEGMENTED LIST */}
          {/* ========================================================================= */}
          <div className="space-y-4 pt-2">
            
            {/* List Header */}
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-bold text-slate-900">
                Upcoming courses. Find Your Own!
              </h3>
              <div className="hidden sm:flex items-center gap-24 text-xs font-semibold text-slate-400 pr-32">
                <span>Start</span>
                <span>Time</span>
              </div>
            </div>

            {/* Course Rows */}
            <div className="space-y-3">
              {courses.map((course) => {
                const IconComp = course.icon;
                return (
                  <div
                    key={course.id}
                    className="bg-[#EBEBEF] hover:bg-[#E5E5E9] transition-all rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    
                    {/* Left: Icon, Title, Level Tag */}
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center text-slate-900 shadow-sm shrink-0">
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="flex items-center gap-3">
                        <h4 className="text-base font-bold text-slate-950">
                          {course.title}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${course.tagBg}`}>
                          {course.tag}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Start Date & Duration */}
                    <div className="flex items-center justify-between sm:justify-end gap-12 sm:gap-24 text-sm font-semibold text-slate-800">
                      <span className="font-mono text-xs font-medium text-slate-600">{course.date}</span>
                      <span className="font-bold text-slate-950">{course.duration}</span>
                      
                      {/* View Details Button */}
                      <button
                        onClick={() => setSelectedCourseModal(course)}
                        className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-950 hover:text-white text-slate-950 font-semibold text-xs border border-slate-300 transition duration-150 shadow-sm"
                      >
                        View details
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </main>
      </div>

      {/* Course Detail Modal */}
      {selectedCourseModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedCourseModal.tagBg}`}>
                {selectedCourseModal.tag}
              </span>
              <button
                onClick={() => setSelectedCourseModal(null)}
                className="p-1 rounded-full bg-slate-100 text-slate-500 hover:text-slate-950 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 className="text-2xl font-bold text-slate-950">
              {selectedCourseModal.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {selectedCourseModal.description}
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-800">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Start Date</span>
                <span>{selectedCourseModal.date}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-slate-400 uppercase">Duration</span>
                <span>{selectedCourseModal.duration}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedCourseModal(null)}
              className="w-full py-3 rounded-full bg-slate-950 text-white font-semibold text-xs hover:bg-slate-800 transition"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
