'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Repeat,
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sliders,
  DollarSign,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { apiRequest } from '../../../../lib/api';

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Modification & Cancellation States
  const [isModifyOpen, setIsModifyOpen] = useState(false);
  const [modifyAmount, setModifyAmount] = useState('');
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer requested termination');

  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/subscriptions/${id}`);
      setData(res);
      if (res.schedule) {
        setModifyAmount(String(res.schedule.amount));
      }
    } catch (err) {
      setError(err.message || 'Failed to load subscription detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchDetail();
    }
  }, [id, fetchDetail]);

  const handleModify = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await apiRequest(`/subscriptions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          newAmount: parseFloat(modifyAmount),
        }),
      });
      setActionMessage({
        type: 'success',
        text: `Subscription rate modified! Prorated mid-cycle adjustment: $${res.proration?.priceAdjustment || 0} for remaining ${res.proration?.daysRemaining || 0} days.`,
      });
      setIsModifyOpen(false);
      await fetchDetail();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to modify subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await apiRequest(`/subscriptions/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({
          reason: cancelReason,
          immediate: true,
        }),
      });
      setActionMessage({
        type: 'success',
        text: `Subscription successfully cancelled. Calculated refund credit note: $${res.cancellationCredit?.refundAmount || 0} (${res.cancellationCredit?.daysRemaining || 0} unserved days).`,
      });
      setIsCancelConfirmOpen(false);
      await fetchDetail();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to cancel subscription.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8 flex items-center justify-center">
        <div className="text-center text-xs text-[#787a8c]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-500" />
          Loading subscription billing breakdown...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8">
        <div className="max-w-2xl mx-auto p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h2 className="text-base font-bold text-white">Error Loading Billing Schedule</h2>
          <p className="text-xs text-rose-300">{error || 'Record not found'}</p>
          <button
            onClick={() => router.push('/subscriptions')}
            className="px-4 py-2 bg-[#1a1b24] hover:bg-[#252734] border border-[#2e3040] rounded-lg text-xs font-medium text-white transition-all"
          >
            Back to Subscriptions
          </button>
        </div>
      </div>
    );
  }

  const { schedule, customer, quotation, oneTimeLines, recurringLines } = data;
  const isCancelled = schedule.status === 'CANCELLED';

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#707284]">
        <Link href="/subscriptions" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Subscriptions
        </Link>
        <span>/</span>
        <span className="text-[#a0a2b4] font-mono">{schedule.planName}</span>
      </div>

      {/* Header & Actions */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Billing Schedule: {schedule.planName}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                schedule.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {schedule.status}
            </span>
          </div>
          <p className="text-xs text-[#8a8b98] mt-1">
            Customer: <span className="text-white font-medium">{customer?.name}</span> • Reference Quotation: <span className="font-mono text-cyan-400">{quotation?.quoteNumber}</span>
          </p>
        </div>

        {/* Modify & Cancel Buttons */}
        {!isCancelled && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsModifyOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161722] hover:bg-[#1e202f] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#888]" />
              <span>Modify Subscription</span>
            </button>

            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:text-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Cancel Subscription</span>
            </button>
          </div>
        )}
      </div>

      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Key Schedule Metrics & Proration Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Cycle & Cadence</div>
          <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
            {schedule.cycle}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">{schedule.prorationResult.totalDays} day cycle basis</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Current Rate</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${schedule.amount.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">Billed per cycle</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Next Bill Date</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {new Date(schedule.nextBillDate).toLocaleDateString()}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">{schedule.prorationResult.daysRemaining} days remaining in cycle</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Proration Credit Value</div>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
            ${schedule.prorationResult.calculatedRefundCredit.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">Current unserved cycle balance</div>
        </div>
      </div>

      {/* Screen #10 Separate Tables: Table 1 - One-Time Lines */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">One-Time Lines</h2>
          </div>
          <span className="text-xs text-[#707284]">
            Invoiced separately via ONE_TIME invoice
          </span>
        </div>

        {oneTimeLines.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#707284]">No one-time hardware lines on this order.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Product</th>
                  <th className="py-3 px-5 font-semibold">Category</th>
                  <th className="py-3 px-5 font-semibold text-right">Quantity</th>
                  <th className="py-3 px-5 font-semibold text-right">Unit Price</th>
                  <th className="py-3 px-5 font-semibold text-right">Discount</th>
                  <th className="py-3 px-5 font-semibold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {oneTimeLines.map((line) => (
                  <tr key={line.id} className="hover:bg-[#13141d]">
                    <td className="py-3.5 px-5 font-semibold text-white">{line.product}</td>
                    <td className="py-3.5 px-5 text-[#888a9c]">{line.category}</td>
                    <td className="py-3.5 px-5 text-right font-mono text-white">{line.quantity}</td>
                    <td className="py-3.5 px-5 text-right font-mono text-[#a0a2b4]">${line.unitPrice.toFixed(2)}</td>
                    <td className="py-3.5 px-5 text-right font-mono text-amber-400">{line.discountPercent.toFixed(1)}%</td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-white">${line.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen #10 Separate Tables: Table 2 - Recurring Lines */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Recurring Lines</h2>
          </div>
          <span className="text-xs text-[#707284]">
            Managed under automated recurring schedule
          </span>
        </div>

        {recurringLines.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#707284]">No recurring subscription lines found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Plan</th>
                  <th className="py-3 px-5 font-semibold">Cycle</th>
                  <th className="py-3 px-5 font-semibold text-right">Quantity</th>
                  <th className="py-3 px-5 font-semibold text-right">Current Amount</th>
                  <th className="py-3 px-5 font-semibold">Next Bill Date</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {recurringLines.map((line) => (
                  <tr key={line.id} className="hover:bg-[#13141d]">
                    <td className="py-3.5 px-5 font-semibold text-white">{line.plan}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a1c26] text-cyan-400 border border-[#2b2e40]">
                        {line.cycle}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-white">{line.quantity}</td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-white">${line.currentAmount.toFixed(2)}</td>
                    <td className="py-3.5 px-5 font-mono text-[#a0a2b4]">{new Date(line.nextBillDate).toLocaleDateString()}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {line.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modify Subscription Modal */}
      {isModifyOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#262838] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1c1d27] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Modify Subscription Rate</span>
              </h3>
              <button onClick={() => setIsModifyOpen(false)} className="text-xs text-[#707284] hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">
                  New Recurring Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={modifyAmount}
                  onChange={(e) => setModifyAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#13141f] border border-[#222434] text-xs space-y-1">
                <div className="text-[11px] font-mono text-[#6c6e80] uppercase">Calculated Mid-Cycle Proration</div>
                <div className="text-[#a0a2b4]">
                  {schedule.prorationResult.daysRemaining} days remaining in cycle ({schedule.prorationResult.totalDays} day base).
                  Delta will be prorated automatically.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1c1d27]">
              <button
                onClick={() => setIsModifyOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#8e90a4] hover:text-white bg-[#151622]"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || !modifyAmount}
                onClick={handleModify}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Confirm Modification'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen #10 Cancellation Confirmation Panel Showing Calculated Credit/Refund */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-rose-500/40 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-white">Confirm Subscription Cancellation</h3>
            </div>

            <p className="text-xs text-[#8e90a2]">
              Review the calculated unserved credit balance before confirming cancellation:
            </p>

            {/* Calculated Credit/Refund Breakdown Card */}
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#888a9c]">Remaining Unserved Days:</span>
                <span className="font-mono font-bold text-white">{schedule.prorationResult.daysRemaining} days</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#888a9c]">Daily Proration Rate:</span>
                <span className="font-mono text-white">
                  ${(schedule.amount / schedule.prorationResult.totalDays).toFixed(2)}/day
                </span>
              </div>
              <div className="h-[1px] bg-rose-500/20 my-1" />
              <div className="flex justify-between text-sm font-bold">
                <span className="text-rose-300">Calculated Credit / Refund:</span>
                <span className="font-mono text-emerald-400">
                  ${schedule.prorationResult.calculatedRefundCredit.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">
                Cancellation Reason
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation rationale..."
                className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1c1d27]">
              <button
                onClick={() => setIsCancelConfirmOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#8e90a4] hover:text-white bg-[#151622]"
              >
                Go Back
              </button>
              <button
                disabled={actionLoading}
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 cursor-pointer"
              >
                {actionLoading ? 'Cancelling...' : 'Confirm & Apply Credit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
