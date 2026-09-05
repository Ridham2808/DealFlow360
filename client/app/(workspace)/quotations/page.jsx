'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../lib/api';
import { 
  Plus, 
  Table as TableIcon, 
  Kanban as KanbanIcon, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal,
  X,
  ShieldAlert,
  ArrowUpDown
} from 'lucide-react';
import { Badge, Spinner } from '../../../components/ui';

const KANBAN_STAGES = [
  { key: 'DRAFT',            label: 'Draft',             badgeVariant: 'neutral' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval',  badgeVariant: 'warning' },
  { key: 'APPROVED',         label: 'Approved',          badgeVariant: 'success' },
  { key: 'UNDER_NEGOTIATION',label: 'Negotiation',       badgeVariant: 'info' },
  { key: 'CONFIRMED',        label: 'Confirmed',         badgeVariant: 'success' },
];

export default function QuotationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('risk') || '');

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (riskFilter) queryParams.set('riskLevel', riskFilter);
      queryParams.set('limit', '100');

      const res = await api.get(`/quotations?${queryParams.toString()}`);
      if (res && res.data) {
        setQuotations(res.data.items || res.data.quotations || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load quotations pipeline.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, riskFilter]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setRiskFilter('');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning" size="sm">Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="success" size="sm">Approved</Badge>;
      case 'UNDER_NEGOTIATION':
        return <Badge variant="info" size="sm">Negotiation</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success" size="sm">Confirmed</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      case 'RETURNED':
        return <Badge variant="warning" size="sm">Returned</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const getRiskBadge = (level, score) => {
    if (!level || level === 'NONE') return null;
    if (level === 'HIGH' || score >= 60) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/50">
          <ShieldAlert className="w-2.5 h-2.5" />
          Risk {score}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-900/50">
        Risk {score}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Title & Top Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">
            Quotations (List)
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Every quotation in the system, one row per quotation, click a row to open it
          </p>
        </div>

        {/* Actions and View Mode Switcher */}
        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-[#111216] border border-[#222228]">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-[#1c1d24] text-[#ededed] shadow-sm font-semibold'
                  : 'text-[#666] hover:text-[#aaa]'
              }`}
              title="Kanban Board View"
            >
              <KanbanIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#1c1d24] text-[#ededed] shadow-sm font-semibold'
                  : 'text-[#666] hover:text-[#aaa]'
              }`}
              title="Table Grid View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <button
            onClick={fetchQuotations}
            disabled={loading}
            className="h-8 w-8 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/quotations/new"
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Quotation</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0c0e] border border-[#1c1c22]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              placeholder="Search by quote number, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#111114] border border-[#222226] text-[#ededed] placeholder-[#555] rounded-lg focus:outline-none focus:border-[#444] transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-[#111114] border border-[#222226] text-[#c8c8c2] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#444]"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="UNDER_NEGOTIATION">Under Negotiation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {/* Risk Filter */}
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="text-xs bg-[#111114] border border-[#222226] text-[#c8c8c2] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#444]"
          >
            <option value="">All Risk Levels</option>
            <option value="NONE">None (0 Risk)</option>
            <option value="LOW">Low Risk</option>
            <option value="MEDIUM">Medium Risk</option>
            <option value="HIGH">High Risk</option>
          </select>

          {(search || statusFilter || riskFilter) && (
            <button
              onClick={clearFilters}
              className="h-7 px-2 text-[11px] text-[#888] hover:text-[#eee] flex items-center gap-1 rounded-md hover:bg-[#16171d] transition-colors"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 min-h-[500px]">
          {KANBAN_STAGES.map((col) => {
            const stageQuotes = quotations.filter((q) => q.status === col.key);

            return (
              <div
                key={col.key}
                className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1 border-b border-[#18181f] pb-2">
                    <span className="text-xs font-semibold text-[#a1a1aa] tracking-tight">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-mono text-[#52525b] px-1.5 py-0.5 rounded bg-[#131418] border border-[#222228]">
                      {stageQuotes.length}
                    </span>
                  </div>

                  {/* Cards inside column */}
                  <div className="space-y-2.5">
                    {loading && quotations.length === 0 ? (
                      <div className="py-6 flex justify-center">
                        <Spinner size="sm" />
                      </div>
                    ) : stageQuotes.length === 0 ? (
                      <div className="py-6 text-center text-[11px] text-[#444]">
                        No quotes
                      </div>
                    ) : (
                      stageQuotes.map((q) => (
                        <div
                          key={q.id}
                          onClick={() => router.push(`/quotations/${q.id}`)}
                          className="bg-[#111216] hover:bg-[#15161c] border border-[#1f2027] hover:border-[#31333e] rounded-xl p-3 cursor-pointer transition-all group space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-[#ededed] group-hover:text-blue-400 transition-colors">
                              {q.quoteNumber}
                            </span>
                            {getRiskBadge(q.riskLevel, q.blendedRiskScore)}
                          </div>

                          <div className="space-y-0.5">
                            <div className="text-xs font-medium text-[#d4d4d8] truncate">
                              {q.customer?.name || 'Unassigned Customer'}
                            </div>
                            <div className="text-[10px] text-[#666] truncate">
                              Rep: {q.ownerRep?.name || 'Operations'}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-[#1a1a22] text-xs">
                            <span className="font-mono font-bold text-[#ededed]">
                              ${Number(q.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] font-mono text-[#71717a]">
                              {Number(q.marginPercentage || 0).toFixed(1)}% margin
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Grid View */
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#c8c8c2]">
              <thead className="bg-[#111216] text-[#71717a] font-mono text-[11px] uppercase tracking-wider border-b border-[#1c1c22]">
                <tr>
                  <th className="py-3 px-4">Quote #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Owner Rep</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Subtotal</th>
                  <th className="py-3 px-4 text-right">Discount</th>
                  <th className="py-3 px-4 text-right">Grand Total</th>
                  <th className="py-3 px-4 text-right">Margin %</th>
                  <th className="py-3 px-4 text-center">Risk</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#18181f]">
                {loading && quotations.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center">
                      <Spinner size="md" />
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-xs text-[#555]">
                      No quotations match your filters.
                    </td>
                  </tr>
                ) : (
                  quotations.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => router.push(`/quotations/${q.id}`)}
                      className="hover:bg-[#121319] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#ededed] group-hover:text-blue-400 transition-colors">
                        {q.quoteNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#ededed]">
                        {q.customer?.name || 'Customer'}
                      </td>
                      <td className="py-3 px-4 text-[#71717a]">
                        {q.ownerRep?.name || 'Operations'}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(q.status)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        ${Number(q.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-amber-400">
                        ${Number(q.discountTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#ededed]">
                        ${Number(q.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className={Number(q.marginPercentage) >= 30 ? 'text-emerald-400' : Number(q.marginPercentage) >= 15 ? 'text-amber-400' : 'text-red-400'}>
                          {Number(q.marginPercentage || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getRiskBadge(q.riskLevel, q.blendedRiskScore) || (
                          <span className="text-[10px] text-[#555] font-mono">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-blue-400 hover:text-blue-300 flex items-center justify-end gap-0.5">
                          <span>Open</span>
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
