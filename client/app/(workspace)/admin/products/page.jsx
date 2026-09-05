'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Package, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  X
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
  const [successMsg, setSuccessMsg] = useState(null);

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
      setSuccessMsg('Product created successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
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
      setSuccessMsg('Variant added successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed] flex items-center gap-2.5">
            <Package className="w-5 h-5 text-[#3b82f6]" />
            Products & Catalog
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Enterprise products, variants, SKU specifications, and cost margins
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => { setErrorMsg(null); setIsProductModalOpen(true); }}
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Product</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-[#180e10] border border-[#3b191c] rounded-xl flex items-center gap-2 text-[#f87171] text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#0d1612] border border-[#16382a] rounded-xl flex items-center gap-2 text-[#34d399] text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filters & Search in Linear Style */}
      <div className="bg-[#0b0c0e] p-3.5 rounded-2xl border border-[#1c1c22] flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#111216] border border-[#222228] text-[#ededed] placeholder-[#555] rounded-lg focus:outline-none focus:border-[#444] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-[#555] font-medium mr-1">Category:</span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-[#18181b] text-white border border-[#2e2e34]'
                  : 'text-[#71717a] hover:text-[#d4d4cf] hover:bg-[#121318]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <span className="text-xs text-[#555] font-mono">Loading catalog products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#555]">
            No products match the selected filters.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0f1014] border-b border-[#1c1c22] text-[#71717a] font-mono uppercase tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-[#16161b] text-[#a1a1aa]">
              {filteredProducts.map((p) => {
                const isExpanded = expandedRow === p.id;
                const margin = p.basePrice > 0 ? (((p.basePrice - p.baseCost) / p.basePrice) * 100).toFixed(0) : 0;

                return (
                  <React.Fragment key={p.id}>
                    <tr className="hover:bg-[#111216] transition-colors">
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : p.id)}
                          className="text-[#555] hover:text-[#ededed] p-0.5 rounded transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#ededed]">{p.name}</div>
                        <div className="font-mono text-[11px] text-[#3b82f6] mt-0.5">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-[#14151b] text-[#a1a1aa] border border-[#222228]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#ededed]">
                        ${Number(p.basePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#71717a]">
                        ${Number(p.baseCost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="ml-1.5 text-[10px] text-[#10b981] font-sans">({margin}% mrg)</span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[#71717a]">
                        {p.taxPercent}%
                      </td>
                      <td className="py-3 px-4 text-center text-[#71717a] font-mono">
                        {p.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                          p.isActive ? 'bg-[#0f1914] text-[#34d399] border border-[#16382a]' : 'bg-[#18181b] text-[#71717a]'
                        }`}>
                          {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setActiveProductId(p.id);
                              setErrorMsg(null);
                              setIsVariantModalOpen(true);
                            }}
                            className="text-xs font-semibold text-[#3b82f6] hover:text-[#60a5fa] transition-colors"
                          >
                            + Variant
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expandable Variants Drawer in Linear Dark Theme */}
                    {isExpanded && (
                      <tr className="bg-[#0e0f13] border-y border-[#1c1c22]">
                        <td colSpan="9" className="py-4 px-8">
                          <div className="space-y-2.5">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#3b82f6]" />
                              Product Variants ({p.variants?.length || 0})
                            </span>

                            {(!p.variants || p.variants.length === 0) ? (
                              <p className="text-xs text-[#52525b] italic py-1">
                                No variants configured for this product. Use &quot;+ Variant&quot; to configure colors, sizes, or specs.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                                {p.variants.map((v) => (
                                  <div
                                    key={v.id}
                                    className="bg-[#131418] border border-[#222228] p-3 rounded-xl flex items-center justify-between text-xs shadow-sm"
                                  >
                                    <div>
                                      <div className="font-medium text-[#ededed]">
                                        <span className="text-[#71717a] font-normal">{v.attributeName}:</span> {v.attributeValue}
                                      </div>
                                      <div className="font-mono text-[10px] text-[#52525b] mt-0.5">
                                        Suffix: <span className="text-[#a1a1aa] font-semibold">{v.skuSuffix}</span>
                                      </div>
                                    </div>
                                    <div className="text-right font-mono font-bold text-[#10b981]">
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

      {/* Modal: New Product (Linear Dark Theme) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f13] border border-[#222228] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">Add New Catalog Product</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-[#555] hover:text-[#ededed]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Product Name *</label>
                  <input
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="e.g. ThinkPad Ultra 16"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">SKU (Unique) *</label>
                  <input
                    required
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="e.g. HW-TP-16"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Category *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                  >
                    <option value="Hardware">Hardware</option>
                    <option value="Services">Services</option>
                    <option value="Software">Software</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Unit of Measure</label>
                  <input
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    placeholder="UNIT, HOUR"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Base Price ($) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    placeholder="1499.00"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Base Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.baseCost}
                    onChange={(e) => setProductForm({ ...productForm, baseCost: e.target.value })}
                    placeholder="950.00"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Tax Percent (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={productForm.taxPercent}
                    onChange={(e) => setProductForm({ ...productForm, taxPercent: e.target.value })}
                    placeholder="8.5"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1c1c22]">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[#71717a] hover:text-[#ededed] hover:bg-[#18181f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Variant */}
      {isVariantModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f13] border border-[#222228] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">Add Product Variant</h3>
              <button onClick={() => setIsVariantModalOpen(false)} className="text-[#555] hover:text-[#ededed]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateVariant} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Attribute Name *</label>
                  <input
                    required
                    value={variantForm.attributeName}
                    onChange={(e) => setVariantForm({ ...variantForm, attributeName: e.target.value })}
                    placeholder="e.g. Memory, Color"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Attribute Value *</label>
                  <input
                    required
                    value={variantForm.attributeValue}
                    onChange={(e) => setVariantForm({ ...variantForm, attributeValue: e.target.value })}
                    placeholder="e.g. 32GB RAM"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">SKU Suffix (Unique) *</label>
                  <input
                    required
                    value={variantForm.skuSuffix}
                    onChange={(e) => setVariantForm({ ...variantForm, skuSuffix: e.target.value })}
                    placeholder="e.g. 32GB"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Price Delta / Extra ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={variantForm.extraPrice}
                    onChange={(e) => setVariantForm({ ...variantForm, extraPrice: e.target.value })}
                    placeholder="150.00"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1c1c22]">
                <button
                  type="button"
                  onClick={() => setIsVariantModalOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[#71717a] hover:text-[#ededed] hover:bg-[#18181f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Variant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
