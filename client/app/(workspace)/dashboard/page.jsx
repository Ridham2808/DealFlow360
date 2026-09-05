'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  DollarSign, 
  ArrowUpRight, 
  TrendingUp, 
  Package, 
  Warehouse,
  ChevronRight,
  Clock,
  Layers
} from 'lucide-react';

export default function WorkspaceDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#18181b] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#71717a]">
              Operations Command
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">
            Welcome back, {user?.name || 'Operator'}
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            DealFlow360 Quote-to-Cash engine is active with PostgreSQL 17 transaction safety.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/quotations"
            className="h-8 px-3.5 rounded-lg text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
          >
            <span>View Quotations</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {[
          { label: 'Active Quotations', value: '6 Deals', sub: '$110,550 Pipeline', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-900/40' },
          { label: 'Pending Approvals', value: '1 Review', sub: 'Escalation Tier 1', icon: CheckCircle2, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-900/40' },
          { label: 'Catalog SKU Count', value: '4 Items', sub: 'Hardware & Services', icon: Package, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900/40' },
          { label: 'Fulfillment Centers', value: '2 Hubs', sub: 'Austin & Allentown', icon: Warehouse, color: 'text-purple-400', bg: 'bg-purple-950/30 border-purple-900/40' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-4 flex flex-col justify-between hover:border-[#2a2a34] transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#71717a]">
                    {m.label}
                  </span>
                  <div className="text-xl font-bold tracking-tight text-[#ededed] mt-1">
                    {m.value}
                  </div>
                </div>
                <div className={`p-2 rounded-xl border ${m.bg} ${m.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-[11px] text-[#52525b] mt-3 pt-2.5 border-t border-[#16161b]">
                {m.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quotations Pipeline Preview */}
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#18181f] pb-3">
            <div>
              <h3 className="text-sm font-semibold text-[#ededed]">Live Quotation Pipeline</h3>
              <p className="text-[11px] text-[#71717a]">Recent sales negotiations across enterprise accounts</p>
            </div>
            <Link
              href="/quotations"
              className="text-xs font-semibold text-[#3b82f6] hover:text-[#60a5fa] flex items-center gap-1"
            >
              <span>Full Board</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {[
              { id: 'Q-1042', customer: 'Beta Industries', stage: 'PENDING_APPROVAL', amount: '$28,900' },
              { id: 'Q-1043', customer: 'Zenith Co', stage: 'NEGOTIATION', amount: '$15,300' },
              { id: 'Q-1041', customer: 'Acme Corp', stage: 'DRAFT', amount: '$12,400' },
            ].map((deal) => (
              <div
                key={deal.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#111216] border border-[#1d1e24] text-xs hover:border-[#2c2d36] transition-colors"
              >
                <div>
                  <span className="font-semibold text-[#ededed]">{deal.customer}</span>
                  <span className="text-[10px] font-mono text-[#52525b] ml-2">{deal.id}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16171d] border border-[#262730] text-[#a1a1aa]">
                    {deal.stage}
                  </span>
                  <span className="font-mono font-bold text-[#ededed]">{deal.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Shortcuts */}
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-5 space-y-3">
          <div className="border-b border-[#18181f] pb-3">
            <h3 className="text-sm font-semibold text-[#ededed]">Catalog & Pricing Guardrails</h3>
            <p className="text-[11px] text-[#71717a]">Admin-governed configuration area</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {[
              { title: 'Products & Variants', desc: 'Catalog items & SKU specs', href: '/admin/products', icon: Package },
              { title: 'Customer Price Lists', desc: 'Tier rules & item overrides', href: '/admin/pricelists', icon: Layers },
              { title: 'Discounts & Ceilings', desc: 'Margin rules & escalation', href: '/admin/discounts', icon: TrendingUp },
              { title: 'Warehouses & Stock', desc: 'Multi-depot allocations', href: '/admin/warehouses', icon: Warehouse },
            ].map((cfg) => {
              const CfgIcon = cfg.icon;
              return (
                <Link
                  key={cfg.title}
                  href={cfg.href}
                  className="p-3 rounded-xl bg-[#111216] hover:bg-[#15161c] border border-[#1d1e24] hover:border-[#2f303a] transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-start justify-between">
                    <CfgIcon className="w-4 h-4 text-[#71717a] group-hover:text-blue-400 transition-colors" />
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#3f3f46] group-hover:text-[#a1a1aa]" />
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-[#ededed] group-hover:text-white">
                      {cfg.title}
                    </h4>
                    <p className="text-[10px] text-[#52525b] mt-0.5">{cfg.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
