'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Spinner, Button, Badge } from '../../components/ui';
import TopNav from '../../components/navigation/TopNav';
import { 
  LogOut, 
  LayoutDashboard, 
  FileText, 
  CheckSquare, 
  Users, 
  Shield, 
  Package, 
  Tags, 
  Sliders, 
  Warehouse 
} from 'lucide-react';

export default function WorkspaceLayout({ children }) {
  const { user, loading, logout, isAuthenticated, isInternal } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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

  const isLinkActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between p-4 border-r border-slate-800 shrink-0">
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm">
              DF
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white leading-none">DealFlow360</div>
              <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-medium">Sales Ops Platform</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 px-3 py-1">Core Sales</div>
            <a
              href="/workspace/dashboard"
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                pathname === '/workspace/dashboard'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
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

            {/* Admin Configuration Section */}
            {(user?.role === 'ADMIN' || user?.role === 'SALES_MANAGER') && (
              <>
                <div className="pt-4 text-[10px] uppercase font-semibold tracking-wider text-slate-500 px-3 py-1">Configuration</div>
                <a
                  href="/workspace/admin/products"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isLinkActive('/workspace/admin/products')
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>Products & Catalog</span>
                </a>
                <a
                  href="/workspace/admin/pricelists"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isLinkActive('/workspace/admin/pricelists')
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Tags className="w-4 h-4" />
                  <span>Price Lists</span>
                </a>
                <a
                  href="/workspace/admin/discounts"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isLinkActive('/workspace/admin/discounts')
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span>Discounts & Approval Rules</span>
                </a>
                <a
                  href="/workspace/admin/warehouses"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isLinkActive('/workspace/admin/warehouses')
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Warehouse className="w-4 h-4" />
                  <span>Warehouses & Inventory</span>
                </a>
              </>
            )}

            {user?.role === 'ADMIN' && (
              <>
                <div className="pt-4 text-[10px] uppercase font-semibold tracking-wider text-slate-500 px-3 py-1">Governance</div>
                <a
                  href="#"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span>Users & Customer Access</span>
                </a>
                <a
                  href="#"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <Shield className="w-4 h-4" />
                  <span>Audit Logs</span>
                </a>
              </>
            )}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">
                {user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()}
              </p>
              <Badge
                variant={roleBadgeVariants[user?.role] || 'neutral'}
                size="sm"
                className="mt-1 font-medium"
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        <main className="p-6 overflow-y-auto flex-1">{children}</main>
      </div>
    </div>
  );
}
