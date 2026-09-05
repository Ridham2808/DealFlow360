'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Shield, Building, Check, AlertCircle, X, Loader2 } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    setSuccessMsg(null);
    setErrorMsg(null);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full name cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);
      const res = await updateProfile({ name: name.trim() });
      if (res.success) {
        setSuccessMsg('Profile updated successfully!');
        setTimeout(() => {
          setSuccessMsg(null);
          onClose();
        }, 1200);
      } else {
        setErrorMsg(res.error || 'Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-[#12141a] border border-[#272a38] rounded-xl max-w-md w-full p-6 shadow-2xl relative text-[#ededed]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#222533]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Account Profile</h3>
              <p className="text-[11px] text-[#8e95a5]">View and update your personal details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alerts */}
        {successMsg && (
          <div className="mt-4 p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-lg flex items-center gap-2 text-xs text-emerald-300">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg flex items-center gap-2 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#8e95a5] mb-1.5">
              Full Name <span className="text-blue-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 transition-colors pl-8"
                placeholder="Enter your name"
              />
              <User className="w-3.5 h-3.5 text-[#5a6275] absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8e95a5] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full bg-[#0a0c10]/60 border border-[#222533] rounded-lg px-3 py-2 text-xs text-[#71788e] cursor-not-allowed pl-8"
              />
              <Mail className="w-3.5 h-3.5 text-[#424859] absolute left-2.5 top-2.5" />
            </div>
            <p className="text-[10px] text-[#5a6275] mt-1">Email is managed by system administrators.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-medium text-[#8e95a5] mb-1.5">
                Role & Permission
              </label>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0c10] border border-[#272a38] rounded-lg text-xs text-[#c5c9d6]">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-mono text-[11px] font-semibold">{user?.role?.replace(/_/g, ' ') || 'USER'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8e95a5] mb-1.5">
                Account Scope
              </label>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0a0c10] border border-[#272a38] rounded-lg text-xs text-[#c5c9d6] truncate">
                <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] truncate">
                  {user?.customer?.name || (user?.role === 'CUSTOMER' ? 'Client Org' : 'Internal')}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#222533]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#272a38] text-xs font-medium text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || name.trim() === user?.name}
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium text-white flex items-center gap-1.5 transition-colors shadow-xs"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
