'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Warehouse, 
  Plus, 
  MapPin, 
  Truck, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Boxes,
  X
} from 'lucide-react';

export default function AdminWarehousesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(null);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockLoading, setStockLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
  });

  const [stockForm, setStockForm] = useState({
    quantityOnHand: '0',
    reserved: '0',
    replenishmentThreshold: '10',
  });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/admin/warehouses');
      if (res?.data) {
        setWarehouses(res.data);
        if (res.data.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(res.data[0].id);
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load warehouses');
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
      if (res?.data) {
        setStock(res.data);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load warehouse stock');
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
        ...warehouseForm,
        shippingCostWeight: parseFloat(warehouseForm.shippingCostWeight || 1.0),
      });
      setIsWarehouseModalOpen(false);
      setWarehouseForm({ name: '', location: '', shippingCostWeight: '1.0' });
      setSuccessMsg('Warehouse created successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
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
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.patch(`/admin/warehouses/${selectedWarehouseId}/stock/${activeStockItem.productId}`, {
        quantityOnHand: parseInt(stockForm.quantityOnHand, 10),
        reserved: parseInt(stockForm.reserved, 10),
        replenishmentThreshold: parseInt(stockForm.replenishmentThreshold, 10),
      });
      setIsStockModalOpen(false);
      setSuccessMsg('Inventory adjusted successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchStock(selectedWarehouseId);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed] flex items-center gap-2.5">
            <Warehouse className="w-5 h-5 text-[#3b82f6]" />
            Warehouses & Stock Allocation
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Track multi-location fulfillment facilities, inventory reservation buffers, and replenishment thresholds
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => { setErrorMsg(null); setIsWarehouseModalOpen(true); }}
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Warehouse</span>
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

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <span className="text-xs text-[#555] font-mono">Loading fulfillment centers...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Warehouse Selection List */}
          <div className="space-y-2.5">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] px-1">
              Fulfillment Facilities ({warehouses.length})
            </h3>
            {warehouses.map((wh) => {
              const isSelected = selectedWarehouseId === wh.id;

              return (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#121319] border-[#3b82f6] shadow-[0_1px_4px_rgba(0,0,0,0.4)]'
                      : 'bg-[#0b0c0e] border-[#1c1c22] hover:border-[#2a2a34]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-[#ededed]">{wh.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-[#71717a] mt-1">
                        <MapPin className="w-3.5 h-3.5 text-[#555]" />
                        <span>{wh.location}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      wh.isActive ? 'bg-[#0f1914] text-[#34d399] border border-[#16382a]' : 'bg-[#18181b] text-[#71717a]'
                    }`}>
                      {wh.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#18181f] flex items-center justify-between text-[11px] text-[#71717a]">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-[#555]" />
                      Weight: <strong className="text-[#ededed] font-mono">{wh.shippingCostWeight}x</strong>
                    </span>
                    <span className="text-[#3b82f6] font-mono text-[10px]">
                      {wh._count?.stockLevels || 0} Stock Lines
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warehouse Stock Table */}
          <div className="lg:col-span-2 bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#1c1c22] bg-[#0f1014] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[#ededed] flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-[#3b82f6]" />
                  Live Stock Allocation — {selectedWarehouse?.name || 'Facility'}
                </h3>
                <p className="text-[11px] text-[#71717a]">
                  Location: {selectedWarehouse?.location} | Rate Multiplier: {selectedWarehouse?.shippingCostWeight}x
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              {stockLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <span className="text-xs text-[#555] font-mono">Loading inventory...</span>
                </div>
              ) : stock.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#555]">
                  No inventory records linked to this facility.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#0f1014] text-[#71717a] text-[10px] uppercase font-mono border-b border-[#1c1c22]">
                      <th className="py-2.5 px-4">Product / SKU</th>
                      <th className="py-2.5 px-3 text-right">On Hand</th>
                      <th className="py-2.5 px-3 text-right">Reserved</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-center">Threshold</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#16161b] text-[#a1a1aa]">
                    {stock.map((item) => (
                      <tr key={item.id} className="hover:bg-[#111216] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-[#ededed]">{item.productName}</div>
                          <div className="font-mono text-[11px] text-[#3b82f6]">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#ededed]">
                          {item.quantityOnHand}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#fbbf24] font-semibold">
                          {item.reserved}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[#34d399] font-bold">
                          {item.available}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-[#52525b]">
                          {item.replenishmentThreshold}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1d1214] text-[#f87171] border border-[#3b191c]">
                              <AlertTriangle className="w-3 h-3" />
                              REPLENISH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#0f1914] text-[#34d399] border border-[#16382a]">
                              HEALTHY
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAdmin && (
                            <button
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
                              className="text-xs font-semibold text-[#3b82f6] hover:text-[#60a5fa]"
                            >
                              Adjust
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

      {/* Modal: New Warehouse */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f13] border border-[#222228] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">Add Fulfillment Warehouse</h3>
              <button onClick={() => setIsWarehouseModalOpen(false)} className="text-[#555] hover:text-[#ededed]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWarehouse} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a1a1aa] mb-1">Facility Name *</label>
                <input
                  required
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  placeholder="e.g. South Logistics Depot"
                  className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Location *</label>
                <input
                  required
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  placeholder="e.g. Atlanta, GA"
                  className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Shipping Cost Multiplier</label>
                <input
                  type="number"
                  step="0.05"
                  value={warehouseForm.shippingCostWeight}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, shippingCostWeight: e.target.value })}
                  placeholder="1.0"
                  className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1c1c22]">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[#71717a] hover:text-[#ededed] hover:bg-[#18181f]"
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

      {/* Modal: Adjust Stock */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f13] border border-[#222228] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">
                Adjust Stock — {activeStockItem?.productName}
              </h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-[#555] hover:text-[#ededed]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStock} className="space-y-3 text-xs">
              <div className="p-2.5 bg-[#14151b] border border-[#1c1c22] rounded-xl text-xs space-y-0.5">
                <div className="font-semibold text-[#ededed]">{activeStockItem?.productName}</div>
                <div className="font-mono text-[11px] text-[#3b82f6]">SKU: {activeStockItem?.sku}</div>
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
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Reserved Commitments</label>
                  <input
                    type="number"
                    min="0"
                    value={stockForm.reserved}
                    onChange={(e) => setStockForm({ ...stockForm, reserved: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
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
                  className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1c1c22]">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[#71717a] hover:text-[#ededed] hover:bg-[#18181f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
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
