'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Button, Badge } from '../../components/ui';
import { LogOut, LayoutDashboard, FileText, CheckSquare, Settings, Users, Shield } from 'lucide-react';

export default function WorkspaceLayout({ children }) {
  const { user, loading, logout, isAuthenticated, isInternal } = useAuth();
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  const roleBadgeVariants = {
    ADMIN: 'danger',
    SALES_MANAGER: 'warning',
    FINANCE: 'success',
    SALES_REP: 'primary',
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-4 border-r border-slate-800">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs">
              DF
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white leading-none">DealFlow360</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Sales Ops Engine</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <a
              href="/workspace/dashboard"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Quotations</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <CheckSquare className="w-4 h-4" />
              <span>Approvals Matrix</span>
            </a>
            <a
              href="#"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Customers & Accounts</span>
            </a>
            {user?.role === 'ADMIN' && (
              <a
                href="#"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>Governance & Audit</span>
              </a>
            )}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <Badge
                variant={roleBadgeVariants[user?.role] || 'neutral'}
                size="sm"
                className="mt-1"
              >
                {user?.role}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full text-slate-400 hover:text-white hover:bg-slate-800 justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Internal Sales Operations Workspace</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Active Role:</span>
            <Badge variant={roleBadgeVariants[user?.role] || 'neutral'} size="sm">
              {user?.role}
            </Badge>
          </div>
        </header>
        <main className="p-6 overflow-y-auto flex-1">{children}</main>
      </div>
    </div>
  );
}
