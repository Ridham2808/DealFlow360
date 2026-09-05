'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Clock, 
  ShieldAlert, 
  Sparkles, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Building2, 
  Send, 
  Check, 
  X, 
  Info,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck
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

  // Add Item State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [inputQuantity, setInputQuantity] = useState(1);
  const [inputDiscount, setInputDiscount] = useState(0);

  // Modals & UI States
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  // Load quotation data
  useEffect(() => {
    if (id) {
      loadQuotation(id);
    }
  }, [id, loadQuotation]);

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
  const activeProduct = catalogProducts.find((p) => p.id === selectedProductId);

  // Reset variant when product changes
  useEffect(() => {
    if (activeProduct?.variants?.length > 0) {
      setSelectedVariantId(activeProduct.variants[0].id);
    } else {
      setSelectedVariantId('');
    }
  }, [selectedProductId, activeProduct]);

  // Handle Add Line Item
  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!selectedProductId) return;

    try {
      await mutateLine({
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        subscriptionPlanId: selectedPlanId || null,
        quantity: Math.max(1, parseInt(inputQuantity, 10) || 1),
        discountPercent: Math.max(0, Math.min(100, parseFloat(inputDiscount) || 0)),
      });

      // Reset form
      setInputQuantity(1);
      setInputDiscount(0);
      setSelectedPlanId('');
      setSuccessMessage('Line item added to quotation.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch {
      // Error handled in context
    }
  };

  // Quantity adjustments
  const handleQuantityDelta = async (line, delta) => {
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

  // Debounced line discount change
  const handleDiscountChange = async (line, newDiscountStr) => {
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

  // One-click add upsell suggestion
  const handleAddUpsell = async (suggestion) => {
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
      setShowSubmitModal(false);
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

  const marginPct = Number(quotation.marginPercentage || 0);
  const isHealthyMargin = marginPct >= 30;
  const isWarningMargin = marginPct >= 15 && marginPct < 30;
  const isDangerMargin = marginPct < 15;

  const canEdit = ['DRAFT', 'UNDER_NEGOTIATION', 'RETURNED'].includes(quotation.status);

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#18181b] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/quotations"
              className="h-7 w-7 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#71717a]">Quotations</span>
              <span className="text-xs text-[#444]">/</span>
              <span className="font-mono text-xs font-semibold text-[#a1a1aa]">{quotation.quoteNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">
              Quotation Detail: {quotation.quoteNumber}
            </h1>
            <span className="text-base text-[#888] font-normal">({quotation.customer?.name})</span>
            {quotation.customer?.tier && (
              <Badge variant={quotation.customer.tier === 'GOLD' ? 'warning' : 'neutral'} size="sm">
                {quotation.customer.tier} Tier
              </Badge>
            )}
            <Badge
              variant={
                quotation?.status === 'APPROVED' || quotation?.status === 'CONFIRMED'
                  ? 'success'
                  : quotation?.status === 'PENDING_APPROVAL'
                  ? 'warning'
                  : 'neutral'
              }
              size="sm"
            >
              {(quotation?.status || 'DRAFT').replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>

        {/* Live sync & Version indicator */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-mono text-[#71717a] block">
              Version v{quotation.version} • {quotation.currency}
            </span>
            <span className="text-[10px] text-[#555]">
              {canEdit ? 'Editable Draft' : 'Locked for Review'}
            </span>
          </div>
          <button
            onClick={() => loadQuotation(id)}
            disabled={saving}
            className="h-8 w-8 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors"
            title="Reload authoritative quotation"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>


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

      {/* Stale Version Conflict Modal */}
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
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Latest Server State</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart & Lines Table */}
      <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1c1c22] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#ededed]">Quotation Line Items</h3>
            <p className="text-[11px] text-[#71717a]">
              Authoritative line discounts, effective limits, and live margins
            </p>
          </div>
          <span className="text-xs font-mono text-[#71717a]">
            {quotation.lines?.length || 0} item{quotation.lines?.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c8c8c2]">
            <thead className="bg-[#111216] text-[#71717a] font-mono text-[11px] uppercase tracking-wider border-b border-[#1c1c22]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3 text-center w-36">Qty</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-center w-32">Discount %</th>
                <th className="py-3 px-3 text-center">Limit</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Line Margin</th>
                {canEdit && <th className="py-3 px-3 text-center w-12">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181f]">
              {!quotation.lines || quotation.lines.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-12 text-center text-xs text-[#555]">
                    No line items added yet. Use the product selector below to add items to this quotation.
                  </td>
                </tr>
              ) : (
                quotation.lines.map((line) => {
                  const discPct = Number(line.discountPercent || 0);
                  const limitPct = Number(line.lineDiscountLimit || 0);
                  const isOverLimit = discPct > limitPct;
                  const overBy = Math.max(0, discPct - limitPct);

                  return (
                    <tr key={line.id} className="hover:bg-[#111216] transition-colors">
                      {/* Product details */}
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-semibold text-[#ededed]">
                          {line.productNameSnapshot || line.product?.name}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-[#71717a]">
                          <span>{line.categorySnapshot || line.product?.category}</span>
                          {line.variant && (
                            <>
                              <span>•</span>
                              <span className="text-blue-400">
                                {line.variant.attributeName}: {line.variant.attributeValue}
                              </span>
                            </>
                          )}
                          {line.subscriptionPlan && (
                            <>
                              <span>•</span>
                              <span className="text-purple-400">
                                {line.subscriptionPlan.name} ({line.subscriptionPlan.billingCycle})
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Quantity [-] [input] [+] */}
                      <td className="py-3.5 px-3 text-center">
                        {canEdit ? (
                          <div className="inline-flex items-center rounded-lg bg-[#14151b] border border-[#24252f] p-0.5">
                            <button
                              type="button"
                              onClick={() => handleQuantityDelta(line, -1)}
                              disabled={line.quantity <= 1 || saving}
                              className="h-6 w-6 rounded flex items-center justify-center text-[#888] hover:text-[#fff] hover:bg-[#20222b] disabled:opacity-30 transition-colors"
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
                              className="h-6 w-6 rounded flex items-center justify-center text-[#888] hover:text-[#fff] hover:bg-[#20222b] transition-colors"
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

                      {/* Unit Price */}
                      <td className="py-3.5 px-3 text-right font-mono text-xs">
                        ${Number(line.unitPrice).toFixed(2)}
                      </td>

                      {/* Discount % Input */}
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

                      {/* Limit % */}
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-[#888]">
                        {limitPct.toFixed(1)}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {isOverLimit ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-900/50">
                            Over +{overBy.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/30 text-emerald-400 border border-emerald-900/40">
                            <Check className="w-2.5 h-2.5" />
                            OK
                          </span>
                        )}
                      </td>

                      {/* Line Margin */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className="font-bold text-[#ededed] block">
                          ${Number(line.lineMargin).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[#71717a]">
                          net ${(Number(line.lineSubtotal) - Number(line.lineDiscountAmount)).toFixed(2)}
                        </span>
                      </td>

                      {/* Action */}
                      {canEdit && (
                        <td className="py-3.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => deleteLine(line.id)}
                            disabled={saving}
                            className="p-1.5 rounded-lg text-[#666] hover:text-red-400 hover:bg-red-950/20 transition-colors"
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

        {/* Add Line Form (Only when quotation is editable) */}
        {canEdit && (
          <form
            onSubmit={handleAddLine}
            className="p-4 bg-[#0e0f14] border-t border-[#1c1c22] flex flex-wrap items-end gap-3"
          >
            {/* Product Selector */}
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                Add Product to Quote
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full text-xs bg-[#121319] border border-[#25262f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-[#444]"
              >
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category}) — Base: ${Number(p.basePrice).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            {/* Variant Selector (if active product has variants) */}
            {activeProduct?.variants?.length > 0 && (
              <div className="space-y-1 w-44">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Product Variant
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full text-xs bg-[#121319] border border-[#25262f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-[#444]"
                >
                  <option value="">Standard / None</option>
                  {activeProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.attributeName}: {v.attributeValue} (+${Number(v.extraPrice).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Optional Subscription Plan Selector */}
            {subscriptionPlans.length > 0 && (
              <div className="space-y-1 w-48">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Subscription Plan (Optional)
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full text-xs bg-[#121319] border border-[#25262f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-[#444]"
                >
                  <option value="">One-off Purchase</option>
                  {subscriptionPlans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} (${Number(pl.price).toFixed(2)} / {pl.billingCycle})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-1 w-20">
              <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={inputQuantity}
                onChange={(e) => setInputQuantity(e.target.value)}
                className="w-full text-center text-xs font-mono bg-[#121319] border border-[#25262f] text-[#ededed] rounded-xl px-2 py-2 focus:outline-none focus:border-[#444]"
              />
            </div>

            {/* Discount % */}
            <div className="space-y-1 w-24">
              <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={inputDiscount}
                onChange={(e) => setInputDiscount(e.target.value)}
                className="w-full text-center text-xs font-mono bg-[#121319] border border-[#25262f] text-[#ededed] rounded-xl px-2 py-2 focus:outline-none focus:border-[#444]"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="h-[38px] px-4 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Line</span>
            </button>
          </form>
        )}
      </div>

      {/* Screen #4 Wireframe Helper Banner (Muted Dark Gold, No Neon Glow) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2">
        <span>Discount is checked against each line&apos;s max limit as soon as it is entered, not only at submit time.</span>
      </div>

      {/* Live Margin Indicator & Totals Section (Authoritative Server Computation) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Authoritative Financial Totals */}
        <div className="lg:col-span-2 bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 space-y-4">
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
                ${Number(quotation.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Discount Total
              </span>
              <div className="text-lg font-bold font-mono text-amber-400">
                -${Number(quotation.discountTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Taxes
              </span>
              <div className="text-lg font-bold font-mono text-[#a1a1aa]">
                +${Number(quotation.taxTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Grand Total
              </span>
              <div className="text-xl font-bold font-mono text-white">
                ${Number(quotation.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Internal Margin Guard Indicators */}
          <div className="pt-4 border-t border-[#18181f] grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Cost of Goods Sold (COGS)
              </span>
              <div className="text-sm font-mono text-[#a1a1aa]">
                ${Number(quotation.totalCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Net Margin Amount
              </span>
              <div className="text-sm font-mono font-bold text-[#ededed]">
                ${Number(quotation.marginAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                Live Margin Health
              </span>
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </div>
        </div>

        {/* Blended Risk Score & Governance Tile */}
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
              <h3 className="text-sm font-semibold text-[#ededed]">Blended Risk Rating</h3>
              <ShieldCheck className="w-4 h-4 text-[#71717a]" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Risk Score:</span>
                <span className="font-mono text-xl font-bold text-[#ededed]">
                  {quotation.blendedRiskScore || 0} / 100
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-[#71717a]">Risk Escalation Level:</span>
                <Badge
                  variant={
                    quotation.riskLevel === 'HIGH'
                      ? 'danger'
                      : quotation.riskLevel === 'MEDIUM'
                      ? 'warning'
                      : quotation.riskLevel === 'LOW'
                      ? 'info'
                      : 'success'
                  }
                  size="sm"
                >
                  {quotation.riskLevel}
                </Badge>
              </div>

              <p className="text-[11px] text-[#71717a] pt-1">
                {quotation.riskLevel === 'NONE'
                  ? 'Quotation discounts are 100% within customer and category ceilings. Auto-approval eligible.'
                  : `Discount exceeds ceilings. Sequential escalation to ${
                      quotation.riskLevel === 'HIGH' ? 'Sales VP & Finance' : 'Sales Manager'
                    } required.`}
              </p>
            </div>
          </div>

          {/* Sequential Step Progress if submitted */}
          {quotation.approvalSteps?.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[#18181f] space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#71717a]">Approval Workflow</span>
              <div className="space-y-1.5">
                {quotation.approvalSteps.map((step) => (
                  <div key={step.id} className="flex items-center justify-between text-xs font-mono">
                    <span className="text-[#a1a1aa]">{step.stepOrder}. {step.requiredRole}</span>
                    <Badge variant={step.status === 'APPROVED' ? 'success' : step.status === 'REJECTED' ? 'danger' : 'warning'} size="sm">
                      {step.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upsell & Cross-Sell Suggestions Panel */}
      {upsellSuggestions.length > 0 && (
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-[#ededed]">
                Smart Upsell & Cross-Sell Recommendations
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
                    ${Number(sug.unitPrice).toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => dismissUpsell(sug.id)}
                      className="px-2 py-1 text-[10px] text-[#666] hover:text-[#999] rounded transition-colors"
                    >
                      Dismiss
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleAddUpsell(sug)}
                        disabled={saving}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50"
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

      {/* Bottom Sticky Action Bar */}
      {canEdit && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#080808]/95 backdrop-blur border-t border-[#1c1c22] z-30 flex items-center justify-between max-w-[1600px] mx-auto">
          <div className="flex items-center gap-2 text-xs text-[#71717a]">
            <span>Total:</span>
            <span className="font-mono font-bold text-[#ededed]">
              ${Number(quotation.grandTotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span>• Margin:</span>
            <span className={`font-mono font-bold ${isHealthyMargin ? 'text-emerald-400' : isWarningMargin ? 'text-amber-400' : 'text-red-400'}`}>
              {marginPct.toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/quotations"
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#888] hover:text-[#ededed] transition-colors"
            >
              Back to List
            </Link>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={saving || !quotation.lines || quotation.lines.length === 0}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {quotation.riskLevel === 'NONE' ? 'Auto-Approve / Confirm Quote' : 'Submit for Approval'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#22222a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">
                {quotation.riskLevel === 'NONE' ? 'Confirm Quotation' : 'Submit for Sequential Approval'}
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-[#666] hover:text-[#ededed]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#a1a1aa] leading-relaxed">
              <p>
                You are about to submit <strong className="text-white font-mono">{quotation.quoteNumber}</strong> for <strong className="text-white">{quotation.customer?.name}</strong> totaling <strong className="text-white font-mono">${Number(quotation.grandTotal).toFixed(2)}</strong>.
              </p>

              {quotation.riskLevel === 'NONE' ? (
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
                className="px-4 py-2 text-xs font-medium text-[#888] hover:text-[#ededed]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Spinner size="sm" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Confirm & Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
