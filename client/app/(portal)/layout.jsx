'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Button, Badge } from '../../components/ui';
import { LogOut, Building, FileText, ShoppingCart } from 'lucide-react';

export default function PortalLayout({ children }) {
  const { user, loading, logout, isAuthenticated, isCustomer } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isCustomer) {
        // Internal users accessing customer portal -> redirect to internal workspace
        router.replace('/workspace/dashboard');
      }
    }
  }, [loading, isAuthenticated, isCustomer, router]);

  if (loading || !isAuthenticated || !isCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Customer Portal Top Nav */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              DF
            </div>
            <div>
              <div className="font-bold text-sm text-slate-900 leading-none">DealFlow360</div>
              <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wider mt-0.5">
                Customer Portal
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-600">
            <a href="/portal" className="text-blue-600 font-semibold border-b-2 border-blue-600 py-5">
              My Quotations
            </a>
            <a href="#" className="hover:text-slate-900 transition-colors py-5">
              Orders & Invoices
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <Badge variant="primary" size="sm">
            Customer
          </Badge>
          <Button variant="ghost" size="sm" onClick={logout} className="text-slate-500">
            <LogOut className="w-4 h-4 mr-1" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Portal Content */}
      <main className="p-6 max-w-6xl mx-auto w-full flex-1">{children}</main>
    </div>
  );
}
