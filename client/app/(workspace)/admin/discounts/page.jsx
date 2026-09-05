'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../context/AuthContext';
import { Button, Input, Badge, Spinner } from '../../../../components/ui';
import { 
  Sliders, 
  Percent, 
  ShieldCheck, 
  Layers, 
  AlertCircle, 
  Check, 
  Edit3,
  ArrowRight
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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          Discount Governance & Escalation Rules
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure maximum allowable discounts per tier and category, and set mandatory escalation rules for quotation approvals.
        </p>
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
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Discount Tiers */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-blue-600" />
                  Customer Tier Discount Ceilings
                </h3>
                <p className="text-[11px] text-slate-500">
                  Standard baseline discounts granted per account relationship tier.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {tiers.map((t) => {
                const isEditing = editingTierId === t.id;

                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900">{t.customerTier}</span>
                      <div className="text-[10px] text-slate-500">Tier Maximum Policy</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={tierVal}
                            onChange={(e) => setTierVal(e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 text-right font-mono"
                          />
                          <span className="text-xs font-mono">%</span>
                          <button
                            onClick={() => handleUpdateTier(t.id)}
                            className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-mono text-slate-900">
                            {t.maxDiscountPercent}%
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingTierId(t.id);
                                setTierVal(String(t.maxDiscountPercent));
                              }}
                              className="text-slate-400 hover:text-slate-700 p-1"
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
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  Category Discount Ceilings
                </h3>
                <p className="text-[11px] text-slate-500">
                  Strict margin guards to protect high-cost categories from excessive discounts.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {ceilings.map((c) => {
                const isEditing = editingCeilingId === c.id;

                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50/60"
                  >
                    <div>
                      <span className="font-bold text-xs text-slate-900">{c.category}</span>
                      <div className="text-[10px] text-slate-500">Margin Guardrail</div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={ceilingVal}
                            onChange={(e) => setCeilingVal(e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500 text-right font-mono"
                          />
                          <span className="text-xs font-mono">%</span>
                          <button
                            onClick={() => handleUpdateCeiling(c.id)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold font-mono text-slate-900">
                            {c.maxDiscountPercent}%
                          </span>
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setEditingCeilingId(c.id);
                                setCeilingVal(String(c.maxDiscountPercent));
                              }}
                              className="text-slate-400 hover:text-slate-700 p-1"
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

          {/* Full Width: Approval Chain Escalation Rules */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Approval Escalation Matrix
              </h3>
              <p className="text-[11px] text-slate-500">
                Determines required management sign-offs when sales representatives exceed baseline discounts.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rules.map((r) => {
                const isEditing = editingRuleId === r.id;

                return (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Step #{r.orderIndex}
                        </span>
                        <Badge variant={r.requiredRole === 'FINANCE' ? 'danger' : r.requiredRole === 'SALES_MANAGER' ? 'warning' : 'neutral'} size="sm">
                          {r.requiredRole}
                        </Badge>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-slate-800">
                          Overage Range
                        </div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          {r.minimumOverage}% <span className="text-slate-400 font-sans">to</span> {r.maximumOverage}%
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-400">
                        {r.maximumOverage === 0 ? 'Auto-approved' : 'Mandatory Approval'}
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
                                className="w-14 px-1.5 py-0.5 text-xs border border-purple-400 rounded text-right font-mono"
                              />
                              <button
                                onClick={() => handleUpdateRule(r.id)}
                                className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700"
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
                              className="text-xs text-purple-600 hover:text-purple-800 font-semibold"
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
