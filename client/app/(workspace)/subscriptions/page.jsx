'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Repeat, 
  Plus, 
  Calendar, 
  ChevronRight, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  PauseCircle, 
  XCircle,
  Clock
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';

export default function SubscriptionsListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    statusCounts: { active: 0, paused: 0, cancelled: 0 },
    items: [],
    pagination: { page: 1, totalPages: 1, total: 0 },
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState(''); // '' for all, or 'ACTIVE', 'PAUSED', 'CANCELLED'

  // Admin "+ New Plan" Modal state
  const [isNewPlanOpen, setIsNewPlanOpen] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: '',
    billingCycle: 'MONTHLY',
    price: '',
  });
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', '1');
      params.append('limit', '500');

      const res = await apiRequest(`/subscriptions?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleCreatePlan = async (e) => {
    e.preventDefault();
    if (!planForm.name || !planForm.price) {
      setPlanError('Plan name and price are required.');
      return;
    }

    setPlanLoading(true);
    setPlanError(null);
    try {
      await apiRequest('/admin/subscription-plans', {
        method: 'POST',
        body: JSON.stringify({
          name: planForm.name,
          billingCycle: planForm.billingCycle,
          price: parseFloat(planForm.price),
        }),
      });
      setIsNewPlanOpen(false);
      setPlanForm({ name: '', billingCycle: 'MONTHLY', price: '' });
      await fetchSubscriptions();
    } catch (err) {
      setPlanError(err.message || 'Failed to create plan.');
    } finally {
      setPlanLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <PauseCircle className="w-3 h-3" /> Paused
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#1a1b26] text-[#9092a4]">
            {status}
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
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Repeat className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Subscription Management</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8a8b98] mt-1">
            Manage recurring schedules, mid-cycle proration adjustments, and cancellation credit balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Admin only "+ New Plan" button */}
          {isAdmin && (
            <button
              onClick={() => setIsNewPlanOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Plan (Admin)</span>
            </button>
          )}

          <button
            onClick={fetchSubscriptions}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] hover:border-[#383a52] text-xs text-[#d0d2e0] hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchSubscriptions} className="underline hover:text-white font-medium">Retry</button>
        </div>
      )}

      {/* Screen #9 Status Filter Pills with Counts */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            statusFilter === ''
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          All ({data.pagination.total || 0})
        </button>

        <button
          onClick={() => setStatusFilter('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            statusFilter === 'ACTIVE'
              ? 'bg-emerald-500 text-black shadow-sm font-bold'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          Active ({data.statusCounts?.active || 0})
        </button>

        <button
          onClick={() => setStatusFilter('PAUSED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            statusFilter === 'PAUSED'
              ? 'bg-amber-500 text-black shadow-sm font-bold'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Paused ({data.statusCounts?.paused || 0})
        </button>

        <button
          onClick={() => setStatusFilter('CANCELLED')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            statusFilter === 'CANCELLED'
              ? 'bg-rose-500 text-white shadow-sm font-bold'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-400" />
          Cancelled ({data.statusCounts?.cancelled || 0})
        </button>
      </div>

      {/* Screen #9 Subscriptions Table (Customer, Plan, Cycle, Next Bill, Status, Actions) */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#707284]">Loading subscriptions...</div>
        ) : data.items.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#707284]">
            No subscription billing schedules found for this status.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Customer</th>
                  <th className="py-3 px-5 font-semibold">Plan</th>
                  <th className="py-3 px-5 font-semibold">Billing Cycle</th>
                  <th className="py-3 px-5 font-semibold text-right">Recurring Rate</th>
                  <th className="py-3 px-5 font-semibold">Next Bill Date</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {data.items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/subscriptions/${item.id}`)}
                    className="hover:bg-[#14151e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {item.customer}
                      </div>
                      <div className="text-[10px] text-[#6b6d80] font-mono">{item.quoteNumber}</div>
                    </td>
                    <td className="py-3.5 px-5 font-medium text-[#d0d2e0]">{item.plan}</td>
                    <td className="py-3.5 px-5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a1c26] text-cyan-400 border border-[#2b2e40]">
                        {item.cycle}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-semibold text-white">
                      ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5 text-[#989ab0] font-mono">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#585a6e]" />
                        <span>{new Date(item.nextBill).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5">{getStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/subscriptions/${item.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#181a24] hover:bg-[#202230] border border-[#2b2d3e] text-[11px] font-medium text-[#d8daf0] hover:text-white transition-colors"
                      >
                        <span>Manage</span>
                        <ChevronRight className="w-3 h-3 text-[#707286]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen #9 Amber Helper Text Banner (Muted Dark Gold, No Neon Glow) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2">
        <span>Click a subscription row to open its billing detail and proration history.</span>
      </div>

      {/* Screen #9 + New Plan (Admin) Button */}
      <div className="pt-1">
        <button
          onClick={() => setIsNewPlanOpen(true)}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#14151e] hover:bg-[#1c1e2b] border border-[#27293b] text-[#d4d6e8] hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-blue-400" />
          <span>+ New Plan (Admin)</span>
        </button>
      </div>
      {isNewPlanOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#262838] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1c1d27] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Create Subscription Plan</span>
              </h3>
              <button onClick={() => setIsNewPlanOpen(false)} className="text-xs text-[#707284] hover:text-white">
                ✕
              </button>
            </div>

            {planError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {planError}
              </div>
            )}

            <form onSubmit={handleCreatePlan} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">Plan Name</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Enterprise Cloud SaaS"
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white placeholder-[#505264] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">Billing Cycle</label>
                <select
                  value={planForm.billingCycle}
                  onChange={(e) => setPlanForm({ ...planForm, billingCycle: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="MONTHLY">MONTHLY (30 Days)</option>
                  <option value="QUARTERLY">QUARTERLY (90 Days)</option>
                  <option value="YEARLY">YEARLY (365 Days)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">Base Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                  placeholder="199.00"
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white placeholder-[#505264] focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1c1d27]">
                <button
                  type="button"
                  onClick={() => setIsNewPlanOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8e90a4] hover:text-white bg-[#151622]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 cursor-pointer"
                >
                  {planLoading ? 'Creating...' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
