'use client';

import React from 'react';
import { Check, Clock, X, CornerDownLeft, Shield } from 'lucide-react';

/**
 * DealFlow360 — ApprovalStepper
 * Visual multi-step sequential approval chain showing role, status, approver, and timestamp.
 */
export function ApprovalStepper({ steps = [], className = '' }) {
  if (!steps || steps.length === 0) {
    return (
      <div className={`p-4 rounded-xl border border-zinc-800 bg-[#0c0c0c] text-zinc-400 text-xs text-center ${className}`}>
        No approval chain required. Quotation is eligible for direct processing.
      </div>
    );
  }

  const roleLabels = {
    SALES_REP: 'Sales Representative',
    SALES_MANAGER: 'Sales Manager Approval',
    FINANCE: 'Finance Escalation Review',
    ADMIN: 'Executive / Admin Override',
  };

  const statusConfigs = {
    PENDING: {
      label: 'Pending Review',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      icon: Clock,
      iconClass: 'text-amber-400',
    },
    APPROVED: {
      label: 'Approved',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      icon: Check,
      iconClass: 'text-emerald-400',
    },
    REJECTED: {
      label: 'Rejected',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      icon: X,
      iconClass: 'text-rose-400',
    },
    RETURNED: {
      label: 'Returned for Revision',
      badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      icon: CornerDownLeft,
      iconClass: 'text-purple-400',
    },
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
          Required Approval Flow
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">
          Sequential Escalation ({steps.length} {steps.length === 1 ? 'Step' : 'Steps'})
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-800">
        {steps.map((step, index) => {
          const cfg = statusConfigs[step.status] || statusConfigs.PENDING;
          const Icon = cfg.icon;
          const isCurrentActive = step.status === 'PENDING' && (index === 0 || steps[index - 1].status === 'APPROVED');

          return (
            <div key={step.id || index} className="relative">
              {/* Step indicator node */}
              <div
                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                  step.status === 'APPROVED'
                    ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                    : step.status === 'REJECTED'
                      ? 'bg-rose-950 border-rose-500 text-rose-400'
                      : step.status === 'RETURNED'
                        ? 'bg-purple-950 border-purple-500 text-purple-400'
                        : isCurrentActive
                          ? 'bg-amber-950 border-amber-400 text-amber-300 ring-2 ring-amber-400/20 animate-pulse'
                          : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                }`}
              >
                <Icon className="w-3 h-3" />
              </div>

              {/* Step content card */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  isCurrentActive
                    ? 'bg-zinc-900/90 border-amber-500/30 shadow-md'
                    : 'bg-[#101010] border-zinc-800/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">
                        Step {step.stepOrder || index + 1}: {roleLabels[step.requiredRole] || step.requiredRole}
                      </span>
                      {isCurrentActive && (
                        <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded">
                          Current Actionable Step
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-zinc-500" />
                      <span>Role required: <strong className="text-zinc-300">{step.requiredRole}</strong></span>
                      {step.assignedUser && (
                        <span className="text-zinc-500">
                          · Actioned by: <span className="text-zinc-300">{step.assignedUser.name || step.assignedUser.email}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
                  >
                    {cfg.label}
                  </span>
                </div>

                {step.notes && (
                  <div className="mt-2.5 pt-2.5 border-t border-zinc-800/60 text-xs text-zinc-400 italic">
                    &ldquo;{step.notes}&rdquo;
                  </div>
                )}

                {step.actionedAt && (
                  <div className="mt-2 text-[10px] font-mono text-zinc-500">
                    Timestamp: {new Date(step.actionedAt).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ApprovalStepper;
