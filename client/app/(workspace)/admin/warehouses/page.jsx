'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { Button, Input, Badge, Modal, Spinner, EmptyState } from '../../../../components/ui';
import { 
  Warehouse, 
  Plus, 
  MapPin, 
  Truck, 
  PackageCheck, 
  AlertTriangle, 
  CheckCircle2, 
  AlertCircle,
  Boxes,
  Edit2
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-blue-600" />
            Warehouses & Stock Allocation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track multi-location fulfillment facilities, inventory reservation buffers, and replenishment thresholds.
          </p>
        </div>

        {isAdmin && (
          <Button 
            onClick={() => { setErrorMsg(null); setIsWarehouseModalOpen(true); }}
            className="flex items-center gap-1.5 shadow-sm text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            New Warehouse
          </Button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Warehouse Selection List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Fulfillment Facilities ({warehouses.length})
            </h3>
            {warehouses.map((wh) => {
              const isSelected = selectedWarehouseId === wh.id;

              return (
                <div
                  key={wh.id}
                  onClick={() => setSelectedWarehouseId(wh.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-blue-50/50 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{wh.name}</h4>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{wh.location}</span>
                      </div>
                    </div>
                    <Badge variant={wh.isActive ? 'success' : 'neutral'} size="sm">
                      {wh.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3 h-3 text-slate-400" />
                      Shipping Weight: <strong className="text-slate-700 font-mono">{wh.shippingCostWeight}x</strong>
                    </span>
                    <span className="text-blue-600 font-semibold">
                      {wh._count?.stockLevels || 0} Stock Records
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warehouse Stock Table */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  Live Stock Allocation — {selectedWarehouse?.name || 'Selected Warehouse'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Location: {selectedWarehouse?.location} | Multiplier: {selectedWarehouse?.shippingCostWeight}x
                </p>
              </div>
            </div>

            <div className="overflow-x-auto flex-1">
              {stockLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <Spinner size="md" />
                </div>
              ) : stock.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    title="No stock records found"
                    description="No inventory records linked to this facility yet."
                  />
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/70 text-slate-500 text-[10px] uppercase font-semibold border-b border-slate-200">
                      <th className="py-2.5 px-4">Product / SKU</th>
                      <th className="py-2.5 px-3 text-right">On Hand</th>
                      <th className="py-2.5 px-3 text-right">Reserved</th>
                      <th className="py-2.5 px-3 text-right">Available</th>
                      <th className="py-2.5 px-3 text-center">Alert Limit</th>
                      <th className="py-2.5 px-3 text-center">Inventory Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {stock.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{item.productName}</div>
                          <div className="font-mono text-[11px] text-blue-600">{item.sku}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                          {item.quantityOnHand}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-600 font-semibold">
                          {item.reserved}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 font-bold">
                          {item.available}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-slate-500">
                          {item.replenishmentThreshold}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.isLowStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" />
                              REPLENISH
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
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
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
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

      {/* Modal: New Warehouse */}
      <Modal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        title="Add Fulfillment Warehouse"
      >
        <form onSubmit={handleCreateWarehouse} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Facility Name *</label>
            <Input
              required
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              placeholder="e.g. South Logistics Depot"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Location (City, State / Region) *</label>
            <Input
              required
              value={warehouseForm.location}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
              placeholder="e.g. Atlanta, GA"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Shipping Cost Weight Multiplier</label>
            <Input
              type="number"
              step="0.05"
              value={warehouseForm.shippingCostWeight}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, shippingCostWeight: e.target.value })}
              placeholder="1.0"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsWarehouseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Warehouse
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adjust Stock */}
      <Modal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        title={`Adjust Stock — ${activeStockItem?.productName || ''}`}
      >
        <form onSubmit={handleUpdateStock} className="space-y-3 text-xs">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <div className="font-semibold text-slate-900">{activeStockItem?.productName}</div>
            <div className="font-mono text-[11px] text-blue-600">SKU: {activeStockItem?.sku}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Physical Quantity On Hand *</label>
              <Input
                required
                type="number"
                min="0"
                value={stockForm.quantityOnHand}
                onChange={(e) => setStockForm({ ...stockForm, quantityOnHand: e.target.value })}
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Reserved Stock (Commitments)</label>
              <Input
                type="number"
                min="0"
                value={stockForm.reserved}
                onChange={(e) => setStockForm({ ...stockForm, reserved: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Replenishment Alert Threshold</label>
            <Input
              type="number"
              min="0"
              value={stockForm.replenishmentThreshold}
              onChange={(e) => setStockForm({ ...stockForm, replenishmentThreshold: e.target.value })}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Stock Adjustments
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
