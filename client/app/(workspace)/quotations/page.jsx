'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Table, 
  Kanban, 
  Search, 
  Filter, 
  ChevronRight, 
  Building2, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight 
} from 'lucide-react';

const INITIAL_QUOTATIONS = [
  { id: 'Q-1041', customer: 'Acme Corp', amount: 12400, stage: 'DRAFT', rep: 'Elena Rostova', date: '2026-09-02' },
  { id: 'Q-1045', customer: 'Delta LLC', amount: 3200, stage: 'DRAFT', rep: 'Elena Rostova', date: '2026-09-04' },
  { id: 'Q-1042', customer: 'Beta Industries', amount: 28900, stage: 'PENDING_APPROVAL', rep: 'Elena Rostova', date: '2026-09-03' },
  { id: 'Q-1039', customer: 'Nova Retail', amount: 9750, stage: 'APPROVED', rep: 'Marcus Brody', date: '2026-09-01' },
  { id: 'Q-1043', customer: 'Zenith Co', amount: 15300, stage: 'NEGOTIATION', rep: 'Elena Rostova', date: '2026-09-03' },
  { id: 'Q-1038', customer: 'Orion Ltd', amount: 41000, stage: 'CONFIRMED', rep: 'Marcus Brody', date: '2026-08-30' },
];

const STAGES = [
  { key: 'DRAFT',            label: 'Draft',             count: 2 },
  { key: 'PENDING_APPROVAL', label: 'Pending Approval',  count: 1 },
  { key: 'APPROVED',         label: 'Approved',          count: 1 },
  { key: 'NEGOTIATION',      label: 'Negotiation',       count: 1 },
  { key: 'CONFIRMED',        label: 'Confirmed',         count: 1 },
];

export default function QuotationsPage() {
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [search, setSearch] = useState('');
  const [quotes, setQuotes] = useState(INITIAL_QUOTATIONS);

  const filteredQuotes = quotes.filter((q) => 
    q.customer.toLowerCase().includes(search.toLowerCase()) ||
    q.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title & Top Description - Exact match to wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#ededed]">
            Quotations (List)
          </h1>
          <p className="text-xs text-[#71717a] mt-1">
            Every quotation in the system, one row per quotation, click a row to open it
          </p>
        </div>

        {/* View Switcher & Search */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              type="text"
              placeholder="Filter quotations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#111114] border border-[#222226] text-[#ededed] placeholder-[#555] rounded-lg focus:outline-none focus:border-[#444] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Kanban Board View - Faithful to User Wireframe */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 min-h-[500px]">
          {STAGES.map((col) => {
            const stageQuotes = filteredQuotes.filter((q) => q.stage === col.key);

            return (
              <div
                key={col.key}
                className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold text-[#a1a1aa] tracking-tight">
                      {col.label}
                    </span>
                    <span className="text-[10px] font-mono text-[#52525b] px-1.5 py-0.5 rounded bg-[#131418] border border-[#222228]">
                      {stageQuotes.length}
                    </span>
                  </div>

                  {/* Cards inside column */}
                  <div className="space-y-2">
                    {stageQuotes.map((q) => (
                      <div
                        key={q.id}
                        className="bg-[#111216] hover:bg-[#15161b] border border-[#222228] hover:border-[#33333d] rounded-xl p-3 cursor-pointer transition-all shadow-[0_1px_3px_rgba(0,0,0,0.3)] group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-medium text-[#ededed] group-hover:text-white transition-colors">
                            {q.customer}
                          </div>
                          <span className="text-[11px] font-mono font-bold text-[#c8c8c2] shrink-0">
                            ${q.amount.toLocaleString()}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-[#1c1c22] flex items-center justify-between text-[10px] text-[#555]">
                          <span className="font-mono text-[#71717a]">{q.id}</span>
                          <span>{q.date}</span>
                        </div>
                      </div>
                    ))}

                    {stageQuotes.length === 0 && (
                      <div className="h-28 rounded-xl border border-dashed border-[#1a1a20] flex items-center justify-center text-[11px] text-[#3f3f46]">
                        Empty Stage
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1c1c22] bg-[#0f1014] text-[#71717a] text-[10px] uppercase font-mono tracking-wider">
                <th className="py-3 px-4">Quote ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#18181f] text-[#a1a1aa]">
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-[#121318] transition-colors cursor-pointer">
                  <td className="py-3 px-4 font-mono font-semibold text-[#3b82f6]">{q.id}</td>
                  <td className="py-3 px-4 font-medium text-[#ededed]">{q.customer}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#14151b] border border-[#222228] text-[#a1a1aa]">
                      {q.stage}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-[#ededed]">
                    ${q.amount.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-[#71717a]">{q.rep}</td>
                  <td className="py-3 px-4 text-right font-mono text-[#52525b]">{q.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Buttons at Bottom - Exact match to wireframe */}
      <div className="flex items-center gap-3 pt-2">
        <button
          className="h-9 px-4 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-2 shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ New Quotation</span>
        </button>

        <button
          onClick={() => setViewMode(viewMode === 'kanban' ? 'table' : 'kanban')}
          className="h-9 px-4 rounded-xl text-xs font-medium bg-[#111216] hover:bg-[#17181e] text-[#a1a1aa] hover:text-[#ededed] border border-[#222228] transition-all flex items-center gap-2"
        >
          {viewMode === 'kanban' ? <Table className="w-3.5 h-3.5" /> : <Kanban className="w-3.5 h-3.5" />}
          <span>{viewMode === 'kanban' ? 'Switch to Table View' : 'Switch to Kanban View'}</span>
        </button>
      </div>
    </div>
  );
}
