'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../../components/ui';
import { LogOut, FileText, MessageSquare, User } from 'lucide-react';
import ProfileModal from '../../components/profile/ProfileModal';

export default function PortalLayout({ children }) {
  const { user, loading, logout, isAuthenticated, isCustomer } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else if (!isCustomer) {
        // Internal users accessing customer portal -> redirect to internal workspace
        router.replace('/dashboard');
      }
    }
  }, [loading, isAuthenticated, isCustomer, router]);

  if (loading || !isAuthenticated || !isCustomer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c10]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0c10] text-[#ededed] font-sans antialiased selection:bg-blue-600/30">
      {/* Customer Portal Top Nav - Exact mockup specification: My Quotation, Messages, Profile */}
      <header className="h-14 bg-[#101217] border-b border-[#222533] px-6 flex items-center justify-between shadow-xs sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#ededeb] flex items-center justify-center p-1 shadow-xs overflow-hidden border border-[#2e3347]">
              <img src="/logo.png" alt="DealFlow360 Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="font-bold text-xs text-white leading-none tracking-tight">DealFlow360</div>
              <div className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider mt-0.5">
                Customer Portal
              </div>
            </div>
          </div>

          {/* Navigation Items: My Quotation, Messages */}
          <nav className="flex items-center gap-1 text-xs">
            <a
              href="/portal"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
                pathname === '/portal'
                  ? 'bg-[#1c202e] text-white border border-[#2e3347]'
                  : 'text-[#8e95a5] hover:text-white hover:bg-[#161821]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              My Quotation
            </a>

            <button
              type="button"
              onClick={() => alert('Messages history is linked directly to your active quotation comments and activity timeline below.')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium text-[#8e95a5] hover:text-white hover:bg-[#161821] transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              Messages
            </button>
          </nav>
        </div>

        {/* Right Nav: Profile & Sign Out */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium text-[#8e95a5] hover:text-white hover:bg-[#161821] border border-transparent hover:border-[#272a38] transition-colors cursor-pointer"
            title="View and update profile"
          >
            <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-semibold text-[10px]">
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-white font-medium">{user?.name}</span>
            <span className="text-[10px] text-[#5a6275] border border-[#272a38] px-1.5 py-0.5 rounded-sm">Profile</span>
          </button>

          <button
            onClick={logout}
            className="flex items-center gap-1 text-xs text-[#71788e] hover:text-red-400 px-2 py-1.5 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Portal Content Area */}
      <main className="p-6 max-w-6xl mx-auto w-full flex-1 animate-in fade-in duration-200">
        {children}
      </main>

      {/* Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
