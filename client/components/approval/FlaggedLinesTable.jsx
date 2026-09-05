'use client';

import React from 'react';
import { AlertCircle, ArrowUpRight } from 'lucide-react';

/**
 * DealFlow360 — FlaggedLinesTable
 * Renders server-evaluated flagged quotation lines with ceiling details, overages, and reasons.
 */
export function FlaggedLinesTable({ flaggedLines = [], className = '' }) {
  if (!flaggedLines || flaggedLines.length === 0) {
    return (
      <div className={`p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-2 ${className}`}>
        <span>All quotation lines comply with customer tier and product category discount ceilings.</span>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-rose-500/20 bg-[#0d0d0d] ${className}`}>
      <div className="px-4 py-3 bg-rose-500/10 border-b border-rose-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-semibold text-rose-300">
            Policy Overages Detected ({flaggedLines.length} {flaggedLines.length === 1 ? 'Line' : 'Lines'})
          </span>
        </div>
        <span className="text-[11px] text-zinc-400 font-mono">Stricter Ceiling Applied</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-[#121212] text-zinc-400 font-mono text-[11px] uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th className="px-4 py-2.5">Product & Category</th>
              <th className="px-3 py-2.5 text-right">Discount Given</th>
              <th className="px-3 py-2.5 text-right">Effective Ceiling</th>
              <th className="px-3 py-2.5 text-right">Overage</th>
              <th className="px-3 py-2.5 text-right">Weight</th>
              <th className="px-4 py-2.5">Violation Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-sans">
            {flaggedLines.map((line, idx) => (
              <tr key={line.lineId || idx} className="hover:bg-zinc-800/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium text-zinc-200">{line.productName}</div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">{line.category}</div>
                </td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-rose-300">
                  {line.discountGiven}%
                </td>
                <td className="px-3 py-3 text-right font-mono text-zinc-400">
                  <span>{line.effectiveLimit}%</span>
                  <div className="text-[10px] text-zinc-500">
                    Tier: {line.customerTierLimit}% | Cat: {line.categoryLimit}%
                  </div>
                </td>
                <td className="px-3 py-3 text-right font-mono">
                  <span className="inline-flex items-center text-rose-400 font-bold bg-rose-400/10 px-1.5 py-0.5 rounded text-[11px]">
                    +{line.overBy}%
                    <ArrowUpRight className="w-3 h-3 ml-0.5" />
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-mono text-zinc-400 text-[11px]">
                  {line.contribution !== undefined ? `${line.contribution}` : '—'}
                </td>
                <td className="px-4 py-3 text-zinc-400 text-xs leading-relaxed max-w-xs">
                  {line.reason}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FlaggedLinesTable;
