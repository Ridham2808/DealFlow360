'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Warehouse,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  DollarSign,
  Truck,
  RotateCcw,
  Check,
  AlertCircle,
  Clock
} from 'lucide-react';
import { apiRequest } from '../../../../lib/api';

export default function FulfillmentDetailPage() {
  const { quotationId } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [splitData, setSplitData] = useState(null);

  // Actions
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);

  // Manual Override Form State
  const [overrideAllocations, setOverrideAllocations] = useState([]);
  const [overrideErrors, setOverrideErrors] = useState([]);

  const fetchSplit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/fulfillment/${quotationId}`);
      setSplitData(res);

      // Initialize manual override form with recommended splits
      if (res.recommendedSplits) {
        setOverrideAllocations(
          res.recommendedSplits.map((s) => ({
            warehouseId: s.warehouseId,
            warehouseName: s.warehouseName,
            productId: s.productId,
            productName: s.productName,
            quantityFulfilled: s.quantityFulfilled,
            backorderQuantity: s.backorderQuantity,
            availableInWarehouse: s.availableInWarehouse,
            estimatedCost: s.estimatedCost,
          }))
        );
      }
    } catch (err) {
      setError(err.message || 'Failed to load fulfillment recommendations');
    } finally {
      setLoading(false);
    }
  }, [quotationId]);

  useEffect(() => {
    if (quotationId) {
      fetchSplit();
    }
  }, [quotationId, fetchSplit]);

  const handleAcceptSplit = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await apiRequest(`/fulfillment/${quotationId}/accept`, {
        method: 'POST',
      });
      setActionMessage({ type: 'success', text: 'Suggested warehouse split accepted and inventory reserved.' });
      await fetchSplit();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to accept split.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConsolidateBackorder = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const res = await apiRequest(`/fulfillment/${quotationId}/consolidate-backorder`, {
        method: 'POST',
      });
      setActionMessage({
        type: 'success',
        text: res.consolidated
          ? `Consolidated ${res.unitsConsolidated} backordered units from newly arrived inventory!`
          : res.message || 'No new inventory available to fulfill backorders at this time.',
      });
      await fetchSplit();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to consolidate backorders.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAllocationChange = (index, field, value) => {
    const next = [...overrideAllocations];
    const num = Math.max(0, parseInt(value, 10) || 0);
    next[index][field] = num;
    setOverrideAllocations(next);

    // Live Row-level stock validation
    const row = next[index];
    const errors = [];
    if (row.quantityFulfilled > row.availableInWarehouse) {
      errors.push(`Allocation at ${row.warehouseName} exceeds available stock (${row.availableInWarehouse}).`);
    }
    setOverrideErrors(errors);
  };

  const handleSaveOverride = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      await apiRequest(`/fulfillment/${quotationId}/manual-override`, {
        method: 'POST',
        body: JSON.stringify({ allocations: overrideAllocations }),
      });
      setActionMessage({ type: 'success', text: 'Manual warehouse allocations saved successfully.' });
      setIsOverrideOpen(false);
      await fetchSplit();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to apply manual override.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8 flex items-center justify-center">
        <div className="text-center text-xs text-[#787a8c]">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Computing optimal warehouse split...
        </div>
      </div>
    );
  }

  if (error || !splitData) {
    return (
      <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-8">
        <div className="max-w-2xl mx-auto p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-400" />
          <h2 className="text-base font-bold text-white">Error Loading Split Detail</h2>
          <p className="text-xs text-rose-300">{error || 'Record not found'}</p>
          <button
            onClick={() => router.push('/fulfillment')}
            className="px-4 py-2 bg-[#1a1b24] hover:bg-[#252734] border border-[#2e3040] rounded-lg text-xs font-medium text-white transition-all"
          >
            Back to Fulfillment
          </button>
        </div>
      </div>
    );
  }

  const { quotation, recommendedSplits, summary, currentSplits } = splitData;
  const isAccepted = currentSplits && currentSplits.some((s) => s.status === 'ACCEPTED' || s.status === 'OVERRIDDEN');

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#707284]">
        <Link href="/fulfillment" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Fulfillment
        </Link>
        <span>/</span>
        <span className="text-[#a0a2b4] font-mono">{quotation.quoteNumber}</span>
      </div>

      {/* Screen #8 Header */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl p-5 lg:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Warehouse Split Recommendation: {quotation.quoteNumber}
            </h1>
            {isAccepted && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Reserved / Allocated
              </span>
            )}
          </div>
          <p className="text-xs text-[#8a8b98] mt-1">
            Customer: <span className="text-white font-medium">{quotation.customerName}</span> • Optimization minimizes distinct depots and balances shipping cost weights.
          </p>
        </div>

        {/* Primary and Secondary Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            disabled={actionLoading}
            onClick={() => setIsOverrideOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161722] hover:bg-[#1e202f] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#888]" />
            <span>Manual Override</span>
          </button>

          <button
            disabled={actionLoading}
            onClick={handleAcceptSplit}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            <span>Accept Suggested Split</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Optimization Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Distinct Depots</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {summary.distinctWarehousesTouched}
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Minimizes logistics touchpoints</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Estimated Shipments</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {summary.totalShipments}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">Total consolidated parcels</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Estimated Shipping Cost</div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ${summary.totalEstimatedCost.toFixed(2)}
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">Weighted dispatch estimate</div>
        </div>

        <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-xl p-4">
          <div className="text-[10px] font-mono text-[#6c6e80] uppercase">Backorder Quantity</div>
          <div className={`text-xl font-bold font-mono mt-1 ${summary.hasBackorder ? 'text-amber-400' : 'text-emerald-400'}`}>
            {summary.totalBackorderQuantity} units
          </div>
          <div className="text-[10px] text-[#707284] mt-0.5">
            {summary.hasBackorder ? 'Stock shortage exists' : '100% available in stock'}
          </div>
        </div>
      </div>

      {/* Screen #8 Recommended Split Table */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Recommended Warehouse Allocations</h2>
          </div>
          <span className="text-xs text-[#707284]">
            {recommendedSplits.length} allocation split {recommendedSplits.length === 1 ? 'line' : 'lines'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                <th className="py-3 px-5 font-semibold">Warehouse</th>
                <th className="py-3 px-5 font-semibold">Product</th>
                <th className="py-3 px-5 font-semibold text-right text-emerald-400">Quantity Fulfilled</th>
                <th className="py-3 px-5 font-semibold text-right text-amber-400">Backorder Quantity</th>
                <th className="py-3 px-5 font-semibold text-right">Estimated Shipments</th>
                <th className="py-3 px-5 font-semibold text-right">Estimated Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#181923]">
              {recommendedSplits.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#13141d]">
                  <td className="py-3.5 px-5">
                    <div className="font-semibold text-white">{row.warehouseName}</div>
                    <div className="text-[10px] text-[#6b6d80]">{row.location} (Weight: {row.shippingCostWeight}x)</div>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-white">{row.productName}</div>
                    <div className="text-[10px] font-mono text-[#6b6d80]">{row.sku}</div>
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                    {row.quantityFulfilled}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-bold text-amber-400">
                    {row.backorderQuantity}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono text-[#a0a2b4]">
                    {row.estimatedShipments}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono font-semibold text-white">
                    ${row.estimatedCost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Screen #8 Muted Dark Gold Helper Banner (No Neon Glow) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2">
        <span>&ldquo;Consolidate Remaining Backorder&rdquo; prompt appears automatically once East Depot restocks.</span>
      </div>

      {/* Screen #8 Bottom Actions */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          disabled={actionLoading}
          onClick={handleAcceptSplit}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-40"
        >
          <Check className="w-4 h-4" />
          <span>Accept Suggested Split</span>
        </button>

        <button
          disabled={actionLoading}
          onClick={() => setIsOverrideOpen(true)}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-[#161722] hover:bg-[#1e202f] border border-[#2b2d40] text-[#cfd2e6] hover:text-white transition-all flex items-center gap-2 cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#888]" />
          <span>Manual Override</span>
        </button>
      </div>

      {/* Screen #8 Backorder Callout Card (Only when backorder exists, Clean Muted Style) */}
      {summary.hasBackorder && (
        <div className="p-5 rounded-2xl bg-[#0f1016] border border-[#27293a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#1a1c27] text-[#a0a2b8] mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Consolidate Remaining Backorder</h3>
              <p className="text-xs text-[#8a8c9e] mt-0.5">
                {summary.totalBackorderQuantity} units could not be satisfied from existing depot stock. When new inventory is received, rerun allocation to reserve stock.
              </p>
            </div>
          </div>

          <button
            disabled={actionLoading}
            onClick={handleConsolidateBackorder}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1e202e] hover:bg-[#282a3d] text-white border border-[#373a52] transition-all flex items-center gap-2 shrink-0 shadow-sm cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span>Consolidate Remaining Backorder</span>
          </button>
        </div>
      )}

      {/* Compact Manual Override Modal */}
      {isOverrideOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0e0f14] border border-[#262838] rounded-2xl w-full max-w-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1c1d27] pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Manual Warehouse Override</span>
                </h3>
                <p className="text-xs text-[#808294]">
                  Adjust quantities per warehouse with real-time stock ceiling validation.
                </p>
              </div>
              <button
                onClick={() => setIsOverrideOpen(false)}
                className="text-xs text-[#707284] hover:text-white"
              >
                ✕
              </button>
            </div>

            {overrideErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {overrideErrors.join(' ')}
              </div>
            )}

            <div className="space-y-3">
              {overrideAllocations.map((alloc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[#13141e] border border-[#222434] grid grid-cols-1 sm:grid-cols-4 gap-3 items-center"
                >
                  <div className="sm:col-span-2">
                    <div className="font-semibold text-white text-xs">{alloc.productName}</div>
                    <div className="text-[11px] text-[#717386]">
                      {alloc.warehouseName} • Available: <span className="text-emerald-400 font-bold">{alloc.availableInWarehouse}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#707284] block mb-1">
                      Fulfill Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={alloc.availableInWarehouse}
                      value={alloc.quantityFulfilled}
                      onChange={(e) => handleAllocationChange(idx, 'quantityFulfilled', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0c0d12] border border-[#2b2d40] text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-[#707284] block mb-1">
                      Backorder Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={alloc.backorderQuantity}
                      onChange={(e) => handleAllocationChange(idx, 'backorderQuantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#0c0d12] border border-[#2b2d40] text-xs font-mono text-white"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1c1d27]">
              <button
                onClick={() => setIsOverrideOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#8e90a4] hover:text-white bg-[#151622]"
              >
                Cancel
              </button>
              <button
                disabled={actionLoading || overrideErrors.length > 0}
                onClick={handleSaveOverride}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 cursor-pointer"
              >
                {actionLoading ? 'Saving...' : 'Apply Override Allocations'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
