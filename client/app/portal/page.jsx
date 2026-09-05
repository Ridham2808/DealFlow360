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
  Plus,
  Inbox,
  Layers,
  Trash2,
  ChevronRight,
  ExternalLink,
  Package
} from 'lucide-react';

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState('quotes'); // 'quotes' | 'requests'

  // Quotations State
  const [quotations, setQuotations] = useState([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, message: null });

  // Customer Requests (RFQ) State
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState([]);

  // New Request Form State
  const [requestForm, setRequestForm] = useState({
    title: '',
    targetBudget: '',
    neededByDate: '',
    notes: '',
    items: [{ name: '', quantity: 1, category: 'Hardware', notes: '' }],
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

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

  // Load customer quote requests
  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('/portal/requests');
      setRequests(res?.data?.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Load catalog for quick product suggestions
  const loadCatalog = useCallback(async () => {
    try {
      const res = await api.get('/portal/catalog');
      setCatalogProducts(res?.data?.products || []);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    }
  }, []);

  useEffect(() => {
    loadQuotations();
    loadRequests();
    loadCatalog();
  }, [loadQuotations, loadRequests, loadCatalog]);

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

  // Handle Request Item Row Mutations
  const handleAddItemRow = () => {
    setRequestForm((prev) => ({
      ...prev,
      items: [...prev.items, { name: '', quantity: 1, category: 'Hardware', notes: '' }],
    }));
  };

  const handleRemoveItemRow = (idx) => {
    setRequestForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemChange = (idx, field, value) => {
    setRequestForm((prev) => {
      const updated = [...prev.items];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, items: updated };
    });
  };

  // Submit New Request for Quotation
  const handleSubmitNewRequest = async (e) => {
    e.preventDefault();
    if (!requestForm.title.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a title or description for your quote request.' });
      return;
    }

    const validItems = requestForm.items.filter((item) => item.name.trim() !== '');
    if (validItems.length === 0) {
      setFeedback({ type: 'error', message: 'Please specify at least one product or service required.' });
      return;
    }

    try {
      setSubmittingRequest(true);
      setFeedback({ type: null, message: null });

      const payload = {
        title: requestForm.title.trim(),
        notes: requestForm.notes.trim() || undefined,
        targetBudget: requestForm.targetBudget ? parseFloat(requestForm.targetBudget) : undefined,
        neededByDate: requestForm.neededByDate || undefined,
        items: validItems,
      };

      const res = await api.post('/portal/requests', payload);
      const created = res?.data?.request;

      setFeedback({
        type: 'success',
        message: `Quote request ${created?.requestNumber || ''} sent to your sales team! They will build your custom proposal shortly.`,
      });

      setShowRequestModal(false);
      setRequestForm({
        title: '',
        targetBudget: '',
        neededByDate: '',
        notes: '',
        items: [{ name: '', quantity: 1, category: 'Hardware', notes: '' }],
      });

      await loadRequests();
      setActiveTab('requests');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to submit quote request.' });
    } finally {
      setSubmittingRequest(false);
    }
  };

  const isConfirmed = quotation?.status === 'CONFIRMED';
  const isPendingApproval = quotation?.status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222533] pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'quotes'
                ? 'bg-[#1c202e] text-white border border-[#2e3347] shadow-xs'
                : 'text-[#8e95a5] hover:text-white hover:bg-[#12141a]'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Active Quotations</span>
            {quotations.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-mono">
                {quotations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-[#1c202e] text-white border border-[#2e3347] shadow-xs'
                : 'text-[#8e95a5] hover:text-white hover:bg-[#12141a]'
            }`}
          >
            <Inbox className="w-4 h-4 text-amber-400" />
            <span>My Quote Requests (RFQ)</span>
            {requests.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-mono">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Button: Request New Quotation */}
        <button
          type="button"
          onClick={() => setShowRequestModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Request New Quotation</span>
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback.message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs animate-in fade-in duration-150 ${
            feedback.type === 'error'
              ? 'bg-red-950/40 border-red-800/60 text-red-300'
              : feedback.type === 'warning'
              ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
            {feedback.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {feedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: null, message: null })}
            className="text-[#8e95a5] hover:text-white text-xs px-2 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* TAB 1: ACTIVE QUOTATIONS */}
      {activeTab === 'quotes' && (
        <div className="space-y-6">
          {loading && !quotation ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-16 border border-[#222533] rounded-xl bg-[#12141a] p-8 space-y-4">
              <FileText className="w-12 h-12 text-[#5a6275] mx-auto" />
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-white">No Formal Quotations Published Yet</h3>
                <p className="text-xs text-[#8e95a5] mt-1.5 leading-relaxed">
                  Your sales team has not yet published an active proposal. You can submit your hardware, service, or subscription requirements directly, and your sales representative will create a tailored proposal for your organization.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Submit a Quote Request
              </button>
            </div>
          ) : (
            <>
              {/* Quotation Selector Pills if multiple */}
              {quotations.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {quotations.map((q) => (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuoteId(q.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-2 cursor-pointer ${
                        selectedQuoteId === q.id
                          ? 'bg-[#1c202e] border-blue-500/50 text-white'
                          : 'bg-[#12141a] border-[#222533] text-[#8e95a5] hover:border-[#33384c]'
                      }`}
                    >
                      <span className="font-semibold">{q.quoteNumber}</span>
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
                      className="p-2 rounded-lg border border-[#222533] text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors cursor-pointer"
                      title="Refresh quote"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Discount Governance Banner */}
              <div className="bg-[#14120c] border border-[#3d3215] rounded-xl p-3.5 flex items-start gap-3 text-[#c9b276]">
                <AlertTriangle className="w-4 h-4 text-[#d4a017] shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold text-[#e6b840]">Discount Governance Protocol: </span>
                  If final terms exceed thresholds, the quote automatically re-enters approval flow.
                </div>
              </div>

              {/* Line Items Table with Inline Comments */}
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
                                    className="p-1.5 rounded-md bg-[#1c202e] border border-[#2e3347] text-[#8e95a5] hover:text-white hover:border-blue-500 disabled:opacity-40 transition-colors cursor-pointer"
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

                  {/* Summary Totals Bar */}
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

              {/* Propose Negotiation Terms */}
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
                        className="px-4 py-2 rounded-lg border border-[#272a38] text-xs font-medium text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmQuotation}
                        disabled={actionLoading}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
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
            </>
          )}
        </div>
      )}

      {/* TAB 2: MY QUOTE REQUESTS (RFQ) */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white tracking-tight">
              Inbound Requests for Quotation (RFQs)
            </h2>
            <span className="text-xs text-[#8e95a5]">
              {requests.length} total request{requests.length === 1 ? '' : 's'}
            </span>
          </div>

          {loadingRequests ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 border border-[#222533] rounded-xl bg-[#12141a] p-8 space-y-4">
              <Inbox className="w-12 h-12 text-[#5a6275] mx-auto" />
              <div className="max-w-md mx-auto">
                <h3 className="text-base font-semibold text-white">No Quote Requests Submitted</h3>
                <p className="text-xs text-[#8e95a5] mt-1.5 leading-relaxed">
                  Need specific hardware models, extended warranties, services, or subscription licenses? Submit a request specifying what you need and your sales rep will prepare a formal proposal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Submit New Request
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-[#12141a] border border-[#222533] rounded-xl p-5 space-y-3 hover:border-[#2e3347] transition-colors shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-blue-400">
                        {req.requestNumber}
                      </span>
                      <h3 className="text-sm font-semibold text-white">
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
                      <span className="text-[11px] text-[#5a6275]">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {req.notes && (
                    <p className="text-xs text-[#8e95a5] leading-relaxed bg-[#0a0c10] border border-[#222533] p-3 rounded-lg">
                      {req.notes}
                    </p>
                  )}

                  {/* Requested Items Breakdown */}
                  {Array.isArray(req.items) && req.items.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] uppercase font-semibold text-[#71788e] tracking-wider block mb-2">
                        Requested Items ({req.items.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {req.items.map((it, idx) => (
                          <div
                            key={idx}
                            className="bg-[#0e1016] border border-[#222533] rounded-lg p-2.5 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="overflow-hidden">
                              <div className="font-medium text-white truncate">{it.name}</div>
                              <div className="text-[10px] text-[#8e95a5] flex items-center gap-2">
                                <span className="text-blue-400 font-mono">Qty: {it.quantity}</span>
                                {it.category && <span>• {it.category}</span>}
                              </div>
                            </div>
                            {it.notes && (
                              <span className="text-[9px] text-[#71788e] italic shrink-0" title={it.notes}>
                                note
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Meta Bar & Actions */}
                  <div className="pt-3 border-t border-[#1e212d] flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 text-[#8e95a5]">
                      {req.targetBudget && (
                        <span>
                          Budget: <strong className="text-white">${Number(req.targetBudget).toLocaleString()}</strong>
                        </span>
                      )}
                      {req.neededByDate && (
                        <span>
                          Needed by: <strong className="text-white">{new Date(req.neededByDate).toLocaleDateString()}</strong>
                        </span>
                      )}
                    </div>

                    {req.quotation && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuoteId(req.quotation.id);
                          setActiveTab('quotes');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View Quoted Proposal ({req.quotation.quoteNumber})</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* REQUEST NEW QUOTATION MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#12141a] border border-[#272a38] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative text-[#ededed] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222533] pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  Request New Quotation (RFQ)
                </h3>
                <p className="text-xs text-[#8e95a5] mt-0.5">
                  Specify products, services, quantities, and timelines directly to your sales representative.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="text-[#8e95a5] hover:text-white text-base px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitNewRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white mb-1">
                  Project Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  value={requestForm.title}
                  onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                  placeholder="e.g. Q4 Developer Workstations & Extended Support"
                  className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#8e95a5] mb-1">
                    Target Needed By Date
                  </label>
                  <input
                    type="date"
                    value={requestForm.neededByDate}
                    onChange={(e) => setRequestForm({ ...requestForm, neededByDate: e.target.value })}
                    className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#8e95a5] mb-1">
                    Estimated Budget ($ USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={requestForm.targetBudget}
                    onChange={(e) => setRequestForm({ ...requestForm, targetBudget: e.target.value })}
                    placeholder="e.g. 25000"
                    className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-white">
                    Requested Products & Services *
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {requestForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0d0f14] border border-[#222533] p-3 rounded-lg grid grid-cols-12 gap-2 items-center"
                    >
                      {/* Item Name / Catalog Select */}
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          placeholder="Product or service name..."
                          list={`catalog-suggestions-${idx}`}
                          className="w-full bg-[#0a0c10] border border-[#272a38] rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                        />
                        <datalist id={`catalog-suggestions-${idx}`}>
                          {catalogProducts.map((p) => (
                            <option key={p.id} value={p.name} />
                          ))}
                        </datalist>
                      </div>

                      {/* Category */}
                      <div className="col-span-6 sm:col-span-3">
                        <select
                          value={item.category}
                          onChange={(e) => handleItemChange(idx, 'category', e.target.value)}
                          className="w-full bg-[#0a0c10] border border-[#272a38] rounded-md px-2 py-1.5 text-xs text-white focus:outline-hidden focus:border-blue-500"
                        >
                          <option value="Hardware">Hardware</option>
                          <option value="Services">Services</option>
                          <option value="Warranty">Warranty</option>
                          <option value="Subscriptions">Subscriptions</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-[#0a0c10] border border-[#272a38] rounded-md px-2 py-1.5 text-xs text-white text-center font-mono focus:outline-hidden focus:border-blue-500"
                        />
                      </div>

                      {/* Remove Button */}
                      <div className="col-span-2 sm:col-span-2 flex justify-end">
                        {requestForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="p-1.5 text-[#71788e] hover:text-red-400 transition-colors cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Notes on spec */}
                      <div className="col-span-12">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(idx, 'notes', e.target.value)}
                          placeholder="Specific model, configuration, or requirement details..."
                          className="w-full bg-[#0a0c10] border border-[#222533] rounded-md px-2.5 py-1 text-[11px] text-[#c5c9d6] placeholder:text-[#5a6275] focus:outline-hidden focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Notes */}
              <div>
                <label className="block text-xs font-medium text-[#8e95a5] mb-1">
                  General Instructions & Commercial Scope
                </label>
                <textarea
                  rows={3}
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Additional context, delivery constraints, or billing preferences..."
                  className="w-full bg-[#0a0c10] border border-[#272a38] rounded-lg px-3 py-2 text-xs text-white focus:outline-hidden focus:border-blue-500 resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222533]">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#272a38] text-xs font-medium text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRequest}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  {submittingRequest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send Request to Sales Rep</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
