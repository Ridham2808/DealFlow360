'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
  ArrowRight, ShieldCheck, MailCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../lib/api';

const DEMO_ACCOUNTS = [
  { role: 'SALES_REP',     email: 'rep@dealflow360.com',     label: 'Sales Rep',  abbr: 'SR' },
  { role: 'SALES_MANAGER', email: 'manager@dealflow360.com', label: 'Manager',    abbr: 'SM' },
  { role: 'FINANCE',       email: 'finance@dealflow360.com', label: 'Finance',    abbr: 'FN' },
  { role: 'ADMIN',         email: 'admin@dealflow360.com',   label: 'Admin',      abbr: 'AD' },
  { role: 'CUSTOMER',      email: 'customer@acmecorp.com',   label: 'Customer',   abbr: 'CU' },
];

const ROLE_LABELS = {
  SALES_REP:     'Sales Representative',
  SALES_MANAGER: 'Sales Manager',
  FINANCE:       'Finance & Compliance',
  ADMIN:         'Administrator',
  CUSTOMER:      'Customer Portal',
};

export default function AuthPage({ defaultTab }) {
  const pathname = usePathname();
  const { login, loading: authLoading } = useAuth();

  const isSignup = defaultTab === 'signup' || pathname?.includes('/signup');
  const [tab, setTab] = useState(isSignup ? 'signup' : 'login');

  useEffect(() => {
    if (pathname?.includes('/signup')) setTab('signup');
    else if (pathname?.includes('/login')) setTab('login');
  }, [pathname]);

  // ── Login state ────────────────────────────────────────────────
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [fieldErrors, setFE]    = useState({});
  const [apiError, setApiError] = useState(null);
  const [successMsg, setOK]     = useState(null);
  const [submitting, setSub]    = useState(false);

  // ── Invitation state (signup tab) ─────────────────────────────
  const [invStep, setInvStep]               = useState(1); // 1 = enter token, 2 = set password
  const [invToken, setInvToken]             = useState('');
  const [invPreview, setInvPreview]         = useState(null); // { email, role, invitedBy }
  const [invName, setInvName]               = useState('');
  const [invPassword, setInvPassword]       = useState('');
  const [invConfirm, setInvConfirm]         = useState('');
  const [showInvPwd, setShowInvPwd]         = useState(false);
  const [invError, setInvError]             = useState(null);
  const [invSuccess, setInvSuccess]         = useState(null);
  const [invSubmitting, setInvSubmitting]   = useState(false);

  const switchTab = (t) => {
    setTab(t);
    setFE({}); setApiError(null); setOK(null);
    setInvStep(1); setInvToken(''); setInvPreview(null);
    setInvError(null); setInvSuccess(null);
    window.history.replaceState(null, '', t === 'signup' ? '/signup' : '/login');
  };

  const quickFill = (acc) => {
    setEmail(acc.email); setPassword('Password123!');
    setFE({}); setApiError(null); setOK(`Filled: ${acc.label}`);
  };

  // ── Login flow ────────────────────────────────────────────────
  const validateLogin = () => {
    const err = {};
    if (!email.trim())   err.email    = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = 'Invalid email';
    if (!password)       err.password = 'Password is required';
    else if (password.length < 6) err.password = 'Min 6 characters';
    setFE(err);
    return Object.keys(err).length === 0;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setApiError(null); setOK(null);
    if (!validateLogin()) return;
    setSub(true);
    try {
      const res = await login({ email, password });
      if (!res.success) setApiError(res.error || 'Invalid credentials');
      else setOK('Redirecting…');
    } catch (err) {
      setApiError(err.message || 'Something went wrong');
    } finally { setSub(false); }
  };

  // ── Invitation Step 1 — validate token ───────────────────────
  const handleValidateToken = async (e) => {
    e.preventDefault();
    setInvError(null);
    if (!invToken.trim()) { setInvError('Please enter your invitation token.'); return; }
    setInvSubmitting(true);
    try {
      const res = await api.post('/auth/invitation/validate', { token: invToken.trim() });
      const preview = res.data?.data?.invitation || res.data?.invitation;
      setInvPreview(preview);
      setInvName(''); // will be set by user
      setInvStep(2);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid or expired invitation token.';
      setInvError(msg);
    } finally { setInvSubmitting(false); }
  };

  // ── Invitation Step 2 — accept & set password ────────────────
  const handleAcceptInvitation = async (e) => {
    e.preventDefault();
    setInvError(null);
    if (!invPassword || invPassword.length < 8) {
      setInvError('Password must be at least 8 characters.'); return;
    }
    if (invPassword !== invConfirm) {
      setInvError('Passwords do not match.'); return;
    }
    setInvSubmitting(true);
    try {
      const res = await api.post('/auth/invitation/accept', {
        token:    invToken.trim(),
        password: invPassword,
        ...(invName.trim() ? { name: invName.trim() } : {}),
      });
      setInvSuccess('Account activated! Redirecting…');
      // Redirect based on role
      const role = invPreview?.role || res.data?.data?.user?.role;
      setTimeout(() => {
        window.location.href = role === 'CUSTOMER' ? '/portal' : '/workspace/dashboard';
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to activate account.';
      setInvError(msg);
    } finally { setInvSubmitting(false); }
  };

  // ── Shared input styles ───────────────────────────────────────
  const inp = (hasErr) =>
    `w-full bg-transparent border rounded-lg px-4 py-3 text-[15px] text-[#d8d8d8] placeholder-[#333] focus:outline-none transition-colors duration-150 ${
      hasErr ? 'border-[#3a1f1f] focus:border-[#5a2f2f]' : 'border-[#1e1e1e] focus:border-[#333]'
    }`;

  return (
    <div className="w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#c8c8c2] mb-2">
          {tab === 'login' ? 'Welcome back' : 'Accept invitation'}
        </h1>
        <p className="text-[15px] text-[#444] leading-relaxed">
          {tab === 'login'
            ? 'Sign in to your DealFlow360 workspace'
            : tab === 'signup' && invStep === 1
              ? 'Enter the invitation token sent by your administrator'
              : `Setting up account for ${invPreview?.email || ''}`}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex mb-7 border-b border-[#151515]">
        {[['login', 'Log in'], ['signup', 'Accept Invite']].map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`pb-3 mr-7 text-[15px] font-medium transition-colors relative ${
              tab === t ? 'text-[#c8c8c2]' : 'text-[#333] hover:text-[#666]'
            }`}
          >
            {label}
            {tab === t && <span className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#c8c8c2]" />}
          </button>
        ))}
      </div>

      {/* ══ LOGIN TAB ══════════════════════════════════════════════ */}
      {tab === 'login' && (
        <>
          {/* Demo accounts */}
          <div className="mb-7">
            <p className="text-[11px] font-semibold tracking-[0.14em] text-[#2e2e2e] uppercase mb-3">
              Quick demo
            </p>
            <div className="flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => quickFill(acc)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#181818] bg-[#0d0d0d] text-[13px] text-[#404040] hover:text-[#aaa] hover:border-[#252525] transition-colors"
                >
                  <span className="w-5 h-5 rounded-md bg-[#161616] text-[9px] font-bold text-[#4a4a4a] flex items-center justify-center">
                    {acc.abbr}
                  </span>
                  {acc.label}
                </button>
              ))}
            </div>
          </div>

          {apiError && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg border border-[#2a1515] bg-[#0f0808] text-[#9a5555] text-[14px]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}
          {successMsg && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg border border-[#152515] bg-[#080f08] text-[#558855] text-[14px]">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold tracking-[0.1em] text-[#383838] uppercase mb-2">
                Email address
              </label>
              <input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={inp(fieldErrors.email)} autoComplete="email"
              />
              {fieldErrors.email && <p className="mt-1.5 text-[12px] text-[#7a4040]">{fieldErrors.email}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[12px] font-semibold tracking-[0.1em] text-[#383838] uppercase">
                  Password
                </label>
                <button type="button" className="text-[12px] text-[#2e2e2e] hover:text-[#666] transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inp(fieldErrors.password) + ' pr-12'}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2e2e2e] hover:text-[#777] transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="mt-1.5 text-[12px] text-[#7a4040]">{fieldErrors.password}</p>}
            </div>

            <button
              type="submit" disabled={submitting || authLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-lg bg-[#c8c8c2] hover:bg-[#b8b8b2] active:bg-[#a8a8a2] text-[#0a0a0a] text-[15px] font-semibold transition-colors disabled:opacity-25 disabled:cursor-not-allowed mt-2"
            >
              {submitting || authLoading
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Please wait…</span></>
                : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-6 pt-5 border-t border-[#111] text-[12px] text-[#262626] leading-relaxed">
            Internal users land on the Sales Dashboard. Customers land on their Quotation Portal.
          </p>
        </>
      )}

      {/* ══ SIGNUP TAB — STEP 1: Enter Token ══════════════════════ */}
      {tab === 'signup' && invStep === 1 && (
        <>
          {/* Info banner */}
          <div className="mb-6 flex items-start gap-3 px-4 py-3.5 rounded-lg border border-[#1e1e1e] bg-[#0e0e0e]">
            <ShieldCheck className="w-4 h-4 text-[#555] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13px] text-[#555] leading-relaxed">
                Account creation is restricted to invited users only. Enter the invitation token sent by your administrator.
              </p>
            </div>
          </div>

          {invError && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg border border-[#2a1515] bg-[#0f0808] text-[#9a5555] text-[14px]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{invError}</span>
            </div>
          )}

          <form onSubmit={handleValidateToken} className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold tracking-[0.1em] text-[#383838] uppercase mb-2">
                Invitation token
              </label>
              <input
                type="text" value={invToken}
                onChange={(e) => setInvToken(e.target.value)}
                placeholder="Paste your token here"
                className={inp(!invToken && invError)}
                autoComplete="off" spellCheck={false}
              />
              <p className="mt-1.5 text-[11px] text-[#2e2e2e]">
                Token was provided by your administrator or sent via email.
              </p>
            </div>

            <button
              type="submit" disabled={invSubmitting}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-lg bg-[#c8c8c2] hover:bg-[#b8b8b2] text-[#0a0a0a] text-[15px] font-semibold transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              {invSubmitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Validating…</span></>
                : <><span>Validate token</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-6 pt-5 border-t border-[#111] text-[12px] text-[#262626] leading-relaxed">
            Don&apos;t have an invitation? Contact your system administrator.
          </p>
        </>
      )}

      {/* ══ SIGNUP TAB — STEP 2: Set Password ═════════════════════ */}
      {tab === 'signup' && invStep === 2 && invPreview && (
        <>
          {/* Invitation preview card */}
          <div className="mb-6 flex items-center gap-3 px-4 py-3.5 rounded-lg border border-[#1e2a1e] bg-[#0a0f0a]">
            <MailCheck className="w-4 h-4 text-[#4a7a4a] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] text-[#558855]">Invitation verified</p>
              <p className="text-[12px] text-[#3a5a3a] mt-0.5 truncate">
                {invPreview.email} &middot; {ROLE_LABELS[invPreview.role] || invPreview.role}
              </p>
            </div>
          </div>

          {invError && (
            <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-lg border border-[#2a1515] bg-[#0f0808] text-[#9a5555] text-[14px]">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{invError}</span>
            </div>
          )}
          {invSuccess && (
            <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg border border-[#152515] bg-[#080f08] text-[#558855] text-[14px]">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{invSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAcceptInvitation} className="space-y-5">
            <div>
              <label className="block text-[12px] font-semibold tracking-[0.1em] text-[#383838] uppercase mb-2">
                Display name <span className="text-[#2a2a2a] normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text" value={invName}
                onChange={(e) => setInvName(e.target.value)}
                placeholder="Alex Morgan"
                className={inp(false)} autoComplete="name"
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold tracking-[0.1em] text-[#383838] uppercase mb-2">
                Set password
              </label>
              <div className="relative">
                <input
                  type={showInvPwd ? 'text' : 'password'} value={invPassword}
                  onChange={(e) => setInvPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className={inp(false) + ' pr-12'} autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowInvPwd(!showInvPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2e2e2e] hover:text-[#777] transition-colors">
                  {showInvPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold tracking-[0.1em] text-[#383838] uppercase mb-2">
                Confirm password
              </label>
              <input
                type="password" value={invConfirm}
                onChange={(e) => setInvConfirm(e.target.value)}
                placeholder="••••••••"
                className={inp(invConfirm && invConfirm !== invPassword)}
                autoComplete="new-password"
              />
              {invConfirm && invConfirm !== invPassword && (
                <p className="mt-1.5 text-[12px] text-[#7a4040]">Passwords do not match</p>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button" onClick={() => { setInvStep(1); setInvError(null); }}
                className="px-4 py-3 rounded-lg border border-[#1e1e1e] text-[14px] text-[#444] hover:text-[#777] hover:border-[#2a2a2a] transition-colors"
              >
                Back
              </button>
              <button
                type="submit" disabled={invSubmitting}
                className="flex-1 flex items-center justify-center gap-2.5 py-3 rounded-lg bg-[#c8c8c2] hover:bg-[#b8b8b2] text-[#0a0a0a] text-[15px] font-semibold transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
              >
                {invSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Activating…</span></>
                  : <><span>Activate account</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </form>

          <p className="mt-6 pt-5 border-t border-[#111] text-[12px] text-[#262626] leading-relaxed">
            By activating your account you agree to the DealFlow360 terms of service.
          </p>
        </>
      )}

    </div>
  );
}
