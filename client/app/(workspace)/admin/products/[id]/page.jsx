'use client';

import React, { useState, useEffect, useMemo, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Trash2,
  Plus,
  Check,
  AlertTriangle,
  Layers,
  DollarSign,
  Tag,
  Package,
  Boxes,
  HelpCircle,
  ExternalLink,
  Edit2,
  X,
  RefreshCw,
  Clock,
  ShieldAlert,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = ['HARDWARE', 'SERVICES', 'SUBSCRIPTION'];
const BILLING_CYCLES = ['MONTHLY', 'QUARTERLY', 'YEARLY'];

export default function ProductDetailPage({ params }) {
  // Unwrap params using React.use for Next.js 15+ compatibility
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Core Product State
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category: 'HARDWARE',
    basePrice: '0.00',
    baseCost: '0.00',
    unit: 'UNIT',
    taxPercent: '0.00',
    description: '',
    isRecurringEligible: false,
    isActive: true,
  });

  // Billing Cycle state (for recurring subscriptions)
  const [billingCycle, setBillingCycle] = useState('MONTHLY');

  // Variants State
  const [variants, setVariants] = useState([]);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [variantForm, setVariantForm] = useState({
    attributeName: '',
    attributeValue: '',
    skuSuffix: '',
    extraPrice: '0.00',
  });
  const [editingVariantId, setEditingVariantId] = useState(null);
  const [editingVariantForm, setEditingVariantForm] = useState({});
  const [variantActionLoading, setVariantActionLoading] = useState(null);

  // Pricelists State
  const [priceLists, setPriceLists] = useState([]);
  const [priceListRowStates, setPriceListRowStates] = useState({}); // { [priceListId]: { unitPrice, minQuantity, saving: bool, saved: bool, existingItemId: string | null } }

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Show Toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Fetch Product & Pricelists
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Product
      const prodRes = await api.get(`/admin/products/${productId}`);
      const p = prodRes.data;
      setProduct(p);

      setForm({
        name: p.name || '',
        sku: p.sku || '',
        category: p.category || 'HARDWARE',
        basePrice: p.basePrice !== undefined ? String(p.basePrice) : '0.00',
        baseCost: p.baseCost !== undefined ? String(p.baseCost) : '0.00',
        unit: p.unit || 'UNIT',
        taxPercent: p.taxPercent !== undefined ? String(p.taxPercent) : '0.00',
        description: p.description || '',
        isRecurringEligible: Boolean(p.isRecurringEligible || p.category === 'SUBSCRIPTION'),
        isActive: p.isActive !== false,
      });

      setVariants(p.variants || []);

      // Fetch PriceLists
      const plRes = await api.get('/admin/pricelists?limit=100');
      const allPriceLists = plRes.data?.items || plRes.data || [];
      setPriceLists(allPriceLists);

      // Map existing price rules for this product
      const rowStateMap = {};
      allPriceLists.forEach((pl) => {
        const item = pl.items?.find((i) => i.productId === productId);
        rowStateMap[pl.id] = {
          unitPrice: item ? String(item.unitPrice || item.customPrice || '0.00') : String(p.basePrice || '0.00'),
          minQuantity: item ? String(item.minQuantity || '1') : '1',
          hasOverride: Boolean(item),
          existingItemId: item ? item.id : null,
          saving: false,
          saved: false,
        };
      });
      setPriceListRowStates(rowStateMap);
    } catch (err) {
      console.error('Failed to load product detail:', err);
      setError(err.message || 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  // Handle General Info Submit
  const handleSaveProduct = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
        category: form.category,
        basePrice: parseFloat(form.basePrice) || 0,
        baseCost: parseFloat(form.baseCost) || 0,
        unit: form.unit.trim().toUpperCase(),
        taxPercent: parseFloat(form.taxPercent) || 0,
        description: form.description?.trim() || null,
        isRecurringEligible: form.category === 'SUBSCRIPTION' ? true : form.isRecurringEligible,
        isActive: form.isActive,
      };

      const res = await api.patch(`/admin/products/${productId}`, payload);
      setProduct(res.data);
      showToast('Product settings successfully updated.');
    } catch (err) {
      console.error('Save product error:', err);
      setError(err.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  // Add Variant
  const handleCreateVariant = async (e) => {
    e.preventDefault();
    if (!variantForm.attributeName || !variantForm.attributeValue || !variantForm.skuSuffix) {
      setError('Please provide Attribute, Value, and unique SKU suffix.');
      return;
    }

    try {
      setVariantActionLoading('new');
      const payload = {
        attributeName: variantForm.attributeName.trim(),
        attributeValue: variantForm.attributeValue.trim(),
        skuSuffix: variantForm.skuSuffix.trim().toUpperCase(),
        extraPrice: parseFloat(variantForm.extraPrice) || 0,
      };

      const res = await api.post(`/admin/products/${productId}/variants`, payload);
      setVariants((prev) => [...prev, res.data]);
      setIsAddingVariant(false);
      setVariantForm({
        attributeName: '',
        attributeValue: '',
        skuSuffix: '',
        extraPrice: '0.00',
      });
      showToast('Variant successfully added.');
    } catch (err) {
      console.error('Create variant error:', err);
      setError(err.message || 'Failed to create variant');
    } finally {
      setVariantActionLoading(null);
    }
  };

  // Update Variant
  const handleSaveEditingVariant = async (variantId) => {
    try {
      setVariantActionLoading(variantId);
      const v = editingVariantForm[variantId];
      const payload = {
        attributeName: v.attributeName,
        attributeValue: v.attributeValue,
        skuSuffix: v.skuSuffix,
        extraPrice: parseFloat(v.extraPrice) || 0,
      };

      const res = await api.patch(`/admin/products/${productId}/variants/${variantId}`, payload);
      setVariants((prev) => prev.map((item) => (item.id === variantId ? res.data : item)));
      setEditingVariantId(null);
      showToast('Variant updated successfully.');
    } catch (err) {
      console.error('Update variant error:', err);
      setError(err.message || 'Failed to update variant');
    } finally {
      setVariantActionLoading(null);
    }
  };

  // Delete Variant
  const handleDeleteVariant = async (variantId) => {
    if (!confirm('Are you sure you want to remove this variant?')) return;
    try {
      setVariantActionLoading(variantId);
      await api.delete(`/admin/products/${productId}/variants/${variantId}`);
      setVariants((prev) => prev.filter((v) => v.id !== variantId));
      showToast('Variant removed.');
    } catch (err) {
      console.error('Delete variant error:', err);
      setError(err.message || 'Failed to delete variant');
    } finally {
      setVariantActionLoading(null);
    }
  };

  // Save Pricelist Row
  const handleSavePriceListRow = async (priceListId) => {
    const row = priceListRowStates[priceListId];
    if (!row) return;

    setPriceListRowStates((prev) => ({
      ...prev,
      [priceListId]: { ...prev[priceListId], saving: true },
    }));

    try {
      const unitPrice = parseFloat(row.unitPrice);
      const minQty = parseInt(row.minQuantity, 10) || 1;

      if (row.existingItemId) {
        // Update existing item
        await api.patch(`/admin/pricelists/${priceListId}/items/${row.existingItemId}`, {
          unitPrice,
          minQuantity: minQty,
        });
      } else {
        // Create new item in pricelist
        const res = await api.post(`/admin/pricelists/${priceListId}/items`, {
          productId,
          unitPrice,
          minQuantity: minQty,
        });
        setPriceListRowStates((prev) => ({
          ...prev,
          [priceListId]: {
            ...prev[priceListId],
            existingItemId: res.data.id,
            hasOverride: true,
          },
        }));
      }

      // Indicate saved with checkmark
      setPriceListRowStates((prev) => ({
        ...prev,
        [priceListId]: {
          ...prev[priceListId],
          saving: false,
          saved: true,
          hasOverride: true,
        },
      }));

      showToast('Pricelist rule saved.');
      setTimeout(() => {
        setPriceListRowStates((prev) => ({
          ...prev,
          [priceListId]: { ...prev[priceListId], saved: false },
        }));
      }, 3000);
    } catch (err) {
      console.error('Save pricelist row error:', err);
      setError(err.message || 'Failed to save pricelist item');
      setPriceListRowStates((prev) => ({
        ...prev,
        [priceListId]: { ...prev[priceListId], saving: false },
      }));
    }
  };

  // Remove Pricelist Row Rule
  const handleRemovePriceListRule = async (priceListId) => {
    const row = priceListRowStates[priceListId];
    if (!row || !row.existingItemId) return;

    if (!confirm('Remove this product override from this price list?')) return;

    setPriceListRowStates((prev) => ({
      ...prev,
      [priceListId]: { ...prev[priceListId], saving: true },
    }));

    try {
      await api.delete(`/admin/pricelists/${priceListId}/items/${row.existingItemId}`);
      setPriceListRowStates((prev) => ({
        ...prev,
        [priceListId]: {
          ...prev[priceListId],
          existingItemId: null,
          hasOverride: false,
          unitPrice: String(product?.basePrice || '0.00'),
          saving: false,
          saved: false,
        },
      }));
      showToast('Pricelist override removed.');
    } catch (err) {
      console.error('Remove pricelist rule error:', err);
      setError(err.message || 'Failed to remove pricelist rule');
      setPriceListRowStates((prev) => ({
        ...prev,
        [priceListId]: { ...prev[priceListId], saving: false },
      }));
    }
  };

  // Soft Delete Product
  const handleDeleteProduct = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await api.delete(`/admin/products/${productId}`);
      router.push('/admin/products');
    } catch (err) {
      console.error('Delete product error:', err);
      setDeleteError(err.message || 'Cannot delete product due to active stock or quotation lines.');
      setDeleting(false);
    }
  };

  // Calculate Total On Hand Inventory across warehouses
  const totalStockOnHand = useMemo(() => {
    if (!product?.stockLevels) return 0;
    return product.stockLevels.reduce((acc, curr) => acc + (Number(curr.quantityOnHand) || 0), 0);
  }, [product]);

  const totalStockReserved = useMemo(() => {
    if (!product?.stockLevels) return 0;
    return product.stockLevels.reduce((acc, curr) => acc + (Number(curr.quantityReserved) || 0), 0);
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm text-[#888]">
          <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
          Loading product details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#e0e0e0] antialiased">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#121319] border border-[#2b2d3d] text-white px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-3 duration-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ═══════════════ TOP BREADCRUMB & HEADER ═══════════════ */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#181920] pb-6">
          <div className="space-y-2">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors group"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to Products</span>
            </Link>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-white">{product?.name || form.name}</h1>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#16171f] border border-[#252736] text-[#9ca3af]">
                {product?.sku || form.sku}
              </span>

              {/* Category Pill */}
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  form.category === 'HARDWARE'
                    ? 'bg-[#092317] text-[#34d399] border-[#134e2c]'
                    : form.category === 'SERVICES'
                    ? 'bg-[#0f2137] text-[#60a5fa] border-[#1e3a5f]'
                    : 'bg-[#241334] text-[#c084fc] border-[#4c246f]'
                }`}
              >
                {form.category}
              </span>

              {/* Status Pill */}
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  form.isActive
                    ? 'bg-[#102316] text-[#4ade80] border-[#1d4227]'
                    : 'bg-[#1f1618] text-[#f87171] border-[#451f24]'
                }`}
              >
                {form.isActive ? 'Active' : 'Archived'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="h-9 px-3 rounded-lg border border-[#28181c] bg-[#170e10] hover:bg-[#261317] text-xs font-medium text-[#fb7185] transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Product</span>
            </button>

            <button
              type="button"
              onClick={handleSaveProduct}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-[#231215] border border-[#481c23] text-[#fb7185] text-xs flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-[#fb7185]/70 hover:text-[#fb7185]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═══════════════ AMBER NOTIFICATION BANNER (MOCKUP-FAITHFUL) ═══════════════ */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[#1c1508] border border-[#422e11] text-[#f59e0b] text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#f59e0b]" />
          <p className="leading-relaxed font-normal">
            Product details should be filled. Recurring order will all be involved at the beginning of the period.
          </p>
        </div>

        {/* ═══════════════ SECTION 1: GENERAL INFORMATION ═══════════════ */}
        <div className="bg-[#0e0f14] border border-[#1d1f2b] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#181924] pb-4 mb-5">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-[#888]" />
              <h2 className="text-sm font-semibold text-white">General Information</h2>
            </div>
            <span className="text-[11px] text-[#71717a]">SKU ID: {product?.id}</span>
          </div>

          <form onSubmit={handleSaveProduct} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">
                    Product Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">
                    SKU Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-colors uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">
                      Category <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) => {
                        const nextCat = e.target.value;
                        setForm({
                          ...form,
                          category: nextCat,
                          isRecurringEligible: nextCat === 'SUBSCRIPTION' ? true : form.isRecurringEligible,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">Unit of Measure</label>
                    <input
                      type="text"
                      value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="UNIT, SEAT, HOUR..."
                      className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-colors uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">Product Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide technical specifications, line-item copy, and notes..."
                    className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-white placeholder-[#555] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">
                      Base Price ($) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={form.basePrice}
                      onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">
                      Base Cost ($) <span className="text-[#555] font-normal">(Internal)</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.baseCost}
                      onChange={(e) => setForm({ ...form, baseCost: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">
                      Tax Rate (%) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={form.taxPercent}
                      onChange={(e) => setForm({ ...form, taxPercent: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] font-mono text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-[#a1a1aa] mb-1.5">Catalog Status</label>
                    <select
                      value={form.isActive ? 'true' : 'false'}
                      onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                      className="w-full px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] text-white focus:outline-none focus:border-[#3b82f6] transition-colors"
                    >
                      <option value="true">Active in Catalog</option>
                      <option value="false">Archived / Hidden</option>
                    </select>
                  </div>
                </div>

                {/* ══════ SUBSCRIPTION / RECURRING CONTROLS (SMOOTH TOGGLE) ══════ */}
                <div className="pt-2 border-t border-[#181924]">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-[12px] font-medium text-white">Subscription & Recurring Billing</div>
                      <div className="text-[11px] text-[#71717a]">
                        Enable automated billing cycle renewals and recurring schedule generation
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isRecurringEligible || form.category === 'SUBSCRIPTION'}
                        onChange={(e) => setForm({ ...form, isRecurringEligible: e.target.checked })}
                        disabled={form.category === 'SUBSCRIPTION'}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-[#252838] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2563eb]"></div>
                    </label>
                  </div>

                  {/* Billing Cycle Options (Conditional without layout breaking) */}
                  {(form.isRecurringEligible || form.category === 'SUBSCRIPTION') && (
                    <div className="mt-3 p-3.5 rounded-xl bg-[#12141c] border border-[#202230] space-y-3 animate-in fade-in duration-150">
                      <div className="text-[11px] font-medium text-[#93c5fd] flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Recurring Invoicing Schedule</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {BILLING_CYCLES.map((cycle) => (
                          <button
                            type="button"
                            key={cycle}
                            onClick={() => setBillingCycle(cycle)}
                            className={`py-1.5 px-2 text-center rounded-lg text-xs font-medium border transition-colors ${
                              billingCycle === cycle
                                ? 'bg-[#1e293b] border-[#3b82f6] text-white'
                                : 'bg-[#161722] border-[#252738] text-[#888] hover:text-white'
                            }`}
                          >
                            {cycle}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-[#71717a]">
                        Subscriptions will be invoiced automatically at the start of each {billingCycle.toLowerCase()}{' '}
                        period.
                      </p>
                    </div>
                  )}

                  {/* Inventory Summary for Hardware */}
                  {form.category === 'HARDWARE' && (
                    <div className="mt-3 p-3 rounded-xl bg-[#12141c] border border-[#202230] flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-3.5 h-3.5 text-[#34d399]" />
                        <span className="text-[#a1a1aa]">Warehouse Stock:</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-white font-semibold">{totalStockOnHand} on hand</span>
                        <span className="text-[#888]">({totalStockReserved} reserved)</span>
                        <span className="text-[#34d399] font-semibold">
                          {Math.max(0, totalStockOnHand - totalStockReserved)} available
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-[#181924]">
              <button
                type="submit"
                disabled={saving}
                className="h-8 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save General Info'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ═══════════════ SECTION 2: PRODUCT VARIANTS TABLE ═══════════════ */}
        <div className="bg-[#0e0f14] border border-[#1d1f2b] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#181924] pb-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#888]" />
                <h2 className="text-sm font-semibold text-white">Product Variants</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#161722] border border-[#242637] text-[#9ca3af]">
                  {variants.length}
                </span>
              </div>
              <p className="text-[11px] text-[#71717a]">
                Configure product SKUs with attribute options, memory, colors, and extra price surcharges.
              </p>
            </div>

            {!isAddingVariant && (
              <button
                type="button"
                onClick={() => setIsAddingVariant(true)}
                className="h-8 px-3 rounded-lg bg-[#161722] hover:bg-[#202230] border border-[#26283a] text-xs font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            )}
          </div>

          {/* Add Variant Form (Inline) */}
          {isAddingVariant && (
            <div className="mb-4 p-4 rounded-xl bg-[#12141d] border border-[#232638] animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">New Variant Specification</span>
                <button
                  type="button"
                  onClick={() => setIsAddingVariant(false)}
                  className="text-[#888] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateVariant} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-[#888] mb-1">Attribute Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Memory, Color, License"
                    value={variantForm.attributeName}
                    onChange={(e) => setVariantForm({ ...variantForm, attributeName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#181a24] border border-[#2b2e42] text-white focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#888] mb-1">Attribute Value</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 32GB RAM, Space Gray"
                    value={variantForm.attributeValue}
                    onChange={(e) => setVariantForm({ ...variantForm, attributeValue: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#181a24] border border-[#2b2e42] text-white focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#888] mb-1">SKU Suffix</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 32GB, SG"
                    value={variantForm.skuSuffix}
                    onChange={(e) => setVariantForm({ ...variantForm, skuSuffix: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#181a24] border border-[#2b2e42] font-mono text-white focus:outline-none focus:border-[#3b82f6] uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#888] mb-1">Price Delta ($)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={variantForm.extraPrice}
                      onChange={(e) => setVariantForm({ ...variantForm, extraPrice: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#181a24] border border-[#2b2e42] font-mono text-white focus:outline-none focus:border-[#3b82f6]"
                    />
                    <button
                      type="submit"
                      disabled={variantActionLoading === 'new'}
                      className="h-8 px-3 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-xs whitespace-nowrap disabled:opacity-50"
                    >
                      {variantActionLoading === 'new' ? 'Saving...' : 'Add'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Variants Table */}
          {variants.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71717a] border border-dashed border-[#202230] rounded-xl">
              No product variants configured yet. Click &quot;Add Variant&quot; above to create size, memory, or tier
              options.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1b1c27] rounded-xl">
              <table className="w-full text-left text-xs text-[#a1a1aa]">
                <thead className="bg-[#12131b] border-b border-[#1b1c27] text-[#71717a] uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Attribute Name</th>
                    <th className="py-2.5 px-4">Attribute Value</th>
                    <th className="py-2.5 px-4">SKU Suffix</th>
                    <th className="py-2.5 px-4 text-right">Extra Surcharge</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181924]">
                  {variants.map((v) => {
                    const isEditing = editingVariantId === v.id;
                    const editData = editingVariantForm[v.id] || v;

                    return (
                      <tr key={v.id} className="hover:bg-[#12131c]/60 transition-colors">
                        <td className="py-2.5 px-4 text-white font-medium">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.attributeName}
                              onChange={(e) =>
                                setEditingVariantForm({
                                  ...editingVariantForm,
                                  [v.id]: { ...editData, attributeName: e.target.value },
                                })
                              }
                              className="px-2 py-1 rounded bg-[#161822] border border-[#2b2e40] text-xs text-white"
                            />
                          ) : (
                            v.attributeName
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-[#d1d5db]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.attributeValue}
                              onChange={(e) =>
                                setEditingVariantForm({
                                  ...editingVariantForm,
                                  [v.id]: { ...editData, attributeValue: e.target.value },
                                })
                              }
                              className="px-2 py-1 rounded bg-[#161822] border border-[#2b2e40] text-xs text-white"
                            />
                          ) : (
                            v.attributeValue
                          )}
                        </td>

                        <td className="py-2.5 px-4 font-mono text-[#9ca3af]">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.skuSuffix}
                              onChange={(e) =>
                                setEditingVariantForm({
                                  ...editingVariantForm,
                                  [v.id]: { ...editData, skuSuffix: e.target.value },
                                })
                              }
                              className="px-2 py-1 rounded bg-[#161822] border border-[#2b2e40] font-mono text-xs text-white uppercase"
                            />
                          ) : (
                            v.skuSuffix
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-right font-mono text-white">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editData.extraPrice}
                              onChange={(e) =>
                                setEditingVariantForm({
                                  ...editingVariantForm,
                                  [v.id]: { ...editData, extraPrice: e.target.value },
                                })
                              }
                              className="w-24 px-2 py-1 rounded bg-[#161822] border border-[#2b2e40] font-mono text-xs text-white text-right"
                            />
                          ) : (
                            `+$${parseFloat(String(v.extraPrice || 0)).toFixed(2)}`
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditingVariant(v.id)}
                                  disabled={variantActionLoading === v.id}
                                  className="p-1.5 rounded-lg bg-[#2563eb] text-white hover:bg-[#1d4ed8] transition-colors"
                                  title="Save Changes"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingVariantId(null)}
                                  className="p-1.5 rounded-lg bg-[#1a1b24] text-[#888] hover:text-white transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVariantId(v.id);
                                    setEditingVariantForm({
                                      ...editingVariantForm,
                                      [v.id]: {
                                        attributeName: v.attributeName,
                                        attributeValue: v.attributeValue,
                                        skuSuffix: v.skuSuffix,
                                        extraPrice: String(v.extraPrice || '0.00'),
                                      },
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-[#888] hover:text-white hover:bg-[#1c1e2a] transition-colors"
                                  title="Edit Variant"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteVariant(v.id)}
                                  disabled={variantActionLoading === v.id}
                                  className="p-1.5 rounded-lg text-[#fb7185] hover:bg-[#281318] transition-colors"
                                  title="Delete Variant"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ═══════════════ SECTION 3: PRICELIST & TIER OVERRIDES TABLE ═══════════════ */}
        <div className="bg-[#0e0f14] border border-[#1d1f2b] rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#181924] pb-4 mb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#888]" />
                <h2 className="text-sm font-semibold text-white">Price Lists & Tier Overrides</h2>
              </div>
              <p className="text-[11px] text-[#71717a]">
                Override unit pricing per tier or contract. Edits are saved on a row-by-row basis.
              </p>
            </div>
          </div>

          {priceLists.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#71717a] border border-dashed border-[#202230] rounded-xl">
              No price lists configured in system. Go to Pricelists admin to create customer tiers.
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#1b1c27] rounded-xl">
              <table className="w-full text-left text-xs text-[#a1a1aa]">
                <thead className="bg-[#12131b] border-b border-[#1b1c27] text-[#71717a] uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Price List Name</th>
                    <th className="py-2.5 px-4">Tier</th>
                    <th className="py-2.5 px-4">Currency</th>
                    <th className="py-2.5 px-4">Unit Price ($)</th>
                    <th className="py-2.5 px-4">Min Qty</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Row Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181924]">
                  {priceLists.map((pl) => {
                    const row = priceListRowStates[pl.id] || {
                      unitPrice: String(product?.basePrice || '0.00'),
                      minQuantity: '1',
                      hasOverride: false,
                      saving: false,
                      saved: false,
                    };

                    return (
                      <tr key={pl.id} className="hover:bg-[#12131c]/60 transition-colors">
                        <td className="py-2.5 px-4 text-white font-medium">
                          <div>{pl.name}</div>
                          {pl.pricingRule && <div className="text-[10px] text-[#71717a]">{pl.pricingRule}</div>}
                        </td>

                        <td className="py-2.5 px-4">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              pl.customerTier === 'PLATINUM'
                                ? 'bg-[#181329] text-[#c084fc] border-[#381e5b]'
                                : pl.customerTier === 'GOLD'
                                ? 'bg-[#221c09] text-[#fbbf24] border-[#4b3e15]'
                                : pl.customerTier === 'SILVER'
                                ? 'bg-[#161a22] text-[#94a3b8] border-[#293548]'
                                : 'bg-[#1e1511] text-[#fb923c] border-[#452718]'
                            }`}
                          >
                            {pl.customerTier}
                          </span>
                        </td>

                        <td className="py-2.5 px-4 font-mono text-[#9ca3af]">{pl.currency || 'USD'}</td>

                        <td className="py-2.5 px-4">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.unitPrice}
                            onChange={(e) =>
                              setPriceListRowStates({
                                ...priceListRowStates,
                                [pl.id]: { ...row, unitPrice: e.target.value },
                              })
                            }
                            className="w-28 px-2 py-1 rounded bg-[#161822] border border-[#2b2e40] font-mono text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                          />
                        </td>

                        <td className="py-2.5 px-4">
                          <input
                            type="number"
                            step="1"
                            min="1"
                            value={row.minQuantity}
                            onChange={(e) =>
                              setPriceListRowStates({
                                ...priceListRowStates,
                                [pl.id]: { ...row, minQuantity: e.target.value },
                              })
                            }
                            className="w-16 px-2 py-1 rounded bg-[#161822] border border-[#2b2e40] font-mono text-xs text-white focus:outline-none focus:border-[#3b82f6]"
                          />
                        </td>

                        <td className="py-2.5 px-4">
                          {row.hasOverride ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#34d399]">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Custom Override</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#71717a]">Default Base</span>
                          )}
                        </td>

                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSavePriceListRow(pl.id)}
                              disabled={row.saving}
                              className={`h-7 px-3 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer ${
                                row.saved
                                  ? 'bg-[#10b981] text-white'
                                  : 'bg-[#1f293d] hover:bg-[#2563eb] text-[#93c5fd] hover:text-white border border-[#2d3748]'
                              }`}
                            >
                              {row.saving ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : row.saved ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Saved</span>
                                </>
                              ) : (
                                <span>Save</span>
                              )}
                            </button>

                            {row.hasOverride && (
                              <button
                                type="button"
                                onClick={() => handleRemovePriceListRule(pl.id)}
                                disabled={row.saving}
                                className="h-7 px-2 rounded-lg text-[#fb7185] hover:bg-[#281318] border border-transparent hover:border-[#481c23] transition-colors"
                                title="Remove Override"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════ MODAL: DELETE PRODUCT CONFIRMATION ═══════════════ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0f14] border border-[#282936] rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#fb7185] mb-3">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-white">Delete Product Confirmation</h4>
            </div>

            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
              Are you sure you want to soft-delete <strong className="text-white">{product?.name}</strong> (
              {product?.sku})?
              If this product has active warehouse stock or pending quotation dependencies, deletion will be guarded.
            </p>

            {deleteError && (
              <div className="mb-4 p-3 rounded-xl bg-[#231215] border border-[#481c23] text-[#fb7185] text-xs">
                <div className="font-semibold mb-1">Deletion Blocked:</div>
                <div>{deleteError}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a1b24]">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteError(null);
                }}
                className="h-8 px-3 rounded-lg border border-[#24252f] text-xs font-medium text-[#888] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={deleting}
                className="h-8 px-3.5 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-xs font-semibold text-white transition-all cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
