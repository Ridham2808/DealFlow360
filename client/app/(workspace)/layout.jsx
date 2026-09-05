'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import TopNav from '../../components/navigation/TopNav';

export default function WorkspaceLayout({ children }) {
  const { loading, isAuthenticated, isInternal } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isInternal) {
        // Customer trying to access internal workspace -> redirect to customer portal
        router.replace('/portal');
      }
    }
  }, [loading, isAuthenticated, isInternal, router]);

  if (loading || !isAuthenticated || !isInternal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080808]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ededeb] flex items-center justify-center p-1.5 animate-pulse shadow-sm overflow-hidden">
            <img src="/logo.png" alt="DealFlow360 Logo" className="w-full h-full object-contain" />
          </div>
          <span className="text-xs text-[#666] font-mono">Loading DealFlow360...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#080808] text-[#c8c8c2] flex flex-col overflow-hidden font-sans selection:bg-[#262626] selection:text-white">
      {/* Top Navbar — Pinned at top, does not scroll */}
      <TopNav />

      {/* Main Screen Content — Independently scrollable */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
