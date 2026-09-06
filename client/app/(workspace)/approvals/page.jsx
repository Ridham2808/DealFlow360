'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Search, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  ChevronRight, 
  RefreshCw,
  User,
  Info
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';

export default function ApprovalsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filter states
  const [pendingOnly, setPendingOnly] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Counts
  const [counts, setCounts] = useState({ pending: 0, returned: 0, approved: 0 });

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (pendingOnly) params.append('pendingOnly', 'true');
      if (statusFilter && !pendingOnly) params.append('status', statusFilter);
      if (riskFilter) params.append('riskLevel', riskFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('page', pagination.page);
      params.append('limit', '500');

      const res = await apiRequest(`/approvals?${params.toString()}`);
      const list = res.items || [];
      setItems(list);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });

      // Compute quick counts
      const pendingCount = list.filter((i) => i.status === 'PENDING_APPROVAL').length;
      const returnedCount = list.filter((i) => i.status === 'RETURNED').length;
      const approvedCount = list.filter((i) => i.status === 'APPROVED' || i.status === 'CONFIRMED').length;
      setCounts({
        pending: pendingCount,
        returned: returnedCount,
        approved: approvedCount,
      });
    } catch (err) {
      setError(err.message || 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, [pendingOnly, statusFilter, riskFilter, searchQuery, pagination.page]);

  useEffect(() => {
    fetchApprovals();
  }, [fetchApprovals]);

  const getRiskBadge = (level) => {
    switch (level) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#2a1315] text-[#f87171] border border-[#4c1d24]">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#261c10] text-[#fbbf24] border border-[#4a3518]">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[#112419] text-[#4ade80] border border-[#1b432a]">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Mockup Screen #5 Header */}
      <div className="pb-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Approvals (List)</h1>
        <p className="text-xs sm:text-sm text-[#888894] mt-0.5">
          Every quotation that needed, needs, or is going through discount approval ({pagination.total || items.length} total records)
        </p>
      </div>

      {/* Screen #5 Top Status Pills with Counts */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => {
            setPendingOnly(false);
            setStatusFilter('');
          }}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            !pendingOnly && !statusFilter
              ? 'bg-[#3b82f6] text-white font-bold shadow-xs'
              : 'bg-[#101524] text-[#60a5fa] border border-[#1e2e4f] hover:bg-[#151f38]'
          }`}
        >
          <span>All Approvals ({pagination.total || items.length})</span>
        </button>

        <button
          onClick={() => {
            setPendingOnly(true);
            setStatusFilter('');
          }}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            pendingOnly
              ? 'bg-[#d97706] text-black font-bold shadow-xs'
              : 'bg-[#1b150c] text-[#d97706] border border-[#3d2a13] hover:bg-[#261c0f]'
          }`}
        >
          <span>{counts.pending} Pending</span>
        </button>

        <button
          onClick={() => {
            setPendingOnly(false);
            setStatusFilter('RETURNED');
          }}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            !pendingOnly && statusFilter === 'RETURNED'
              ? 'bg-[#ef4444] text-white font-bold shadow-xs'
              : 'bg-[#211113] text-[#f87171] border border-[#441a1e] hover:bg-[#2b1518]'
          }`}
        >
          <span>{counts.returned} Returned</span>
        </button>

        <button
          onClick={() => {
            setPendingOnly(false);
            setStatusFilter('APPROVED');
          }}
          className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            !pendingOnly && statusFilter === 'APPROVED'
              ? 'bg-[#22c55e] text-black font-bold shadow-xs'
              : 'bg-[#0f1f16] text-[#4ade80] border border-[#1b3d29] hover:bg-[#152e20]'
          }`}
        >
          <span>{counts.approved} Approved</span>
        </button>
      </div>

      {/* Table & Content Container */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl overflow-hidden shadow-sm">
        {error && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchApprovals} className="underline hover:text-white font-medium">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-[#707284] text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
            Loading approval queue...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-[#707284] text-xs">
            No quotations currently require approval.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] font-mono text-[11px]">
                  <th className="py-3 px-5 font-medium">Quotation</th>
                  <th className="py-3 px-5 font-medium">Customer</th>
                  <th className="py-3 px-5 font-medium">Blended Risk</th>
                  <th className="py-3 px-5 font-medium">Stage</th>
                  <th className="py-3 px-5 font-medium">Assigned To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => router.push(`/approvals/${item.id}`)}
                    className="hover:bg-[#14151e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 font-mono font-medium text-[#dcdce5] group-hover:text-blue-400">
                      {item.quoteNumber}
                    </td>
                    <td className="py-3.5 px-5 text-[#c2c4d6]">
                      {item.customer?.name || 'Customer'}
                    </td>
                    <td className="py-3.5 px-5">
                      {getRiskBadge(item.riskLevel)}
                    </td>
                    <td className="py-3.5 px-5 text-[#a4a6b8]">
                      {item.pendingStep?.requiredRole === 'SALES_MANAGER'
                        ? 'Sales Manager'
                        : item.pendingStep?.requiredRole === 'FINANCE'
                        ? 'Finance'
                        : item.status === 'APPROVED'
                        ? 'Auto-Approved'
                        : item.status}
                    </td>
                    <td className="py-3.5 px-5 text-[#888a9e]">
                      {item.pendingStep?.assignedUser?.name || (item.pendingStep ? 'Pending Assignment' : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen #5 Amber Helper Banner — Subtle, Muted Dark Gold (NO neon glow!) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2">
        <span>Click any row to open its full approval detail, risk breakdown, and audit trail.</span>
      </div>

      {/* Filter: Pending Only Toggle */}
      <div className="pt-1">
        <button
          onClick={() => {
            setPendingOnly(!pendingOnly);
            setStatusFilter('');
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
            pendingOnly
              ? 'bg-[#181924] text-white border-[#2f3246]'
              : 'bg-[#101117] text-[#707284] border-[#1d1f2b] hover:text-white'
          }`}
        >
          Filter: Pending Only {pendingOnly ? '✓' : ''}
        </button>
      </div>
    </div>
  );
}
