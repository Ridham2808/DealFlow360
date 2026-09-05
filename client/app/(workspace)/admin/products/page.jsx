'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Package, 
  Plus, 
  Search, 
  ChevronRight, 
  Layers, 
  AlertCircle,
  CheckCircle2,
  X,
  Tags,
  Sliders,
  RotateCw,
  MoreHorizontal,
  ExternalLink,
  Trash2,
  Info,
  ArrowUpDown,
  Filter,
  Layers3
} from 'lucide-react';

export default function AdminProductsCatalogPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Data state
  const [products, setProducts] = useState([]);
  const [pricelistsCount, setPricelistsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'INACTIVE'
  const [sortBy, setSortBy] = useState('name_asc'); // 'name_asc', 'price_asc', 'price_desc', 'newest'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals state
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState(null); // product object
  const [actionMenuOpenId, setActionMenuOpenId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [dependencyError, setDependencyError] = useState(null);

  // Create Product Form
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'HARDWARE',
    basePrice: '',
    baseCost: '',
    unit: 'UNIT',
    taxPercent: '18',
    description: '',
    isRecurringEligible: false,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [prodRes, plRes] = await Promise.all([
        api.get('/admin/products'),
        api.get('/admin/pricelists').catch(() => ({ data: { items: [] } })),
      ]);

      setProducts(prodRes.data || []);
      const plList = plRes.data?.items || plRes.data || [];
      setPricelistsCount(Array.isArray(plList) ? plList.length : 3);
    } catch (err) {
      console.error('Failed to load catalog:', err);
      setErrorMsg(err.message || 'Failed to load product catalog. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Close active dropdowns on window click
  useEffect(() => {
    const closeMenu = () => setActionMenuOpenId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Stats calculation
  const totalProducts = products.length;
  const totalVariants = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);

  // Handle Create Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name || !productForm.sku || !productForm.basePrice) {
      setErrorMsg('Name, SKU, and Base Price are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await api.post('/admin/products', {
        name: productForm.name,
        sku: productForm.sku,
        category: productForm.category,
        basePrice: parseFloat(productForm.basePrice),
        baseCost: productForm.baseCost ? parseFloat(productForm.baseCost) : 0,
        unit: productForm.unit,
        taxPercent: productForm.taxPercent ? parseFloat(productForm.taxPercent) : 0,
        description: productForm.description || null,
        isRecurringEligible: productForm.isRecurringEligible,
      });

      setSuccessMsg(`Product ${productForm.name} created successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setIsNewProductModalOpen(false);
      setProductForm({
        name: '',
        sku: '',
        category: 'HARDWARE',
        basePrice: '',
        baseCost: '',
        unit: 'UNIT',
        taxPercent: '18',
        description: '',
        isRecurringEligible: false,
      });
      await fetchData();

      // Navigate to detail page if created
      if (res.data?.id) {
        router.push(`/admin/products/${res.data.id}`);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.error?.message || err.message || 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Product (Soft delete with dependency protection)
  const handleDeleteProduct = async (product) => {
    try {
      setSubmitting(true);
      setDependencyError(null);
      await api.delete(`/admin/products/${product.id}`);
      setSuccessMsg(`Product ${product.name} has been soft-deleted.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setDeleteConfirmDialog(null);
      await fetchData();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to delete product';
      setDependencyError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setStatusFilter('ALL');
    setSortBy('name_asc');
    setCurrentPage(1);
  };

  // Filter & Sort Logic
  const filteredProducts = products.filter((p) => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(search.toLowerCase()) || 
      p.sku?.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesStatus = 
      statusFilter === 'ALL' || 
      (statusFilter === 'ACTIVE' && p.isActive) || 
      (statusFilter === 'INACTIVE' && !p.isActive);

    return matchesSearch && matchesCat && matchesStatus;
  });

  filteredProducts.sort((a, b) => {
    if (sortBy === 'name_asc') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'price_asc') return Number(a.basePrice) - Number(b.basePrice);
    if (sortBy === 'price_desc') return Number(b.basePrice) - Number(a.basePrice);
    if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full text-[#c8c8c2] pb-16 select-none space-y-6">
      {/* Toast Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-[#0f1712] border border-[#1d3c26] text-[#4ade80] text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-[#666] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-[#180f12] border border-[#3e1820] text-[#f87171] text-xs font-medium flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#f87171]" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[#666] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Screen #16 Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#18181f]">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#9e9ea7]" />
            <span>Product catalog</span>
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Every product, variant and price list in one place.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            href="/admin/pricelists"
            className="h-8 px-3.5 rounded-lg bg-[#111217] hover:bg-[#171821] border border-[#22232c] text-xs font-medium text-[#c4c4cc] hover:text-white flex items-center gap-2 transition-all cursor-pointer"
          >
            <Tags className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span>Manage Price fields</span>
          </Link>

          {isAdmin && (
            <button
              onClick={() => setIsNewProductModalOpen(true)}
              className="h-8 px-4 rounded-lg bg-[#ededed] hover:bg-white text-[#09090b] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_1px_3px_rgba(0,0,0,0.4)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Small Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#0c0d12] border border-[#1a1b22] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">Total Products</span>
            <Package className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{totalProducts}</div>
          <p className="text-[11px] text-[#555] mt-1">Active catalog SKUs</p>
        </div>

        <div className="bg-[#0c0d12] border border-[#1a1b22] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">Pricelists</span>
            <Tags className="w-4 h-4 text-[#fbbf24]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{pricelistsCount}</div>
          <p className="text-[11px] text-[#555] mt-1">Customer tier rules</p>
        </div>

        <div className="bg-[#0c0d12] border border-[#1a1b22] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#71717a]">Variants</span>
            <Layers className="w-4 h-4 text-[#a78bfa]" />
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">{totalVariants}</div>
          <p className="text-[11px] text-[#555] mt-1">Product variations</p>
        </div>
      </div>

      {/* Amber Helper Banner */}
      <div className="p-3.5 rounded-xl bg-[#1c1810] border border-[#3e321b] text-[#fbbf24] text-xs flex items-center gap-2.5">
        <Info className="w-4 h-4 shrink-0 text-[#fbbf24]" />
        <span>Click a product row to open general info, variants and taxonomy/price rules.</span>
      </div>

      {/* Section Header & Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#71717a] font-mono">
            Products
          </h2>
          <span className="text-xs text-[#555] font-mono">
            Showing {paginatedProducts.length} of {filteredProducts.length} items
          </span>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-[#0c0d12] border border-[#1a1b22] rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#555] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-[#111218] border border-[#20212b] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#3a3b4c]"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded-lg bg-[#111218] border border-[#20212b] text-xs text-[#c4c4cc] focus:outline-none focus:border-[#3a3b4c] cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="HARDWARE">Hardware</option>
              <option value="SERVICES">Services</option>
              <option value="SUBSCRIPTION">Subscription</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 px-2.5 rounded-lg bg-[#111218] border border-[#20212b] text-xs text-[#c4c4cc] focus:outline-none focus:border-[#3a3b4c] cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Right: Sort & Reset */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 px-2.5 rounded-lg bg-[#111218] border border-[#20212b] text-xs text-[#c4c4cc] focus:outline-none focus:border-[#3a3b4c] cursor-pointer"
            >
              <option value="name_asc">Sort by Name (A-Z)</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
            </select>

            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="h-8 px-2.5 rounded-lg bg-[#111218] hover:bg-[#181924] border border-[#20212b] text-xs text-[#888] hover:text-white transition-colors cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Screen #16 Dense Dark Table */}
      <div className="w-full bg-[#0c0d12] border border-[#1a1b22] rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#181820] bg-[#0f1015] text-[#71717a] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Product name</th>
                <th className="py-3 px-4 font-semibold">Category</th>
                <th className="py-3 px-4 font-semibold">Variants</th>
                <th className="py-3 px-4 font-semibold">Price</th>
                <th className="py-3 px-4 font-semibold">Unit</th>
                <th className="py-3 px-4 font-semibold">Tax</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#16171e]">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-3.5 bg-[#171822] rounded w-36" /></td>
                    <td className="py-4 px-4"><div className="h-3 bg-[#171822] rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-3 bg-[#171822] rounded w-12" /></td>
                    <td className="py-4 px-4"><div className="h-3 bg-[#171822] rounded w-16" /></td>
                    <td className="py-4 px-4"><div className="h-3 bg-[#171822] rounded w-10" /></td>
                    <td className="py-4 px-4"><div className="h-3 bg-[#171822] rounded w-10" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-[#171822] rounded w-14" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-6 bg-[#171822] rounded w-6 ml-auto" /></td>
                  </tr>
                ))
              ) : paginatedProducts.length === 0 ? (
                // Empty State Message with Error Retry
                <tr>
                  <td colSpan="8" className="py-14 text-center">
                    <Package className="w-8 h-8 text-[#444] mx-auto mb-2" />
                    <p className="text-sm font-semibold text-white">No products found</p>
                    <p className="text-xs text-[#666] mt-1 max-w-sm mx-auto">
                      Try clearing filters or search queries, or add a new product to your catalog.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        onClick={fetchData}
                        className="h-8 px-3 rounded-lg border border-[#242532] text-xs font-medium text-[#aaa] hover:text-white flex items-center gap-1.5 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setIsNewProductModalOpen(true)}
                          className="h-8 px-3.5 rounded-lg bg-[#ededed] hover:bg-white text-xs font-semibold text-[#09090b] transition-all"
                        >
                          + New Product
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => {
                  const variantsCount = p.variants?.length || 0;

                  return (
                    <tr
                      key={p.id}
                      tabIndex={0}
                      onClick={() => router.push(`/admin/products/${p.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(`/admin/products/${p.id}`);
                      }}
                      className="hover:bg-[#12131a] focus:bg-[#141520] focus:outline-none transition-colors group cursor-pointer"
                    >
                      {/* Product Name & SKU */}
                      <td className="py-3 px-4 font-medium text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#14151e] border border-[#22232e] text-[#a1a1aa] flex items-center justify-center shrink-0 group-hover:border-[#383a4c] transition-colors">
                            <Package className="w-3.5 h-3.5 text-[#9e9ea7]" />
                          </div>
                          <div>
                            <div className="font-semibold text-[13px] text-white group-hover:text-[#60a5fa] transition-colors">
                              {p.name}
                            </div>
                            <div className="text-[10px] text-[#555] font-mono mt-0.5">
                              {p.sku}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold uppercase tracking-wider border ${
                          p.category === 'HARDWARE'
                            ? 'bg-[#151c27] border-[#20314a] text-[#60a5fa]'
                            : p.category === 'SUBSCRIPTION'
                            ? 'bg-[#1e1b2e] border-[#382d5c] text-[#a78bfa]'
                            : 'bg-[#1f1910] border-[#3e2e17] text-[#fbbf24]'
                        }`}>
                          {p.category}
                        </span>
                      </td>

                      {/* Variants */}
                      <td className="py-3 px-4 text-[#a1a1aa] font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-[#13141c] border border-[#20212e] text-[#888]">
                          {variantsCount} variant{variantsCount !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-4 font-semibold text-white font-mono text-[13px]">
                        ${Number(p.basePrice).toFixed(2)}
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 text-[#71717a] font-mono text-[11px]">
                        {p.unit || 'UNIT'}
                      </td>

                      {/* Tax */}
                      <td className="py-3 px-4 text-[#71717a] font-mono text-[11px]">
                        {p.taxPercent}%
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono border ${
                          p.isActive
                            ? 'bg-[#0f1712] border-[#1b3b24] text-[#4ade80]'
                            : 'bg-[#1f1315] border-[#3d1a20] text-[#f87171]'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${p.isActive ? 'bg-[#4ade80]' : 'bg-[#f87171]'}`} />
                          <span>{p.isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Actions Menu */}
                      <td className="py-3 px-4 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActionMenuOpenId(actionMenuOpenId === p.id ? null : p.id)}
                          className="p-1 rounded-lg hover:bg-[#1a1b24] text-[#71717a] hover:text-white transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {actionMenuOpenId === p.id && (
                          <div className="absolute right-4 mt-1 w-44 bg-[#101117] border border-[#242533] rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] p-1.5 z-30 text-left">
                            <button
                              onClick={() => {
                                setActionMenuOpenId(null);
                                router.push(`/admin/products/${p.id}`);
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#c4c4cc] hover:text-white hover:bg-[#181924] flex items-center gap-2 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#38bdf8]" />
                              <span>View Details</span>
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setActionMenuOpenId(null);
                                  setDeleteConfirmDialog(p);
                                }}
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs text-[#f87171] hover:bg-[#251216] flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Product</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredProducts.length > itemsPerPage && (
          <div className="p-3 border-t border-[#181820] bg-[#0d0e14] flex items-center justify-between text-xs text-[#71717a]">
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="h-7 px-2.5 rounded-md border border-[#20212e] text-[#aaa] hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="h-7 px-2.5 rounded-md border border-[#20212e] text-[#aaa] hover:text-white disabled:opacity-30 transition-all cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ MODAL: CREATE NEW PRODUCT ═══════════════ */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0e0f14] border border-[#22232d] rounded-2xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#1a1b24]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#181922] border border-[#282937] text-[#38bdf8]">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Create New Product</h3>
                  <p className="text-[11px] text-[#71717a]">Add SKU, taxonomy category, unit price and tax</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewProductModalOpen(false)}
                className="p-1 rounded-lg text-[#666] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Product Name <span className="text-[#f87171]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell PowerEdge Server"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    SKU Code <span className="text-[#f87171]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HW-SRV-001"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Category <span className="text-[#f87171]">*</span>
                  </label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full h-8 px-2.5 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white focus:outline-none focus:border-[#404152]"
                  >
                    <option value="HARDWARE">HARDWARE</option>
                    <option value="SERVICES">SERVICES</option>
                    <option value="SUBSCRIPTION">SUBSCRIPTION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Unit Type
                  </label>
                  <input
                    type="text"
                    placeholder="UNIT / MONTH / USER"
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value.toUpperCase() })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Base Price ($) <span className="text-[#f87171]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={productForm.basePrice}
                    onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Base Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={productForm.baseCost}
                    onChange={(e) => setProductForm({ ...productForm, baseCost: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                    Tax (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="18"
                    value={productForm.taxPercent}
                    onChange={(e) => setProductForm({ ...productForm, taxPercent: e.target.value })}
                    className="w-full h-8 px-3 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Detailed SKU specifications and technical notes..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#14151b] border border-[#24252f] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#404152]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#1a1b24] mt-5">
                <button
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[#24252f] text-xs font-medium text-[#888] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg bg-[#ededed] hover:bg-white text-xs font-semibold text-[#09090b] transition-all"
                >
                  {submitting ? 'Creating...' : 'Create & Open Detail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: DELETE PRODUCT CONFIRMATION ═══════════════ */}
      {deleteConfirmDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0f14] border border-[#282936] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#fb7185] mb-3">
              <Trash2 className="w-5 h-5" />
              <h4 className="text-sm font-semibold text-white">Delete Product Confirmation</h4>
            </div>

            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-4">
              Are you sure you want to soft-delete <strong className="text-white">{deleteConfirmDialog.name}</strong> ({deleteConfirmDialog.sku})?
              If this product has active warehouse stock or pending quotation dependencies, deletion will be guarded.
            </p>

            {dependencyError && (
              <div className="mb-4 p-3 rounded-xl bg-[#231215] border border-[#481c23] text-[#fb7185] text-xs">
                <div className="font-semibold mb-1">Deletion Blocked:</div>
                <div>{dependencyError}</div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1a1b24]">
              <button
                onClick={() => {
                  setDeleteConfirmDialog(null);
                  setDependencyError(null);
                }}
                className="h-8 px-3 rounded-lg border border-[#24252f] text-xs font-medium text-[#888] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmDialog)}
                disabled={submitting}
                className="h-8 px-3.5 rounded-lg bg-[#e11d48] hover:bg-[#be123c] text-xs font-semibold text-white transition-all cursor-pointer"
              >
                {submitting ? 'Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
