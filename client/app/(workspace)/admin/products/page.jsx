'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { Button, Input, Badge, Modal, Spinner, EmptyState } from '../../../../components/ui';
import { 
  Package, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Tag, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit2
} from 'lucide-react';

export default function AdminProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedRow, setExpandedRow] = useState(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [activeProductId, setActiveProductId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'Hardware',
    basePrice: '',
    baseCost: '',
    unit: 'UNIT',
    taxPercent: '0',
    description: '',
    isRecurringEligible: false,
  });

  const [variantForm, setVariantForm] = useState({
    attributeName: 'Configuration',
    attributeValue: '',
    extraPrice: '0',
    skuSuffix: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/admin/products');
      if (res?.data?.items) {
        setProducts(res.data.items);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.post('/admin/products', {
        ...productForm,
        basePrice: parseFloat(productForm.basePrice),
        baseCost: parseFloat(productForm.baseCost || 0),
        taxPercent: parseFloat(productForm.taxPercent || 0),
      });
      setIsProductModalOpen(false);
      setProductForm({
        name: '',
        sku: '',
        category: 'Hardware',
        basePrice: '',
        baseCost: '',
        unit: 'UNIT',
        taxPercent: '0',
        description: '',
        isRecurringEligible: false,
      });
      await fetchProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVariant = async (e) => {
    e.preventDefault();
    if (!activeProductId) return;
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.post(`/admin/products/${activeProductId}/variants`, {
        ...variantForm,
        extraPrice: parseFloat(variantForm.extraPrice || 0),
      });
      setIsVariantModalOpen(false);
      setVariantForm({
        attributeName: 'Configuration',
        attributeValue: '',
        extraPrice: '0',
        skuSuffix: '',
      });
      await fetchProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create variant');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Products & Catalog Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage base items, SKU pricing rules, units of measure, and product variants.
          </p>
        </div>

        {isAdmin && (
          <Button 
            onClick={() => { setErrorMsg(null); setIsProductModalOpen(true); }}
            className="flex items-center gap-1.5 shadow-sm text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            New Product
          </Button>
        )}
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-12">
            <EmptyState
              title="No products found"
              description="No products match your filter criteria. Create a new product to populate the catalog."
            />
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4">SKU / Product Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Base Price</th>
                <th className="py-3 px-4 text-right">Base Cost</th>
                <th className="py-3 px-4 text-center">Tax</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProducts.map((p) => {
                const isExpanded = expandedRow === p.id;
                const margin = p.basePrice > 0 ? (((p.basePrice - p.baseCost) / p.basePrice) * 100).toFixed(0) : 0;

                return (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="font-mono text-[11px] text-blue-600 mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                        ${Number(p.basePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        ${Number(p.baseCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="ml-1.5 text-[10px] text-emerald-600 font-sans">({margin}% mrg)</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600">
                        {p.taxPercent}%
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {p.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={p.isActive ? 'success' : 'neutral'} size="sm">
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setActiveProductId(p.id);
                              setErrorMsg(null);
                              setIsVariantModalOpen(true);
                            }}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            + Variant
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Variants Drawer */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-y border-slate-200">
                        <td colSpan="9" className="py-3 px-8">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-blue-600" />
                                Product Variants ({p.variants?.length || 0})
                              </span>
                            </div>

                            {(!p.variants || p.variants.length === 0) ? (
                              <p className="text-xs text-slate-400 italic py-1">
                                No variants configured for this product. Use &quot;+ Variant&quot; to configure colors, sizes, or specs.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                {p.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="bg-white border border-slate-200 p-2.5 rounded-lg shadow-2xs flex items-center justify-between text-xs"
                                  >
                                    <div>
                                      <div className="font-medium text-slate-800">
                                        <span className="text-slate-400 font-normal">{v.attributeName}:</span> {v.attributeValue}
                                      </div>
                                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                                        Suffix: <span className="text-slate-700 font-semibold">{v.skuSuffix}</span>
                                      </div>
                                    </div>
                                    <div className="text-right font-mono font-semibold text-emerald-700">
                                      +${Number(v.extraPrice).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: New Product */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Add New Catalog Product"
      >
        <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Product Name *</label>
              <Input
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="e.g. ThinkPad Ultra 16"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">SKU (Unique) *</label>
              <Input
                required
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="e.g. HW-TP-16"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Category *</label>
              <select
                value={productForm.category}
                onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Hardware">Hardware</option>
                <option value="Services">Services</option>
                <option value="Software">Software</option>
                <option value="Accessories">Accessories</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Unit of Measure</label>
              <Input
                value={productForm.unit}
                onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                placeholder="UNIT, HOUR, MONTH"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Base Price ($) *</label>
              <Input
                required
                type="number"
                step="0.01"
                value={productForm.basePrice}
                onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                placeholder="1499.00"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Base Cost ($)</label>
              <Input
                type="number"
                step="0.01"
                value={productForm.baseCost}
                onChange={(e) => setProductForm({ ...productForm, baseCost: e.target.value })}
                placeholder="950.00"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Tax Percent (%)</label>
              <Input
                type="number"
                step="0.01"
                value={productForm.taxPercent}
                onChange={(e) => setProductForm({ ...productForm, taxPercent: e.target.value })}
                placeholder="8.5"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows="2"
              value={productForm.description}
              onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enterprise specification details..."
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="recurring"
              checked={productForm.isRecurringEligible}
              onChange={(e) => setProductForm({ ...productForm, isRecurringEligible: e.target.checked })}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="recurring" className="text-xs text-slate-700 font-medium">
              Eligible for Recurring / Subscription Billing
            </label>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Product
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: New Variant */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title="Add Product Variant"
      >
        <form onSubmit={handleCreateVariant} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Attribute Name *</label>
              <Input
                required
                value={variantForm.attributeName}
                onChange={(e) => setVariantForm({ ...variantForm, attributeName: e.target.value })}
                placeholder="e.g. Memory, Color, Screen"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Attribute Value *</label>
              <Input
                required
                value={variantForm.attributeValue}
                onChange={(e) => setVariantForm({ ...variantForm, attributeValue: e.target.value })}
                placeholder="e.g. 32GB RAM, Space Gray"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">SKU Suffix (Unique) *</label>
              <Input
                required
                value={variantForm.skuSuffix}
                onChange={(e) => setVariantForm({ ...variantForm, skuSuffix: e.target.value })}
                placeholder="e.g. 32GB or SG"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Price Delta / Extra ($)</label>
              <Input
                type="number"
                step="0.01"
                value={variantForm.extraPrice}
                onChange={(e) => setVariantForm({ ...variantForm, extraPrice: e.target.value })}
                placeholder="150.00"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsVariantModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Add Variant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
