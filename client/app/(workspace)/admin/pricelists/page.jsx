'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { Button, Input, Badge, Modal, Spinner, EmptyState } from '../../../../components/ui';
import { 
  Tags, 
  Plus, 
  Search, 
  Calendar, 
  DollarSign, 
  Layers, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export default function AdminPriceListsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [expandedListId, setExpandedListId] = useState(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    customerTier: 'GOLD',
    currency: 'USD',
    pricingRule: '',
  });

  const fetchPriceLists = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await api.get('/admin/pricelists');
      if (res?.data?.items) {
        setPriceLists(res.data.items);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load price lists');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPriceLists();
  }, []);

  const handleCreatePriceList = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setErrorMsg(null);
      await api.post('/admin/pricelists', form);
      setIsModalOpen(false);
      setForm({
        name: '',
        customerTier: 'GOLD',
        currency: 'USD',
        pricingRule: '',
      });
      await fetchPriceLists();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create price list');
    } finally {
      setSubmitting(false);
    }
  };

  const tierBadgeVariants = {
    GOLD: 'warning',
    SILVER: 'neutral',
    BRONZE: 'danger',
  };

  const filteredLists = priceLists.filter((pl) => {
    if (selectedTier === 'ALL') return true;
    return pl.customerTier === selectedTier;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Tags className="w-5 h-5 text-blue-600" />
            Customer Tier Price Lists
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Segment product prices, volume break tiers, and currency rules by customer tier.
          </p>
        </div>

        {isAdmin && (
          <Button 
            onClick={() => { setErrorMsg(null); setIsModalOpen(true); }}
            className="flex items-center gap-1.5 shadow-sm text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4" />
            New Price List
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

      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        {['ALL', 'GOLD', 'SILVER', 'BRONZE'].map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedTier === tier
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tier === 'ALL' ? 'All Tiers' : `${tier} Tier`}
          </button>
        ))}
      </div>

      {/* Price Lists Cards / Table */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <EmptyState
            title="No price lists found"
            description="Create price lists to configure tier-specific volume discounts and currency agreements."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredLists.map((pl) => {
            const isExpanded = expandedListId === pl.id;

            return (
              <div
                key={pl.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setExpandedListId(isExpanded ? null : pl.id)}
                      className="mt-0.5 text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{pl.name}</h3>
                        <Badge variant={tierBadgeVariants[pl.customerTier] || 'neutral'} size="sm">
                          {pl.customerTier}
                        </Badge>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                          {pl.currency}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {pl.pricingRule || 'Standard base pricing policy'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {pl.items?.length || 0} Custom Overrides
                    </span>
                    <Badge variant={pl.isActive ? 'success' : 'neutral'} size="sm">
                      {pl.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>
                </div>

                {/* Overrides Table Drawer */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/70 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                      Custom Item Price Overrides
                    </h4>
                    {(!pl.items || pl.items.length === 0) ? (
                      <p className="text-xs text-slate-400 italic py-2">
                        No product overrides configured yet for this price list. Base catalog prices apply.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <thead className="bg-slate-100/70 text-slate-500 text-[10px] uppercase font-semibold">
                          <tr>
                            <th className="py-2 px-3">Product</th>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3 text-center">Min Quantity</th>
                            <th className="py-2 px-3 text-right">Negotiated Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {pl.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2 px-3 font-medium text-slate-900">{item.product?.name}</td>
                              <td className="py-2 px-3 font-mono text-blue-600">{item.product?.sku}</td>
                              <td className="py-2 px-3 text-center font-mono">{item.minimumQuantity}</td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                ${Number(item.unitPrice).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: New Price List */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Customer Price List"
      >
        <form onSubmit={handleCreatePriceList} className="space-y-3 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Price List Name *</label>
            <Input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Gold Strategic Accounts 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Target Customer Tier *</label>
              <select
                value={form.customerTier}
                onChange={(e) => setForm({ ...form, customerTier: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="GOLD">GOLD</option>
                <option value="SILVER">SILVER</option>
                <option value="BRONZE">BRONZE</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Currency Code (ISO)</label>
              <Input
                required
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                placeholder="USD, EUR, INR"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Pricing Rule Formula / Description</label>
            <Input
              value={form.pricingRule}
              onChange={(e) => setForm({ ...form, pricingRule: e.target.value })}
              placeholder="e.g. Volume discount on orders > 10 units"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Price List
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
