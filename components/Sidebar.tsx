'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StarLogoSvg } from './graphics/StarLogoSvg';
import { 
  LayoutGrid, 
  ShieldCheck, 
  History, 
  BookOpen, 
  User, 
  Settings 
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutGrid },
  { name: 'POCR Auditor', href: '/auditor', icon: ShieldCheck, badge: '⚡' },
  { name: 'Evaluation History', href: '/history', icon: History },
  { name: 'CVC Rubric', href: '/rubric', icon: BookOpen },
  { name: 'Profile', href: '/profile', icon: User },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-20 lg:w-64 bg-[#18181B] rounded-[28px] p-4 flex flex-col justify-between shrink-0 shadow-xl border border-slate-800 transition-all duration-200">
      <div className="space-y-6">
        {/* Top Branding Logo */}
        <Link 
          href="/" 
          className="flex items-center gap-3.5 px-2 py-1 group cursor-pointer"
          title="POCR-Bot Dashboard"
        >
          <div className="w-12 h-12 rounded-2xl bg-white text-slate-950 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0">
            <StarLogoSvg className="w-6 h-6 text-slate-950" />
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-white font-extrabold text-base tracking-tight leading-none">
              POCR-Bot
            </span>
            <span className="text-[11px] font-semibold text-[#F8E14B] tracking-wider uppercase mt-1">
              CCC CVC Auditor
            </span>
          </div>
        </Link>

        {/* Navigation Section */}
        <nav className="flex md:flex-col items-center lg:items-stretch gap-2">
          <div className="hidden lg:block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 px-3 py-1">
            Navigation
          </div>
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl font-semibold text-xs transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#27272A] text-white shadow-md border border-slate-700/60'
                    : 'text-slate-400 hover:text-white hover:bg-[#27272A]/60'
                }`}
                title={item.name}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-[#6320EE] rounded-r-full hidden lg:block" />
                )}

                <div className={`p-1.5 rounded-xl transition shrink-0 ${isActive ? 'text-[#F8E14B]' : 'text-slate-400 group-hover:text-white'}`}>
                  <IconComponent className="w-5 h-5" />
                </div>

                <span className="hidden lg:inline-block font-bold text-sm tracking-tight truncate flex-1">
                  {item.name}
                </span>

                {item.badge && (
                  <span className="hidden lg:inline-flex px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-[#6320EE] text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Info Card */}
      <div className="hidden lg:block pt-4 border-t border-slate-800/80 px-2">
        <div className="bg-[#27272A]/80 rounded-2xl p-3 border border-slate-700/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#6320EE] text-white font-black text-xs flex items-center justify-center shadow shrink-0">
            CVC
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">CCC Rubric 2027</p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Standard 1-4 & A11Y</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
