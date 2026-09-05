'use client';

import React from 'react';
import { History, User, ArrowRight, FileText } from 'lucide-react';

/**
 * DealFlow360 — AuditTimeline
 * Chronological immutable audit log timeline for quotation and approval lifecycle actions.
 */
export function AuditTimeline({ auditLogs = [], className = '' }) {
  if (!auditLogs || auditLogs.length === 0) {
    return (
      <div className={`p-4 rounded-xl border border-zinc-800 bg-[#0d0d0d] text-zinc-500 text-xs text-center ${className}`}>
        No audit log entries recorded yet.
      </div>
    );
  }

  const actionLabels = {
    QUOTATION_AUTO_APPROVED: 'Auto-Approved',
    SUBMITTED_FOR_APPROVAL: 'Submitted for Review',
    APPROVAL_STEP_APPROVED: 'Step Approved',
    APPROVAL_STEP_REJECTED: 'Step Rejected',
    APPROVAL_STEP_RETURNED: 'Returned for Revision',
    QUOTATION_TRANSITION_UNDER_NEGOTIATION: 'Moved to Negotiation',
    QUOTATION_TRANSITION_CONFIRMED: 'Quotation Confirmed',
    QUOTATION_TRANSITION_DRAFT: 'Reverted to Draft',
  };

  const actionBadgeColors = {
    QUOTATION_AUTO_APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    APPROVAL_STEP_APPROVED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    APPROVAL_STEP_REJECTED: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    APPROVAL_STEP_RETURNED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    SUBMITTED_FOR_APPROVAL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
          Audit Trail & History
        </span>
      </div>

      <div className="space-y-2.5">
        {auditLogs.map((log, idx) => {
          const badgeClass =
            actionBadgeColors[log.action] || 'bg-zinc-800 text-zinc-300 border-zinc-700';

          return (
            <div
              key={log.id || idx}
              className="p-3 rounded-xl border border-zinc-800/80 bg-[#0f0f0f] text-xs space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${badgeClass}`}
                  >
                    {actionLabels[log.action] || log.action}
                  </span>

                  {log.beforeStatus && log.afterStatus && log.beforeStatus !== log.afterStatus && (
                    <div className="flex items-center gap-1 font-mono text-[11px] text-zinc-400">
                      <span className="text-zinc-500">{log.beforeStatus}</span>
                      <ArrowRight className="w-3 h-3 text-zinc-600" />
                      <span className="text-zinc-300 font-semibold">{log.afterStatus}</span>
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-mono text-zinc-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>

              {log.reasonNote && (
                <p className="text-zinc-300 text-xs leading-relaxed pl-1 border-l-2 border-zinc-700">
                  {log.reasonNote}
                </p>
              )}

              <div className="flex items-center gap-2 text-[10px] text-zinc-500 pt-1">
                <User className="w-3 h-3" />
                <span>
                  Actor: <strong className="text-zinc-400">{log.actor?.name || log.actor?.email || log.actorId}</strong>
                </span>
                {log.actor?.role && (
                  <span className="font-mono text-zinc-500">({log.actor.role})</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AuditTimeline;
