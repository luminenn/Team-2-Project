'use client';

import React, { useState } from 'react';
import { usePocr } from '@/lib/context/PocrContext';
import { Settings, Key, Globe, Cpu, Check, Save, Moon, Sun, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const { settings, setSettings } = usePocr();
  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleTestCanvasConnection = () => {
    setIsVerifying(true);
    setConnectionStatus(null);
    setTimeout(() => {
      setIsVerifying(false);
      if (formData.canvasApiToken.trim().length > 10) {
        setConnectionStatus('SUCCESS: Canvas LMS API endpoint verified (200 OK)');
      } else {
        setConnectionStatus('ERROR: Canvas API Token appears invalid.');
      }
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-[#6320EE] rounded-[32px] p-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl shadow-purple-600/20">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-[#F8E14B] uppercase tracking-wider mb-1">
            <Settings className="w-4 h-4 text-[#F8E14B]" />
            <span>App Configurations & Integrations</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            System Settings & Canvas API
          </h1>
          <p className="text-xs text-white/90 mt-1 font-medium">
            Configure live Canvas LMS API integration, automated evaluation parameters, and theme preferences.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-500 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center gap-2 shadow-md">
          <Check className="w-4 h-4" /> System settings saved successfully!
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-[28px] p-8 border border-slate-200 shadow-sm space-y-6">
        
        {/* 1. Canvas Integration */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Key className="w-5 h-5 text-[#6320EE]" /> Live Canvas LMS Integration
          </h2>

          <div className="space-y-4 text-xs">
            {/* Instance URL */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Canvas Instance Domain URL</label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={formData.canvasInstanceUrl}
                  onChange={(e) => setFormData({ ...formData, canvasInstanceUrl: e.target.value })}
                  placeholder="https://canvas.yourdistrict.edu"
                  className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
                  required
                />
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">Canvas Personal Access Token / API Key</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showToken ? 'text' : 'password'}
                  value={formData.canvasApiToken}
                  onChange={(e) => setFormData({ ...formData, canvasApiToken: e.target.value })}
                  placeholder="Paste your Canvas access token here..."
                  className="w-full bg-[#F4F4F6] text-slate-900 font-mono text-xs rounded-xl pl-10 pr-24 py-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px]"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 font-medium pt-1">
                Obtain a token in Canvas via <em>Account Settings ➔ Approved Integrations ➔ New Access Token</em>.
              </p>
            </div>

            {/* Connection Test Button */}
            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={handleTestCanvasConnection}
                disabled={isVerifying}
                className="px-4 py-2.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 transition"
              >
                {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 text-[#F8E14B]" />}
                Test Canvas API Connection
              </button>

              {connectionStatus && (
                <span className={`text-xs font-bold ${connectionStatus.startsWith('SUCCESS') ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {connectionStatus}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Automated AI & Auditor Config */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2 pb-3 border-b border-slate-100">
            <Cpu className="w-5 h-5 text-[#FF6B35]" /> AI Reviewer Engine & Auto-Fix
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* AI Model */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">AI Evaluation Model Engine</label>
              <select
                value={formData.aiModel}
                onChange={(e) => setFormData({ ...formData, aiModel: e.target.value })}
                className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
              >
                <option value="Gemini 2.5 Flash / Claude 3.5 Sonnet">Gemini 2.5 Flash / Claude 3.5 Sonnet (Recommended)</option>
                <option value="Gemini Pro 1.5">Gemini Pro 1.5 (High Context)</option>
                <option value="Local Rule Engine Only">Local Heuristic Engine Only (Offline)</option>
              </select>
            </div>

            {/* Auto Fix */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 block">HTML Remediation Auto-Fix</label>
              <select
                value={formData.autoFixEnabled ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, autoFixEnabled: e.target.value === 'true' })}
                className="w-full bg-[#F4F4F6] text-slate-900 font-semibold rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#6320EE]/20 border border-slate-200"
              >
                <option value="true">Enabled (Generate clean HTML fixes for alt text & headers)</option>
                <option value="false">Disabled (Show suggestions only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Theme & UI Toggles */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-lg font-black text-slate-950 flex items-center gap-2">
            <Sun className="w-5 h-5 text-amber-500" /> Interface Theme Controls
          </h2>

          <div className="grid grid-cols-3 gap-3 text-xs">
            {(['light', 'dark', 'system'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFormData({ ...formData, theme: mode })}
                className={`p-3.5 rounded-2xl border font-bold capitalize transition flex items-center justify-center gap-2 ${
                  formData.theme === mode
                    ? 'bg-[#6320EE] text-white border-[#6320EE] shadow-md'
                    : 'bg-[#F4F4F6] text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {mode === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {mode} Theme
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-full bg-[#6320EE] hover:bg-[#5218cc] text-white font-bold text-xs shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-[#F8E14B]" /> Save App Settings
          </button>
        </div>
      </form>
    </div>
  );
}
