'use client';

import React, { useState } from 'react';
import { usePocr } from '@/lib/context/PocrContext';
import { User, Mail, Building, Shield, Check, Save, Sparkles, Bell, Layout, Heart } from 'lucide-react';

export default function ProfilePage() {
  const { userProfile, setUserProfile } = usePocr();
  const [formData, setFormData] = useState({ ...userProfile });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#6320EE] rounded-[32px] p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl shadow-purple-600/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#F8E14B] uppercase tracking-wider mb-1">
            <User className="w-4 h-4 text-[#F8E14B]" />
            <span>Faculty & Reviewer Profile</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Reviewer Profile & Preferences
          </h1>
          <p className="text-xs text-white/90 mt-1 font-medium">
            Manage your certified CCC POCR Reviewer credentials, institution affiliation, and UI/UX review preferences.
          </p>
        </div>

        <div className="w-16 h-16 rounded-full border-4 border-[#F8E14B] overflow-hidden shadow-lg shrink-0">
          <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md">
          <Check className="w-4 h-4" /> Profile details updated successfully!
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-8 border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Sparkles className="w-5 h-5 text-[#6320EE]" /> Personal & Academic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Full Name & Credentials</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">Institutional Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
                required
              />
            </div>
          </div>

          {/* Institution */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">College / Institution Affiliation</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
                required
              />
            </div>
          </div>

          {/* POCR Role */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 block">POCR Reviewer Role</label>
            <div className="relative">
              <Shield className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200 appearance-none"
              >
                <option value="Lead POCR Master Auditor & Instructional Designer">Lead POCR Master Auditor & Instructional Designer</option>
                <option value="Peer Course Reviewer">Peer Course Reviewer</option>
                <option value="Accessibility Specialist">Accessibility Specialist</option>
                <option value="Faculty Course Author">Faculty Course Author</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bio / Experience */}
        <div className="space-y-1.5 text-xs">
          <label className="font-bold text-slate-700 block">Reviewer Bio & Specialty Notes</label>
          <textarea
            rows={3}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            className="w-full bg-[#F4F4F6] text-slate-900 font-medium rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200 leading-relaxed"
          />
        </div>

        {/* UI/UX Preferences */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-sm font-black text-slate-950 flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#FF6B35]" /> Reviewer Workspace Preferences
          </h3>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F4F6] cursor-pointer">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">Email Audit Notifications</span>
                <span className="text-slate-500 text-[11px]">Receive summary reports when a course evaluation completes.</span>
              </div>
              <input
                type="checkbox"
                checked={formData.preferences.emailNotifications}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, emailNotifications: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-[#6320EE]"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#F4F4F6] cursor-pointer">
              <div className="space-y-0.5">
                <span className="font-bold text-slate-900 block">Automated YouTube Caption Scanning</span>
                <span className="text-slate-500 text-[11px]">Automatically check embedded videos upon IMSCC upload.</span>
              </div>
              <input
                type="checkbox"
                checked={formData.preferences.autoRunCaptions}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, autoRunCaptions: e.target.checked },
                  })
                }
                className="w-4 h-4 accent-[#6320EE]"
              />
            </label>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-[#F8E14B]" /> Save Profile Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
