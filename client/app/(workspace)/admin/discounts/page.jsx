'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Sliders, 
  Percent, 
  ShieldCheck, 
  Layers, 
  AlertCircle, 
  Check, 
  Edit3
} from 'lucide-react';

export default function AdminDiscountsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tiers, setTiers] = useState([]);
  const [ceilings, setCeilings] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Edit states
  const [editingTierId, setEditingTierId] = useState(null);
  const [tierVal, setTierVal] = useState('');

  const [editingCeilingId, setEditingCeilingId] = useState(null);
  const [ceilingVal, setCeilingVal] = useState('');

  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleMaxVal, setRuleMaxVal] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [tiersRes, ceilingsRes, rulesRes] = await Promise.all([
        api.get('/admin/discount-tiers'),
        api.get('/admin/category-ceilings'),
        api.get('/admin/approval-chain-rules'),
      ]);

      if (tiersRes?.data) setTiers(tiersRes.data);
      if (ceilingsRes?.data) setCeilings(ceilingsRes.data);
      if (rulesRes?.data) setRules(rulesRes.data);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load configuration parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateTier = async (id) => {
    try {
      setErrorMsg(null);
      await api.patch(`/admin/discount-tiers/${id}`, {
        maxDiscountPercent: parseFloat(tierVal),
      });
      setEditingTierId(null);
      setSuccessMsg('Discount tier updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update discount tier');
    }
  };

  const handleUpdateCeiling = async (id) => {
    try {
      setErrorMsg(null);
      await api.patch(`/admin/category-ceilings/${id}`, {
        maxDiscountPercent: parseFloat(ceilingVal),
      });
      setEditingCeilingId(null);
      setSuccessMsg('Category ceiling updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update category ceiling');
    }
  };

  const handleUpdateRule = async (id) => {
    try {
      setErrorMsg(null);
      await api.patch(`/admin/approval-chain-rules/${id}`, {
        maximumOverage: parseFloat(ruleMaxVal),
      });
      setEditingRuleId(null);
      setSuccessMsg('Approval rule threshold updated.');
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update approval rule');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#ededed] flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-[#3b82f6]" />
          Discount Governance & Escalations
        </h1>
        <p className="text-xs text-[#71717a] mt-1">
          Configure maximum allowable discounts per tier and category, and set mandatory escalation rules for quotation approvals
        </p>
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
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <span className="text-xs text-[#555] font-mono">Loading governance rules...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Column 1: Discount Tiers */}
          <div className="bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] p-5 space-y-3">
            <div className="border-b border-[#18181f] pb-3">
              <h3 className="font-semibold text-sm text-[#ededed] flex items-center gap-2">
                <Percent className="w-4 h-4 text-[#3b82f6]" />
                Customer Tier Discount Ceilings
              </h3>
              <p className="text-[11px] text-[#71717a] mt-0.5">
                Standard baseline discounts granted per account relationship tier
              </p>
            </div>

            <div className="space-y-2.5">
              {tiers.map((t) => {
                const isEditing = editingTierId === t.id;

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#1d1e24] bg-[#111216]"
                  >
                    <div>
                      <span className="font-semibold text-xs text-[#ededed]">{t.customerTier}</span>
                      <div className="text-[10px] text-[#555]">Relationship Tier Cap</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={tierVal}
                            onChange={(e) => setTierVal(e.target.value)}
                            className="w-16 px-2 py-1 text-xs bg-[#181820] border border-[#3b82f6] rounded text-[#ededed] text-right font-mono focus:outline-none"
                          />
                          <span className="text-xs font-mono text-[#71717a]">%</span>
                          <button
                            onClick={() => handleUpdateTier(t.id)}
                            className="p-1 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-mono text-[#ededed]">
                            {t.maxDiscountPercent}%
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingTierId(t.id);
                                setTierVal(String(t.maxDiscountPercent));
                              }}
                              className="text-[#555] hover:text-[#ededed] p-1 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Category Ceilings */}
          <div className="bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] p-5 space-y-3">
            <div className="border-b border-[#18181f] pb-3">
              <h3 className="font-semibold text-sm text-[#ededed] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#10b981]" />
                Category Discount Ceilings
              </h3>
              <p className="text-[11px] text-[#71717a] mt-0.5">
                Strict margin guards to protect high-cost categories from excessive discounts
              </p>
            </div>

            <div className="space-y-2.5">
              {ceilings.map((c) => {
                const isEditing = editingCeilingId === c.id;

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-[#1d1e24] bg-[#111216]"
                  >
                    <div>
                      <span className="font-semibold text-xs text-[#ededed]">{c.category}</span>
                      <div className="text-[10px] text-[#555]">Hard Margin Floor</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={ceilingVal}
                            onChange={(e) => setCeilingVal(e.target.value)}
                            className="w-16 px-2 py-1 text-xs bg-[#181820] border border-[#10b981] rounded text-[#ededed] text-right font-mono focus:outline-none"
                          />
                          <span className="text-xs font-mono text-[#71717a]">%</span>
                          <button
                            onClick={() => handleUpdateCeiling(c.id)}
                            className="p-1 bg-[#10b981] text-white rounded hover:bg-[#059669]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-mono text-[#ededed]">
                            {c.maxDiscountPercent}%
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingCeilingId(c.id);
                                setCeilingVal(String(c.maxDiscountPercent));
                              }}
                              className="text-[#555] hover:text-[#ededed] p-1 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full Width: Approval Escalation Matrix */}
          <div className="lg:col-span-2 bg-[#0b0c0e] rounded-2xl border border-[#1c1c22] p-5 space-y-3">
            <div className="border-b border-[#18181f] pb-3">
              <h3 className="font-semibold text-sm text-[#ededed] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#a855f7]" />
                Approval Escalation Matrix
              </h3>
              <p className="text-[11px] text-[#71717a] mt-0.5">
                Required sign-offs triggered when quotation discounts exceed category or tier limits
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {rules.map((r) => {
                const isEditing = editingRuleId === r.id;

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-[#1d1e24] bg-[#111216] flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                          Step #{r.orderIndex}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#1a1528] text-[#c084fc] border border-[#3b2d56]">
                          {r.requiredRole}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-[#ededed]">
                          Overage Range
                        </div>
                        <div className="text-xs text-[#71717a] mt-1 font-mono">
                          {r.minimumOverage}% <span className="text-[#555] font-sans">to</span> {r.maximumOverage}%
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[#1a1b22] flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-[#52525b]">
                        {r.maximumOverage === 0 ? 'AUTO-APPROVED' : 'APPROVAL REQUIRED'}
                      </span>
                      {isAdmin && (
                        <div>
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                value={ruleMaxVal}
                                onChange={(e) => setRuleMaxVal(e.target.value)}
                                className="w-14 px-1.5 py-0.5 text-xs bg-[#181820] border border-[#a855f7] rounded text-right font-mono text-[#ededed] focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateRule(r.id)}
                                className="p-1 bg-[#a855f7] text-white rounded hover:bg-[#9333ea]"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingRuleId(r.id);
                                setRuleMaxVal(String(r.maximumOverage));
                              }}
                              className="text-xs text-[#a855f7] hover:text-[#c084fc] font-semibold"
                            >
                              Edit Max
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
