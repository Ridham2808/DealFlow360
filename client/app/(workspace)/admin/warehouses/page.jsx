'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Warehouse,
  Plus,
  MapPin,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  X,
  RefreshCw,
  Search,
  ShieldCheck,
  Building2,
  ChevronRight,
  ArrowUpDown,
  Calculator,
} from 'lucide-react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';

export default function AdminWarehousesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Search & Filter for stock table
  const [stockSearch, setStockSearch] = useState('');

  // Modals
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [activeStockItem, setActiveStockItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Forms
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    location: '',
    shippingCostWeight: '1.0',
    isActive: true,
  });

  const [stockForm, setStockForm] = useState({
    quantityOnHand: '0',
    reserved: '0',
    replenishmentThreshold: '10',
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/admin/warehouses');
      const list = res?.data || [];
      setWarehouses(list);
      if (list.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(list[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch warehouses:', err);
      setErrorMsg(err.message || 'Failed to load fulfillment facilities');
    } finally {
      setLoading(false);
    }
  };

  const fetchStock = async (warehouseId) => {
    if (!warehouseId) return;
    try {
      setStockLoading(true);
      setErrorMsg(null);
      const res = await api.get(`/admin/warehouses/${warehouseId}/stock`);
      setStock(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch warehouse stock:', err);
      setErrorMsg(err.message || 'Failed to load inventory for facility');
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (selectedWarehouseId) {
      fetchStock(selectedWarehouseId);
    }
  }, [selectedWarehouseId]);

  const handleCreateWarehouse = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      const res = await api.post('/admin/warehouses', {
        name: warehouseForm.name.trim(),
        location: warehouseForm.location.trim(),
        shippingCostWeight: parseFloat(warehouseForm.shippingCostWeight) || 1.0,
        isActive: warehouseForm.isActive,
      });

      setIsWarehouseModalOpen(false);
      setWarehouseForm({ name: '', location: '', shippingCostWeight: '1.0', isActive: true });
      showToast('Warehouse facility created successfully.');
      await fetchWarehouses();
      if (res?.data?.id) setSelectedWarehouseId(res.data.id);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create warehouse');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStock = async (e) => {
    e.preventDefault();
    if (!selectedWarehouseId || !activeStockItem) return;

    const onHand = parseInt(stockForm.quantityOnHand, 10);
    const reserved = parseInt(stockForm.reserved, 10);
    const threshold = parseInt(stockForm.replenishmentThreshold, 10);

    if (isNaN(onHand) || onHand < 0) {
      setErrorMsg('Quantity on hand must be a non-negative number.');
      return;
    }
    if (isNaN(reserved) || reserved < 0) {
      setErrorMsg('Reserved commitments must be a non-negative number.');
      return;
    }
    if (reserved > onHand) {
      setErrorMsg(`Reserved count (${reserved}) cannot exceed On Hand count (${onHand}). Available stock cannot be negative.`);
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.patch(`/admin/warehouses/${selectedWarehouseId}/stock/${activeStockItem.productId}`, {
        quantityOnHand: onHand,
        reserved,
        replenishmentThreshold: isNaN(threshold) ? 0 : threshold,
      });

      setIsStockModalOpen(false);
      showToast('Inventory level adjusted and logged to audit trail.');
      await fetchStock(selectedWarehouseId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  // Filtered Stock list
  const filteredStock = useMemo(() => {
    if (!stockSearch) return stock;
    const q = stockSearch.toLowerCase();
    return stock.filter(
      (item) =>
        item.productName?.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q) ||
        item.category?.toLowerCase().includes(q)
    );
  }, [stock, stockSearch]);

  // Live calculation for Stock Modal
  const modalOnHand = parseInt(stockForm.quantityOnHand, 10) || 0;
  const modalReserved = parseInt(stockForm.reserved, 10) || 0;
  const modalAvailable = Math.max(0, modalOnHand - modalReserved);
  const isAllocationInvalid = modalReserved > modalOnHand;

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
        {/* ═══════════════ HEADER ═══════════════ */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#181920] pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Warehouse className="w-5 h-5 text-[#3b82f6]" />
              <h1 className="text-xl font-semibold tracking-tight text-white">Warehouses & Stock Allocation</h1>
            </div>
            <p className="text-xs text-[#71717a] mt-1">
              Multi-depot fulfillment routing, live reservation buffers, and audit-logged inventory adjustments.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setIsWarehouseModalOpen(true);
              }}
              className="h-9 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Warehouse</span>
            </button>
          )}
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#231215] border border-[#481c23] text-[#fb7185] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-[#fb7185]/70 hover:text-[#fb7185]">
              ✕
            </button>
          </div>
        )}

        {/* ═══════════════ NOTIFICATION BANNER (CLEAN LINEAR DARK) ═══════════════ */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#111218] border border-[#21232e] text-[#9ca3af] text-xs leading-relaxed shadow-sm">
          <Boxes className="w-4 h-4 shrink-0 text-[#60a5fa] mt-0.5" />
          <p>
            Multi-location inventory allocation calculates available fulfillment buffers as{' '}
            <strong className="text-white">Available = On Hand - Reserved</strong>. Stock level adjustments are
            transaction-logged to immutable audit trails with strict non-negative guards.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-xs text-[#888] gap-2 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
            Loading fulfillment centers...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ═══════════════ COLUMN 1: WAREHOUSE SELECTION LIST ═══════════════ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-medium text-[#71717a] uppercase tracking-wider">
                  Fulfillment Depots ({warehouses.length})
                </span>
                <span className="text-[10px] text-[#555] font-mono">Select to view</span>
              </div>

              {warehouses.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#71717a] border border-dashed border-[#1f202d] rounded-2xl">
                  No warehouse facilities configured.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {warehouses.map((wh) => {
                    const isSelected = selectedWarehouseId === wh.id;

                    return (
                      <div
                        key={wh.id}
                        onClick={() => setSelectedWarehouseId(wh.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#12131d] border-[#3b82f6] shadow-sm ring-1 ring-[#3b82f6]/30'
                            : 'bg-[#0e0f14] border-[#1a1c26] hover:border-[#27293b]'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-sm text-white">{wh.name}</h3>
                            <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
                              <MapPin className="w-3.5 h-3.5 text-[#555]" />
                              <span>{wh.location}</span>
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                              wh.isActive
                                ? 'bg-[#092317] text-[#34d399] border border-[#134e2c]'
                                : 'bg-[#18181b] text-[#71717a] border border-[#27272a]'
                            }`}
                          >
                            {wh.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-[#181924] flex items-center justify-between text-[11px] text-[#71717a]">
                          <span className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-[#555]" />
                            <span>Weight:</span>
                            <strong className="text-white font-mono">{wh.shippingCostWeight}x</strong>
                          </span>
                          <span className="text-[#3b82f6] font-mono text-[10px] flex items-center gap-1">
                            <span>Manage Stock</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══════════════ COLUMN 2 & 3: WAREHOUSE LIVE STOCK TABLE ═══════════════ */}
            <div className="lg:col-span-2 bg-[#0e0f14] rounded-2xl border border-[#1d1f2b] overflow-hidden flex flex-col shadow-sm">
              <div className="p-4 border-b border-[#181924] bg-[#11121a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#3b82f6]" />
                    <h2 className="text-sm font-semibold text-white">
                      Live Stock Allocation — {selectedWarehouse?.name || 'Facility'}
                    </h2>
                  </div>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Location: <span className="text-[#a1a1aa]">{selectedWarehouse?.location}</span> | Shipping
                    Multiplier: <span className="text-white font-mono">{selectedWarehouse?.shippingCostWeight}x</span>
                  </p>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="text"
                    placeholder="Search stock..."
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    className="w-44 pl-8 pr-2.5 py-1.5 rounded-lg bg-[#161822] border border-[#252838] text-xs text-white placeholder-[#555] focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div className="overflow-x-auto flex-1">
                {stockLoading ? (
                  <div className="py-20 flex items-center justify-center text-xs text-[#888] gap-2 font-mono">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
                    Loading inventory levels...
                  </div>
                ) : filteredStock.length === 0 ? (
                  <div className="py-20 text-center text-xs text-[#71717a]">
                    No inventory records match your query for this facility.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse text-[#a1a1aa]">
                    <thead>
                      <tr className="bg-[#12131b] text-[#71717a] text-[10px] uppercase font-mono border-b border-[#181924]">
                        <th className="py-2.5 px-4 font-semibold">Product / SKU</th>
                        <th className="py-2.5 px-3 text-right font-semibold">On Hand</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Reserved</th>
                        <th className="py-2.5 px-3 text-right font-semibold">Available</th>
                        <th className="py-2.5 px-3 text-center font-semibold">Safety Min</th>
                        <th className="py-2.5 px-3 text-center font-semibold">Health Status</th>
                        <th className="py-2.5 px-4 text-right font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#181924]">
                      {filteredStock.map((item) => (
                        <tr key={item.id} className="hover:bg-[#12131c]/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-white">{item.productName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-[#60a5fa]">{item.sku}</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#161822] text-[#888] border border-[#242637]">
                                {item.category}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                            {item.quantityOnHand}
                          </td>

                          <td className="py-3 px-3 text-right font-mono text-[#94a3b8] font-medium">
                            {item.reserved}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold">
                            <span className={item.available > 0 ? 'text-[#34d399]' : 'text-[#f87171]'}>
                              {item.available}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center font-mono text-[#71717a]">
                            {item.replenishmentThreshold}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {item.isLowStock ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1d1214] text-[#f87171] border border-[#3b191c]">
                                <AlertTriangle className="w-3 h-3" />
                                REPLENISH
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#092317] text-[#34d399] border border-[#134e2c]">
                                HEALTHY
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveStockItem(item);
                                  setStockForm({
                                    quantityOnHand: String(item.quantityOnHand),
                                    reserved: String(item.reserved),
                                    replenishmentThreshold: String(item.replenishmentThreshold),
                                  });
                                  setErrorMsg(null);
                                  setIsStockModalOpen(true);
                                }}
                                className="h-7 px-2.5 rounded-lg bg-[#161722] hover:bg-[#202230] border border-[#262838] text-[11px] font-medium text-white transition-colors cursor-pointer"
                              >
                                Adjust Stock
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ MODAL: NEW WAREHOUSE ═══════════════ */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f14] border border-[#262838] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#181924] pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#3b82f6]" />
                <h3 className="text-sm font-semibold text-white">Add Fulfillment Warehouse</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWarehouseModalOpen(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[#a1a1aa] mb-1">Facility Name *</label>
                <input
                  required
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="e.g. South Logistics Depot"
                  className="w-full px-3 py-2 bg-[#14151e] border border-[#262838] rounded-lg text-white focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Location Address / City *</label>
                <input
                  required
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  placeholder="e.g. Atlanta, GA"
                  className="w-full px-3 py-2 bg-[#14151e] border border-[#262838] rounded-lg text-white focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Shipping Cost Multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  value={warehouseForm.shippingCostWeight}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, shippingCostWeight: e.target.value })}
                  placeholder="1.0"
                  className="w-full px-3 py-2 bg-[#14151e] border border-[#262838] rounded-lg font-mono text-white focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#181924]">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[#262838] text-xs font-medium text-[#888] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Warehouse'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: ADJUST STOCK WITH LIVE CALCULATION ═══════════════ */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f14] border border-[#262838] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#181924] pb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-[#3b82f6]" />
                <h3 className="text-sm font-semibold text-white">Adjust Stock Buffer</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStock} className="space-y-4 text-xs">
              <div className="p-3 bg-[#13141d] border border-[#1f2130] rounded-xl space-y-1">
                <div className="font-semibold text-white">{activeStockItem?.productName}</div>
                <div className="flex items-center gap-2 font-mono text-[11px]">
                  <span className="text-[#3b82f6]">SKU: {activeStockItem?.sku}</span>
                  <span className="text-[#555]">&bull;</span>
                  <span className="text-[#71717a]">{selectedWarehouse?.name}</span>
                </div>
              </div>

              {/* Real-time Calculation Panel */}
              <div className="p-3.5 rounded-xl bg-[#141622] border border-[#24273c] space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#93c5fd]">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Available Inventory Formula</span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="text-center">
                    <div className="text-[#71717a] text-[10px]">On Hand</div>
                    <div className="font-bold text-white text-sm">{modalOnHand}</div>
                  </div>
                  <span className="text-[#555] font-bold">&minus;</span>
                  <div className="text-center">
                    <div className="text-[#71717a] text-[10px]">Reserved</div>
                    <div className="font-bold text-[#cbd5e1] text-sm">{modalReserved}</div>
                  </div>
                  <span className="text-[#555] font-bold">=</span>
                  <div className="text-center">
                    <div className="text-[#71717a] text-[10px]">Available</div>
                    <div className={`font-bold text-sm ${isAllocationInvalid ? 'text-red-400' : 'text-[#34d399]'}`}>
                      {modalAvailable}
                    </div>
                  </div>
                </div>

                {isAllocationInvalid && (
                  <p className="text-[11px] text-red-400 font-medium">
                    &bull; Warning: Reserved quantity cannot exceed on-hand quantity.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Quantity On Hand *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={stockForm.quantityOnHand}
                    onChange={(e) => setStockForm({ ...stockForm, quantityOnHand: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151e] border border-[#262838] rounded-lg text-white font-mono focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Reserved Commitments</label>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.reserved}
                    onChange={(e) => setStockForm({ ...stockForm, reserved: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151e] border border-[#262838] rounded-lg text-white font-mono focus:outline-none focus:border-[#3b82f6]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Replenishment Alert Threshold</label>
                <input
                  type="number"
                  min="0"
                  value={stockForm.replenishmentThreshold}
                  onChange={(e) => setStockForm({ ...stockForm, replenishmentThreshold: e.target.value })}
                  className="w-full px-3 py-2 bg-[#14151e] border border-[#262838] rounded-lg text-white font-mono focus:outline-none focus:border-[#3b82f6]"
                />
                <p className="text-[10px] text-[#71717a] mt-1">
                  Triggers &quot;REPLENISH&quot; alert badge when Available falls at or below this count.
                </p>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#181924]">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="h-8 px-3.5 rounded-lg border border-[#262838] text-xs font-medium text-[#888] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || isAllocationInvalid}
                  className="h-8 px-4 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
