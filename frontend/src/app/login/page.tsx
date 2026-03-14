'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';
import { Package, Eye, EyeOff } from 'lucide-react';

type Tab = 'login' | 'signup' | 'forgot' | 'reset';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('login');
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();

  // ── Login ──
  const loginForm = useForm<{ loginId: string; password: string }>();
  const onLogin = async (data: any) => {
    try {
      const res = await authApi.login(data);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.loginId}!`);
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Login failed');
    }
  };

  // ── Signup ──
  const signupForm = useForm<any>();
  const onSignup = async (data: any) => {
    if (data.password !== data.confirm) { toast.error('Passwords do not match'); return; }
    try {
      const res = await authApi.signup(data);
      login(res.data.token, res.data.user);
      toast.success('Account created!');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Signup failed');
    }
  };

  // ── Forgot password ──
  const forgotForm = useForm<{ loginId: string }>();
  const onForgot = async (data: any) => {
    try {
      await authApi.forgotPw(data);
      toast.success('OTP sent to your email!');
      setTab('reset');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  // ── Reset password ──
  const resetForm = useForm<any>();
  const onReset = async (data: any) => {
    try {
      await authApi.resetPw(data);
      toast.success('Password reset! Please log in.');
      setTab('login');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm">
            <Package size={18} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 leading-none">CoreInventory</p>
            <p className="text-xs text-gray-500">Stock management system</p>
          </div>
        </div>

        <div className="card p-6">
          {/* Tabs */}
          {(tab === 'login' || tab === 'signup') && (
            <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-5">
              {(['login', 'signup'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-700 bg-white'}`}
                >
                  {t === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>
          )}

          {/* Login */}
          {tab === 'login' && (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-3">
              <div>
                <label className="label">Login ID</label>
                <input className="input" placeholder="e.g. admin" {...loginForm.register('loginId', { required: true })} />
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input className="input pr-9" type={showPw ? 'text' : 'password'} placeholder="••••••••" {...loginForm.register('password', { required: true })} />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2.5 top-2.5 text-gray-400">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary w-full justify-center mt-1" disabled={loginForm.formState.isSubmitting}>
                {loginForm.formState.isSubmitting ? 'Logging in…' : 'Log in'}
              </button>
              <p className="text-center text-xs text-gray-500">
                <button type="button" onClick={() => setTab('forgot')} className="text-brand-600 hover:underline">
                  Forgot password?
                </button>
              </p>
            </form>
          )}

          {/* Signup */}
          {tab === 'signup' && (
            <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-3">
              <div>
                <label className="label">Login ID (6–12 chars)</label>
                <input className="input" placeholder="e.g. jsmith" maxLength={12} {...signupForm.register('loginId', { required: true, minLength: 6, maxLength: 12 })} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" placeholder="you@company.com" {...signupForm.register('email', { required: true })} />
              </div>
              <div>
                <label className="label">Password</label>
                <input className="input" type="password" placeholder="Min 8 chars, upper + special" {...signupForm.register('password', { required: true })} />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input className="input" type="password" placeholder="Repeat password" {...signupForm.register('confirm', { required: true })} />
              </div>
              <button type="submit" className="btn btn-primary w-full justify-center" disabled={signupForm.formState.isSubmitting}>
                {signupForm.formState.isSubmitting ? 'Creating…' : 'Create account'}
              </button>
            </form>
          )}

          {/* Forgot */}
          {tab === 'forgot' && (
            <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">Enter your login ID and we'll send an OTP to your email.</p>
              <div>
                <label className="label">Login ID</label>
                <input className="input" placeholder="Your login ID" {...forgotForm.register('loginId', { required: true })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTab('login')} className="btn flex-1 justify-center">Back</button>
                <button type="submit" className="btn btn-primary flex-1 justify-center" disabled={forgotForm.formState.isSubmitting}>
                  {forgotForm.formState.isSubmitting ? 'Sending…' : 'Send OTP'}
                </button>
              </div>
            </form>
          )}

          {/* Reset */}
          {tab === 'reset' && (
            <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">Enter the OTP you received and your new password.</p>
              <div>
                <label className="label">Login ID</label>
                <input className="input" {...resetForm.register('loginId', { required: true })} />
              </div>
              <div>
                <label className="label">OTP</label>
                <input className="input" placeholder="6-digit OTP" maxLength={6} {...resetForm.register('otp', { required: true })} />
              </div>
              <div>
                <label className="label">New password</label>
                <input className="input" type="password" {...resetForm.register('newPassword', { required: true })} />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setTab('forgot')} className="btn flex-1 justify-center">Back</button>
                <button type="submit" className="btn btn-primary flex-1 justify-center" disabled={resetForm.formState.isSubmitting}>
                  {resetForm.formState.isSubmitting ? 'Resetting…' : 'Reset password'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">Demo: <code className="font-mono bg-gray-100 px-1 rounded">admin</code> / <code className="font-mono bg-gray-100 px-1 rounded">Admin@123</code></p>
      </div>
    </div>
  );
}
