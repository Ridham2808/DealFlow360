'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  CheckCircle2,
  Clock,
  Download,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  Info,
  DollarSign,
  AlertCircle,
  Truck,
  Check
} from 'lucide-react';
import { apiRequest } from '../../../../lib/api';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Payment Recording Modal State
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState(null); // { type: 'success' | 'error', text }

  const fetchInvoice = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/invoices/${id}`);
      setData(res);
      if (res.invoice) {
        setPaymentAmount(String(res.amountDue || res.invoice.amount));
      }
    } catch (err) {
      setError(err.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id, fetchInvoice]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true);
    setPaymentFeedback(null);
    try {
      await apiRequest(`/invoices/${id}/payment`, {
        method: 'POST',
        body: JSON.stringify({
          amount: parseFloat(paymentAmount),
          paymentMethod,
          reference: paymentRef,
        }),
      });
      setPaymentFeedback({ type: 'success', text: 'Payment recorded successfully! Invoice status updated to PAID.' });
      setIsPaymentOpen(false);
      await fetchInvoice();
    } catch (err) {
      setPaymentFeedback({ type: 'error', text: err.message || 'Payment recording failed.' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const downloadUrl = `${apiBase}/invoices/${id}/download`;

      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(downloadUrl, {
        method: 'GET',
        credentials: 'include',
        headers,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson?.error?.message || `Download failed (HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${data?.invoice?.invoiceNumber || id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setPaymentFeedback({ type: 'success', text: `Invoice ${data?.invoice?.invoiceNumber || id} downloaded successfully.` });
    } catch (err) {
      setPaymentFeedback({ type: 'error', text: 'Failed to download invoice: ' + err.message });
    }
  };


  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8 flex items-center justify-center">
        <div className="text-center text-xs text-[#787a8c]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
          Loading invoice details...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8">
        <div className="max-w-2xl mx-auto p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h2 className="text-base font-bold text-white">Error Loading Invoice</h2>
          <p className="text-xs text-rose-300">{error || 'Record not found'}</p>
          <button
            onClick={() => router.push('/invoices')}
            className="px-4 py-2 bg-[#1a1b24] hover:bg-[#252734] border border-[#2e3040] rounded-lg text-xs font-medium text-white transition-all"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const { invoice, customer, quotation, lines, stepper, paymentHistory, amountDue } = data;
  const isPaid = invoice.status === 'PAID';

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#707284]">
        <Link href="/invoices" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
        </Link>
        <span>/</span>
        <span className="text-[#a0a2b4] font-mono">{invoice.invoiceNumber}</span>
      </div>

      {/* Screen #13 Header */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Invoice: {invoice.invoiceNumber}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                isPaid
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}
            >
              {invoice.status}
            </span>
          </div>
          <p className="text-xs text-[#8a8b98] mt-1">
            Customer: <span className="text-white font-medium">{customer?.name}</span> • Reference Quote: <span className="font-mono text-blue-400">{quotation?.quoteNumber}</span>
          </p>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161722] hover:bg-[#1e202f] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-[#888]" />
            <span>Download Invoice</span>
          </button>

          {!isPaid && (
            <button
              onClick={() => setIsPaymentOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* Muted Dark Gold Helper Banner About Partial-Invoicing Reconciliation (No Neon Glow) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-start gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-[#c9b276] mt-0.5" />
        <div>
          <span className="font-semibold text-white">Partial-Invoicing & Hybrid Reconciliation: </span>
          <span>One-time hardware deliverables are isolated to this invoice. Recurring subscriptions are decoupled into distinct billing schedules to prevent ambiguous blends. Payment transactions update ledger balances atomically without affecting recurring schedules.</span>
        </div>
      </div>

      {/* Inline Feedback Banner */}
      {paymentFeedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            paymentFeedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {paymentFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{paymentFeedback.text}</span>
        </div>
      )}

      {/* Screen #13 Stepper: Order Confirmed -> Shipped -> Invoiced -> Paid */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-mono uppercase tracking-wider text-[#6b6d80] font-bold mb-4">
          Receivable Lifecycle Stepper
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stepper.map((step, idx) => {
            const isCompleted = step.status === 'COMPLETED';

            return (
              <div
                key={step.node}
                className={`p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-[#12131b] border-[#1d1f2b] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono text-[#6e7082] font-semibold">Stage 0{idx + 1}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-[#555]" />
                  )}
                </div>
                <div className="text-sm font-bold text-white">{step.label}</div>
                <div className="text-xs text-[#828498] mt-1">
                  {step.date ? new Date(step.date).toLocaleDateString() : isCompleted ? 'Completed' : 'Pending'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice Amount Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Total Invoiced Amount</div>
          <div className="text-2xl font-bold font-mono text-white mt-1">
            ${invoice.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">Type: {invoice.type}</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Amount Due</div>
          <div className={`text-2xl font-bold font-mono mt-1 ${isPaid ? 'text-emerald-400' : 'text-amber-400'}`}>
            ${amountDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">
            {isPaid ? 'Balance cleared in full' : `Due by ${new Date(invoice.dueDate).toLocaleDateString()}`}
          </div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Settlement Date</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {invoice.paidAt ? new Date(invoice.paidAt).toLocaleDateString() : 'Pending Receipt'}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">
            {invoice.paidAt ? 'Fully reconciled' : 'Awaiting remittance'}
          </div>
        </div>
      </div>

      {/* Invoiced Lines Table */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">Invoiced Items</h2>
          <span className="text-xs text-[#707284]">{lines.length} billed lines</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                <th className="py-3 px-5 font-semibold">Product</th>
                <th className="py-3 px-5 font-semibold text-right">Quantity</th>
                <th className="py-3 px-5 font-semibold text-right">Unit Price</th>
                <th className="py-3 px-5 font-semibold text-right">Discount</th>
                <th className="py-3 px-5 font-semibold text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181923]">
              {lines.map((line) => (
                <tr key={line.id} className="hover:bg-[#13141d]">
                  <td className="py-3.5 px-5 font-medium text-white">{line.product}</td>
                  <td className="py-3.5 px-5 text-right font-mono text-white">{line.quantity}</td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#a0a2b4]">${line.unitPrice.toFixed(2)}</td>
                  <td className="py-3.5 px-5 text-right font-mono text-amber-400">{line.discountPercent.toFixed(1)}%</td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-white">${line.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment History Table */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <h2 className="text-sm font-bold text-white tracking-tight">Payment & Remittance History</h2>
          <span className="text-xs text-[#707284]">{paymentHistory.length} recorded payments</span>
        </div>
        {paymentHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#707284]">No payments recorded against this invoice yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Payment ID</th>
                  <th className="py-3 px-5 font-semibold">Method</th>
                  <th className="py-3 px-5 font-semibold">Date</th>
                  <th className="py-3 px-5 font-semibold text-right">Amount</th>
                  <th className="py-3 px-5 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {paymentHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-[#13141d]">
                    <td className="py-3.5 px-5 font-mono text-blue-400">{p.id}</td>
                    <td className="py-3.5 px-5 text-white">{p.method}</td>
                    <td className="py-3.5 px-5 font-mono text-[#8e90a4]">
                      {new Date(p.date).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                      ${p.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {isPaymentOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#262838] rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#1c1d27] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Record Invoice Payment</span>
              </h3>
              <button onClick={() => setIsPaymentOpen(false)} className="text-xs text-[#707284] hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">
                  Payment Amount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CREDIT_CARD">Credit / Corporate Card</option>
                  <option value="WIRE_TRANSFER">Wire Transfer / ACH</option>
                  <option value="CHECK">Corporate Check</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-[#707284] block mb-1">
                  Transaction Reference / Check #
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. ACH-9920194 or TXN-4482"
                  className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-xs text-white placeholder-[#505264] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1c1d27]">
                <button
                  type="button"
                  onClick={() => setIsPaymentOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-[#8e90a4] hover:text-white bg-[#151622]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40 cursor-pointer"
                >
                  {paymentLoading ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
