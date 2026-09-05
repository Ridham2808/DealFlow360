'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'SALES_REP',     email: 'rep@dealflow360.com',      label: 'Sales Rep' },
  { role: 'SALES_MANAGER', email: 'manager@dealflow360.com',   label: 'Manager' },
  { role: 'FINANCE',       email: 'finance@dealflow360.com',   label: 'Finance' },
  { role: 'ADMIN',         email: 'admin@dealflow360.com',     label: 'Admin' },
  { role: 'CUSTOMER',      email: 'customer@acmecorp.com',     label: 'Customer' },
];

const ROLES = [
  { id: 'SALES_REP',     label: 'Sales Representative' },
  { id: 'SALES_MANAGER', label: 'Sales Manager' },
  { id: 'FINANCE',       label: 'Finance & Compliance' },
  { id: 'ADMIN',         label: 'Administrator' },
  { id: 'CUSTOMER',      label: 'Customer Portal' },
];

export default function AuthPage({ defaultTab }) {
  const pathname = usePathname();
  const { login, signup, loading: authLoading } = useAuth();

  const isSignup = defaultTab === 'signup' || pathname?.includes('/signup');
  const [activeTab, setActiveTab] = useState(isSignup ? 'signup' : 'login');

  useEffect(() => {
    if (pathname?.includes('/signup')) setActiveTab('signup');
    else if (pathname?.includes('/login')) setActiveTab('login');
  }, [pathname]);

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [company, setCompany]         = useState('');
  const [role, setRole]               = useState('SALES_REP');
  const [showPwd, setShowPwd]         = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError]       = useState(null);
  const [successMsg, setSuccessMsg]   = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setFieldErrors({});
    setApiError(null);
    setSuccessMsg(null);
    window.history.replaceState(null, '', tab === 'signup' ? '/signup' : '/login');
  };

  const quickFill = (acc) => {
    setEmail(acc.email);
    setPassword('Password123!');
    setRole(acc.role);
    setFieldErrors({});
    setApiError(null);
    setSuccessMsg(`Filled: ${acc.label}`);
  };

  const validate = () => {
    const err = {};
    if (activeTab === 'signup' && !name.trim()) err.name = 'Name is required';
    if (!email.trim())                          err.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) err.email = 'Invalid email';
    if (!password)                              err.password = 'Password is required';
    else if (password.length < 6)              err.password = 'Minimum 6 characters';
    if (activeTab === 'signup' && role === 'CUSTOMER' && !company.trim())
      err.company = 'Company name is required';
    setFieldErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMsg(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (activeTab === 'login') {
        const res = await login({ email, password });
        if (!res.success) setApiError(res.error || 'Invalid credentials');
        else setSuccessMsg('Redirecting...');
      } else {
        const res = await signup({
          name, email, password, role,
          companyName: role === 'CUSTOMER' ? company : undefined,
        });
        if (!res.success) setApiError(res.error || 'Registration failed');
        else setSuccessMsg('Account created. Redirecting...');
      }
    } catch (err) {
      setApiError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- shared input class ----------
  const inputCls = (err) =>
    `w-full bg-[#111111] border text-sm text-[#e9e9e9] placeholder-[#444] rounded-lg px-3.5 py-2.5 focus:outline-none transition-colors ${
      err
        ? 'border-[#555] focus:border-[#888]'
        : 'border-[#232323] focus:border-[#555]'
    }`;

  return (
    <div className="w-full max-w-sm">

      {/* ── Logo ── */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-[#161616] border border-[#2a2a2a] text-white text-lg font-semibold mb-4">
          ⚡
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#e9e9e9]">
          {activeTab === 'login' ? 'Welcome back' : 'Create account'}
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          {activeTab === 'login'
            ? 'Sign in to DealFlow360'
            : 'Entry point for internal users and customers'}
        </p>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex mb-6 bg-[#111111] border border-[#1e1e1e] rounded-lg p-1 gap-1">
        {['login', 'signup'].map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            type="button"
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              activeTab === t
                ? 'bg-[#1e1e1e] text-[#e9e9e9]'
                : 'text-[#555] hover:text-[#999]'
            }`}
          >
            {t === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      {/* ── Quick demo fill ── */}
      <div className="mb-5">
        <p className="text-xs text-[#555] mb-2 font-medium">Quick demo accounts</p>
        <div className="flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => quickFill(acc)}
              className="px-2.5 py-1 rounded-md text-xs border border-[#222] bg-[#111] text-[#666] hover:text-[#bbb] hover:border-[#333] transition-colors"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Alerts ── */}
      {apiError && (
        <div className="mb-4 flex items-start gap-2.5 px-3.5 py-3 rounded-lg border border-[#2a1a1a] bg-[#140e0e] text-[#cc6666] text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{apiError}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 flex items-center gap-2.5 px-3.5 py-3 rounded-lg border border-[#1a2a1a] bg-[#0e140e] text-[#66aa66] text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">

        {activeTab === 'signup' && (
          <div>
            <label className="block text-xs text-[#777] mb-1.5 font-medium">Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Morgan"
              className={inputCls(fieldErrors.name)}
            />
            {fieldErrors.name && <p className="mt-1 text-xs text-[#888]">{fieldErrors.name}</p>}
          </div>
        )}

        <div>
          <label className="block text-xs text-[#777] mb-1.5 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={inputCls(fieldErrors.email)}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-[#888]">{fieldErrors.email}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-[#777] font-medium">Password</label>
            {activeTab === 'login' && (
              <button type="button" className="text-xs text-[#555] hover:text-[#888] transition-colors">
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputCls(fieldErrors.password) + ' pr-10'}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#888] transition-colors"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1 text-xs text-[#888]">{fieldErrors.password}</p>}
        </div>

        {/* Role selector (signup) */}
        {activeTab === 'signup' && (
          <>
            <div>
              <label className="block text-xs text-[#777] mb-1.5 font-medium">Account type</label>
              <div className="grid grid-cols-1 gap-1.5">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRole(r.id)}
                    className={`flex items-center px-3.5 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                      role === r.id
                        ? 'border-[#333] bg-[#161616] text-[#e9e9e9]'
                        : 'border-[#1a1a1a] bg-[#111] text-[#555] hover:text-[#888] hover:border-[#222]'
                    }`}
                  >
                    <span className="flex-1">{r.label}</span>
                    {role === r.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e9e9e9] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {role === 'CUSTOMER' && (
              <div>
                <label className="block text-xs text-[#777] mb-1.5 font-medium">Company name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corporation"
                  className={inputCls(fieldErrors.company)}
                />
                {fieldErrors.company && <p className="mt-1 text-xs text-[#888]">{fieldErrors.company}</p>}
              </div>
            )}
          </>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || authLoading}
          className="w-full mt-2 py-2.5 rounded-lg bg-[#e9e9e9] hover:bg-[#d0d0d0] active:bg-[#b8b8b8] text-[#0a0a0a] text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting || authLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Please wait…</span></>
          ) : (
            activeTab === 'login' ? 'Log in' : 'Create account'
          )}
        </button>

      </form>

      {/* ── Info note ── */}
      <div className="mt-6 border-t border-[#181818] pt-5 space-y-2">
        <p className="text-xs text-[#444] leading-relaxed">
          After login, internal users land on the Sales Dashboard. Customers land on their Quotation Portal.
        </p>
        <ul className="space-y-1">
          {[
            'Company / team selector shown for multi-team setups',
            'Basic validation on email and password fields',
            'Sign up creates a new internal or customer account',
          ].map((note) => (
            <li key={note} className="text-xs text-[#3a3a3a] flex items-start gap-1.5">
              <span className="mt-0.5">–</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
