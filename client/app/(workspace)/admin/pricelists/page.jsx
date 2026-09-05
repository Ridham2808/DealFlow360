'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Tags, 
  Plus, 
  Layers, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  X
} from 'lucide-react';

export default function AdminPriceListsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [priceLists, setPriceLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
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
      setSuccessMsg('Price list created successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
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

  const filteredLists = priceLists.filter((pl) => {
    if (selectedTier === 'ALL') return true;
    return pl.customerTier === selectedTier;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed] flex items-center gap-2.5">
            <Tags className="w-5 h-5 text-[#3b82f6]" />
            Customer Tier Price Lists
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Segment product prices, volume break tiers, and currency rules by customer tier
          </p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => { setErrorMsg(null); setIsModalOpen(true); }}
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Price List</span>
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

      {/* Tier Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[#1c1c22] pb-3">
        {['ALL', 'GOLD', 'SILVER', 'BRONZE'].map((tier) => (
          <button
            key={tier}
            onClick={() => setSelectedTier(tier)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTier === tier
                ? 'bg-[#18181b] text-white border border-[#2e2e34]'
                : 'text-[#71717a] hover:text-[#d4d4cf] hover:bg-[#121318]'
            }`}
          >
            {tier === 'ALL' ? 'All Tiers' : `${tier} Tier`}
          </button>
        ))}
      </div>

      {/* Price Lists Cards */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <span className="text-xs text-[#555] font-mono">Loading price lists...</span>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] p-12 text-center text-xs text-[#555]">
          No price lists found for the selected tier.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredLists.map((pl) => {
            const isExpanded = expandedListId === pl.id;

            return (
              <div
                key={pl.id}
                className="bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] overflow-hidden transition-all hover:border-[#2a2a34]"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => setExpandedListId(isExpanded ? null : pl.id)}
                      className="mt-0.5 text-[#555] hover:text-[#ededed] p-1 rounded transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-[#ededed]">{pl.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-[#14151b] border border-[#222228] text-[#a1a1aa]">
                          {pl.customerTier}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#16171d] text-[#60a5fa] border border-[#1e293b]">
                          {pl.currency}
                        </span>
                      </div>
                      <p className="text-xs text-[#71717a] mt-1">
                        {pl.pricingRule || 'Standard baseline discount schedule'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#71717a]">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#555]" />
                      {pl.items?.length || 0} Custom Overrides
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                      pl.isActive ? 'bg-[#0f1914] text-[#34d399] border border-[#16382a]' : 'bg-[#18181b] text-[#71717a]'
                    }`}>
                      {pl.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>

                {/* Overrides Table Drawer */}
                {isExpanded && (
                  <div className="border-t border-[#1c1c22] bg-[#0e0f13] p-4">
                    <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] mb-2.5">
                      Custom Item Price Overrides
                    </h4>
                    {(!pl.items || pl.items.length === 0) ? (
                      <p className="text-xs text-[#52525b] italic py-2">
                        No product overrides configured yet for this price list. Base catalog prices apply.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs bg-[#111216] rounded-xl border border-[#1c1c22] overflow-hidden">
                        <thead className="bg-[#14151b] text-[#71717a] text-[10px] uppercase font-mono">
                          <tr>
                            <th className="py-2.5 px-3">Product</th>
                            <th className="py-2.5 px-3">SKU</th>
                            <th className="py-2.5 px-3 text-center">Min Quantity</th>
                            <th className="py-2.5 px-3 text-right">Negotiated Unit Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#18181f] text-[#a1a1aa]">
                          {pl.items.map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 px-3 font-medium text-[#ededed]">{item.product?.name}</td>
                              <td className="py-2.5 px-3 font-mono text-[#3b82f6]">{item.product?.sku}</td>
                              <td className="py-2.5 px-3 text-center font-mono">{item.minimumQuantity}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#ededed]">
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e0f13] border border-[#222228] rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c1c22] pb-3">
              <h3 className="text-sm font-bold text-[#ededed]">Create Customer Price List</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#555] hover:text-[#ededed]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePriceList} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a1a1aa] mb-1">Price List Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Gold Strategic Accounts 2026"
                  className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Target Customer Tier *</label>
                  <select
                    value={form.customerTier}
                    onChange={(e) => setForm({ ...form, customerTier: e.target.value })}
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                  >
                    <option value="GOLD">GOLD</option>
                    <option value="SILVER">SILVER</option>
                    <option value="BRONZE">BRONZE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#a1a1aa] mb-1">Currency Code (ISO)</label>
                  <input
                    required
                    maxLength={3}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs font-mono focus:outline-none focus:border-[#444]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a1a1aa] mb-1">Pricing Rule Description</label>
                <input
                  value={form.pricingRule}
                  onChange={(e) => setForm({ ...form, pricingRule: e.target.value })}
                  placeholder="e.g. Volume discount on orders > 10 units"
                  className="w-full px-3 py-2 bg-[#14151b] border border-[#25252d] rounded-lg text-[#ededed] text-xs focus:outline-none focus:border-[#444]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#1c1c22]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-[#71717a] hover:text-[#ededed] hover:bg-[#18181f]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Price List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
