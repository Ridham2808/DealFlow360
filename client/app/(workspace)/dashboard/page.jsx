'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { 
  Plus, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ArrowUpRight, 
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Activity,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Badge, Spinner } from '../../../components/ui';

export default function WorkspaceDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/quotations/dashboard-metrics');
      if (res && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load operational metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge variant="warning" size="sm">Pending Approval</Badge>;
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

  const metrics = data?.metrics || {
    pendingApprovals: { count: 0, subtext: '0 quotations waiting' },
    openQuotations: { count: 0, subtext: 'Draft + Negotiation' },
    atRiskDeals: { count: 0, subtext: 'Flagged by Deal Health limits' },
  };

  return (
    <div className="space-y-6">
      {/* Header: Exact match to prompt specification */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#18181b] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#71717a]">
              Sales Operations
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">
            Sales Dashboard / Home
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Real-time pipeline visibility, approval velocity, and margin protection telemetry.
          </p>
        </div>

        {/* Action Buttons: + New Quotation and View Approvals */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="h-8 w-8 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors"
            title="Refresh dashboard"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/quotations?status=PENDING_APPROVAL"
            className="h-8 px-3 rounded-lg text-xs font-medium bg-[#131418] border border-[#26272e] hover:bg-[#1a1b22] text-[#d4d4d8] flex items-center gap-1.5 transition-colors"
          >
            <span>View Approvals</span>
          </Link>

          <Link
            href="/quotations/new"
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ New Quotation</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3 Clickable Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Pending Approvals */}
        <div
          onClick={() => router.push('/quotations?status=PENDING_APPROVAL')}
          className="bg-[#0b0c0e] hover:bg-[#101116] border border-[#1c1c22] hover:border-amber-900/50 rounded-2xl p-5 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] group-hover:text-amber-400 transition-colors">
                Pending Approvals
              </span>
              <div className="text-3xl font-bold tracking-tight text-[#ededed] mt-1.5">
                {metrics.pendingApprovals.count}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-400 group-hover:scale-105 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-[#71717a] mt-4 pt-3 border-t border-[#18181f] flex items-center justify-between">
            <span>{metrics.pendingApprovals.subtext}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52525b] group-hover:text-amber-400 transition-colors" />
          </div>
        </div>

        {/* Card 2: Open Quotations */}
        <div
          onClick={() => router.push('/quotations?status=DRAFT')}
          className="bg-[#0b0c0e] hover:bg-[#101116] border border-[#1c1c22] hover:border-blue-900/50 rounded-2xl p-5 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] group-hover:text-blue-400 transition-colors">
                Open Quotations
              </span>
              <div className="text-3xl font-bold tracking-tight text-[#ededed] mt-1.5">
                {metrics.openQuotations.count}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-950/30 border border-blue-900/40 text-blue-400 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-[#71717a] mt-4 pt-3 border-t border-[#18181f] flex items-center justify-between">
            <span>{metrics.openQuotations.subtext}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52525b] group-hover:text-blue-400 transition-colors" />
          </div>
        </div>

        {/* Card 3: At Risk Deals */}
        <div
          onClick={() => router.push('/quotations?risk=HIGH')}
          className="bg-[#0b0c0e] hover:bg-[#101116] border border-[#1c1c22] hover:border-red-900/50 rounded-2xl p-5 cursor-pointer transition-all group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a] group-hover:text-red-400 transition-colors">
                At Risk Deals
              </span>
              <div className="text-3xl font-bold tracking-tight text-[#ededed] mt-1.5">
                {metrics.atRiskDeals.count}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xs text-[#71717a] mt-4 pt-3 border-t border-[#18181f] flex items-center justify-between">
            <span>{metrics.atRiskDeals.subtext}</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#52525b] group-hover:text-red-400 transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Recent Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Feed (Real AuditLog records) */}
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#18181f] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#71717a]" />
                <h3 className="text-sm font-semibold text-[#ededed]">Recent Activity</h3>
              </div>
              <span className="text-[11px] font-mono text-[#52525b]">Audit Trail</span>
            </div>

            {loading && !data ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : !data?.recentActivities || data.recentActivities.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#555]">
                No recent activity recorded yet. Create or update quotations to build the audit log.
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-xl bg-[#111216] border border-[#1e1f26] flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#ededed]">
                          {act.actor?.name || 'System Operator'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#18181e] border border-[#272730] text-[#888]">
                          {act.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-[#8e8e93] text-[11px] leading-relaxed">
                        {act.reasonNote || 'Transaction state modification executed.'}
                      </p>
                      {act.quotation && (
                        <Link
                          href={`/quotations/${act.quotation.id}`}
                          className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-mono"
                        >
                          <span>{act.quotation.quoteNumber}</span>
                          {act.quotation.customer?.name && (
                            <span className="text-[#555]">({act.quotation.customer.name})</span>
                          )}
                        </Link>
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-[#52525b] shrink-0">
                      {formatRelativeTime(act.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Quotations Pipeline */}
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#18181f] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#71717a]" />
                <h3 className="text-sm font-semibold text-[#ededed]">Active Quotations</h3>
              </div>
              <Link
                href="/quotations"
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading && !data ? (
              <div className="py-12 flex justify-center">
                <Spinner size="md" />
              </div>
            ) : !data?.recentQuotes || data.recentQuotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#555]">
                No active quotations found. Start by creating a new draft quotation.
              </div>
            ) : (
              <div className="divide-y divide-[#16171d]">
                {data.recentQuotes.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => router.push(`/quotations/${q.id}`)}
                    className="py-3 px-2 rounded-xl hover:bg-[#111216] cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-[#ededed]">
                          {q.quoteNumber}
                        </span>
                        {getStatusBadge(q.status)}
                      </div>
                      <div className="text-[11px] text-[#71717a]">
                        {q.customer?.name || 'Customer'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-[#ededed] font-mono">
                        ${Number(q.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] font-mono text-[#71717a]">
                        Margin: {Number(q.marginPercentage || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-[#18181f] mt-4">
            <Link
              href="/quotations"
              className="w-full py-2 rounded-xl bg-[#121318] hover:bg-[#181920] border border-[#22232b] text-xs font-medium text-[#c8c8c2] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Explore Kanban Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
