'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  KeyRound, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Loader2,
  Lock
} from 'lucide-react';
import api from '../../../lib/api';

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState('');
  const [validating, setValidating] = useState(true);
  const [invitation, setInvitation] = useState(null);
  const [validateError, setValidateError] = useState(null);

  // Form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const rawToken = searchParams.get('token') || '';
    setToken(rawToken);

    if (!rawToken) {
      setValidating(false);
      setValidateError('No invitation token provided. Please use the link sent in your invitation email.');
      return;
    }

    const validateToken = async () => {
      try {
        setValidating(true);
        setValidateError(null);
        const res = await api.post('/auth/invitation/validate', { token: rawToken });
        if (res.data?.invitation) {
          setInvitation(res.data.invitation);
        } else {
          setValidateError('Invitation could not be loaded.');
        }
      } catch (err) {
        setValidateError(
          err.response?.data?.error?.message || 
          'This invitation has already been used or has expired. Please contact your workspace administrator.'
        );
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!password || password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/auth/invitation/accept', {
        token,
        password,
        name: name || undefined,
      });

      setSuccess(true);
      const user = res.data?.user;

      setTimeout(() => {
        if (user?.role === 'CUSTOMER') {
          router.push('/portal');
        } else {
          router.push('/dashboard');
        }
      }, 1500);
    } catch (err) {
      setFormError(err.response?.data?.error?.message || 'Failed to activate invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (validating) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Loader2 className="w-8 h-8 text-[#9e9ea7] animate-spin mb-3" />
        <p className="text-xs text-[#a1a1aa]">Validating enterprise invitation token...</p>
      </div>
    );
  }

  if (validateError) {
    return (
      <div className="p-6 bg-[#130f11] border border-[#30161b] rounded-2xl text-center">
        <div className="w-10 h-10 rounded-full bg-[#201115] border border-[#4a1c24] text-[#f87171] flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-2">Invitation Invalid or Expired</h3>
        <p className="text-xs text-[#a1a1aa] leading-relaxed mb-5">
          {validateError}
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#181920] hover:bg-[#22232e] border border-[#2b2c3a] text-xs font-semibold text-white transition-all"
        >
          <span>Return to Sign In</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="p-6 bg-[#0e1712] border border-[#1b3d26] rounded-2xl text-center animate-in fade-in zoom-in-95">
        <div className="w-10 h-10 rounded-full bg-[#12241a] border border-[#265335] text-[#4ade80] flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1">Account Activated Successfully</h3>
        <p className="text-xs text-[#a1a1aa] mb-4">
          Session established. Redirecting to your DealFlow360 workspace...
        </p>
        <div className="w-full bg-[#14261c] h-1.5 rounded-full overflow-hidden">
          <div className="bg-[#4ade80] h-full animate-[pulse_1s_infinite] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#131520] border border-[#202438] text-[#60a5fa] text-[10px] font-mono font-semibold uppercase tracking-wider mb-2.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Invitation</span>
        </div>
        <h2 className="text-xl font-bold text-white tracking-tight">Accept Workspace Invitation</h2>
        <p className="text-xs text-[#71717a] mt-1">
          Complete your account setup and choose your secure password.
        </p>
      </div>

      {/* Invitation Details Card */}
      {invitation && (
        <div className="mb-5 p-3.5 rounded-xl bg-[#0f1015] border border-[#1d1e26] text-xs space-y-2">
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-[#666]">Invited Account:</span>
            <span className="font-mono text-white font-medium">{invitation.email}</span>
          </div>
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-[#666]">Assigned Role:</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#181920] border border-[#292a37] text-[#c4c4cc]">
              {invitation.role}
            </span>
          </div>
          <div className="flex items-center justify-between text-[#a1a1aa]">
            <span className="text-[#666]">Invited By:</span>
            <span className="text-[#c4c4cc]">{invitation.invitedBy || 'System Administrator'}</span>
          </div>
        </div>
      )}

      {formError && (
        <div className="mb-4 p-3 rounded-xl bg-[#180f12] border border-[#3e1820] text-[#f87171] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Activation Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
            Display Name
          </label>
          <input
            type="text"
            placeholder="Confirm your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-[#0e0f14] border border-[#1e1f27] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#3b3c4a]"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
            Choose Password <span className="text-[#f87171]">*</span>
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 pl-3 pr-9 rounded-xl bg-[#0e0f14] border border-[#1e1f27] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#3b3c4a]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#666] hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
            Confirm Password <span className="text-[#f87171]">*</span>
          </label>
          <input
            type="password"
            required
            minLength={8}
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-[#0e0f14] border border-[#1e1f27] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#3b3c4a]"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full h-9 rounded-xl bg-[#ededed] hover:bg-white text-[#09090b] font-semibold text-xs transition-all flex items-center justify-center gap-2 mt-2 shadow-[0_1px_4px_rgba(0,0,0,0.5)] cursor-pointer"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Activating Account...</span>
            </>
          ) : (
            <>
              <span>Activate Account & Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 text-[#777] animate-spin" />
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
