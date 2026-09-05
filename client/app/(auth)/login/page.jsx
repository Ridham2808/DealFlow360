'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, Building, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

const DEMO_ACCOUNTS = [
  { role: 'SALES_REP', email: 'rep@dealflow360.com', label: 'Sales Rep' },
  { role: 'SALES_MANAGER', email: 'manager@dealflow360.com', label: 'Sales Mgr' },
  { role: 'FINANCE', email: 'finance@dealflow360.com', label: 'Finance' },
  { role: 'ADMIN', email: 'admin@dealflow360.com', label: 'Admin' },
  { role: 'CUSTOMER', email: 'customer@acmecorp.com', label: 'Customer' },
];

export default function AuthPage() {
  const { login, signup, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedRole, setSelectedRole] = useState('SALES_REP');

  // Errors & UI state
  const [fieldErrors, setFieldErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [successToast, setSuccessToast] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const errors = {};
    if (activeTab === 'signup' && !name.trim()) {
      errors.name = 'Full name is required.';
    }

    if (!email.trim()) {
      errors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (activeTab === 'signup' && selectedRole === 'CUSTOMER' && !companyName.trim()) {
      errors.companyName = 'Company name is required for customer accounts.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessToast(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (activeTab === 'login') {
        const res = await login({ email, password });
        if (!res.success) {
          setApiError(res.error || 'Invalid email or password.');
        } else {
          setSuccessToast('Authentication successful! Redirecting...');
        }
      } else {
        const payload = {
          name,
          email,
          password,
          role: selectedRole,
          companyName: selectedRole === 'CUSTOMER' ? companyName : undefined,
        };
        const res = await signup(payload);
        if (!res.success) {
          setApiError(res.error || 'Registration failed.');
        } else {
          setSuccessToast('Account created successfully! Redirecting...');
        }
      }
    } catch (err) {
      setApiError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setFieldErrors({});
    setApiError(null);
  };

  const isLoading = isSubmitting || authLoading;

  return (
    <div className="w-full">
      {/* Success Toast */}
      {successToast && (
        <div className="mb-4 p-3.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-medium flex items-center justify-between shadow-lg backdrop-blur-md">
          <span>{successToast}</span>
        </div>
      )}

      {/* Main Dark Card */}
      <div className="bg-[#111622] border border-slate-800/80 rounded-2xl p-7 shadow-2xl shadow-black/50 backdrop-blur-sm">
        {/* Header with Title & Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-blue-500/20 mb-3 tracking-wider">
            DF
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DealFlow360</h1>
          <p className="text-xs text-slate-400 mt-1">Intelligent Sales Operations Platform</p>
        </div>

        {/* Small tab-style toggle buttons: Log In and Sign Up */}
        <div className="flex bg-[#161D2D] p-1 rounded-lg border border-slate-800 mb-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('login');
              setFieldErrors({});
              setApiError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
              activeTab === 'login'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('signup');
              setFieldErrors({});
              setApiError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-150 ${
              activeTab === 'signup'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Amber helper banner */}
        <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
          <span className="text-amber-400 font-bold mt-0.5">ℹ</span>
          <div>
            After login, internal users land on the Sales Dashboard. Customers land on their Quotation Portal.
          </div>
        </div>

        {/* Quick Demo Credentials Switcher */}
        {activeTab === 'login' && (
          <div className="mb-5 p-2.5 bg-[#161D2D] rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Quick Fill Demo User:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc.email)}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${
                    email === acc.email
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1E273A] text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* API Error Box */}
        {apiError && (
          <div className="mb-5 p-3 bg-rose-950/70 border border-rose-600/50 rounded-xl text-rose-300 text-xs font-medium">
            {apiError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {activeTab === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  placeholder="Jane Doe"
                  className={`w-full bg-[#161D2D] border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                    fieldErrors.name ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                  }`}
                />
              </div>
              {fieldErrors.name && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.name}</p>}
            </div>
          )}

          {/* Email input */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="name@company.com"
                autoComplete="email"
                className={`w-full bg-[#161D2D] border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  fieldErrors.email ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
            </div>
            {fieldErrors.email && <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.email}</p>}
          </div>

          {/* Password input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                Password
              </label>
              {activeTab === 'login' && (
                <button
                  type="button"
                  onClick={() => alert('Password reset workflow will be enabled in future administrative settings.')}
                  className="text-[11px] text-slate-400 hover:text-blue-400 transition-colors focus:outline-none"
                >
                  Forgot Password?
                </button>
              )}
            </div>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••••••"
                autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
                className={`w-full bg-[#161D2D] border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  fieldErrors.password ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
            </div>
            {fieldErrors.password && (
              <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.password}</p>
            )}
          </div>

          {/* Signup additional options */}
          {activeTab === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Account Type / Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-[#161D2D] border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SALES_REP">Sales Representative</option>
                  <option value="CUSTOMER">Customer Account Contact</option>
                </select>
              </div>

              {selectedRole === 'CUSTOMER' && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Company / Organization Name
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Building className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      disabled={isLoading}
                      placeholder="Acme Corp"
                      className={`w-full bg-[#161D2D] border rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                        fieldErrors.companyName ? 'border-rose-500' : 'border-slate-800 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {fieldErrors.companyName && (
                    <p className="text-[11px] text-rose-400 mt-1">{fieldErrors.companyName}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Primary Button with inline spinner and changing label */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-lg shadow-blue-600/25 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#111622]"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
            <span>
              {isLoading
                ? activeTab === 'login'
                  ? 'Signing in...'
                  : 'Creating Account...'
                : activeTab === 'login'
                ? 'Log In'
                : 'Create Account'}
            </span>
          </button>
        </form>

        {/* Muted notes */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>Company / team selector shown for multi-team setups.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>Basic validation on email and password fields.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-slate-500">•</span>
            <span>Sign-Up link creates a new internal or customer account.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
