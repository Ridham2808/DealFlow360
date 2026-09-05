'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../lib/api';

const QuotationContext = createContext(null);

export function QuotationProvider({ children }) {
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [conflictError, setConflictError] = useState(null);
  const [upsellSuggestions, setUpsellSuggestions] = useState([]);
  const [dismissedUpsells, setDismissedUpsells] = useState(new Set());

  // Fetch Quotation by ID
  const loadQuotation = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setConflictError(null);

    try {
      const res = await api.get(`/quotations/${id}`);
      if (res && res.data) {
        setQuotation(res.data);
      }

      // Fetch upsell suggestions in parallel
      try {
        const upRes = await api.get(`/quotations/${id}/upsell-suggestions`);
        if (upRes && Array.isArray(upRes.data)) {
          setUpsellSuggestions(upRes.data);
        }
      } catch {
        // Upsell fail should not block main quotation display
      }
    } catch (err) {
      setError(err.message || 'Failed to load quotation.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mutate Line (Add or Update with Version Locking)
  const mutateLine = useCallback(
    async (lineData) => {
      if (!quotation?.id) return null;
      setSaving(true);
      setError(null);
      setConflictError(null);

      try {
        const payload = {
          ...lineData,
          version: quotation.version, // Concurrency control
        };

        const res = await api.patch(`/quotations/${quotation.id}/lines`, payload);
        if (res && res.data) {
          setQuotation(res.data);

          // Refresh suggestions after line mutation
          try {
            const upRes = await api.get(`/quotations/${quotation.id}/upsell-suggestions`);
            if (upRes && Array.isArray(upRes.data)) {
              setUpsellSuggestions(upRes.data);
            }
          } catch {
            // non-blocking
          }

          return res.data;
        }
      } catch (err) {
        if (err.status === 409 || err.code === 'STALE_VERSION_ERROR') {
          setConflictError(
            'This quotation was updated in another session. Please reload to see the latest changes before editing.'
          );
        } else {
          setError(err.message || 'Failed to update quotation line item.');
        }
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [quotation]
  );

  // Delete Line Item
  const deleteLine = useCallback(
    async (lineId) => {
      if (!quotation?.id || !lineId) return null;
      setSaving(true);
      setError(null);
      setConflictError(null);

      try {
        const res = await api.delete(
          `/quotations/${quotation.id}/lines/${lineId}?version=${quotation.version}`
        );
        if (res && res.data) {
          setQuotation(res.data);

          // Refresh upsells
          try {
            const upRes = await api.get(`/quotations/${quotation.id}/upsell-suggestions`);
            if (upRes && Array.isArray(upRes.data)) {
              setUpsellSuggestions(upRes.data);
            }
          } catch {
            // non-blocking
          }
          return res.data;
        }
      } catch (err) {
        if (err.status === 409 || err.code === 'STALE_VERSION_ERROR') {
          setConflictError(
            'This quotation was updated in another session. Please reload to see the latest changes.'
          );
        } else {
          setError(err.message || 'Failed to remove line item.');
        }
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [quotation]
  );

  // Submit for Approval or Direct Confirmation
  const submitQuotation = useCallback(async () => {
    if (!quotation?.id) return null;
    setSaving(true);
    setError(null);
    setConflictError(null);

    try {
      const res = await api.post(`/quotations/${quotation.id}/submit-approval`, {
        version: quotation.version,
      });
      if (res && res.data) {
        setQuotation(res.data);
        return res.data;
      }
    } catch (err) {
      if (err.status === 409 || err.code === 'STALE_VERSION_ERROR') {
        setConflictError(
          'This quotation was updated in another session. Please reload before submitting.'
        );
      } else {
        setError(err.message || 'Failed to submit quotation.');
      }
      throw err;
    } finally {
      setSaving(false);
    }
  }, [quotation]);

  // Dismiss an upsell suggestion for this session
  const dismissUpsell = useCallback((suggestionId) => {
    setDismissedUpsells((prev) => new Set(prev).add(suggestionId));
  }, []);

  const visibleUpsells = upsellSuggestions.filter(
    (s) => !dismissedUpsells.has(s.id) && !dismissedUpsells.has(s.productId)
  );

  return (
    <QuotationContext.Provider
      value={{
        quotation,
        loading,
        saving,
        error,
        conflictError,
        upsellSuggestions: visibleUpsells,
        loadQuotation,
        mutateLine,
        deleteLine,
        submitQuotation,
        dismissUpsell,
        setConflictError,
        setError,
      }}
    >
      {children}
    </QuotationContext.Provider>
  );
}

export function useQuotation() {
  const context = useContext(QuotationContext);
  if (!context) {
    throw new Error('useQuotation must be used within a QuotationProvider');
  }
  return context;
}
