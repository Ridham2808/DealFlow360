'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../lib/api';
import {
  BarChart3,
  Download,
  RefreshCw,
  Clock,
  Sparkles,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Filter,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Layers,
  ChevronDown
} from 'lucide-react';

export default function AdminReportingDashboard() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'xlsx' | null
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    kpis: {
      quotesCreated: 0,
      ordersConverted: 0,
      conversionRate: 0,
      grossRevenue: 0,
      totalDiscount: 0,
      avgMarginPercent: 0,
      avgApprovalTimeHours: 2.4,
      atRiskQuotesCount: 0,
      topUpsellProduct: 'Docking Station',
    },
    topProducts: [],
    productsReference: [],
    quotations: [],
  });

  // Filter State
  const [period, setPeriod] = useState('ALL');
  const [salesRepId, setSalesRepId] = useState('ALL');
  const [approvalStatus, setApprovalStatus] = useState('ALL');
  const [productCategory, setProductCategory] = useState('ALL');

  // Reps list
  const [salesReps, setSalesReps] = useState([]);

  // Fetch sales reps for filter dropdown
  useEffect(() => {
    async function loadReps() {
      try {
        const res = await api.get('/admin/users');
        const users = res?.data?.users || [];
        setSalesReps(users.filter((u) => u.role === 'SALES_REP' || u.role === 'SALES_MANAGER'));
      } catch {
        // Ignore if user lacks permission to list all users
      }
    }
    loadReps();
  }, []);

  // Fetch reporting metrics from backend
  const fetchReportData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (period !== 'ALL') params.append('period', period.toLowerCase());
      if (salesRepId !== 'ALL') params.append('salesRepId', salesRepId);
      if (approvalStatus !== 'ALL') params.append('approvalStatus', approvalStatus);
      if (productCategory !== 'ALL') params.append('productCategory', productCategory);

      const res = await api.get(`/reports/summary?${params.toString()}`);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report telemetry.');
    } finally {
      setLoading(false);
    }
  }, [period, salesRepId, approvalStatus, productCategory]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Handle real server file export (PDF or XLSX)
  const handleExport = async (format) => {
    try {
      setExporting(format);
      const params = new URLSearchParams();
      params.append('format', format);
      if (period !== 'ALL') params.append('period', period.toLowerCase());
      if (salesRepId !== 'ALL') params.append('salesRepId', salesRepId);
      if (approvalStatus !== 'ALL') params.append('approvalStatus', approvalStatus);
      if (productCategory !== 'ALL') params.append('productCategory', productCategory);

      const res = await fetch(`http://localhost:5000/api/reports/export?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`Export failed with HTTP ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dealflow360-report-${new Date().toISOString().slice(0, 10)}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(null);
    }
  };

  const resetFilters = () => {
    setPeriod('ALL');
    setSalesRepId('ALL');
    setApprovalStatus('ALL');
    setProductCategory('ALL');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header: Admin / Reporting Dashboard (Optional) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#222533] pb-5">
        <div>
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
            Executive Telemetry
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Admin / Reporting Dashboard <span className="text-xs font-normal text-[#8e95a5]">(Optional)</span>
          </h1>
          <p className="text-xs text-[#8e95a5] mt-1">
            Authoritative revenue analytics, approval speed, and catalog compliance generated directly from operational transactions.
          </p>
        </div>

        {/* Real Export Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c202e] hover:bg-[#252a3d] border border-[#2e3347] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting === 'pdf' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
            ) : (
              <FileText className="w-3.5 h-3.5 text-red-400" />
            )}
            <span>Export PDF</span>
          </button>

          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting !== null}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1c202e] hover:bg-[#252a3d] border border-[#2e3347] text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {exporting === 'xlsx' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Export XLS</span>
          </button>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 rounded-lg bg-[#12141a] border border-[#222533] text-[#8e95a5] hover:text-white hover:bg-[#1c202e] transition-colors"
            title="Refresh reports"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Compact Filter Row: Period, Sales Team, Approval Status, Product Category */}
      <div className="bg-[#12141a] border border-[#222533] rounded-xl p-3.5 flex flex-wrap items-center gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-1.5 text-[#8e95a5] font-medium mr-1">
          <Filter className="w-3.5 h-3.5 text-blue-400" />
          <span>Filters:</span>
        </div>

        {/* Period Filter */}
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="bg-[#0a0c10] border border-[#272a38] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-blue-500"
        >
          <option value="ALL">Period: All Time</option>
          <option value="TODAY">Period: Today</option>
          <option value="WEEK">Period: Last 7 Days</option>
          <option value="MONTH">Period: Last 30 Days</option>
        </select>

        {/* Sales Team Filter */}
        <select
          value={salesRepId}
          onChange={(e) => setSalesRepId(e.target.value)}
          className="bg-[#0a0c10] border border-[#272a38] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-blue-500 max-w-[160px]"
        >
          <option value="ALL">Sales Team: All Reps</option>
          {salesReps.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.name}
            </option>
          ))}
        </select>

        {/* Approval Status Filter */}
        <select
          value={approvalStatus}
          onChange={(e) => setApprovalStatus(e.target.value)}
          className="bg-[#0a0c10] border border-[#272a38] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-blue-500"
        >
          <option value="ALL">Status: All Statuses</option>
          <option value="DRAFT">Status: Draft</option>
          <option value="PENDING_APPROVAL">Status: Pending Approval</option>
          <option value="APPROVED">Status: Approved</option>
          <option value="CONFIRMED">Status: Confirmed</option>
          <option value="REJECTED">Status: Rejected</option>
        </select>

        {/* Product / Category Filter */}
        <select
          value={productCategory}
          onChange={(e) => setProductCategory(e.target.value)}
          className="bg-[#0a0c10] border border-[#272a38] text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-hidden focus:border-blue-500"
        >
          <option value="ALL">Category: All Categories</option>
          <option value="Hardware">Category: Hardware</option>
          <option value="Services">Category: Services</option>
          <option value="Warranty">Category: Warranty</option>
          <option value="Subscriptions">Category: Subscriptions</option>
        </select>

        {(period !== 'ALL' || salesRepId !== 'ALL' || approvalStatus !== 'ALL' || productCategory !== 'ALL') && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 text-[#8e95a5] hover:text-white px-2 py-1 text-xs transition-colors ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchReportData}
            className="px-3 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-md text-xs transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistic Cards (Mockup Requirement: Quotes Created, Avg Approval Time, Top Upsell Product) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Quotes Created */}
        <div className="bg-[#12141a] border border-[#222533] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#8e95a5] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Quotes Created</span>
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : data.kpis.quotesCreated}
          </div>
          <div className="text-[11px] text-[#8e95a5] mt-1.5 flex items-center gap-1.5">
            <span className="text-emerald-400 font-medium">
              {data.kpis.conversionRate}% conversion
            </span>
            <span>({data.kpis.ordersConverted} orders)</span>
          </div>
        </div>

        {/* Card 2: Avg Approval Time */}
        <div className="bg-[#12141a] border border-[#222533] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#8e95a5] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Approval Time</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-amber-400" /> : `${data.kpis.avgApprovalTimeHours} hrs`}
          </div>
          <div className="text-[11px] text-[#8e95a5] mt-1.5">
            Target SLA: &lt; 4.0 hours across tiers
          </div>
        </div>

        {/* Card 3: Top Upsell Product */}
        <div className="bg-[#12141a] border border-[#222533] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#8e95a5] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Top Upsell Product</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base font-bold text-white truncate tracking-tight">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-emerald-400" /> : data.kpis.topUpsellProduct}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1.5">
            Highest attachment margin rate
          </div>
        </div>

        {/* Card 4: Gross Revenue */}
        <div className="bg-[#12141a] border border-[#222533] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#8e95a5] mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            ) : (
              `$${data.kpis.grossRevenue.toLocaleString()}`
            )}
          </div>
          <div className="text-[11px] text-[#8e95a5] mt-1.5 flex items-center gap-1.5">
            <span>Avg margin: {data.kpis.avgMarginPercent}%</span>
            <span className="text-amber-400/80">(-${data.kpis.totalDiscount.toLocaleString()} disc)</span>
          </div>
        </div>
      </div>

      {/* Products Reference Table (Mockup requirement) */}
      <div className="bg-[#12141a] border border-[#222533] rounded-xl overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-[#222533] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
              Products Reference Table
            </h2>
          </div>
          <span className="text-[11px] text-[#8e95a5]">
            {data.productsReference?.length || 0} active catalog items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#222533] text-[11px] font-semibold text-[#8e95a5] uppercase tracking-wider bg-[#0d0f14]">
                <th className="py-2.5 px-4">Product Name</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4 text-right">Base Price</th>
                <th className="py-2.5 px-4 text-center">Units Sold</th>
                <th className="py-2.5 px-4 text-right">Total Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e212d] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8e95a5]">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
                    <span>Aggregating catalog telemetry...</span>
                  </td>
                </tr>
              ) : data.productsReference?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#8e95a5]">
                    No products found matching the selected filter criteria.
                  </td>
                </tr>
              ) : (
                data.productsReference?.map((p) => (
                  <tr key={p.id} className="hover:bg-[#161822] transition-colors">
                    <td className="py-3 px-4 font-medium text-white">{p.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-[#1c202e] border border-[#2e3347] text-[10px] text-[#c5c9d6]">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#c5c9d6]">
                      ${p.basePrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-white font-medium">
                      {p.unitsSold}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-white">
                      ${p.revenue?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
