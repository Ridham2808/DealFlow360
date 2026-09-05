'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Warehouse as WarehouseIcon, 
  Package, 
  Clock, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { apiRequest } from '../../../lib/api';

export default function FulfillmentListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ stockTable: [], ordersAwaiting: [] });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest('/fulfillment');
      setData(res || { stockTable: [], ordersAwaiting: [] });
    } catch (err) {
      setError(err.message || 'Failed to load fulfillment data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#080808] text-[#f0f0f2] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c1d25]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <WarehouseIcon className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Warehouse Fulfillment</h1>
          </div>
          <p className="text-xs sm:text-sm text-[#8a8b98] mt-1">
            Real-time depot inventory reservation, multi-warehouse split optimization, and order fulfillment.
          </p>
        </div>

        <button
          onClick={fetchOverview}
          className="self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-[#14151e] border border-[#262838] hover:border-[#383a52] text-xs text-[#d0d2e0] hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchOverview} className="underline hover:text-white font-medium">Retry</button>
        </div>
      )}

      {/* Section 1: Live Depot Stock Table (Warehouse, Product, In Stock, Reserved, Available) */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm space-y-0">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WarehouseIcon className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Fulfillment and Stock (List)</h2>
          </div>
          <span className="text-xs text-[#727486]">
            {data.stockTable.length} SKU depot locations tracked
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#707284]">Loading inventory...</div>
        ) : data.stockTable.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#707284]">No inventory records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Warehouse</th>
                  <th className="py-3 px-5 font-semibold">Product</th>
                  <th className="py-3 px-5 font-semibold text-right">In Stock</th>
                  <th className="py-3 px-5 font-semibold text-right">Reserved</th>
                  <th className="py-3 px-5 font-semibold text-right text-emerald-400">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {data.stockTable.map((stock) => (
                  <tr key={stock.id} className="hover:bg-[#13141d]">
                    <td className="py-3.5 px-5 font-medium text-white">
                      {stock.warehouse}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="text-white font-medium">{stock.product}</div>
                      <div className="text-[10px] font-mono text-[#6c6e80]">{stock.sku}</div>
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[#a0a2b4]">
                      {stock.inStock}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono text-[#8a8c9e]">
                      {stock.reserved}
                    </td>
                    <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-400">
                      {stock.available}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: Orders Awaiting Fulfillment */}
      <div className="bg-[#0e0f14] border border-[#1b1c26] rounded-2xl overflow-hidden shadow-sm space-y-0">
        <div className="p-4 sm:p-5 border-b border-[#1a1b26] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Orders Awaiting Fulfillment</h2>
          </div>
          <span className="text-xs text-[#727486]">
            {data.ordersAwaiting.length} orders eligible for allocation
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#707284]">Loading orders...</div>
        ) : data.ordersAwaiting.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#707284]">
            No orders currently awaiting warehouse dispatch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#12131b] border-b border-[#1c1d27] text-[#787a8c] uppercase font-mono text-[10px] tracking-wider">
                  <th className="py-3 px-5 font-semibold">Order</th>
                  <th className="py-3 px-5 font-semibold">Customer</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold">Warehouse</th>
                  <th className="py-3 px-5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181923]">
                {data.ordersAwaiting.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/fulfillment/${order.id}`)}
                    className="hover:bg-[#14151e] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-5 font-mono font-semibold text-blue-400 group-hover:text-blue-300">
                      {order.order}
                    </td>
                    <td className="py-3.5 px-5">
                      <div className="font-medium text-white">{order.customer}</div>
                      <div className="text-[10px] text-[#717386]">Tier: {order.customerTier || 'BRONZE'}</div>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-[#c2c4d8] font-medium">
                      {order.warehouse}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <Link
                        href={`/fulfillment/${order.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#181a24] hover:bg-[#202230] border border-[#2b2d3e] text-[11px] font-medium text-[#d8daf0] hover:text-white transition-colors"
                      >
                        <span>Split Detail</span>
                        <ArrowRight className="w-3 h-3 text-[#707286]" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Screen #7 Amber Helper Text Banner (Directly below Orders Table, Muted Dark Gold) */}
      <div className="p-3 rounded-lg bg-[#14120c] border border-[#3d3215] text-xs text-[#c9b276] leading-relaxed flex items-center gap-2">
        <span>Click an order row to open its warehouse split detail.</span>
      </div>
    </div>
  );
}
