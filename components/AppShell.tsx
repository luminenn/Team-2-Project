'use client';

import React from 'react';
import { Sidebar } from './Sidebar';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#E5E5E7] p-2 sm:p-4 font-sans text-slate-900">
      <div className="w-full h-full bg-[#F4F4F6] rounded-[32px] shadow-2xl border border-slate-300/80 p-3 sm:p-5 flex flex-col md:flex-row gap-5 overflow-hidden">
        {/* Fixed Left Vertical Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto p-2 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
};
