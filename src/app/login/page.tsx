'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [message, setMessage] = useState('');

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
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
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
      window.location.href = '/dashboard';
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-[#00e87b] rounded-lg flex items-center justify-center font-bold text-black">
            C
          </div>
          <span className="text-xl font-bold text-white">CashPulse</span>
        </Link>

        <div className="bg-[#111] border border-[#222] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Start collecting'}
            {mode === 'forgot' && 'Reset password'}
          </h1>
          <p className="text-gray-400 mb-6">
            {mode === 'login' && 'Log in to your CashPulse dashboard'}
            {mode === 'signup' && 'Create your account — free to start'}
            {mode === 'forgot' && 'Enter your email to reset your password'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}
          {message && (
            <div className="bg-[#00e87b]/10 border border-[#00e87b]/20 rounded-lg p-3 mb-4 text-[#00e87b] text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-[#00e87b] focus:outline-none transition"
                placeholder="you@company.com"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-4 py-3 text-white focus:border-[#00e87b] focus:outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00e87b] text-black font-semibold py-3 rounded-lg hover:bg-[#00cc6a] transition disabled:opacity-50"
            >
              {loading
                ? 'Loading...'
                : mode === 'login'
                ? 'Log In'
                : mode === 'signup'
                ? 'Create Account'
                : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400 space-y-2">
            {mode === 'login' && (
              <>
                <p>
                  Don&apos;t have an account?{' '}
                  <button onClick={() => setMode('signup')} className="text-[#00e87b] hover:underline">
                    Sign up free
                  </button>
                </p>
                <p>
                  <button onClick={() => setMode('forgot')} className="text-gray-500 hover:text-gray-300">
                    Forgot password?
                  </button>
                </p>
              </>
            )}
            {mode === 'signup' && (
              <p>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-[#00e87b] hover:underline">
                  Log in
                </button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                <button onClick={() => setMode('login')} className="text-[#00e87b] hover:underline">
                  Back to login
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
