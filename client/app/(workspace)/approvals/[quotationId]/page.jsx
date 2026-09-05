'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  User,
  Calendar,
  Layers,
  Check,
  RefreshCw,
  Send,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../../../lib/api';

export default function ApprovalDetailPage() {
  const { quotationId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [activeActionModal, setActiveActionModal] = useState(null); // 'REJECTED' | 'RETURNED'
  const [inlineReason, setInlineReason] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/approvals/${quotationId}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load approval detail');
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    if (quotationId) {
      fetchDetail();
    }
  }, [quotationId, fetchDetail]);

  const handleStepAction = async (action, notes = '') => {
    if ((action === 'REJECTED' || action === 'RETURNED') && (!notes || !notes.trim())) {
      setActionError('A valid reason is required to reject or return for revision.');
      return;
    }

    if (!data?.allowedActions?.activeStepId) {
      setActionError('No active step currently available for action.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      await apiRequest(`/approvals/${data.allowedActions.activeStepId}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          notes: notes.trim() || undefined,
          expectedVersion: data.quotation?.version,
        }),
      });

      // Clear inline modal state
      setActiveActionModal(null);
      setInlineReason('');

      // Refresh server state fresh
      await fetchDetail();
    } catch (err) {
      setActionError(err.message || `Failed to perform ${action} action.`);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8 flex items-center justify-center">
        <div className="text-center text-xs text-[#787a8c]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Loading approval context...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8">
        <div className="max-w-2xl mx-auto p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h2 className="text-base font-bold text-white">Error Loading Approval</h2>
          <p className="text-xs text-rose-300">{error || 'Record not found'}</p>
          <button
            onClick={() => router.push('/approvals')}
            className="px-4 py-2 bg-[#1a1b24] hover:bg-[#252734] border border-[#2e3040] rounded-lg text-xs font-medium text-white transition-all"
          >
            Back to Approval Queue
          </button>
        </div>
      </div>
    );
  }

  const { quotation, customer, whyFlagged, stepper, auditTable, allowedActions } = data;

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#707284]">
        <Link href="/approvals" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Queue
        </Link>
        <span>/</span>
        <span className="text-[#a0a2b4] font-mono">{quotation.quoteNumber}</span>
      </div>

      {/* Screen #6 Header & Badges */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Approval Detail: {quotation.quoteNumber}</span>
            <span className="text-[#888898] font-normal">({customer?.name || 'Customer'})</span>
          </h1>
          <p className="text-xs text-[#707284] mt-0.5">Opened by clicking a row on the Approvals list</p>

          <div className="flex flex-wrap items-center gap-2.5 mt-3">
            {/* Blended Risk Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold bg-[#3b1216] text-[#f87171] border border-[#5c1c24]">
              Blended Risk: {quotation.riskLevel}
            </span>

            {/* Customer Tier Badge */}
            <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold bg-[#0c2338] text-[#38bdf8] border border-[#164268]">
              Customer Tier: {customer?.tier || 'Gold'}
            </span>
          </div>
        </div>

        {/* Financial Summary Card */}
        <div className="flex items-center gap-4 bg-[#12131b] border border-[#1d1f2b] p-3.5 rounded-xl self-start md:self-auto">
          <div>
            <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Grand Total</div>
            <div className="text-lg font-bold font-mono text-white">
              ${quotation.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="h-8 w-[1px] bg-[#222432]" />
          <div>
            <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Margin</div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {quotation.marginPercentage.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Why This Quote Was Flagged Section */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">Why This Quote Was Flagged</h2>
          <span className="text-xs text-[#707284]">
            {whyFlagged.length} {whyFlagged.length === 1 ? 'line evaluated' : 'lines evaluated'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                <th className="py-3 px-5 font-semibold">Line</th>
                <th className="py-3 px-5 font-semibold text-right">Discount Given</th>
                <th className="py-3 px-5 font-semibold text-right">Limit Allowed</th>
                <th className="py-3 px-5 font-semibold text-right">Over By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181923]">
              {whyFlagged.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 px-5 text-center text-[#707284]">
                    All discounts conform to policy limits.
                  </td>
                </tr>
              ) : (
                whyFlagged.map((row, idx) => (
                  <tr key={row.lineId || idx} className="hover:bg-[#13141d]">
                    <td className="py-3.5 px-5 font-medium text-white">
                      {row.line} <span className="text-[#6e7082]">({row.category})</span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[#dcdce5]">
                      {row.discountGiven.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[#8e90a4]">
                      {row.limitAllowed.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-rose-400">
                      {row.overBy > 0 ? `${row.overBy.toFixed(1)} pt OVER` : '0 pt - OK'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen #6 Muted Amber Helper Banner — Exactly below Why Flagged Table (No Neon Glow!) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed">
        Worst single line ({whyFlagged.find((f) => f.overBy > 0)?.overBy.toFixed(0) || '0'}pt over) plus overall pattern across the order sets the blended score. One bad line is enough to require approval.
      </div>

      {/* Screen #6 Horizontal 4-Node Visual Stepper (Submitted -> Sales Manager -> Finance -> Confirmed) */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-6 shadow-sm">
        <div className="text-[10px] uppercase font-mono tracking-wider text-[#606275] mb-4 font-bold">
          Multi-Stage Sequential Escalation Flow
        </div>

        <div className="flex items-center justify-between max-w-2xl mx-auto px-4">
          {/* Node 1: Submitted */}
          <div className="flex flex-col items-center gap-2 relative">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-sm">
              <Check className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold text-white">Submitted</span>
            <span className="text-[10px] font-mono text-[#6c6e80]">Rep</span>
          </div>

          <div className="flex-1 h-0.5 bg-[#252838] mx-2 relative -top-3" />

          {/* Node 2: Sales Manager */}
          {(() => {
            const smStep = stepper.find((s) => s.requiredRole === 'SALES_MANAGER');
            const isSmApproved = smStep?.status === 'APPROVED';
            const isSmActive = smStep?.status === 'PENDING';
            const isSmReturned = smStep?.status === 'RETURNED';
            const isSmRejected = smStep?.status === 'REJECTED';

            return (
              <div className="flex flex-col items-center gap-2 relative">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                    isSmApproved
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : isSmReturned
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : isSmRejected
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : isSmActive
                      ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 shadow-md'
                      : 'bg-[#14151f] border-[#2b2d3d] text-[#606275]'
                  }`}
                >
                  {isSmApproved ? <Check className="w-4 h-4" /> : '2'}
                </div>
                <span className={`text-xs font-semibold ${isSmActive ? 'text-blue-400' : 'text-white'}`}>
                  Sales Manager
                </span>
                <span className="text-[10px] font-mono text-[#6c6e80]">
                  {smStep?.status || 'Pending'}
                </span>
              </div>
            );
          })()}

          <div className="flex-1 h-0.5 bg-[#252838] mx-2 relative -top-3" />

          {/* Node 3: Finance */}
          {(() => {
            const fnStep = stepper.find((s) => s.requiredRole === 'FINANCE');
            const isFnApproved = fnStep?.status === 'APPROVED';
            const isFnActive = fnStep?.status === 'PENDING';
            const isFnReturned = fnStep?.status === 'RETURNED';
            const isFnRejected = fnStep?.status === 'REJECTED';

            return (
              <div className="flex flex-col items-center gap-2 relative">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs transition-all ${
                    isFnApproved
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : isFnReturned
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : isFnRejected
                      ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                      : isFnActive
                      ? 'bg-blue-600 border-blue-400 text-white ring-4 ring-blue-500/20 shadow-md'
                      : 'bg-[#14151f] border-[#2b2d3d] text-[#606275]'
                  }`}
                >
                  {isFnApproved ? <Check className="w-4 h-4" /> : '3'}
                </div>
                <span className={`text-xs font-semibold ${isFnActive ? 'text-blue-400' : 'text-white'}`}>
                  Finance
                </span>
                <span className="text-[10px] font-mono text-[#6c6e80]">
                  {fnStep?.status || 'Escalation'}
                </span>
              </div>
            );
          })()}

          <div className="flex-1 h-0.5 bg-[#252838] mx-2 relative -top-3" />

          {/* Node 4: Confirmed */}
          {(() => {
            const isAllApproved = quotation.status === 'APPROVED';
            return (
              <div className="flex flex-col items-center gap-2 relative">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs ${
                    isAllApproved
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                      : 'bg-[#14151f] border-[#2b2d3d] text-[#606275]'
                  }`}
                >
                  {isAllApproved ? <Check className="w-4 h-4" /> : '4'}
                </div>
                <span className="text-xs font-semibold text-white">Confirmed</span>
                <span className="text-[10px] font-mono text-[#6c6e80]">
                  {isAllApproved ? 'Order Ready' : 'Pending'}
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Audit Trail Table: User, Action, Date, Note */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Audit Trail</h2>
          </div>
          <span className="text-xs text-[#707284]">Append-only operational history</span>
        </div>

        {auditTable.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#707284]">No audit entries recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">User</th>
                  <th className="py-3 px-5 font-semibold">Action</th>
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {auditTable.map((log) => (
                  <tr key={log.id} className="hover:bg-[#13141d]">
                    <td className="py-3.5 px-5 font-medium text-white">
                      <div>{log.user}</div>
                      <div className="text-[10px] text-[#606275]">{log.role || log.userEmail || ''}</div>
                    </td>
                    <td className="py-3.5 px-5 font-mono text-blue-400 font-semibold">{log.action}</td>
                    <td className="py-3.5 px-5 text-[#888a9c] font-mono text-[11px]">
                      {new Date(log.date).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-[#c2c4d8]">{log.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen #6 Bottom Action Buttons: Approve (Green), Return for Revision (Amber), Reject (Red) */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-5 lg:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white">Decision & Authorizations</h2>
            <p className="text-xs text-[#808294] mt-0.5">
              {allowedActions?.canApprove
                ? `You are authorized to action the pending ${allowedActions.requiredRole || 'approval'} step.`
                : allowedActions?.isOwner
                ? 'You are the creator of this quotation. Self-approval is strictly forbidden.'
                : 'You do not hold the required role for the currently pending step.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              disabled={!allowedActions?.canApprove || actionLoading}
              onClick={() => handleStepAction('APPROVED')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-40 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Approve</span>
            </button>

            <button
              disabled={!allowedActions?.canReturn || actionLoading}
              onClick={() => {
                setActiveActionModal('RETURNED');
                setInlineReason('');
                setActionError(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return for Revision</span>
            </button>

            <button
              disabled={!allowedActions?.canReject || actionLoading}
              onClick={() => {
                setActiveActionModal('REJECTED');
                setInlineReason('');
                setActionError(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 transition-all flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>

        {/* Action Error Message */}
        {actionError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Inline Reason Input */}
        {activeActionModal && (
          <div className="p-4 rounded-xl bg-[#13141e] border border-[#2b2d40] space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                {activeActionModal === 'REJECTED' ? (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400" /> Specify Rejection Reason
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 text-amber-400" /> Specify Revision Requirements
                  </>
                )}
              </span>
              <button
                onClick={() => setActiveActionModal(null)}
                className="text-xs text-[#777] hover:text-white"
              >
                Cancel
              </button>
            </div>

            <textarea
              rows={3}
              value={inlineReason}
              onChange={(e) => setInlineReason(e.target.value)}
              placeholder={
                activeActionModal === 'REJECTED'
                  ? 'Enter substantive reason for rejecting this quotation (mandatory)...'
                  : 'Enter specific corrections required from the representative (mandatory)...'
              }
              className="w-full p-3 rounded-lg bg-[#0e0f14] border border-[#222432] text-xs text-white placeholder-[#505264] focus:outline-none focus:border-blue-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setActiveActionModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-[#8e90a4] hover:text-white bg-[#1a1b26]"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || !inlineReason.trim()}
                onClick={() => handleStepAction(activeActionModal, inlineReason)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40 cursor-pointer ${
                  activeActionModal === 'REJECTED'
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {actionLoading ? 'Submitting...' : 'Submit Decision'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
