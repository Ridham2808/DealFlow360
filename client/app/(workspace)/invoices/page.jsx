'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronRight, 
  Download, 
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';

export default function InvoicesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    statusCounts: { unpaid: 0, paid: 0 },
    items: [],
    pagination: { page: 1, totalPages: 1, total: 0 },
  });

  // Filter state: '' for all, or 'UNPAID', 'PAID'
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', '1');
      params.append('limit', '20');

      const res = await apiRequest(`/invoices?${params.toString()}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case 'PARTIALLY_PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Partially Paid
          </span>
        );
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> Unpaid / Issued
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
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Invoices & Receivables</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8a8b98] mt-1">
            Track issued one-time receivables, payment reconciliation, and accounting records.
          </p>
        </div>

        <button
          onClick={fetchInvoices}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] hover:border-[#383a52] text-xs text-[#d0d2e0] hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchInvoices} className="underline hover:text-white font-medium">Retry</button>
        </div>
      )}

      {/* Screen #12 Status Pills: Unpaid and Paid */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          onClick={() => setStatusFilter('')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            statusFilter === ''
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          All Invoices ({data.pagination.total || 0})
        </button>

        <button
          onClick={() => setStatusFilter('UNPAID')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            statusFilter === 'UNPAID'
              ? 'bg-amber-500 text-black shadow-sm font-bold'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Unpaid ({data.statusCounts?.unpaid || 0})</span>
        </button>

        <button
          onClick={() => setStatusFilter('PAID')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            statusFilter === 'PAID'
              ? 'bg-emerald-500 text-black shadow-sm font-bold'
              : 'bg-[#12131b] text-[#8e90a2] border border-[#202230] hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Paid ({data.statusCounts?.paid || 0})</span>
        </button>
      </div>

      {/* Screen #12 Invoice Table (Invoice #, Customer, Amount, Status, Due Date, Actions) */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-[#707284]">Loading invoices...</div>
        ) : data.items.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#707284]">No invoices found matching current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Invoice #</th>
                  <th className="py-3 px-5 font-semibold">Customer</th>
                  <th className="py-3 px-5 font-semibold text-right">Amount</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold">Due Date</th>
                  <th className="py-3 px-5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {data.items.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                    className="hover:bg-[#14151e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 font-mono font-semibold text-blue-400 group-hover:text-blue-300">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-white">{inv.customer}</div>
                      <div className="text-[10px] text-[#6b6d80] font-mono">{inv.quoteNumber}</div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-white">
                      ${inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-5">{getStatusBadge(inv.status)}</td>
                    <td className="py-3.5 px-5 font-mono text-[#989ab0]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-[#585a6e]" />
                        <span>{new Date(inv.dueDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/invoices/${inv.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#181a24] hover:bg-[#202230] border border-[#2b2d3e] text-[11px] font-medium text-[#d8daf0] hover:text-white transition-colors"
                      >
                        <span>View</span>
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
    </div>
  );
}
