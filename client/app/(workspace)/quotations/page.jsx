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
  ArrowUpDown,
  Inbox,
  Package,
  ExternalLink,
  Sparkles,
  Layers,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Badge, Spinner } from '../../../components/ui';

const KANBAN_STAGES = [
  { key: 'DRAFT',            label: 'Draft',                badgeVariant: 'neutral' },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval',     badgeVariant: 'warning' },
  { key: 'RETURNED',         label: 'Returned for Review',  badgeVariant: 'warning' },
  { key: 'APPROVED',         label: 'Approved',             badgeVariant: 'success' },
  { key: 'UNDER_NEGOTIATION',label: 'Negotiation',          badgeVariant: 'info' },
  { key: 'CONFIRMED',        label: 'Confirmed',            badgeVariant: 'success' },
];

export default function QuotationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Main Page Mode
  const [mainTab, setMainTab] = useState('pipeline'); // 'pipeline' | 'requests'

  // Quotations Pipeline State
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [riskFilter, setRiskFilter] = useState(searchParams.get('risk') || '');

  // Inbound Customer Requests (RFQ) State
  const [customerRequests, setCustomerRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [requestSearch, setRequestSearch] = useState('');
  const [convertingRequestId, setConvertingRequestId] = useState(null);

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

  const fetchCustomerRequests = useCallback(async () => {
    try {
      setRequestsLoading(true);
      const res = await api.get('/customer-requests');
      if (res && res.data) {
        setCustomerRequests(res.data.requests || []);
        setPendingRequestsCount(res.data.pendingCount || 0);
      }
    } catch (err) {
      console.error('Failed to load customer requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotations();
    fetchCustomerRequests();
  }, [fetchQuotations, fetchCustomerRequests]);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setRiskFilter('');
  };

  // Convert Customer Inbound Request to Quotation Draft
  const handleCreateQuotationFromRequest = async (requestId) => {
    try {
      setConvertingRequestId(requestId);
      const res = await api.post(`/customer-requests/${requestId}/create-quotation`);
      if (res && res.data && res.data.quotationId) {
        router.push(`/quotations/${res.data.quotationId}`);
      }
    } catch (err) {
      alert(err.message || 'Failed to create quotation from request.');
    } finally {
      setConvertingRequestId(null);
    }
  };

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await api.patch(`/customer-requests/${requestId}/status`, { status: newStatus });
      await fetchCustomerRequests();
    } catch (err) {
      alert(err.message || 'Failed to update request status.');
    }
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
    switch (level) {
      case 'HIGH':
        return <Badge variant="danger" size="sm">High Risk ({score})</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning" size="sm">Med Risk ({score})</Badge>;
      case 'LOW':
        return <Badge variant="neutral" size="sm">Low Risk ({score})</Badge>;
      default:
        return null;
    }
  };

  // Filtered customer requests
  const filteredCustomerRequests = customerRequests.filter((r) => {
    if (requestFilter !== 'ALL' && r.status !== requestFilter) return false;
    if (requestSearch) {
      const q = requestSearch.toLowerCase();
      const matchNum = r.requestNumber.toLowerCase().includes(q);
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchCust = (r.customer?.name || '').toLowerCase().includes(q);
      return matchNum || matchTitle || matchCust;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">
            Sales Quotations & Inbound Demand
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Manage live quotation pipeline, review customer inbound RFQ requests, and generate proposals.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {mainTab === 'pipeline' && (
            <div className="flex items-center p-0.5 rounded-lg bg-[#111216] border border-[#222228]">
              <button
                onClick={() => setViewMode('kanban')}
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
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
                className={`p-1.5 rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
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
          )}

          <button
            onClick={() => {
              fetchQuotations();
              fetchCustomerRequests();
            }}
            disabled={loading || requestsLoading}
            className="h-8 w-8 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || requestsLoading ? 'animate-spin' : ''}`} />
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

      {/* Main Tabs: Pipeline vs Customer Inbound Requests (RFQ) */}
      <div className="flex items-center gap-2 border-b border-[#1c1c22] pb-3">
        <button
          onClick={() => setMainTab('pipeline')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            mainTab === 'pipeline'
              ? 'bg-[#181920] text-white border border-[#2a2b36] shadow-xs'
              : 'text-[#8e95a5] hover:text-white hover:bg-[#111216]'
          }`}
        >
          <span>Quotations Pipeline</span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono">
            {quotations.length}
          </span>
        </button>

        <button
          onClick={() => setMainTab('requests')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
            mainTab === 'requests'
              ? 'bg-[#181920] text-white border border-[#2a2b36] shadow-xs'
              : 'text-[#8e95a5] hover:text-white hover:bg-[#111216]'
          }`}
        >
          <Inbox className="w-3.5 h-3.5 text-amber-400" />
          <span>Customer Inbound Requests (RFQ)</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold font-mono">
              {pendingRequestsCount} New
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: CUSTOMER INBOUND REQUESTS (RFQ) */}
      {mainTab === 'requests' && (
        <div className="space-y-4">
          {/* Requests Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#0b0c0e] border border-[#1c1c22]">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                <input
                  type="text"
                  placeholder="Search by request #, customer, or title..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#111216] border border-[#222228] rounded-lg text-[#ededed] placeholder-[#555] focus:outline-hidden focus:border-[#3b82f6]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'PENDING', 'REVIEWED', 'QUOTED', 'DECLINED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setRequestFilter(st)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    requestFilter === st
                      ? 'bg-[#1e2029] text-white border border-[#2e3347]'
                      : 'text-[#8e95a5] hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Requests' : st}
                </button>
              ))}
            </div>
          </div>

          {requestsLoading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : filteredCustomerRequests.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#0c0d10] border border-[#1a1b22] text-[#71717a] space-y-2">
              <Inbox className="w-10 h-10 mx-auto text-[#555]" />
              <p className="text-sm font-semibold text-white">No Customer Requests Found</p>
              <p className="text-xs max-w-sm mx-auto">
                No inbound requests match the current filter. Customer quote requests submitted through the Customer Portal will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCustomerRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#0e1015] border border-[#1e212d] rounded-xl p-5 space-y-4 hover:border-[#2e3347] transition-colors shadow-xs"
                >
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c1f2b] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/50">
                        {req.requestNumber}
                      </span>
                      <h3 className="text-sm font-bold text-white tracking-tight">
                        {req.title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          req.status === 'QUOTED'
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                            : req.status === 'REVIEWED'
                            ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                            : req.status === 'DECLINED'
                            ? 'bg-red-950/60 text-red-300 border border-red-800/60'
                            : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-[11px] text-[#71788e]">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info & Requirements */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-[#12141c] p-3 rounded-lg border border-[#222533]">
                      <span className="text-[10px] uppercase text-[#71788e] font-semibold tracking-wider block mb-1">
                        Customer Account
                      </span>
                      <div className="font-semibold text-white">{req.customer?.name}</div>
                      <div className="text-[10px] text-[#8e95a5] flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50 text-[9px] font-bold">
                          {req.customer?.tier} TIER
                        </span>
                        <span>{req.customer?.email}</span>
                      </div>
                    </div>

                    <div className="bg-[#12141c] p-3 rounded-lg border border-[#222533]">
                      <span className="text-[10px] uppercase text-[#71788e] font-semibold tracking-wider block mb-1">
                        Commercial Target
                      </span>
                      <div className="font-mono font-bold text-white">
                        {req.targetBudget ? `$${Number(req.targetBudget).toLocaleString()}` : 'Not Specified'}
                      </div>
                      <div className="text-[10px] text-[#71788e] mt-0.5">Customer Budget Target</div>
                    </div>

                    <div className="bg-[#12141c] p-3 rounded-lg border border-[#222533]">
                      <span className="text-[10px] uppercase text-[#71788e] font-semibold tracking-wider block mb-1">
                        Required By
                      </span>
                      <div className="font-semibold text-white">
                        {req.neededByDate ? new Date(req.neededByDate).toLocaleDateString() : 'Flexible'}
                      </div>
                      <div className="text-[10px] text-[#71788e] mt-0.5">Delivery Target</div>
                    </div>

                    <div className="bg-[#12141c] p-3 rounded-lg border border-[#222533]">
                      <span className="text-[10px] uppercase text-[#71788e] font-semibold tracking-wider block mb-1">
                        Requested Scope
                      </span>
                      <div className="font-semibold text-white">
                        {Array.isArray(req.items) ? req.items.length : 0} Item Lines
                      </div>
                      <div className="text-[10px] text-blue-400 mt-0.5">Ready for Quote Generation</div>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {req.notes && (
                    <div className="text-xs bg-[#11131a] border border-[#222533] p-3 rounded-lg text-[#c5c9d6] leading-relaxed">
                      <span className="font-semibold text-white block mb-0.5">Customer Requirement Notes:</span>
                      {req.notes}
                    </div>
                  )}

                  {/* Requested Items Table / Badges */}
                  {Array.isArray(req.items) && req.items.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold uppercase text-[#71788e] tracking-wider block">
                        Requested Item Lines Breakdown
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                        {req.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="bg-[#141620] border border-[#252838] rounded-lg p-2.5 text-xs flex flex-col justify-between gap-1"
                          >
                            <div className="font-medium text-white truncate" title={it.name}>
                              {it.name}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-[#8e95a5] pt-1 border-t border-[#1e2130]">
                              <span className="text-blue-400 font-mono font-semibold">Qty: {it.quantity}</span>
                              <span className="px-1.5 py-0.2 rounded bg-[#0a0c10] border border-[#222533] text-[9px]">
                                {it.category || 'Hardware'}
                              </span>
                            </div>
                            {it.notes && (
                              <div className="text-[10px] text-[#71788e] italic truncate" title={it.notes}>
                                {it.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1c1f2b]">
                    <div className="flex items-center gap-2">
                      {req.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'REVIEWED')}
                          className="px-3 py-1.5 rounded-lg border border-[#272a38] text-xs font-medium text-[#8e95a5] hover:text-white hover:bg-[#161821] transition-colors cursor-pointer"
                        >
                          Mark as Reviewed
                        </button>
                      )}
                      {req.status !== 'DECLINED' && req.status !== 'QUOTED' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'DECLINED')}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#71788e] hover:text-red-400 transition-colors cursor-pointer"
                        >
                          Decline Request
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {req.quotation ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/quotations/${req.quotation.id}`)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Quoted Proposal ({req.quotation.quoteNumber})</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleCreateQuotationFromRequest(req.id)}
                          disabled={convertingRequestId === req.id}
                          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors shadow-sm cursor-pointer"
                        >
                          {convertingRequestId === req.id ? (
                            <Spinner size="xs" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>⚡ Create Quotation from Request</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: QUOTATIONS PIPELINE (Kanban or Table) */}
      {mainTab === 'pipeline' && (
        <div className="space-y-4">
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
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#111216] border border-[#222228] rounded-lg text-[#ededed] placeholder-[#555] focus:outline-hidden focus:border-[#3b82f6]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#111216] border border-[#222228] rounded-lg text-[#ededed] focus:outline-hidden focus:border-[#3b82f6]"
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="UNDER_NEGOTIATION">Under Negotiation</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="RETURNED">Returned</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-[#111216] border border-[#222228] rounded-lg text-[#ededed] focus:outline-hidden focus:border-[#3b82f6]"
              >
                <option value="">All Risk Levels</option>
                <option value="LOW">Low Risk</option>
                <option value="MEDIUM">Medium Risk</option>
                <option value="HIGH">High Risk</option>
              </select>

              {(search || statusFilter || riskFilter) && (
                <button
                  onClick={clearFilters}
                  className="p-1.5 rounded-lg text-[#888] hover:text-[#ededed] hover:bg-[#1c1d24] transition-colors"
                  title="Clear filters"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Pipeline Content Area */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : quotations.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-[#0c0d10] border border-[#1a1b22] text-[#71717a]">
              <p className="text-sm font-semibold text-white">No Quotations Found</p>
              <p className="text-xs mt-1">Try adjusting your filters or create a new quotation.</p>
            </div>
          ) : viewMode === 'kanban' ? (
            /* KANBAN VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 overflow-x-auto pb-4 items-start">
              {KANBAN_STAGES.map((stage) => {
                const stageQuotes = quotations.filter((q) => q.status === stage.key);
                const stageTotal = stageQuotes.reduce((acc, q) => acc + Number(q.grandTotal || 0), 0);
                const isReturnedStage = stage.key === 'RETURNED';

                return (
                  <div
                    key={stage.key}
                    className={`flex flex-col rounded-xl bg-[#0b0c0e] border min-w-[230px] max-h-[calc(100vh-250px)] overflow-hidden ${
                      isReturnedStage ? 'border-amber-900/30' : 'border-[#191a20]'
                    }`}
                  >
                    {/* Stage Header */}
                    <div className={`p-3 border-b flex items-center justify-between ${
                      isReturnedStage ? 'border-amber-900/30 bg-amber-950/10' : 'border-[#191a20]'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold tracking-tight ${
                          isReturnedStage ? 'text-amber-300' : 'text-[#ededed]'
                        }`}>
                          {stage.label}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full border ${
                          isReturnedStage
                            ? 'bg-amber-950/50 text-amber-300 border-amber-800/60'
                            : 'bg-[#181920] text-[#71717a] border-[#222228]'
                        }`}>
                          {stageQuotes.length}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-[#71717a]">
                        ${stageTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    {/* Cards Container */}
                    <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1 max-h-[600px]">
                      {stageQuotes.length === 0 ? (
                        <div className="py-8 text-center text-[11px] text-[#444] font-mono">
                          No quotes in {stage.label.toLowerCase()}
                        </div>
                      ) : (
                        stageQuotes.map((q) => (
                          <div
                            key={q.id}
                            onClick={() => router.push(`/quotations/${q.id}`)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors shadow-xs group ${
                              isReturnedStage
                                ? 'bg-[#14120c] border-amber-900/50 hover:border-amber-600/70'
                                : 'bg-[#111216] border-[#1e1f26] hover:border-[#333542]'
                            }`}
                          >
                            {isReturnedStage && (
                              <div className="text-[10px] text-amber-400 font-semibold mb-1 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Returned by Manager</span>
                              </div>
                            )}

                            <div className="flex items-center justify-between gap-1 mb-1.5">
                              <span className={`font-mono text-xs font-bold transition-colors ${
                                isReturnedStage ? 'text-amber-300 group-hover:text-amber-200' : 'text-[#ededed] group-hover:text-blue-400'
                              }`}>
                                {q.quoteNumber}
                              </span>
                              {getRiskBadge(q.riskLevel, q.blendedRiskScore)}
                            </div>

                            <div className="text-xs font-medium text-[#c8c8c2] truncate mb-2">
                              {q.customer?.name || 'Customer'}
                            </div>

                            <div className={`flex items-center justify-between pt-2 border-t text-xs ${
                              isReturnedStage ? 'border-amber-900/30' : 'border-[#181920]'
                            }`}>
                              <div className="font-mono font-bold text-[#ededed]">
                                ${Number(q.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[10px] text-[#71717a] font-mono">
                                {Number(q.marginPercentage || 0).toFixed(0)}% margin
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TABLE VIEW */
            <div className="rounded-xl border border-[#191a20] bg-[#0b0c0e] overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#191a20] text-[11px] font-semibold uppercase tracking-wider text-[#71717a] bg-[#0e0f13]">
                      <th className="py-2.5 px-4">Quote #</th>
                      <th className="py-2.5 px-4">Customer</th>
                      <th className="py-2.5 px-4">Owner</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                      <th className="py-2.5 px-4 text-right">Discount</th>
                      <th className="py-2.5 px-4 text-right">Grand Total</th>
                      <th className="py-2.5 px-4 text-right">Margin %</th>
                      <th className="py-2.5 px-4 text-center">Risk</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#15161c]">
                    {quotations.map((q) => (
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
