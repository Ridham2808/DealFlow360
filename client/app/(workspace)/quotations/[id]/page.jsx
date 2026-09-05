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
  Building2,
  Tag,
  Search,
  Wrench,
  Shield,
  Repeat,
  Box,
  Layers,
  Clock,
  MapPin,
  FileText,
  UserCheck
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
  const [allCustomers, setAllCustomers] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Catalog Filters & Search
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('ALL'); // ALL, PHYSICAL_PRODUCT, SERVICE, WARRANTY, SUBSCRIPTION
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  // Change Customer State
  const [showChangeCustomerModal, setShowChangeCustomerModal] = useState(false);
  const [newCustomerId, setNewCustomerId] = useState('');
  const [changingCustomer, setChangingCustomer] = useState(false);

  // Add Item State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [inputQuantity, setInputQuantity] = useState(1);
  const [inputDiscount, setInputDiscount] = useState(0);
  const [serviceDeliveryDate, setServiceDeliveryDate] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceEstimatedHours, setServiceEstimatedHours] = useState('');
  const [serviceNote, setServiceNote] = useState('');
  const [warrantyCoverageDuration, setWarrantyCoverageDuration] = useState('2 Years');
  const [warrantyLinkedProductId, setWarrantyLinkedProductId] = useState('');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState('');
  const [subscriptionSeats, setSubscriptionSeats] = useState(1);
  const [addingLine, setAddingLine] = useState(false);

  // Modals & UI States
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [deleteConfirmLineId, setDeleteConfirmLineId] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lineDetailModal, setLineDetailModal] = useState(null);

  // Load quotation data
  useEffect(() => {
    if (id) {
      loadQuotation(id);
    }
  }, [id, loadQuotation]);

  // Load catalog lookups & customers
  useEffect(() => {
    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [prodRes, planRes, custRes] = await Promise.all([
          api.get('/quotations/lookup/products'),
          api.get('/quotations/lookup/subscription-plans'),
          api.get('/quotations/lookup/customers'),
        ]);
        if (prodRes?.data) setCatalogProducts(prodRes.data);
        if (planRes?.data) setSubscriptionPlans(planRes.data);
        if (custRes?.data) setAllCustomers(custRes.data);
        if (prodRes?.data?.length > 0) setSelectedProductId(prodRes.data[0].id);
      } catch {
        // non-blocking
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Filtered catalog products
  const filteredCatalogProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      const matchesSearch = 
        !catalogSearch.trim() ||
        p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(catalogSearch.toLowerCase());

      const matchesType = 
        selectedTypeFilter === 'ALL' || p.itemType === selectedTypeFilter;

      const matchesCategory = 
        selectedCategoryFilter === 'ALL' || p.category === selectedCategoryFilter;

      return matchesSearch && matchesType && matchesCategory && p.isActive;
    });
  }, [catalogProducts, catalogSearch, selectedTypeFilter, selectedCategoryFilter]);

  // Active selected product object
  const activeProduct = useMemo(
    () => catalogProducts.find((p) => p.id === selectedProductId),
    [catalogProducts, selectedProductId]
  );

  // Available categories for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set(catalogProducts.map((p) => p.category).filter(Boolean));
    return Array.from(set);
  }, [catalogProducts]);

  // Physical products currently on quote (for warranty linking)
  const physicalQuoteLines = useMemo(() => {
    return (quotation?.lines || []).filter(
      (l) => l.itemType === 'PHYSICAL_PRODUCT' || (!['SERVICE', 'WARRANTY', 'SUBSCRIPTION'].includes(l.itemType) && !l.isRecurring)
    );
  }, [quotation?.lines]);

  // Reset variant when product changes
  useEffect(() => {
    if (activeProduct?.variants?.length > 0) {
      setSelectedVariantId(activeProduct.variants[0].id);
    } else {
      setSelectedVariantId('');
    }

    if (activeProduct?.itemType === 'WARRANTY' && physicalQuoteLines.length > 0) {
      setWarrantyLinkedProductId(physicalQuoteLines[0].productId);
    }
  }, [selectedProductId, activeProduct, physicalQuoteLines]);

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

  // Handle Controlled Change Customer Action (Draft Only)
  const handleChangeCustomer = async () => {
    if (!newCustomerId || newCustomerId === quotation?.customerId) {
      setShowChangeCustomerModal(false);
      return;
    }
    setChangingCustomer(true);
    try {
      await api.patch(`/quotations/${id}`, {
        customerId: newCustomerId,
        version: quotation.version,
      });
      setShowChangeCustomerModal(false);
      setSuccessMessage('Customer updated. Server recomputed all prices, discount ceilings, and risk.');
      setTimeout(() => setSuccessMessage(null), 3500);
      loadQuotation(id);
    } catch (err) {
      setError(err.message || 'Failed to change customer.');
    } finally {
      setChangingCustomer(false);
    }
  };

  // Handle Add Line Item
  const handleAddLine = async (e) => {
    e?.preventDefault();
    if (!selectedProductId || !canEdit) return;

    // Validate warranty linking if item is a warranty
    if (activeProduct?.itemType === 'WARRANTY' && physicalQuoteLines.length === 0) {
      setError('A warranty must be linked to a physical product covered in this quotation. Please add a physical product first.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setAddingLine(true);
    try {
      const payload = {
        productId: selectedProductId,
        variantId: selectedVariantId || null,
        subscriptionPlanId: selectedPlanId || null,
        quantity: Math.max(1, parseInt(inputQuantity, 10) || 1),
        discountPercent: Math.max(0, Math.min(100, parseFloat(inputDiscount) || 0)),
        itemType: activeProduct?.itemType || 'PHYSICAL_PRODUCT',
        serviceDeliveryDate: serviceDeliveryDate || undefined,
        serviceLocation: serviceLocation.trim() || undefined,
        serviceEstimatedHours: serviceEstimatedHours ? parseFloat(serviceEstimatedHours) : undefined,
        serviceNote: serviceNote.trim() || undefined,
        warrantyCoverageDuration: warrantyCoverageDuration || undefined,
        warrantyLinkedProductId: warrantyLinkedProductId || undefined,
        subscriptionStartDate: subscriptionStartDate || undefined,
        subscriptionSeats: subscriptionSeats ? parseInt(subscriptionSeats, 10) : undefined,
      };

      await mutateLine(payload);

      // Reset form defaults
      setInputQuantity(1);
      setInputDiscount(0);
      setServiceNote('');
      setServiceLocation('');
      setServiceEstimatedHours('');
      setSelectedPlanId('');
      setSuccessMessage(`Added ${activeProduct.name} (${activeProduct.itemType}) to quotation.`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      // Error is set in context
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
      {/* 1. Quotation Detail Header (Exact Mockup Structure) */}
      <div className="border-b border-[#18181b] pb-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancelClick}
                className="h-7 w-7 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors cursor-pointer"
                title="Return to Quotations list"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#ededed]">
                Quotation Detail: {quotation.quoteNumber} ({quotation.customer?.name || 'Customer'})
              </h1>
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
              {canEdit ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Editable
                </span>
              ) : isPendingApproval ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>Locked for Review</span>
                </span>
              ) : null}
            </div>
            <p className="text-xs text-[#71717a]">
              Opened by clicking a row on the Quotations list. Add products, apply discounts, review upsells.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            <div className="text-right">
              <span className="text-[10px] font-mono text-[#71717a] block">
                Version v{quotation.version} • {quotation.currency}
              </span>
              <span className="text-[10px] text-[#888]">
                {canEdit ? 'Sales Rep Workspace' : isPendingApproval ? 'Locked for Review' : quotation.status}
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

        {/* Read-Only Header Fields: Customer & Price List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {/* Customer Field */}
          <div className="p-3.5 rounded-xl bg-[#111216] border border-[#1e1f26] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[#71717a] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Customer</span>
              </div>
              <div className="text-sm font-semibold text-[#ededed] flex items-center gap-2">
                <span>{quotation.customer?.name}</span>
                <span className="text-xs font-mono font-normal text-[#888]">({quotation.customer?.email})</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#162130] text-[#60a5fa] border border-[#223956]">
                  {customerTier} Tier ({tierCeilingPercent}% Ceiling)
                </span>
              </div>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setNewCustomerId(quotation.customerId);
                  setShowChangeCustomerModal(true);
                }}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1 rounded-lg border border-blue-500/30 hover:bg-blue-500/10 transition-colors cursor-pointer"
              >
                Change Customer
              </button>
            )}
          </div>

          {/* Price List Field */}
          <div className="p-3.5 rounded-xl bg-[#111216] border border-[#1e1f26] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-[10px] uppercase font-mono tracking-wider text-[#71717a] flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-emerald-400" />
                <span>Price List</span>
              </div>
              <div className="text-sm font-semibold text-[#ededed] flex items-center gap-2">
                <span>{quotation.priceList?.name || 'Gold Enterprise Tier 2026'}</span>
                <span className="text-xs font-mono text-[#888]">({quotation.currency})</span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-[#666] bg-[#171822] px-2 py-0.5 rounded border border-[#272836]">
              Auto-Resolved
            </span>
          </div>
        </div>
      </div>

      {/* Approver Return Notice */}
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
              Re-editing has been enabled. Adjust the line items and click Submit for Approval.
            </span>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-900/50 text-xs text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {conflictError && (
        <div className="p-4 rounded-2xl bg-[#130b0b] border border-red-800/60 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Concurrency Version Conflict</span>
          </div>
          <p className="text-[#a1a1aa]">{conflictError}</p>
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
      )}

      {/* 2. Compact Product, Service, Warranty, and Subscription Catalog Selector */}
      {canEdit && (
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#18181f] pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#ededed]">Add Item to Quotation</h3>
                <p className="text-[11px] text-[#71717a]">
                  Catalog selector for Physical Products, Services, Warranties, and Subscriptions
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-[#888]">
              Customer Tier Limit: <strong className="text-blue-400">{tierCeilingPercent}%</strong>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#666] absolute left-3 top-2.5" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search catalog by name or SKU..."
                className="w-full bg-[#111216] border border-[#24252f] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#ededed] placeholder:text-[#555] focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Type Filters */}
            <div className="inline-flex rounded-xl bg-[#111216] border border-[#24252f] p-0.5 text-xs">
              {[
                { id: 'ALL', label: 'All' },
                { id: 'PHYSICAL_PRODUCT', label: 'Products' },
                { id: 'SERVICE', label: 'Services' },
                { id: 'WARRANTY', label: 'Warranties' },
                { id: 'SUBSCRIPTION', label: 'Subscriptions' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedTypeFilter === t.id
                      ? 'bg-blue-600 text-white font-semibold shadow-xs'
                      : 'text-[#888] hover:text-[#ededed]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-[#111216] border border-[#24252f] text-xs text-[#ededed] rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Add Item Form */}
          <form onSubmit={handleAddLine} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              {/* Item Selector Dropdown */}
              <div className="lg:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Select Item <span className="text-red-400">*</span>
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={loadingCatalog || addingLine}
                  className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {filteredCatalogProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.itemType}) — {currencySymbol}{Number(p.basePrice).toFixed(2)} • {p.billingType}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type-Specific Field 1: Variant (for Physical Product) OR Duration/Cycle */}
              {activeProduct?.itemType === 'PHYSICAL_PRODUCT' && activeProduct?.variants?.length > 0 && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                    Product Variant
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    disabled={addingLine}
                    className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Standard / Base</option>
                    {activeProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.attributeName}: {v.attributeValue} (+{currencySymbol}{Number(v.extraPrice).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type-Specific: Warranty Linked Product */}
              {activeProduct?.itemType === 'WARRANTY' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                    Linked Covered Product <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={warrantyLinkedProductId}
                    onChange={(e) => setWarrantyLinkedProductId(e.target.value)}
                    disabled={addingLine || physicalQuoteLines.length === 0}
                    className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  >
                    {physicalQuoteLines.length === 0 ? (
                      <option value="">No physical product on quote</option>
                    ) : (
                      physicalQuoteLines.map((pl) => (
                        <option key={pl.id} value={pl.productId}>
                          {pl.product?.name || pl.productNameSnapshot}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Type-Specific: Subscription Plan selection */}
              {activeProduct?.itemType === 'SUBSCRIPTION' && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                    Recurring Billing Plan
                  </label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                    disabled={addingLine}
                    className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Standard Plan Cycle</option>
                    {subscriptionPlans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} ({plan.billingCycle})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity / Units / Seats */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  {activeProduct?.itemType === 'SERVICE'
                    ? 'Service Hours'
                    : activeProduct?.itemType === 'SUBSCRIPTION'
                    ? 'Seats / Quantity'
                    : 'Quantity'}
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

              {/* Status & Availability Preview */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Inventory / Delivery
                </label>
                <div className="h-[38px] px-3 rounded-xl bg-[#111216] border border-[#24252f] flex items-center text-xs">
                  {activeProduct?.itemType === 'PHYSICAL_PRODUCT' ? (
                    <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1.5">
                      <Box className="w-3.5 h-3.5" />
                      <span>{activeProduct.stockStatus || 'IN_STOCK'}</span>
                    </span>
                  ) : activeProduct?.itemType === 'SERVICE' ? (
                    <span className="font-mono text-[11px] text-blue-400 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      <span>No warehouse stock</span>
                    </span>
                  ) : activeProduct?.itemType === 'WARRANTY' ? (
                    <span className="font-mono text-[11px] text-purple-400 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Coverage attached</span>
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] text-amber-400 flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5" />
                      <span>Recurring Schedule</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Type-Specific Extended Row */}
            {activeProduct?.itemType === 'SERVICE' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#12131b] border border-[#222432]">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-[#888] block">
                    Service Delivery Date
                  </label>
                  <input
                    type="date"
                    value={serviceDeliveryDate}
                    onChange={(e) => setServiceDeliveryDate(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-[#252636] rounded-lg px-2.5 py-1 text-xs text-[#ededed]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-[#888] block">
                    Service Location
                  </label>
                  <input
                    type="text"
                    placeholder="Customer HQ / Onsite..."
                    value={serviceLocation}
                    onChange={(e) => setServiceLocation(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-[#252636] rounded-lg px-2.5 py-1 text-xs text-[#ededed]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-[#888] block">
                    Service Delivery Notes
                  </label>
                  <input
                    type="text"
                    placeholder="Migration scope, backup confirmation..."
                    value={serviceNote}
                    onChange={(e) => setServiceNote(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-[#252636] rounded-lg px-2.5 py-1 text-xs text-[#ededed]"
                  />
                </div>
              </div>
            )}

            {/* Warranty Configuration */}
            {activeProduct?.itemType === 'WARRANTY' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#12131b] border border-[#222432]">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-[#888] block">
                    Coverage Duration
                  </label>
                  <select
                    value={warrantyCoverageDuration}
                    onChange={(e) => setWarrantyCoverageDuration(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-[#252636] rounded-lg px-2.5 py-1 text-xs text-[#ededed]"
                  >
                    <option value="1 Year">1 Year Standard Replacement</option>
                    <option value="2 Years">2 Years Comprehensive Coverage</option>
                    <option value="3 Years">3 Years Extended Enterprise Care</option>
                  </select>
                </div>
                <div className="flex items-center text-xs text-[#a0a2b8] pt-4">
                  <span>Coverage will be officially attached to the covered hardware serial/SKU during fulfillment.</span>
                </div>
              </div>
            )}

            {/* Subscription Configuration */}
            {activeProduct?.itemType === 'SUBSCRIPTION' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[#12131b] border border-[#222432]">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-mono text-[#888] block">
                    Subscription Start Date
                  </label>
                  <input
                    type="date"
                    value={subscriptionStartDate}
                    onChange={(e) => setSubscriptionStartDate(e.target.value)}
                    className="w-full bg-[#0d0e14] border border-[#252636] rounded-lg px-2.5 py-1 text-xs text-[#ededed]"
                  />
                </div>
                <div className="flex items-center text-xs text-[#a0a2b8] pt-4">
                  <span>Recurring billing schedule will be initiated upon quotation confirmation.</span>
                </div>
              </div>
            )}

            {/* Button Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-[#71717a]">
                {parseFloat(inputDiscount) > activeEffectiveLimit && (
                  <span className="text-rose-400 font-mono font-medium flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>+{((parseFloat(inputDiscount) || 0) - activeEffectiveLimit).toFixed(1)}pt over category limit</span>
                  </span>
                )}
              </div>

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
                    <span>Add Item</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Exact Line-Item Table (Product | Qty | Price | Discount | Limit | Status) */}
      <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#1c1c22] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#ededed]">Quotation Line Items</h3>
            <p className="text-[11px] text-[#71717a]">
              Physical Products, Services, Warranties, and Subscriptions with server-authoritative ceilings
            </p>
          </div>
          <span className="text-xs font-mono text-[#71717a]">
            {lineCount} item{lineCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c8c8c2]">
            {/* Columns: Product | Qty | Price | Discount | Limit | Status */}
            <thead className="bg-[#111216] text-[#71717a] font-mono text-[11px] uppercase tracking-wider border-b border-[#1c1c22]">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3 text-center w-36">Qty</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-center w-32">Discount</th>
                <th className="py-3 px-3 text-center">Limit</th>
                <th className="py-3 px-3 text-center">Status</th>
                {canEdit && <th className="py-3 px-3 text-center w-20">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181f]">
              {!hasLines ? (
                /* Initial Empty Item State */
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-14 text-center">
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
                  let statusBadgeStyle = 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50';

                  if (isInvalid) {
                    statusText = 'INVALID';
                    statusBadgeStyle = 'bg-red-950/40 text-red-400 border-red-900/50';
                  } else if (isOverLimit) {
                    statusText = `OVER (+${overBy.toFixed(0)}pt)`;
                    statusBadgeStyle = 'bg-red-950/40 text-red-400 border-red-900/50';
                  } else if (isMarginWarning) {
                    statusText = 'MARGIN WARNING';
                    statusBadgeStyle = 'bg-amber-950/40 text-amber-400 border-amber-900/50';
                  }

                  const lineType = line.itemType || (line.categorySnapshot === 'Services' ? 'SERVICE' : line.categorySnapshot === 'Warranty' ? 'WARRANTY' : line.isRecurring ? 'SUBSCRIPTION' : 'PHYSICAL_PRODUCT');
                  const billingType = line.billingType || (line.isRecurring ? 'Recurring' : 'One-time');

                  return (
                    <tr key={line.id} className="hover:bg-[#111216] transition-colors">
                      {/* Product */}
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-semibold text-[#ededed] flex items-center gap-2">
                          <span>{line.product?.name || line.productNameSnapshot}</span>
                          {/* Small Muted Billing-Type Label */}
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#171822] text-[#888] border border-[#272836]">
                            {billingType}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#71717a] flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[#52525b]">{line.product?.sku}</span>
                          <span>•</span>
                          <span className="text-[#a0a2b8]">{lineType}</span>
                          {line.stockStatus && (
                            <>
                              <span>•</span>
                              <span className={line.stockStatus === 'IN_STOCK' ? 'text-emerald-400' : 'text-amber-400'}>
                                {line.stockStatus}
                              </span>
                            </>
                          )}
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

                      {/* Price (Read-only from server) */}
                      <td className="py-3.5 px-3 text-right font-mono text-xs text-[#ededed]">
                        {currencySymbol}{Number(line.unitPrice).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Discount (Editable) */}
                      <td className="py-3.5 px-3 text-center">
                        {canEdit ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              defaultValue={discPct}
                              onBlur={(e) => handleDiscountChange(line, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.target.blur();
                                }
                              }}
                              className={`w-14 text-center text-xs font-mono py-1 rounded-lg border focus:outline-none transition-colors ${
                                isOverLimit
                                  ? 'bg-red-950/20 border-red-800 text-red-400 focus:border-red-600'
                                  : 'bg-[#111114] border-[#25262e] text-[#ededed] focus:border-[#444]'
                              }`}
                            />
                            <span className="text-[11px] text-[#666]">%</span>
                          </div>
                        ) : (
                          <span className="font-mono text-xs">
                            {discPct.toFixed(0)}%
                          </span>
                        )}
                      </td>

                      {/* Limit (Read-only) */}
                      <td className="py-3.5 px-3 text-center font-mono text-xs text-[#888]">
                        {limitPct.toFixed(0)}%
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${statusBadgeStyle}`}>
                          {!isOverLimit && !isInvalid && <Check className="w-2.5 h-2.5" />}
                          {statusText}
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

      {/* 5. Discount and Limit Behavior: Amber Warning Banner */}
      <div className="p-3.5 rounded-xl bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2.5">
        <AlertTriangle className="w-4 h-4 text-[#eab308] shrink-0" />
        <span>Discount is checked against each line&apos;s own limit live, as soon as it is entered, not only at submit time.</span>
      </div>

      {/* Flagged Line Breakdown Table (if overages exist) */}
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
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">{disc.toFixed(0)}%</td>
                      <td className="py-2.5 px-3 text-right text-[#a0a2b8]">{limit.toFixed(0)}%</td>
                      <td className="py-2.5 px-3 text-right text-rose-400 font-bold">+{overBy.toFixed(0)}pt</td>
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

      {/* 6. Upsell and Cross-Sell Suggestions (Matching Mockup Cards) */}
      {upsellSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-[#ededed]">
                Upsell and Cross-Sell Suggestions
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#52525b]">Live Algorithmic Recommendations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {upsellSuggestions.map((sug) => (
              <div
                key={sug.id}
                className="p-4 rounded-2xl bg-[#0e0f14] border border-[#1e1f28] hover:border-[#2d2f3c] flex flex-col justify-between space-y-3 transition-colors shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#ededed]">
                      + {sug.productName}
                    </h4>
                    {sug.promotionTag?.includes('off') ? (
                      <span className="text-[11px] font-mono font-semibold text-amber-400">
                        Promo: {sug.promotionTag}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono font-semibold text-emerald-400">
                        Margin: +{currencySymbol}{sug.marginDelta ? Number(sug.marginDelta).toFixed(0) : '18'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#71717a] leading-relaxed">
                    {sug.reason}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#18181f]">
                  <span className="font-mono text-xs font-bold text-white">
                    {currencySymbol}{Number(sug.unitPrice).toFixed(0)}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => dismissUpsell(sug.id)}
                      className="px-2 py-1 text-[11px] text-[#666] hover:text-[#999] transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleAddUpsell(sug)}
                        disabled={saving}
                        className="px-3 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add to Quote</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. Economics and Risk Integration */}
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

      {/* 8. Bottom Action Buttons */}
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
                <button
                  type="button"
                  onClick={handleCancelClick}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#888] hover:text-[#ededed] bg-[#12131b] border border-[#202230] transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161722] hover:bg-[#1e202f] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-all cursor-pointer disabled:opacity-50"
                >
                  Save Draft
                </button>

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

      {/* Controlled Change Customer Modal (Draft Only) */}
      {showChangeCustomerModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#22222a] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">Change Customer Account</h3>
              <button
                onClick={() => setShowChangeCustomerModal(false)}
                className="text-[#666] hover:text-[#ededed] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#a1a1aa] leading-relaxed">
              <p>
                Changing the customer account will re-evaluate customer tier ceilings, price list adjustments, line limits, and live margin risk scores across all existing lines.
              </p>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-[#a1a1aa] block">
                  Select Customer Account
                </label>
                <select
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                  className="w-full text-xs bg-[#111216] border border-[#24252f] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  {allCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.tier} Tier) — {c.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowChangeCustomerModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#888] hover:text-[#ededed] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangeCustomer}
                disabled={changingCustomer}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {changingCustomer ? <Spinner size="sm" /> : <UserCheck className="w-3.5 h-3.5" />}
                <span>Update Customer &amp; Revalidate</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              You have modified quotation parameters without saving. Returning now will discard your pending edits.
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
