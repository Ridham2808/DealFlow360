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
          <div className="w-8 h-8 rounded-lg bg-[#d4d4cf] flex items-center justify-center animate-pulse">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.2" fill="#0c0c0c" />
              <rect x="9" y="1" width="6" height="6" rx="1.2" fill="#0c0c0c" />
              <rect x="1" y="9" width="6" height="6" rx="1.2" fill="#0c0c0c" />
              <rect x="9" y="9" width="6" height="6" rx="1.2" fill="#0c0c0c" opacity="0.35" />
            </svg>
          </div>
          <span className="text-xs text-[#555] font-mono">Loading DealFlow360...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] text-[#c8c8c2] flex flex-col font-sans selection:bg-[#262626] selection:text-white">
      {/* Top Navbar — No Sidebar Layout */}
      <TopNav />

      {/* Main Screen Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
