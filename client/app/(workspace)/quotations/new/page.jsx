'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { 
  ArrowLeft, 
  Building2, 
  Calendar, 
  DollarSign, 
  FileText, 
  AlertTriangle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { Badge, Spinner } from '../../../../components/ui';

export default function NewQuotationPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form Fields
  const [customerId, setCustomerId] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [expirationDate, setExpirationDate] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    async function loadCustomers() {
      setLoadingCustomers(true);
      try {
        const res = await api.get('/quotations/lookup/customers');
        if (res && res.data) {
          setCustomers(res.data);
          if (res.data.length > 0) {
            setCustomerId(res.data[0].id);
          }
        }
      } catch (err) {
        setError(err.message || 'Failed to load customers.');
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        customerId,
        currency,
        expirationDate: expirationDate || null,
        notes: notes.trim() || undefined,
      };

      const res = await api.post('/quotations', payload);
      if (res && res.data && res.data.id) {
        router.push(`/quotations/${res.data.id}`);
      } else {
        throw new Error('Unexpected response format.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create quotation draft.');
      setSubmitting(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/quotations"
          className="h-8 w-8 rounded-lg bg-[#111216] border border-[#222228] text-[#888] hover:text-[#ededed] flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5 text-xs text-[#71717a]">
            <span>Quotations</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#a1a1aa]">Create Draft</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#ededed] mt-0.5">
            New Quotation
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/50 text-xs text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-[#0b0c0e] border border-[#1c1c22] rounded-2xl p-6 space-y-5">
        {/* Customer Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#ededed]">
            Customer Account <span className="text-red-400">*</span>
          </label>
          <p className="text-[11px] text-[#71717a]">
            Customer tier dictates the baseline automated discount approval ceiling.
          </p>

          {loadingCustomers ? (
            <div className="py-2 flex items-center gap-2 text-xs text-[#666]">
              <Spinner size="sm" />
              <span>Loading customer accounts...</span>
            </div>
          ) : (
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full text-xs bg-[#111114] border border-[#222226] text-[#ededed] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#444] transition-colors"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.tier} Tier) — {c.email}
                </option>
              ))}
            </select>
          )}

          {selectedCustomer && (
            <div className="mt-2 p-2.5 rounded-lg bg-[#111216] border border-[#1d1f27] flex items-center justify-between text-xs">
              <span className="text-[#888]">Resolved Pricing Tier:</span>
              <span className="font-mono font-bold text-[#ededed]">
                {selectedCustomer.tier} (
                {selectedCustomer.tier === 'GOLD' ? '15% Ceiling' : selectedCustomer.tier === 'SILVER' ? '10% Ceiling' : '5.5% Ceiling'}
                )
              </span>
            </div>
          )}
        </div>

        {/* Currency & Expiration */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#ededed]">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full text-xs bg-[#111114] border border-[#222226] text-[#ededed] rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#444]"
            >
              <option value="USD">USD ($ - United States Dollar)</option>
              <option value="EUR">EUR (€ - Euro)</option>
              <option value="INR">INR (₹ - Indian Rupee)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#ededed]">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full text-xs bg-[#111114] border border-[#222226] text-[#ededed] rounded-xl px-3 py-2 focus:outline-none focus:border-[#444]"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[#ededed]">
            Internal Deal Notes / Scope (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Key commercial assumptions, payment terms, or client requirements..."
            className="w-full text-xs bg-[#111114] border border-[#222226] text-[#ededed] placeholder-[#555] rounded-xl p-3 focus:outline-none focus:border-[#444] transition-colors resize-none"
          />
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-[#18181f] flex items-center justify-end gap-3">
          <Link
            href="/quotations"
            className="px-4 py-2 text-xs font-medium text-[#888] hover:text-[#ededed] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || loadingCustomers}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Spinner size="sm" />
                <span>Creating Draft...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Create Draft & Build Quote</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
