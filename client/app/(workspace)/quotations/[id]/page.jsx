'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuotation } from '../../../../context/QuotationContext';
import { api } from '../../../../lib/api';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Minus, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  RefreshCw, 
  Send, 
  Check, 
  X, 
  Lock, 
  RotateCcw, 
  ExternalLink, 
  ShieldCheck, 
  Package,
  Calendar,
  FileText,
  Building2,
  Tag,
  Percent,
  Layers,
  ChevronDown,
  Info
} from 'lucide-react';
import { Badge, Spinner } from '../../../../components/ui';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { 
    quotation, 
    loading, 
    saving, 
    error, 
    conflictError, 
    upsellSuggestions, 
    loadQuotation, 
    mutateLine, 
    deleteLine, 
    submitQuotation, 
    dismissUpsell,
    setConflictError,
    setError 
  } = useQuotation();

  // Lookups for Adding New Lines
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Sales Rep Editable Header Fields
  const [expirationDate, setExpirationDate] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Add Item State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [inputQuantity, setInputQuantity] = useState(1);
  const [inputDiscount, setInputDiscount] = useState(0);
  const [inputLineNote, setInputLineNote] = useState('');
  const [addingLine, setAddingLine] = useState(false);

  // Modals & UI States
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [deleteConfirmLineId, setDeleteConfirmLineId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load quotation data
  useEffect(() => {
    if (id) {
      loadQuotation(id);
    }
  }, [id, loadQuotation]);

  // Sync header fields when quotation loads
  useEffect(() => {
    if (quotation) {
      if (quotation.expirationDate) {
        try {
          const d = new Date(quotation.expirationDate);
          if (!isNaN(d.getTime())) {
            setExpirationDate(d.toISOString().split('T')[0]);
          }
        } catch {
          // ignore
        }
      }
      // If internal notes were stored in audit logs or meta
      if (quotation.internalNotes) {
        setInternalNotes(quotation.internalNotes);
      }
    }
  }, [quotation]);

  // Load catalog lookups
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [prodRes, planRes] = await Promise.all([
          api.get('/quotations/lookup/products'),
          api.get('/quotations/lookup/subscription-plans'),
        ]);
        if (prodRes?.data) setCatalogProducts(prodRes.data);
        if (planRes?.data) setSubscriptionPlans(planRes.data);
        if (prodRes?.data?.length > 0) setSelectedProductId(prodRes.data[0].id);
      } catch {
        // non-blocking
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Selected product object
  const activeProduct = useMemo(
    () => catalogProducts.find((p) => p.id === selectedProductId),
    [catalogProducts, selectedProductId]
  );

  // Reset variant when product changes
  useEffect(() => {
    if (activeProduct?.variants?.length > 0) {
      setSelectedVariantId(activeProduct.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
  }, [selectedProductId, activeProduct]);

  // Safe checks on quotation data
  const hasLines = Boolean(quotation?.lines && quotation.lines.length > 0);
  const lineCount = quotation?.lines ? quotation.lines.length : 0;
  const currencySymbol = quotation?.currency === 'EUR' ? '€' : quotation?.currency === 'INR' ? '₹' : '$';

  const marginPct = hasLines ? Number(quotation?.marginPercentage || 0) : 0;
  const isHealthyMargin = hasLines && marginPct >= 30;
  const isWarningMargin = hasLines && marginPct >= 15 && marginPct < 30;
  const isDangerMargin = hasLines && marginPct < 15;

  const canEdit = quotation?.status ? ['DRAFT', 'UNDER_NEGOTIATION', 'RETURNED'].includes(quotation.status) : true;
  const isPendingApproval = quotation?.status === 'PENDING_APPROVAL';

  // Customer Tier Ceilings
  const customerTier = quotation?.customer?.tier || 'BRONZE';
  const tierCeilingPercent = customerTier === 'GOLD' ? 15 : customerTier === 'SILVER' ? 10 : 5;

  // Active product category ceiling
  const activeProductCategoryCeiling = activeProduct?.category === 'Services' ? 10 : 15;
  const activeEffectiveLimit = Math.min(tierCeilingPercent, activeProductCategoryCeiling);

  // Check for returned reason from approvers
  const returnedStep = quotation?.approvalSteps?.find((s) => s.status === 'RETURNED' || s.status === 'REJECTED');

  // Flagged lines with overages
  const flaggedLines = useMemo(() => {
    return (quotation?.lines || []).filter((l) => {
      const disc = Number(l.discountPercent || 0);
      const limit = Number(l.lineDiscountLimit || 0);
      return disc > limit;
    });
  }, [quotation?.lines]);

  // Handle Add Line Item
  const handleAddLine = async (e) => {
    e?.preventDefault();
    if (!selectedProductId || !canEdit) return;

    setAddingLine(true);
    try {
      await mutateLine({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        subscriptionPlanId: selectedPlanId || null,
        quantity: Math.max(1, parseInt(inputQuantity, 10) || 1),
        discountPercent: Math.max(0, Math.min(100, parseFloat(inputDiscount) || 0)),
        lineNote: inputLineNote.trim() || undefined,
      });

      // Reset form
      setInputQuantity(1);
      setInputDiscount(0);
      setInputLineNote('');
      setSelectedPlanId('');
      setSuccessMessage('Line item added to quotation successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error handled in context
    } finally {
      setAddingLine(false);
    }
  };

  // Quantity adjustments
  const handleQuantityDelta = async (line, delta) => {
    if (!canEdit) return;
    const newQty = Math.max(1, line.quantity + delta);
    if (newQty === line.quantity) return;

    try {
      await mutateLine({
        lineId: line.id,
        productId: line.productId,
        quantity: newQty,
        discountPercent: Number(line.discountPercent || 0),
        variantId: line.variantId || null,
        subscriptionPlanId: line.subscriptionPlanId || null,
      });
    } catch {
      // Handled in context
    }
  };

  // Line discount change
  const handleDiscountChange = async (line, newDiscountStr) => {
    if (!canEdit) return;
    const val = Math.max(0, Math.min(100, parseFloat(newDiscountStr) || 0));
    try {
      await mutateLine({
        lineId: line.id,
        productId: line.productId,
        quantity: line.quantity,
        discountPercent: val,
        variantId: line.variantId || null,
        subscriptionPlanId: line.subscriptionPlanId || null,
      });
    } catch {
      // Handled in context
    }
  };

  // Delete line item
  const confirmDeleteLine = async () => {
    if (!deleteConfirmLineId || !canEdit) return;
    try {
      await deleteLine(deleteConfirmLineId);
      setDeleteConfirmLineId(null);
      setSuccessMessage('Line item removed from quotation.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Handled in context
    }
  };

  // One-click add upsell suggestion
  const handleAddUpsell = async (suggestion) => {
    if (!canEdit) return;
    try {
      await mutateLine({
        productId: suggestion.productId,
        quantity: 1,
        discountPercent: 0,
      });
      dismissUpsell(suggestion.id);
      setSuccessMessage(`Added ${suggestion.productName} to quotation.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Handled in context
    }
  };

  // Save Draft action
  const handleSaveDraft = async () => {
    if (!quotation) return;
    try {
      await api.patch(`/quotations/${id}`, {
        currency: quotation.currency,
        expirationDate: expirationDate || null,
        notes: internalNotes.trim() || undefined,
        version: quotation.version,
      });
      setIsDirty(false);
      const timeStr = new Date().toLocaleTimeString();
      setSuccessMessage(`Draft ${quotation.quoteNumber} saved successfully at ${timeStr}.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      loadQuotation(id);
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    }
  };

  // Submit quotation
  const handleConfirmSubmit = async () => {
    try {
      const res = await submitQuotation();
      setShowSubmitModal(false);
      setSuccessMessage(
        res?.status === 'APPROVED'
          ? 'Quotation within compliant ceilings has been auto-approved!'
          : 'Quotation submitted into sequential approval workflow.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch {
      // Handled in context
    }
  };

  // Cancel action
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelModal(true);
    } else {
      router.push('/quotations');
    }
  };

  if (loading && !quotation) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <span className="text-xs text-[#71717a] font-mono">Loading authoritative quotation...</span>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="text-sm text-red-400">Quotation not found or inaccessible.</div>
        <Link
          href="/quotations"
          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Quotations</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#18181b] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelClick}
              className="h-7 w-7 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors cursor-pointer"
              title="Return to Quotations"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <Link href="/quotations" className="text-xs text-[#71717a] hover:text-[#ededed] transition-colors">
                Quotations
              </Link>
              <span className="text-xs text-[#444]">/</span>
              <span className="font-mono text-xs font-semibold text-[#a1a1aa]">{quotation.quoteNumber}</span>
            </div>
          </div>

          {/* Header Title & Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ededed]">
              Quotation Detail: {quotation.quoteNumber}
            </h1>
            <span className="text-sm sm:text-base text-[#888] font-normal">
              ({quotation.customer?.name || 'Acme Corp'})
            </span>

            {/* Version */}
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md bg-[#161722] text-[#c4c6dc] border border-[#27293a]">
              Version v{quotation.version || 1}
            </span>

            {/* Status */}
            <Badge
              variant={
                quotation.status === 'APPROVED' || quotation.status === 'CONFIRMED'
                  ? 'success'
                  : quotation.status === 'PENDING_APPROVAL'
                  ? 'warning'
                  : quotation.status === 'RETURNED'
                  ? 'danger'
                  : 'neutral'
              }
              size="sm"
            >
              Status: {(quotation.status || 'DRAFT').replace(/_/g, ' ')}
            </Badge>

            {/* Editable or Locked for Review */}
            {canEdit ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Editable
              </span>
            ) : isPendingApproval ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                <span>Locked for Review</span>
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {quotation.status}
              </span>
            )}

            {/* Item count */}
            <span className="text-xs font-mono text-[#71717a]">
              {lineCount} item{lineCount === 1 ? '' : 's'}
            </span>

            {/* Customer Tier */}
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#101924] text-[#60a5fa] border border-[#1e3a5f]">
              {customerTier} Tier ({tierCeilingPercent}% Ceiling)
            </span>
          </div>
        </div>

        {/* Live sync & Version indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#71717a] block">
              Version v{quotation.version} • {quotation.currency}
            </span>
            <span className="text-[10px] text-[#888]">
              {canEdit ? 'Sales Rep Editable' : isPendingApproval ? 'Locked for Review' : quotation.status}
            </span>
          </div>
          <button
            onClick={() => loadQuotation(id)}
            disabled={saving}
            className="h-8 w-8 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors cursor-pointer"
            title="Reload authoritative quotation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Return for Revision Notice */}
      {quotation.status === 'RETURNED' && (
        <div className="p-4 rounded-xl bg-[#1b140d] border border-[#4d3618] text-xs text-[#f59e0b] flex items-start gap-3">
          <RotateCcw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <span className="font-bold text-white block">
              Quotation Returned for Revision
            </span>
            <p className="text-[#c9a76d] leading-relaxed">
              {returnedStep?.notes || 'Approver requested modifications to line discounts and pricing before approval can proceed.'}
            </p>
            <span className="text-[11px] text-white font-medium block pt-1">
              Re-editing has been enabled. Make the required adjustments and click Submit for Approval.
            </span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Concurrency Conflict Alert */}
      {conflictError && (
        <div className="p-4 rounded-2xl bg-[#130b0b] border border-red-800/60 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Concurrency Version Conflict (409 STALE_VERSION_ERROR)</span>
          </div>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">
            {conflictError}
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                setConflictError(null);
                loadQuotation(id);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Latest Server State</span>
            </button>
          </div>
        </div>
      )}

      {/* Section 3 Spec: Sales Rep Parameters Card */}
      <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#18181f] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#ededed] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span>Quotation Scope &amp; Commercial Terms</span>
            </h3>
            <p className="text-[11px] text-[#71717a]">
              Customer relationship, payment terms, and commercial assumptions entered by Sales Rep
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2">
              {isDirty && (
                <span className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                  ● Unsaved header changes
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#161722] hover:bg-[#202230] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Save Draft Values
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Customer & Resolved Tier (Read-only for Sales Rep) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#111216] border border-[#1c1c24]">
            <span className="text-[11px] font-semibold text-[#a1a1aa] block">
              Customer Account
            </span>
            <div className="font-semibold text-[#ededed]">
              {quotation.customer?.name || 'Customer'}
            </div>
            <div className="text-[11px] text-[#71717a]">
              {quotation.customer?.email || 'contact@customer.com'}
            </div>
            <div className="pt-2 mt-2 border-t border-[#1a1b24] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#888]">Resolved Pricing Tier:</span>
              <span className="font-mono text-[11px] font-bold text-blue-400">
                {customerTier} ({tierCeilingPercent}% Ceiling)
              </span>
            </div>
          </div>

          {/* Expiration Date (Editable by Sales Rep) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#111216] border border-[#1c1c24]">
            <label className="text-[11px] font-semibold text-[#a1a1aa] flex items-center justify-between">
              <span>Expiration Date</span>
              <span className="text-[10px] text-[#666]">Optional</span>
            </label>
            {canEdit ? (
              <div className="relative">
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => {
                    setExpirationDate(e.target.value);
                    setIsDirty(true);
                  }}
                  className="w-full bg-[#0a0b0e] border border-[#242632] rounded-lg px-3 py-1.5 text-xs text-[#ededed] focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            ) : (
              <div className="font-mono text-xs text-[#ededed] py-1.5">
                {expirationDate || 'No expiration set'}
              </div>
            )}
            <div className="pt-2 mt-2 border-t border-[#1a1b24] flex items-center justify-between">
              <span className="text-[10px] font-mono text-[#888]">Currency:</span>
              <span className="font-mono text-[11px] font-bold text-[#ededed]">
                {quotation.currency} ({currencySymbol})
              </span>
            </div>
          </div>

          {/* Internal Notes / Deal Scope (Editable by Sales Rep) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#111216] border border-[#1c1c24]">
            <label className="text-[11px] font-semibold text-[#a1a1aa] flex items-center justify-between">
              <span>Internal Deal Notes / Scope</span>
              <span className="text-[10px] text-[#666]">Commercial Terms</span>
            </label>
            {canEdit ? (
              <textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => {
                  setInternalNotes(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Key commercial assumptions, payment terms, or client requirements..."
                className="w-full bg-[#0a0b0e] border border-[#242632] rounded-lg p-2 text-xs text-[#ededed] focus:outline-none focus:border-blue-500 placeholder:text-[#52525b] resize-none"
              />
            ) : (
              <p className="text-xs text-[#a1a1aa] py-1 leading-relaxed">
                {internalNotes || 'No internal commercial notes recorded.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Section 2 Spec: Prominent Add Product / Add to Quote Area */}
      {canEdit && (
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#ededed]">Add Product to Quotation</h3>
                <p className="text-[11px] text-[#71717a]">
                  Select catalog products, configure variants, adjust quantities, and apply compliant discounts
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#888]">
              Effective Line Ceiling: <strong className="text-blue-400">{activeEffectiveLimit}%</strong>
            </div>
          </div>

          <form onSubmit={handleAddLine} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Product Selector */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Product <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={loadingCatalog || addingLine}
                  className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {catalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.category}) — Base: {currencySymbol}{Number(p.basePrice).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product Variant */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Variant
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  disabled={addingLine || !activeProduct?.variants?.length}
                  className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                >
                  <option value="">Standard / Base</option>
                  {activeProduct?.variants?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.attributeName}: {v.attributeValue} (+{currencySymbol}{Number(v.extraPrice).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subscription Plan */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Subscription Plan
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  disabled={addingLine}
                  className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="">One-Time Sale</option>
                  {subscriptionPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} ({plan.billingCycle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Quantity
                </label>
                <div className="flex items-center rounded-xl bg-[#111216] border border-[#24252f] p-0.5">
                  <button
                    type="button"
                    onClick={() => setInputQuantity((prev) => Math.max(1, (parseInt(prev, 10) || 1) - 1))}
                    disabled={inputQuantity <= 1 || addingLine}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-[#1e1f29] transition-colors cursor-pointer disabled:opacity-30"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={inputQuantity}
                    onChange={(e) => setInputQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    disabled={addingLine}
                    className="w-full text-xs text-center font-mono font-bold bg-transparent text-[#ededed] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setInputQuantity((prev) => (parseInt(prev, 10) || 1) + 1)}
                    disabled={addingLine}
                    className="h-7 w-7 rounded-lg flex items-center justify-center text-[#888] hover:text-white hover:bg-[#1e1f29] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Discount % */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#a1a1aa]">
                    Discount %
                  </label>
                  <span className="text-[10px] font-mono text-[#71717a]">
                    Limit: {activeEffectiveLimit}%
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={inputDiscount}
                    onChange={(e) => setInputDiscount(e.target.value)}
                    disabled={addingLine}
                    className={`w-full text-xs font-mono font-semibold rounded-xl px-3 py-2 focus:outline-none transition-colors ${
                      parseFloat(inputDiscount) > activeEffectiveLimit
                        ? 'bg-red-950/30 border border-red-800 text-red-400 focus:border-red-600'
                        : 'bg-[#111216] border border-[#24252f] text-[#ededed] focus:border-blue-500'
                    }`}
                  />
                  <span className="absolute right-3 top-2 text-xs text-[#666]">%</span>
                </div>
              </div>
            </div>

            {/* Line Note & Add Button Row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Optional line note (special customer requirements, delivery commitments, etc.)..."
                  value={inputLineNote}
                  onChange={(e) => setInputLineNote(e.target.value)}
                  disabled={addingLine}
                  className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] placeholder:text-[#52525b] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {parseFloat(inputDiscount) > activeEffectiveLimit && (
                  <span className="text-xs text-rose-400 font-mono flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>+{((parseFloat(inputDiscount) || 0) - activeEffectiveLimit).toFixed(1)}pt over limit</span>
                  </span>
                )}

                <button
                  type="submit"
                  disabled={addingLine || saving || loadingCatalog || !selectedProductId}
                  className="h-[38px] px-6 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {addingLine ? (
                    <>
                      <Spinner size="sm" />
                      <span>Adding to Quote...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Add to Quote</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Section 4 Spec: Line-Item Table */}
      <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1c1c22] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#ededed]">Quotation Line Items</h3>
            <p className="text-[11px] text-[#71717a]">
              Authoritative line discounts, effective limits, and live margins
            </p>
          </div>
          <span className="text-xs font-mono text-[#71717a]">
            {lineCount} item{lineCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c8c8c2]">
            {/* Exact Header Spec: Product | Qty | Price | Discount % | Limit | Status | Line Margin | Actions */}
            <thead className="bg-[#111216] text-[#71717a] font-mono text-[11px] uppercase tracking-wider border-b border-[#1c1c22]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3 text-center w-36">Qty</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-center w-32">Discount %</th>
                <th className="py-3 px-3 text-center">Limit</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Line Margin</th>
                {canEdit && <th className="py-3 px-3 text-center w-16">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181f]">
              {!hasLines ? (
                /* Section 2 Spec: Initial Empty Item Area */
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <div className="w-10 h-10 rounded-xl bg-[#14151e] border border-[#232533] flex items-center justify-center text-[#707284]">
                        <Package className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-medium text-[#ededed]">
                        No line items added yet. Use the product selector below to add items to this quotation.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                quotation.lines.map((line) => {
                  const discPct = Number(line.discountPercent || 0);
                  const limitPct = Number(line.lineDiscountLimit || 0);
                  const isOverLimit = discPct > limitPct;
                  const overBy = Math.max(0, discPct - limitPct);
                  const isInvalid = Number(line.quantity) < 1 || Number(line.unitPrice) <= 0;
                  const isMarginWarning = Number(line.lineMargin) < 0 || (Number(line.lineSubtotal) > 0 && (Number(line.lineMargin) / Number(line.lineSubtotal)) < 0.15);

                  let statusText = 'OK';
                  let statusBadgeStyle = 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40';

                  if (isInvalid) {
                    statusText = 'INVALID';
                    statusBadgeStyle = 'bg-red-950/40 text-red-400 border-red-900/50';
                  } else if (isOverLimit) {
                    statusText = `OVER LIMIT (+${overBy.toFixed(1)}pt)`;
                    statusBadgeStyle = 'bg-red-950/40 text-red-400 border-red-900/50';
                  } else if (isMarginWarning) {
                    statusText = 'MARGIN WARNING';
                    statusBadgeStyle = 'bg-amber-950/40 text-amber-400 border-amber-900/50';
                  }

                  return (
                    <tr key={line.id} className="hover:bg-[#111216] transition-colors">
                      {/* Product */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-semibold text-[#ededed]">
                          {line.product?.name || line.productNameSnapshot}
                        </div>
                        <div className="text-[10px] text-[#71717a] flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[#52525b]">{line.product?.sku}</span>
                          <span>•</span>
                          <span>{line.categorySnapshot || line.product?.category}</span>
                          {line.variant && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400 font-medium">
                                {line.variant.attributeName}: {line.variant.attributeValue}
                              </span>
                            </>
                          )}
                          {line.subscriptionPlan && (
                            <>
                              <span>•</span>
                              <span className="text-purple-400 font-medium">
                                {line.subscriptionPlan.name} ({line.subscriptionPlan.billingCycle})
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Qty: [-] [qty] [+] */}
                      <td className="py-3.5 px-3 text-center">
                        {canEdit ? (
                          <div className="inline-flex items-center rounded-lg bg-[#14151b] border border-[#24252f] p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(line, -1)}
                              disabled={line.quantity <= 1 || saving}
                              className="h-6 w-6 rounded flex items-center justify-center text-[#888] hover:text-white hover:bg-[#20222b] disabled:opacity-30 transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-xs text-[#ededed]">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(line, 1)}
                              disabled={saving}
                              className="h-6 w-6 rounded flex items-center justify-center text-[#888] hover:text-white hover:bg-[#20222b] transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-xs text-[#ededed]">
                            {line.quantity}
                          </span>
                        )}
                      </td>

                      {/* Price (Read-only) */}
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-[#ededed]">
                        {currencySymbol}{Number(line.unitPrice).toFixed(2)}
                      </td>

                      {/* Discount % (Sales rep editable) */}
                      <td className="py-3.5 px-3 text-center">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.5"
                              defaultValue={discPct}
                              onBlur={(e) => handleDiscountChange(line, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                              className={`w-16 text-center text-xs font-mono py-1 rounded-lg border focus:outline-none transition-colors ${
                                isOverLimit
                                  ? 'bg-red-950/20 border-red-800 text-red-400 focus:border-red-600'
                                  : 'bg-[#111114] border-[#25262e] text-[#ededed] focus:border-[#444]'
                              }`}
                            />
                            <span className="text-[11px] text-[#666]">%</span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs">
                            {discPct.toFixed(1)}%
                          </span>
                        )}
                      </td>

                      {/* Limit (Read-only) */}
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-[#888]">
                        {limitPct.toFixed(1)}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded border ${statusBadgeStyle}`}>
                          {!isOverLimit && !isInvalid && <Check className="w-2.5 h-2.5" />}
                          {statusText}
                        </span>
                      </td>

                      {/* Line Margin (Server-computed) */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-[#ededed] block">
                          {currencySymbol}{Number(line.lineMargin).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#71717a]">
                          net {currencySymbol}{(Number(line.lineSubtotal) - Number(line.lineDiscountAmount)).toFixed(2)}
                        </span>
                      </td>

                      {/* Actions */}
                      {canEdit && (
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmLineId(line.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
                            title="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen #4 Wireframe Helper Banner (Muted Dark Gold, No Neon Glow) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2">
        <span>Discount is checked against each line&apos;s max limit as soon as it is entered, not only at submit time.</span>
      </div>

      {/* Section 6 Spec: Flagged Lines Details */}
      {flaggedLines.length > 0 && (
        <div className="bg-[#141010] border border-[#3d2024] rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Discount Ceiling Overages Detected ({flaggedLines.length} Flagged Line{flaggedLines.length === 1 ? '' : 's'})</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[#888] font-mono text-[10px] border-b border-[#2d181c]">
                  <th className="py-2 px-3">Product</th>
                  <th className="py-2 px-3 text-right">Given Discount</th>
                  <th className="py-2 px-3 text-right">Allowed Limit</th>
                  <th className="py-2 px-3 text-right">Overage Points</th>
                  <th className="py-2 px-3">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d181c] font-mono text-[11px]">
                {flaggedLines.map((fl) => {
                  const disc = Number(fl.discountPercent || 0);
                  const limit = Number(fl.lineDiscountLimit || 0);
                  const overBy = disc - limit;
                  return (
                    <tr key={fl.id}>
                      <td className="py-2.5 px-3 text-white font-sans font-medium">{fl.product?.name || fl.productNameSnapshot}</td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">{disc.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right text-[#a0a2b8]">{limit.toFixed(1)}%</td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">+{overBy.toFixed(1)} pt</td>
                      <td className="py-2.5 px-3 text-[#c4c6dc] font-sans text-xs">
                        Exceeds {customerTier} tier &amp; {fl.categorySnapshot || fl.product?.category} ceiling
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 2 & 5 Spec: Server-Computed Economics & Risk Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Totals */}
        <div className="lg:col-span-2 bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
            <h3 className="text-sm font-semibold text-[#ededed]">Authoritative Deal Economics</h3>
            <span className="text-[11px] font-mono text-[#52525b]">Server Computed</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Gross Subtotal
              </span>
              <div className="text-lg font-bold font-mono text-[#ededed]">
                {currencySymbol}{Number(quotation.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Discount Total
              </span>
              <div className="text-lg font-bold font-mono text-amber-400">
                -{currencySymbol}{Number(quotation.discountTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Taxes
              </span>
              <div className="text-lg font-bold font-mono text-[#a1a1aa]">
                +{currencySymbol}{Number(quotation.taxTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Grand Total
              </span>
              <div className="text-xl font-bold font-mono text-white">
                {currencySymbol}{Number(quotation.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Cost of Goods Sold & Margins */}
          <div className="pt-4 border-t border-[#18181f] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Cost of Goods Sold (COGS)
              </span>
              <div className="text-sm font-mono text-[#a1a1aa]">
                {hasLines ? `${currencySymbol}${Number(quotation.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Net Margin Amount
              </span>
              <div className="text-sm font-mono font-bold text-[#ededed]">
                {hasLines ? `${currencySymbol}${Number(quotation.marginAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Live Margin Health
              </span>
              <div className="flex items-center gap-2">
                {hasLines ? (
                  <>
                    <span className="text-sm font-mono font-bold text-[#ededed]">
                      {marginPct.toFixed(1)}%
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                        isHealthyMargin
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50'
                          : isWarningMargin
                          ? 'bg-amber-950/40 text-amber-400 border border-amber-900/50'
                          : 'bg-red-950/40 text-red-400 border border-red-900/50'
                      }`}
                    >
                      {isHealthyMargin ? 'HEALTHY' : isWarningMargin ? 'CAUTION' : 'DANGER'}
                    </span>
                  </>
                ) : (
                  <span className="text-xs font-mono text-[#888] bg-[#14151e] px-2.5 py-0.5 rounded-md border border-[#232534]">
                    Not calculated
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Blended Risk Score & Governance Tile */}
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 flex flex-col justify-between shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
              <h3 className="text-sm font-semibold text-[#ededed]">Blended Risk Rating</h3>
              <ShieldCheck className="w-4 h-4 text-[#71717a]" />
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Risk Score:</span>
                <span className="font-mono text-xl font-bold text-[#ededed]">
                  {hasLines ? (quotation.blendedRiskScore || 0) : 0} / 100
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Risk Escalation Level:</span>
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                    !hasLines || quotation.riskLevel === 'NONE' || quotation.riskLevel === 'LOW'
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50'
                      : quotation.riskLevel === 'MEDIUM'
                      ? 'bg-amber-950/40 text-amber-400 border-amber-900/50'
                      : 'bg-red-950/40 text-red-400 border-red-900/50'
                  }`}
                >
                  {hasLines ? (quotation.riskLevel || 'NONE') : 'NONE'}
                </span>
              </div>

              {/* Helper Message */}
              <div className="pt-2 border-t border-[#18181f] text-[11px] text-[#71717a] leading-relaxed">
                {!hasLines ? (
                  <span className="text-[#888]">Add line items to calculate margin and deal risk.</span>
                ) : quotation.riskLevel === 'NONE' || quotation.riskLevel === 'LOW' ? (
                  <span className="text-emerald-400/90">No approval required yet. All line discounts conform to policy limits.</span>
                ) : (
                  <span className="text-amber-300/90">
                    Sequential approval escalation required due to line overages.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upsell & Cross-Sell Suggestions */}
      {upsellSuggestions.length > 0 && (
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-[#ededed]">
                Smart Upsell &amp; Cross-Sell Recommendations
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#52525b]">Ranked by Margin Delta</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
            {upsellSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-3.5 rounded-xl bg-[#111216] border border-[#1f2027] hover:border-[#31333e] flex flex-col justify-between space-y-3 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/40 text-blue-400 border border-blue-900/40">
                      {sug.promotionTag}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400">
                      +{sug.marginPercent}% margin
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-[#ededed] line-clamp-1">
                    {sug.productName}
                  </h4>
                  <p className="text-[11px] text-[#71717a] leading-relaxed">
                    {sug.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#18181f]">
                  <span className="font-mono text-xs font-bold text-white">
                    {currencySymbol}{Number(sug.unitPrice).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => dismissUpsell(sug.id)}
                      className="px-2 py-1 text-[10px] text-[#666] hover:text-[#999] rounded transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleAddUpsell(sug)}
                        disabled={saving}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 7 Spec: Bottom Sticky Action Bar by Status */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#080808]/95 backdrop-blur border-t border-[#1c1c22] z-30">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-[#71717a]">
            <span>Total:</span>
            <span className="font-mono font-bold text-[#ededed]">
              {currencySymbol}{Number(quotation.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span>• Margin:</span>
            <span className={`font-mono font-bold ${!hasLines ? 'text-[#888]' : isHealthyMargin ? 'text-emerald-400' : isWarningMargin ? 'text-amber-400' : 'text-red-400'}`}>
              {hasLines ? `${marginPct.toFixed(1)}%` : '—'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {canEdit ? (
              <>
                {/* Cancel -> return to quotation list with unsaved changes check */}
                <button
                  type="button"
                  onClick={handleCancelClick}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#888] hover:text-[#ededed] bg-[#12131b] border border-[#202230] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                {/* Save Draft */}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161722] hover:bg-[#1e202f] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Draft
                </button>

                {/* Submit for Approval (Disabled until at least 1 valid line exists) */}
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={saving || !hasLines}
                  title={!hasLines ? 'Add at least one product line before submitting' : 'Submit for approval or confirm'}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-40 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {quotation.riskLevel === 'NONE' || quotation.riskLevel === 'LOW'
                      ? 'Submit / Auto-Approve'
                      : 'Submit for Approval'}
                  </span>
                </button>
              </>
            ) : isPendingApproval ? (
              /* PENDING_APPROVAL controls */
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Locked for Review</span>
                </span>

                <Link
                  href={`/approvals/${quotation.id}`}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Approval Status</span>
                </Link>
              </div>
            ) : quotation.status === 'APPROVED' ? (
              /* APPROVED controls -> Send to Fulfillment */
              <div className="flex items-center gap-3">
                <Link
                  href={`/fulfillment/${quotation.id}`}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <span>Send to Fulfillment</span>
                </Link>
              </div>
            ) : (
              <Link
                href="/quotations"
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#888] hover:text-[#ededed] bg-[#12131b] border border-[#202230] transition-colors"
              >
                Back to List
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Submit for Approval */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#22222a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">
                {quotation.riskLevel === 'NONE' || quotation.riskLevel === 'LOW'
                  ? 'Confirm Quotation Submission'
                  : 'Submit for Sequential Governance Approval'}
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-[#666] hover:text-[#ededed] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#a1a1aa] leading-relaxed">
              <p>
                You are about to submit <strong className="text-white font-mono">{quotation.quoteNumber}</strong> for <strong className="text-white">{quotation.customer?.name}</strong> totaling <strong className="text-white font-mono">{currencySymbol}{Number(quotation.grandTotal).toFixed(2)}</strong>.
              </p>

              {quotation.riskLevel === 'NONE' || quotation.riskLevel === 'LOW' ? (
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/40 text-emerald-300">
                  All discount percentages are strictly within customer relationship and category guardrails. This quotation will be <strong>auto-approved immediately</strong>.
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-900/40 text-amber-300">
                  Blended risk score is <strong>{quotation.blendedRiskScore} ({quotation.riskLevel})</strong>. Sequential escalation will be triggered and an immutable audit log entry recorded.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#888] hover:text-[#ededed] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm &amp; Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Line Item */}
      {deleteConfirmLineId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#22222a] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-sm font-bold text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Remove Line Item</span>
            </div>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              Are you sure you want to remove this line item? Totals, margin, and deal risk will be immediately recalculated on the server.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmLineId(null)}
                className="px-3 py-1.5 text-xs text-[#888] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteLine}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Remove Line
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Unsaved Changes Cancel */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#22222a] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Discard Unsaved Changes?</span>
            </div>
            <p className="text-xs text-[#a1a1aa] leading-relaxed">
              You have modified quotation parameters or notes without saving. Returning now will discard your pending edits.
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 text-xs text-[#888] hover:text-white cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  router.push('/quotations');
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Discard &amp; Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
