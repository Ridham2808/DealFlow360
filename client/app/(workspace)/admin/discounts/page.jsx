'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Percent,
  ShieldCheck,
  Layers,
  AlertTriangle,
  Check,
  Save,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AdminDiscountsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Data states
  const [tiers, setTiers] = useState([]);
  const [ceilings, setCeilings] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Form field state maps
  const [tierValues, setTierValues] = useState({}); // { [id]: number | string }
  const [ceilingValues, setCeilingValues] = useState({}); // { [id]: number | string }
  const [ruleValues, setRuleValues] = useState({}); // { [id]: { minimumOverage, maximumOverage, requiredRole, isActive } }

  // Row-level saving state
  const [rowSaving, setRowSaving] = useState({}); // { [key]: boolean }

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [tiersRes, ceilingsRes, rulesRes] = await Promise.all([
        api.get('/admin/discount-tiers'),
        api.get('/admin/category-ceilings'),
        api.get('/admin/approval-chain-rules'),
      ]);

      const tList = tiersRes?.data || [];
      const cList = ceilingsRes?.data || [];
      const rList = (rulesRes?.data || []).sort((a, b) => a.orderIndex - b.orderIndex);

      setTiers(tList);
      setCeilings(cList);
      setRules(rList);

      // Initialize form values
      const tMap = {};
      tList.forEach((t) => {
        tMap[t.id] = String(t.maxDiscountPercent);
      });
      setTierValues(tMap);

      const cMap = {};
      cList.forEach((c) => {
        cMap[c.id] = String(c.maxDiscountPercent);
      });
      setCeilingValues(cMap);

      const rMap = {};
      rList.forEach((r) => {
        rMap[r.id] = {
          minimumOverage: String(r.minimumOverage),
          maximumOverage: String(r.maximumOverage),
          requiredRole: r.requiredRole,
          isActive: r.isActive !== false,
        };
      });
      setRuleValues(rMap);
    } catch (err) {
      console.error('Failed to load governance config:', err);
      setErrorMsg(err.message || 'Failed to load configuration parameters');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Save a single tier
  const handleSaveTier = async (id) => {
    try {
      setRowSaving((prev) => ({ ...prev, [`tier-${id}`]: true }));
      setErrorMsg(null);
      const val = parseFloat(tierValues[id]);
      if (isNaN(val) || val < 0 || val > 100) {
        throw new Error('Discount ceiling must be between 0 and 100%.');
      }

      await api.patch(`/admin/discount-tiers/${id}`, {
        maxDiscountPercent: val,
      });

      showToast('Tier discount ceiling updated.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update discount tier');
    } finally {
      setRowSaving((prev) => ({ ...prev, [`tier-${id}`]: false }));
    }
  };

  // Save a single category ceiling
  const handleSaveCeiling = async (id) => {
    try {
      setRowSaving((prev) => ({ ...prev, [`ceiling-${id}`]: true }));
      setErrorMsg(null);
      const val = parseFloat(ceilingValues[id]);
      if (isNaN(val) || val < 0 || val > 100) {
        throw new Error('Category ceiling must be between 0 and 100%.');
      }

      await api.patch(`/admin/category-ceilings/${id}`, {
        maxDiscountPercent: val,
      });

      showToast('Category discount ceiling updated.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update category ceiling');
    } finally {
      setRowSaving((prev) => ({ ...prev, [`ceiling-${id}`]: false }));
    }
  };

  // Save a single approval rule
  const handleSaveRule = async (id) => {
    try {
      setRowSaving((prev) => ({ ...prev, [`rule-${id}`]: true }));
      setErrorMsg(null);
      const r = ruleValues[id];
      const minVal = parseFloat(r.minimumOverage);
      const maxVal = parseFloat(r.maximumOverage);

      if (isNaN(minVal) || minVal < 0) {
        throw new Error('Minimum overage must be non-negative.');
      }
      if (isNaN(maxVal) || maxVal < minVal) {
        throw new Error('Maximum overage cannot be less than minimum overage.');
      }

      await api.patch(`/admin/approval-chain-rules/${id}`, {
        minimumOverage: minVal,
        maximumOverage: maxVal,
        requiredRole: r.requiredRole,
        isActive: r.isActive,
      });

      showToast('Approval chain rule updated.');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update approval rule');
    } finally {
      setRowSaving((prev) => ({ ...prev, [`rule-${id}`]: false }));
    }
  };

  // Save entire configuration at once (Primary "Save Configuration" button)
  const handleSaveAllConfiguration = async () => {
    try {
      setSavingAll(true);
      setErrorMsg(null);

      const promises = [];

      // Tiers
      tiers.forEach((t) => {
        const val = parseFloat(tierValues[t.id]);
        if (!isNaN(val)) {
          promises.push(api.patch(`/admin/discount-tiers/${t.id}`, { maxDiscountPercent: val }));
        }
      });

      // Ceilings
      ceilings.forEach((c) => {
        const val = parseFloat(ceilingValues[c.id]);
        if (!isNaN(val)) {
          promises.push(api.patch(`/admin/category-ceilings/${c.id}`, { maxDiscountPercent: val }));
        }
      });

      // Rules
      rules.forEach((r) => {
        const rv = ruleValues[r.id];
        if (rv) {
          const minVal = parseFloat(rv.minimumOverage);
          const maxVal = parseFloat(rv.maximumOverage);
          if (!isNaN(minVal) && !isNaN(maxVal) && maxVal >= minVal) {
            promises.push(
              api.patch(`/admin/approval-chain-rules/${r.id}`, {
                minimumOverage: minVal,
                maximumOverage: maxVal,
                requiredRole: rv.requiredRole,
                isActive: rv.isActive,
              })
            );
          }
        }
      });

      await Promise.all(promises);
      showToast('All discount governance configurations saved successfully.');
      await fetchData();
    } catch (err) {
      console.error('Save all error:', err);
      setErrorMsg(err.message || 'Failed to save entire configuration');
    } finally {
      setSavingAll(false);
    }
  };

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
        {/* ═══════════════ HEADER & PRIMARY SAVE ACTION ═══════════════ */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-[#181920] pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Sliders className="w-5 h-5 text-[#3b82f6]" />
              <h1 className="text-xl font-semibold tracking-tight text-white">Discount Tiers & Approval Chains</h1>
            </div>
            <p className="text-xs text-[#71717a] mt-1">
              Configure baseline customer tier ceilings, category margin safety thresholds, and sequential role
              escalation chains.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveAllConfiguration}
            disabled={savingAll || loading}
            className="h-9 px-4 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-medium text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer self-start md:self-auto"
          >
            {savingAll ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Configuration...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>

        {/* Global Error Notice */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#231215] border border-[#481c23] text-[#fb7185] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-[#fb7185]/70 hover:text-[#fb7185]">
              ✕
            </button>
          </div>
        )}

        {/* ═══════════════ AMBER NOTIFICATION BANNER (MOCKUP-FAITHFUL) ═══════════════ */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#1c1508] border border-[#422e11] text-[#f59e0b] text-xs leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#f59e0b] mt-0.5" />
          <p>
            Blended risk score evaluates deal margin, customer credit tier, and cumulative discount overages. Any
            discount exceeding tier or category ceilings triggers sequential approval chains recorded in immutable audit
            logs.
          </p>
        </div>

        {loading ? (
          <div className="py-20 flex items-center justify-center text-xs text-[#888] gap-2 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-[#2563eb]" />
            Loading discount governance parameters...
          </div>
        ) : (
          <div className="space-y-6">
            {/* ═══════════════ TOP 2 CARDS: TIERS & CATEGORY CEILINGS ═══════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card 1: Tier Discount Ceilings */}
              <div className="bg-[#0e0f14] rounded-2xl border border-[#1d1f2b] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#181924] pb-3">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#3b82f6]" />
                    <h2 className="text-sm font-semibold text-white">Tier Discount Ceilings</h2>
                  </div>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Standard relationship tier cap. Quotations with discounts up to this ceiling require no manager
                    escalation.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {tiers.map((t) => {
                    const isSaving = rowSaving[`tier-${t.id}`];

                    return (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[#1a1c26] bg-[#12131c] hover:border-[#262838] transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                t.customerTier === 'PLATINUM'
                                  ? 'bg-[#181329] text-[#c084fc] border-[#381e5b]'
                                  : t.customerTier === 'GOLD'
                                  ? 'bg-[#221c09] text-[#fbbf24] border-[#4b3e15]'
                                  : t.customerTier === 'SILVER'
                                  ? 'bg-[#161a22] text-[#94a3b8] border-[#293548]'
                                  : 'bg-[#1e1511] text-[#fb923c] border-[#452718]'
                              }`}
                            >
                              {t.customerTier}
                            </span>
                            <span className="text-xs font-medium text-white">{t.customerTier} Tier Ceiling</span>
                          </div>
                          <div className="text-[10px] text-[#71717a]">Baseline auto-approval threshold</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              disabled={!isAdmin}
                              value={tierValues[t.id] ?? ''}
                              onChange={(e) => setTierValues({ ...tierValues, [t.id]: e.target.value })}
                              className="w-20 px-2.5 py-1 text-xs bg-[#161822] border border-[#262838] rounded-lg text-white text-right font-mono focus:outline-none focus:border-[#3b82f6] disabled:opacity-60"
                            />
                            <span className="absolute right-7 pointer-events-none text-xs text-[#71717a] font-mono">
                              %
                            </span>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSaveTier(t.id)}
                              disabled={isSaving}
                              className="h-7 px-2.5 rounded-lg bg-[#161722] hover:bg-[#202230] border border-[#262838] text-[11px] font-medium text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Save Tier"
                            >
                              {isSaving ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 text-[#34d399]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Card 2: Category Discount Ceilings */}
              <div className="bg-[#0e0f14] rounded-2xl border border-[#1d1f2b] p-6 shadow-sm space-y-4">
                <div className="border-b border-[#181924] pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#10b981]" />
                    <h2 className="text-sm font-semibold text-white">Category Discount Ceilings</h2>
                  </div>
                  <p className="text-[11px] text-[#71717a] mt-0.5">
                    Hard categorical margin guardrails protecting high COGS hardware and delivery service margins.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {ceilings.map((c) => {
                    const isSaving = rowSaving[`ceiling-${c.id}`];

                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3.5 rounded-xl border border-[#1a1c26] bg-[#12131c] hover:border-[#262838] transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                c.category === 'HARDWARE'
                                  ? 'bg-[#092317] text-[#34d399] border-[#134e2c]'
                                  : c.category === 'SERVICES'
                                  ? 'bg-[#0f2137] text-[#60a5fa] border-[#1e3a5f]'
                                  : 'bg-[#241334] text-[#c084fc] border-[#4c246f]'
                              }`}
                            >
                              {c.category}
                            </span>
                            <span className="text-xs font-medium text-white">{c.category} Margin Guard</span>
                          </div>
                          <div className="text-[10px] text-[#71717a]">Maximum permissible discount on line items</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max="100"
                              disabled={!isAdmin}
                              value={ceilingValues[c.id] ?? ''}
                              onChange={(e) => setCeilingValues({ ...ceilingValues, [c.id]: e.target.value })}
                              className="w-20 px-2.5 py-1 text-xs bg-[#161822] border border-[#262838] rounded-lg text-white text-right font-mono focus:outline-none focus:border-[#3b82f6] disabled:opacity-60"
                            />
                            <span className="absolute right-7 pointer-events-none text-xs text-[#71717a] font-mono">
                              %
                            </span>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleSaveCeiling(c.id)}
                              disabled={isSaving}
                              className="h-7 px-2.5 rounded-lg bg-[#161722] hover:bg-[#202230] border border-[#262838] text-[11px] font-medium text-white transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Save Ceiling"
                            >
                              {isSaving ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3 text-[#34d399]" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ═══════════════ FULL WIDTH: DISCOUNT RANGE & ORDERED ROLE CHAINS ═══════════════ */}
            <div className="bg-[#0e0f14] rounded-2xl border border-[#1d1f2b] p-6 shadow-sm space-y-6">
              <div className="border-b border-[#181924] pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#a855f7]" />
                  <h2 className="text-sm font-semibold text-white">Sequential Role Escalation Chains</h2>
                </div>
                <p className="text-[11px] text-[#71717a] mt-0.5">
                  Ordered multi-level approval triggers based on discount overage ranges. Escalation flows sequentially
                  from Sales Manager to Finance.
                </p>
              </div>

              {/* Chain Diagram Flow */}
              <div className="p-4 rounded-xl bg-[#12141d] border border-[#1e202d] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-[#71717a]">
                  <span className="w-6 h-6 rounded-full bg-[#181a24] border border-[#2b2e42] flex items-center justify-center font-mono text-[11px] text-white">
                    0
                  </span>
                  <div>
                    <div className="text-white font-medium">Standard Pricing</div>
                    <div className="text-[10px]">Within Tier / Cat Ceilings</div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#444] hidden md:block" />

                <div className="flex items-center gap-2 text-[#71717a]">
                  <span className="w-6 h-6 rounded-full bg-[#141d30] border border-[#1e3a5f] flex items-center justify-center font-mono text-[11px] text-[#60a5fa]">
                    1
                  </span>
                  <div>
                    <div className="text-white font-medium">Sales Manager</div>
                    <div className="text-[10px]">Overages &le; 10%</div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#444] hidden md:block" />

                <div className="flex items-center gap-2 text-[#71717a]">
                  <span className="w-6 h-6 rounded-full bg-[#281525] border border-[#521c4b] flex items-center justify-center font-mono text-[11px] text-[#f472b6]">
                    2
                  </span>
                  <div>
                    <div className="text-white font-medium">Finance Director</div>
                    <div className="text-[10px]">Overages &gt; 10%</div>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#444] hidden md:block" />

                <div className="flex items-center gap-2 text-[#71717a]">
                  <span className="w-6 h-6 rounded-full bg-[#2b1915] border border-[#5c281e] flex items-center justify-center font-mono text-[11px] text-[#fb923c]">
                    3
                  </span>
                  <div>
                    <div className="text-white font-medium">Executive Admin</div>
                    <div className="text-[10px]">Strict Loss Protection</div>
                  </div>
                </div>
              </div>

              {/* Approval Chain Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rules.map((r) => {
                  const rv = ruleValues[r.id] || {
                    minimumOverage: String(r.minimumOverage),
                    maximumOverage: String(r.maximumOverage),
                    requiredRole: r.requiredRole,
                    isActive: r.isActive !== false,
                  };
                  const isSaving = rowSaving[`rule-${r.id}`];

                  return (
                    <div
                      key={r.id}
                      className="p-5 rounded-xl border border-[#1d1e2a] bg-[#12131d] flex flex-col justify-between space-y-4 hover:border-[#27293b] transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a] flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
                            Step #{r.orderIndex}
                          </span>

                          <span
                            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${
                              rv.requiredRole === 'FINANCE'
                                ? 'bg-[#221020] text-[#f472b6] border-[#4e1b46]'
                                : rv.requiredRole === 'ADMIN'
                                ? 'bg-[#261513] text-[#fb923c] border-[#55291e]'
                                : 'bg-[#151c2e] text-[#60a5fa] border-[#22395d]'
                            }`}
                          >
                            {rv.requiredRole}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-semibold text-white">Discount Overage Trigger Range</div>
                          <p className="text-[10px] text-[#71717a] mt-0.5">
                            Additional discount percentage beyond standard ceilings.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <label className="block text-[10px] text-[#888] mb-1">Min Overage (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              disabled={!isAdmin}
                              value={rv.minimumOverage}
                              onChange={(e) =>
                                setRuleValues({
                                  ...ruleValues,
                                  [r.id]: { ...rv, minimumOverage: e.target.value },
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-[#161824] border border-[#25283a] font-mono text-xs text-white focus:outline-none focus:border-[#3b82f6] disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] text-[#888] mb-1">Max Overage (%)</label>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              disabled={!isAdmin}
                              value={rv.maximumOverage}
                              onChange={(e) =>
                                setRuleValues({
                                  ...ruleValues,
                                  [r.id]: { ...rv, maximumOverage: e.target.value },
                                })
                              }
                              className="w-full px-2 py-1.5 rounded-lg bg-[#161824] border border-[#25283a] font-mono text-xs text-white focus:outline-none focus:border-[#3b82f6] disabled:opacity-60"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#181926] flex items-center justify-between">
                        <span className="text-[10px] font-mono text-[#71717a]">
                          {parseFloat(rv.maximumOverage) === 0 ? 'AUTO APPROVED' : 'SEQUENTIAL SIGN-OFF'}
                        </span>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleSaveRule(r.id)}
                            disabled={isSaving}
                            className="h-7 px-3 rounded-lg bg-[#161722] hover:bg-[#202230] border border-[#262838] text-[11px] font-medium text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isSaving ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <Check className="w-3 h-3 text-[#34d399]" />
                                <span>Save Step</span>
                              </>
                            )}
                          </button>
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
    </div>
  );
}
