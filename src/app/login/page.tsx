'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [message, setMessage] = useState('');
  const [redirectTo, setRedirectTo] = useState('/dashboard');

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'signup') setMode('signup');
    const r = searchParams.get('redirect');
    if (r) setRedirectTo(r);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/dashboard`,
      });
      if (error) setError(error.message);
      else setMessage('Check your email for a password reset link.');
      setLoading(false);
      return;
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/onboarding` },
      });
      if (error) setError(error.message);
      else setMessage('Check your email to confirm your account, then log in.');
      setLoading(false);
      return;
    }

    // Login
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = redirectTo;
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 bg-[#00e87b] rounded-lg flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <span className="text-[22px] font-semibold text-white tracking-tight">CashPulse</span>
        </Link>

        {/* Card */}
        <div className="bg-[#111] border border-white/[0.06] rounded-2xl p-8">
          <h1 className="text-[22px] font-semibold text-white text-center mb-1">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="text-[14px] text-[#888] text-center mb-8">
            {mode === 'login' && 'Log in to continue to CashPulse'}
            {mode === 'signup' && 'Start your free 14-day trial'}
            {mode === 'forgot' && "We'll send you a reset link"}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-5 text-red-400 text-[13px]">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-[#00e87b]/10 border border-[#00e87b]/20 rounded-lg px-4 py-3 mb-5 text-[#00e87b] text-[13px]">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[13px] font-medium text-[#ccc] mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[15px] focus:border-[#00e87b] focus:ring-1 focus:ring-[#00e87b]/30 focus:outline-none transition placeholder:text-[#555]"
                placeholder="you@company.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[13px] font-medium text-[#ccc]">Password</label>
                  {mode === 'login' && (
                    <button type="button" onClick={() => setMode('forgot')} className="text-[12px] text-[#00e87b] hover:underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#0a0a0a] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[15px] focus:border-[#00e87b] focus:ring-1 focus:ring-[#00e87b]/30 focus:outline-none transition placeholder:text-[#555]"
                  placeholder="Minimum 6 characters"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00e87b] text-black font-semibold py-3 rounded-lg text-[15px] hover:bg-[#00c966] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Continue'
                : mode === 'signup'
                ? 'Continue'
                : 'Send reset link'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[12px] text-[#666] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Toggle login/signup */}
          <div className="text-center text-[14px] text-[#888]">
            {mode === 'login' && (
              <p>
                Don&apos;t have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-[#00e87b] font-medium hover:underline">
                  Sign up
                </button>
              </p>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-[#00e87b] font-medium hover:underline">
                  Log in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                <button onClick={() => setMode('login')} className="text-[#00e87b] font-medium hover:underline">
                  Back to log in
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-[#555] mt-6 leading-relaxed">
          By continuing, you agree to CashPulse&apos;s{' '}
          <a href="#" className="text-[#888] hover:text-white underline">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="text-[#888] hover:text-white underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00e87b] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
