'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api';
import {
  FileText,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  DollarSign,
  Percent,
  Check,
  Loader2,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export default function CustomerPortalPage() {
  const [quotations, setQuotations] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });

  // Negotiation Form State
  const [lineComments, setLineComments] = useState({});
  const [counterDiscount, setCounterDiscount] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [negotiationNotes, setNegotiationNotes] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Load customer's quotation list
  const loadQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/portal/quotations/me');
      const list = res?.data?.quotations || [];
      setQuotations(list);
      if (list.length > 0 && !selectedQuoteId) {
        setSelectedQuoteId(list[0].id);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load quotations.' });
    } finally {
      setLoading(false);
    }
  }, [selectedQuoteId]);

  // Load detailed single quotation
  const loadQuotationDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      setActionLoading(true);
      const res = await api.get(`/portal/quotations/${id}`);
      const q = res?.data?.quotation;
      setQuotation(q);
      if (q?.latestCounterProposal?.requestedDiscountPercent) {
        setCounterDiscount(String(q.latestCounterProposal.requestedDiscountPercent));
      }
      if (q?.latestCounterProposal?.requestedDeliveryDate) {
        setDeliveryDate(q.latestCounterProposal.requestedDeliveryDate);
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load quotation detail.' });
    } finally {
      setActionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuotations();
  }, [loadQuotations]);

  useEffect(() => {
    if (selectedQuoteId) {
      loadQuotationDetail(selectedQuoteId);
    }
  }, [selectedQuoteId, loadQuotationDetail]);

  // Handle line comment submission
  const handleAddLineComment = async (lineId) => {
    const text = lineComments[lineId]?.trim();
    if (!text) return;

    try {
      setActionLoading(true);
      setFeedback({ type: null, message: null });
      await api.post(`/portal/quotations/${quotation.id}/comment`, {
        lineId,
        message: text,
      });
      setLineComments((prev) => ({ ...prev, [lineId]: '' }));
      setFeedback({ type: 'success', message: 'Comment sent to your account team.' });
      await loadQuotationDetail(quotation.id);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to post comment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Submit counter discount proposal
  const handleCounterProposal = async (e) => {
    e.preventDefault();
    const discountVal = parseFloat(counterDiscount);
    if (isNaN(discountVal) || discountVal < 0 || discountVal > 100) {
      setFeedback({ type: 'error', message: 'Please enter a valid discount percentage (0-100).' });
      return;
    }

    try {
      setActionLoading(true);
      setFeedback({ type: null, message: null });
      await api.post(`/portal/quotations/${quotation.id}/counter-discount`, {
        requestedDiscountPercent: discountVal,
        requestedDeliveryDate: deliveryDate || null,
        reason: negotiationNotes.trim() || undefined,
      });
      setFeedback({ type: 'success', message: 'Counter proposal submitted for review.' });
      await loadQuotationDetail(quotation.id);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit proposal.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm quotation
  const handleConfirmQuotation = async () => {
    try {
      setActionLoading(true);
      setShowConfirmModal(false);
      setFeedback({ type: null, message: null });

      const res = await api.post(`/portal/quotations/${quotation.id}/confirm`);
      const result = res?.data;

      if (result?.reEnteredApproval) {
        setFeedback({
          type: 'warning',
          message: 'Your requested terms exceed standard discount limits. The quotation has automatically re-entered the approval flow for management review.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: 'Quotation confirmed successfully! Order and invoice processing initiated.',
        });
      }

      await loadQuotationDetail(quotation.id);
      await loadQuotations();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to confirm quotation.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !quotation) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="text-center py-20 border border-[#222533] rounded-xl bg-[#12141a] p-8">
        <FileText className="w-12 h-12 text-[#5a6275] mx-auto mb-3" />
        <h3 className="text-base font-semibold text-white">No Quotations Available</h3>
        <p className="text-xs text-[#8e95a5] mt-1 max-w-sm mx-auto">
          Your account representative has not yet published any formal proposals for your organization.
        </p>
      </div>
    );
  }

  const isConfirmed = quotation?.status === 'CONFIRMED';
  const isPendingApproval = quotation?.status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-6">
      {/* Quotation Selector Pills if multiple */}
      {quotations.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {quotations.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedQuoteId(q.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 ${
                selectedQuoteId === q.id
                  ? 'bg-[#1c202e] border-blue-500/50 text-white'
                  : 'bg-[#12141a] border-[#222533] text-[#8e95a5] hover:border-[#33384c]'
              }`}
            >
              <span>{q.quoteNumber}</span>
              <span className="text-[10px] text-[#5a6275]">(${Number(q.grandTotal).toLocaleString()})</span>
            </button>
          ))}
        </div>
      )}

      {/* Header with Title and Status Pill */}
      {quotation && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#12141a] border border-[#222533] rounded-xl p-5 shadow-xs">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Quotation: {quotation.quoteNumber}
              </h1>
              {/* Status Pill: Sent, Under Negotiation, or Confirmed */}
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
                  quotation.status === 'CONFIRMED'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60'
                    : quotation.status === 'PENDING_APPROVAL'
                    ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
                    : quotation.status === 'UNDER_NEGOTIATION'
                    ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60'
                    : 'bg-[#1c202e] text-[#c5c9d6] border border-[#2e3347]'
                }`}
              >
                {quotation.status === 'SENT_TO_CUSTOMER'
                  ? 'Sent'
                  : quotation.status === 'UNDER_NEGOTIATION'
                  ? 'Under Negotiation'
                  : quotation.status === 'CONFIRMED'
                  ? 'Confirmed'
                  : quotation.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-[#8e95a5] mt-1">
              Account: <span className="text-white font-medium">{quotation.customer?.name}</span> • Created:{' '}
              {new Date(quotation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase text-[#8e95a5] tracking-wider block">Total Quotation Value</span>
              <span className="text-xl font-bold text-white">
                ${quotation.grandTotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <button
              onClick={() => loadQuotationDetail(quotation.id)}
              disabled={actionLoading}
              className="p-2 rounded-lg border border-[#222533] text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors"
              title="Refresh quote"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Amber Banner required by mockup: "If final terms exceed thresholds, the quote automatically re-enters approval flow." */}
      <div className="bg-[#14120c] border border-[#3d3215] rounded-xl p-3.5 flex items-start gap-3 text-[#c9b276]">
        <AlertTriangle className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <span className="font-semibold text-[#e6b840]">Discount Governance Protocol: </span>
          If final terms exceed thresholds, the quote automatically re-enters approval flow.
        </div>
      </div>

      {/* Global Toast / Feedback Alerts */}
      {feedback.message && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
            feedback.type === 'error'
              ? 'bg-red-950/40 border-red-800/60 text-red-300'
              : feedback.type === 'warning'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            {feedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: null, message: null })}
            className="text-[#8e95a5] hover:text-white text-xs px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Line Items Table with Inline Customer Comments */}
      {quotation && (
        <div className="bg-[#12141a] border border-[#222533] rounded-xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-[#222533] flex items-center justify-between">
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Proposed Line Items & Specifications
            </h2>
            <span className="text-[11px] text-[#8e95a5]">{quotation.lines?.length || 0} line items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#222533] text-[11px] font-semibold text-[#8e95a5] uppercase tracking-wider bg-[#0d0f14]">
                  <th className="py-2.5 px-4">Product / Item</th>
                  <th className="py-2.5 px-4 text-center">Qty</th>
                  <th className="py-2.5 px-4 text-right">Unit Price</th>
                  <th className="py-2.5 px-4 text-right">Line Total</th>
                  <th className="py-2.5 px-4">Customer Comment & Line Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e212d] text-xs">
                {quotation.lines?.map((line) => (
                  <tr key={line.id} className="hover:bg-[#161822] transition-colors">
                    <td className="py-3 px-4 font-medium text-white max-w-xs">
                      <div>{line.productName}</div>
                      <div className="text-[10px] text-[#8e95a5] flex items-center gap-1.5 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-[#1c202e] border border-[#2e3347] text-[9px]">
                          {line.category || 'Product'}
                        </span>
                        {line.isRecurring && (
                          <span className="text-blue-400 font-semibold text-[9px]">Recurring Plan</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center text-[#c5c9d6] font-mono">
                      {line.quantity}
                    </td>

                    <td className="py-3 px-4 text-right text-[#c5c9d6] font-mono">
                      ${line.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {line.discountPercent > 0 && (
                        <div className="text-[10px] text-amber-400/90 font-mono">
                          ({line.discountPercent}% off)
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right text-white font-semibold font-mono">
                      ${line.lineSubtotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>

                    <td className="py-3 px-4 min-w-[280px]">
                      {/* Comments history on this line */}
                      {line.comments?.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {line.comments.map((c) => (
                            <div
                              key={c.id}
                              className="text-[11px] bg-[#0a0c10] border border-[#222533] rounded-md px-2.5 py-1.5 text-[#c5c9d6]"
                            >
                              <div className="flex items-center justify-between text-[9px] text-[#71788e]">
                                <span className="font-semibold text-blue-400">{c.authorName}</span>
                                <span>{new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="mt-0.5 text-white/90">{c.message}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inline Customer Comment Input */}
                      {!isConfirmed && (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={lineComments[line.id] || ''}
                            onChange={(e) =>
                              setLineComments((prev) => ({ ...prev, [line.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddLineComment(line.id);
                              }
                            }}
                            placeholder="Add comment or delivery request on this line..."
                            className="w-full bg-[#0a0c10] border border-[#272a38] rounded-md px-2.5 py-1 text-xs text-white placeholder:text-[#5a6275] focus:outline-hidden focus:border-blue-500 transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => handleAddLineComment(line.id)}
                            disabled={actionLoading || !lineComments[line.id]?.trim()}
                            className="p-1.5 rounded-md bg-[#1c202e] border border-[#2e3347] text-[#8e95a5] hover:text-white hover:border-blue-500 disabled:opacity-40 transition-colors"
                            title="Send line comment"
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quotation Summary Totals Bar */}
          <div className="p-4 bg-[#0d0f14] border-t border-[#222533] flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-[#8e95a5]">
              {quotation.expirationDate && (
                <span>Valid through: {new Date(quotation.expirationDate).toLocaleDateString()}</span>
              )}
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-[#8e95a5]">Subtotal: </span>
                <span className="text-white font-medium">${quotation.subtotal?.toLocaleString()}</span>
              </div>
              {quotation.discountTotal > 0 && (
                <div>
                  <span className="text-[#8e95a5]">Discount: </span>
                  <span className="text-amber-400">-${quotation.discountTotal?.toLocaleString()}</span>
                </div>
              )}
              {quotation.taxTotal > 0 && (
                <div>
                  <span className="text-[#8e95a5]">Tax: </span>
                  <span className="text-[#c5c9d6]">${quotation.taxTotal?.toLocaleString()}</span>
                </div>
              )}
              <div className="text-sm font-bold text-white border-l border-[#272a38] pl-4">
                <span className="text-blue-400">Total: </span>
                ${quotation.grandTotal?.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Negotiation Controls & Bottom Actions (Screen #11 mockup specifications) */}
      {!isConfirmed && (
        <div className="bg-[#12141a] border border-[#222533] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#222533] pb-3">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              Propose Negotiation Terms
            </h3>
            <span className="text-[11px] text-[#8e95a5]">
              Changes subject to automatic discount governance review
            </span>
          </div>

          <form onSubmit={handleCounterProposal} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#8e95a5] mb-1.5 flex items-center gap-1.5">
                <Percent className="w-3 h-3 text-amber-400" />
                Counter Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={counterDiscount}
                onChange={(e) => setCounterDiscount(e.target.value)}
                placeholder="e.g. 15"
                className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8e95a5] mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-blue-400" />
                Requested Delivery Date
              </label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#8e95a5] mb-1.5 flex items-center gap-1.5">
                Commercial Note / Scope Reason
              </label>
              <input
                type="text"
                value={negotiationNotes}
                onChange={(e) => setNegotiationNotes(e.target.value)}
                placeholder="Commercial justification or scope..."
                className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#1e212d]">
              <button
                type="submit"
                disabled={actionLoading || !counterDiscount}
                className="px-4 py-2 rounded-lg border border-[#2e3347] text-xs font-semibold text-white hover:bg-[#1c202e] disabled:opacity-40 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Submit Request
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={actionLoading || isPendingApproval}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-semibold text-white transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Confirm Quotation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#12141a] border border-[#272a38] rounded-xl max-w-md w-full p-6 shadow-2xl relative text-[#ededed]">
            <h3 className="text-base font-bold text-white mb-2">Confirm Quotation Terms</h3>
            <p className="text-xs text-[#8e95a5] leading-relaxed mb-4">
              Are you sure you want to formally accept this quotation for a total of{' '}
              <span className="text-white font-semibold font-mono">
                ${quotation?.grandTotal?.toLocaleString()}
              </span>
              ? Once confirmed, order processing and billing generation will initiate.
            </p>
            <div className="p-3 bg-[#14120c] border border-[#3d3215] rounded-lg mb-5 text-[11px] text-[#c9b276]">
              Note: If negotiated terms exceed discount governance limits, the quotation will automatically re-enter the approval flow.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-[#272a38] text-xs font-medium text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQuotation}
                disabled={actionLoading}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-xs"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Yes, Confirm Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {quotation?.activity?.length > 0 && (
        <div className="bg-[#12141a] border border-[#222533] rounded-xl p-5 shadow-xs">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#8e95a5]" />
            Negotiation & Proposal Activity Timeline
          </h3>

          <div className="space-y-3">
            {quotation.activity.map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs border-l-2 border-[#2e3347] pl-3 py-0.5">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 -ml-[17px] border-2 border-[#12141a]" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">
                      {act.actorName} ({act.actorRole || 'System'})
                    </span>
                    <span className="text-[10px] text-[#5a6275]">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-[#8e95a5] mt-0.5 text-[11px]">{act.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
