'use client';

import React, { useState } from 'react';
import { StarLogoSvg } from './graphics/StarLogoSvg';
import { LoginCharactersSvg } from './graphics/LoginCharactersSvg';
import { Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('student@college.edu');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-[#E5E5E7] flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-5xl bg-[#EBEBEF] rounded-[32px] border border-slate-300 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[640px]">
        
        {/* Left Side: Geometric Character Illustration */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex items-center justify-center relative bg-[#EBEBEF]">
          <LoginCharactersSvg className="w-full max-w-md h-auto" />
        </div>

        {/* Right Side: Clean White Login Card */}
        <div className="w-full md:w-1/2 bg-white p-8 sm:p-14 flex flex-col justify-between border-l border-slate-200/60 rounded-t-[32px] md:rounded-t-none md:rounded-l-[32px]">
          
          {/* Top Star Logo */}
          <div className="flex justify-center mb-6">
            <StarLogoSvg className="w-9 h-9 text-slate-950" />
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">
              Welcome back!
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Please enter your details
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto w-full">
            
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pb-2 pt-1 border-b border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-950 transition bg-transparent"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-1.5 relative">
              <label className="block text-xs font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pb-2 pt-1 border-b border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:border-slate-950 transition bg-transparent pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-slate-950 focus:ring-0 cursor-pointer accent-slate-950"
                />
                <span>Remember for 30 days</span>
              </label>

              <button type="button" className="text-slate-400 hover:text-slate-700 font-medium transition">
                Forgot password?
              </button>
            </div>

            {/* Buttons */}
            <div className="space-y-3 pt-4">
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-full bg-[#18181B] hover:bg-black text-white font-semibold text-sm transition duration-150 shadow-md"
              >
                Log In
              </button>

              <button
                type="button"
                onClick={onLoginSuccess}
                className="w-full py-3.5 px-4 rounded-full bg-[#F4F4F6] hover:bg-[#EBEBEF] text-slate-900 font-semibold text-sm transition duration-150 flex items-center justify-center gap-3 border border-slate-200/80"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Log in with Google</span>
              </button>
            </div>

          </form>

          {/* Footer */}
          <div className="text-center text-xs text-slate-500 font-medium mt-8">
            Don't have an account?{' '}
            <button onClick={onLoginSuccess} className="text-slate-950 font-bold hover:underline">
              Sign Up
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
