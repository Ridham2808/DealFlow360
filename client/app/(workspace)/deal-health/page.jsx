'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Clock,
  Truck,
  Send,
  ArrowUpRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  User,
  ExternalLink
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';

export default function DealHealthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    cards: { stalledDeals: 0, discountAnomalies: 0, deliverySlippage: 0 },
    table: [],
  });

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text }

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/deal-health');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load deal health data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleEscalate = async (flagId, e) => {
    e.stopPropagation();
    setActionLoadingId(`esc-${flagId}`);
    setFeedback(null);
    try {
      await apiRequest(`/deal-health/${flagId}/escalate`, { method: 'POST' });
      setFeedback({ type: 'success', text: 'Deal anomaly escalated to HIGH priority with management audit.' });
      await fetchDashboard();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to escalate flag.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleNudgeRep = async (flagId, repName, e) => {
    e.stopPropagation();
    setActionLoadingId(`nudge-${flagId}`);
    setFeedback(null);
    try {
      const res = await apiRequest(`/deal-health/${flagId}/nudge`, { method: 'POST' });
      setFeedback({ type: 'success', text: `Nudge dispatched to ${repName}! Operational audit log recorded.` });
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to nudge representative.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getIssueBadge = (issue) => {
    switch (issue) {
      case 'STALLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Stalled Deal
          </span>
        );
      case 'DISCOUNT_ANOMALY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> Discount Anomaly
          </span>
        );
      case 'DELIVERY_SLIPPAGE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Truck className="w-3 h-3" /> Delivery Slippage
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1d1f2b] text-[#a0a2b4]">
            {issue}
          </span>
        );
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 uppercase">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
            Med
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
            Low
          </span>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c1d25]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Deal Health & Anomaly Telemetry
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8a8b98] mt-1">
            Real-time scanner surfacing stalled negotiations, rep discount anomalies, and warehouse fulfillment slippage.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] hover:border-[#383a52] text-xs text-[#d0d2e0] hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Rescan Pipeline</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchDashboard} className="underline hover:text-white font-medium">Retry</button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Screen #14 Three Telemetry Cards: Stalled Deals, Discount Anomalies, Delivery Slippage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Stalled Deals */}
        <div className="bg-[#0e0f14] border border-[#1b1c26] hover:border-[#2b2d3d] rounded-2xl p-5 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8a8b98] uppercase font-semibold">
              Stalled Deals
            </span>
            <div className="p-1.5 rounded-lg bg-[#181510] text-[#c9b276]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {data.cards?.stalledDeals || 0}
          </div>
          <p className="text-[11px] text-[#717386]">
            Quotations inactive &gt; 7 days without revision or approval
          </p>
        </div>

        {/* Card 2: Discount Anomalies */}
        <div className="bg-[#0e0f14] border border-[#1b1c26] hover:border-[#2b2d3d] rounded-2xl p-5 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8a8b98] uppercase font-semibold">
              Discount Anomalies
            </span>
            <div className="p-1.5 rounded-lg bg-[#1f1315] text-[#f87171]">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {data.cards?.discountAnomalies || 0}
          </div>
          <p className="text-[11px] text-[#717386]">
            Discounts materially above representative historical benchmarks
          </p>
        </div>

        {/* Card 3: Delivery Slippage */}
        <div className="bg-[#0e0f14] border border-[#1b1c26] hover:border-[#2b2d3d] rounded-2xl p-5 shadow-sm space-y-2 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-[#8a8b98] uppercase font-semibold">
              Delivery Slippage
            </span>
            <div className="p-1.5 rounded-lg bg-[#181424] text-[#c084fc]">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {data.cards?.deliverySlippage || 0}
          </div>
          <p className="text-[11px] text-[#717386]">
            Confirmed orders with unfulfilled backorders or overdue shipments
          </p>
        </div>
      </div>

      {/* Screen #14 Table: Deal, Issue, Flagged, Severity, and Action */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Active Pipeline Anomalies</h2>
          </div>
          <span className="text-xs text-[#707284]">
            {data.table?.length || 0} active unresolved risk flags
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-[#707284]">Scanning deal health...</div>
        ) : data.table?.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#707284]">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            Pipeline healthy. No stalled deals, outlier discounts, or delivery slippage detected.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Deal / Quotation</th>
                  <th className="py-3 px-5 font-semibold">Issue</th>
                  <th className="py-3 px-5 font-semibold">Flagged Details</th>
                  <th className="py-3 px-5 font-semibold">Flagged Date</th>
                  <th className="py-3 px-5 font-semibold">Severity</th>
                  <th className="py-3 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {data.table.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/quotations/${row.quotationId}`)}
                    className="hover:bg-[#14151e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-mono font-semibold text-blue-400 group-hover:text-blue-300 flex items-center gap-1.5">
                        <span>{row.deal}</span>
                        <ExternalLink className="w-3 h-3 text-[#555] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="text-[10px] text-[#717386]">
                        {row.customer} • Rep: {row.ownerRep?.name || 'Rep'}
                      </div>
                    </td>
                    <td className="py-3.5 px-5">{getIssueBadge(row.issue)}</td>
                    <td className="py-3.5 px-5 text-[#c0c2d4] max-w-sm leading-relaxed">
                      {row.details}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-[#8a8c9e] text-[11px]">
                      {new Date(row.flagged).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-5">{getSeverityBadge(row.severity)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {/* Red outline Nudge Rep button (Mockup requirement) */}
                        <button
                          disabled={actionLoadingId === `nudge-${row.id}`}
                          onClick={(e) => handleNudgeRep(row.id, row.ownerRep?.name, e)}
                          className="px-3 py-1.5 rounded-lg border border-rose-500/40 hover:bg-rose-500/10 text-rose-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3 text-rose-400" />
                          <span>{actionLoadingId === `nudge-${row.id}` ? 'Nudging...' : 'Nudge Rep'}</span>
                        </button>

                        {/* Escalate button */}
                        <button
                          disabled={actionLoadingId === `esc-${row.id}` || row.severity === 'HIGH'}
                          onClick={(e) => handleEscalate(row.id, e)}
                          className="px-3 py-1.5 rounded-lg bg-[#181a24] hover:bg-[#202230] border border-[#2b2d3e] text-[#d0d2e0] hover:text-white text-[11px] font-medium transition-all flex items-center gap-1 disabled:opacity-40 cursor-pointer"
                        >
                          <ArrowUpRight className="w-3 h-3 text-[#888]" />
                          <span>{actionLoadingId === `esc-${row.id}` ? '...' : 'Escalate'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
