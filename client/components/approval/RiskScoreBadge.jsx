'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';

/**
 * DealFlow360 — RiskScoreBadge
 * Displays pre-calculated server risk level and score.
 * Does NOT calculate risk client-side.
 */
export function RiskScoreBadge({
  score = 0,
  riskLevel = 'NONE',
  anyLineOverLimit = false,
  showScore = true,
  size = 'md',
  className = '',
}) {
  const normalizedLevel = String(riskLevel || 'NONE').toUpperCase();

  const levelConfigs = {
    NONE: {
      label: 'No Risk',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dotClass: 'bg-emerald-400',
      icon: CheckCircle2,
    },
    LOW: {
      label: 'Low Risk',
      badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      dotClass: 'bg-blue-400',
      icon: ShieldCheck,
    },
    MEDIUM: {
      label: 'Medium Risk',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dotClass: 'bg-amber-400',
      icon: AlertTriangle,
    },
    HIGH: {
      label: 'High Risk',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      dotClass: 'bg-rose-400',
      icon: ShieldAlert,
    },
  };

  const current = levelConfigs[normalizedLevel] || levelConfigs.LOW;
  const IconComponent = current.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3 py-1.5 gap-2.5',
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-center font-medium border rounded-full transition-colors ${
          current.badgeClass
        } ${sizeClasses[size] || sizeClasses.md}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${current.dotClass}`} />
        <IconComponent className="w-3.5 h-3.5" />
        <span>{current.label}</span>

        {showScore && (
          <span className="ml-1 pl-1.5 border-l border-current/20 font-mono font-bold">
            {Math.round(score)}
          </span>
        )}
      </span>

      {anyLineOverLimit && normalizedLevel !== 'NONE' && (
        <span className="text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
          Line Ceiling Exceeded
        </span>
      )}
    </div>
  );
}

export default RiskScoreBadge;
