'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * DealFlow360 — ReasonInput
 * Accessible controlled textarea for entering mandatory rejection or revision notes.
 */
export function ReasonInput({
  value = '',
  onChange,
  label = 'Action Reason / Notes',
  placeholder = 'Explain the rationale for this decision (required for rejections or returns)...',
  error = '',
  required = true,
  rows = 3,
  className = '',
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-300">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        <span className="text-[10px] font-mono text-zinc-500">
          {value.length} characters
        </span>
      </div>

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-[#0b0b0b] px-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 transition-all ${
          error
            ? 'border-rose-500 focus:border-rose-400 focus:ring-rose-500/20'
            : 'border-zinc-800 focus:border-zinc-600 focus:ring-zinc-700/30'
        }`}
      />

      {error && (
        <div className="flex items-center gap-1.5 text-rose-400 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default ReasonInput;
