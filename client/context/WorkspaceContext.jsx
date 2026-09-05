'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * WorkspaceContext placeholder for active quotation, draft cart,
 * and working session state.
 *
 * NOTE: As per architectural requirements, do not put business calculations
 * (discounts, margins, tax, totals, approvals) in this context.
 * All calculations are executed strictly server-side.
 */

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const [activeQuotationId, setActiveQuotationId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [activeCustomer, setActiveCustomer] = useState(null);

  const clearWorkspace = () => {
    setActiveQuotationId(null);
    setCartItems([]);
    setActiveCustomer(null);
  };

  const value = {
    activeQuotationId,
    setActiveQuotationId,
    cartItems,
    setCartItems,
    activeCustomer,
    setActiveCustomer,
    clearWorkspace,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
