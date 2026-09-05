'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, 
  ChevronDown, 
  Database, 
  User as UserIcon,
  Package,
  Tags,
  Sliders,
  Warehouse,
  FileText,
  CheckSquare,
  Truck,
  Repeat,
  Receipt,
  Activity,
  BarChart3,
  LayoutDashboard
} from 'lucide-react';

export default function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard',     href: '/dashboard',     match: '/dashboard' },
    { label: 'Quotations',    href: '/quotations',    match: '/quotations' },
    { label: 'Approvals',     href: '/approvals',     match: '/approvals' },
    { label: 'Fulfillment',   href: '/fulfillment',   match: '/fulfillment' },
    { label: 'Subscriptions', href: '/subscriptions', match: '/subscriptions' },
    { label: 'Invoices',      href: '/invoices',      match: '/invoices' },
    { label: 'Deal Health',   href: '/deal-health',   match: '/deal-health' },
    { label: 'Reports',       href: '/reports',       match: '/reports' },
    { label: 'Product',       href: '/admin/products', match: '/admin' },
  ];

  const configSubItems = [
    { label: 'Products & Variants',  href: '/admin/products',   icon: Package },
    { label: 'Price Lists',          href: '/admin/pricelists', icon: Tags },
    { label: 'Discounts & Ceilings', href: '/admin/discounts',  icon: Sliders },
    { label: 'Warehouses & Stock',   href: '/admin/warehouses', icon: Warehouse },
  ];

  const isItemActive = (item) => {
    if (item.match === '/admin') {
      return pathname.startsWith('/admin');
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <header className="w-full bg-[#080808] border-b border-[#18181b] sticky top-0 z-50">
      <div className="w-full px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[#d4d4cf] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="6" height="6" rx="1.2" fill="#0c0c0c" />
                <rect x="9" y="1" width="6" height="6" rx="1.2" fill="#0c0c0c" />
                <rect x="1" y="9" width="6" height="6" rx="1.2" fill="#0c0c0c" />
                <rect x="9" y="9" width="6" height="6" rx="1.2" fill="#0c0c0c" opacity="0.35" />
              </svg>
            </div>
            <span className="text-[14px] font-semibold tracking-tight text-[#c8c8c2] group-hover:text-white transition-colors">
              DealFlow<span className="text-[#666]">360</span>
            </span>
          </Link>

          {/* Center Navigation Pills - Exactly like User Wireframe */}
          <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1">
            {navItems.map((item) => {
              const active = isItemActive(item);

              if (item.label === 'Product') {
                return (
                  <div key={item.label} className="relative">
                    <button
                      onClick={() => setIsConfigOpen(!isConfigOpen)}
                      className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                        active
                          ? 'bg-[#18181b] text-[#f4f4f5] border border-[#2e2e34] shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                          : 'text-[#888891] hover:text-[#e4e4e7] hover:bg-[#121215] border border-transparent'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronDown className={`w-3 h-3 text-[#666] transition-transform ${isConfigOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu for Configuration */}
                    {isConfigOpen && (
                      <div 
                        onMouseLeave={() => setIsConfigOpen(false)}
                        className="absolute left-0 mt-1.5 w-52 bg-[#0e0e11] border border-[#222227] rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in slide-in-from-top-1"
                      >
                        <div className="px-2.5 py-1 text-[10px] font-semibold text-[#555] uppercase tracking-wider">
                          Admin Configuration
                        </div>
                        {configSubItems.map((sub) => {
                          const SubIcon = sub.icon;
                          const isSubActive = pathname === sub.href;
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsConfigOpen(false)}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs transition-colors ${
                                isSubActive
                                  ? 'bg-[#1c1c22] text-white font-medium'
                                  : 'text-[#999] hover:text-[#e0e0e0] hover:bg-[#141418]'
                              }`}
                            >
                              <SubIcon className="w-3.5 h-3.5 text-[#777]" />
                              <span>{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center transition-all ${
                    active
                      ? 'bg-[#18181b] text-[#f4f4f5] border border-[#2e2e34] shadow-[0_1px_2px_rgba(0,0,0,0.4)]'
                      : 'text-[#888891] hover:text-[#e4e4e7] hover:bg-[#121215] border border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: Database Status, Role, User Profile, Logout */}
        <div className="flex items-center gap-3 shrink-0">
          {/* PostgreSQL Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0f1412] text-[#34d399] border border-[#16382a] text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>PG 17</span>
          </div>

          {/* User Role Badge */}
          <div className="px-2 py-0.5 rounded border border-[#27272a] bg-[#121215] text-[#a1a1aa] text-[10px] font-mono uppercase tracking-wider font-semibold">
            {user?.role || 'USER'}
          </div>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-[#1c1c20]" />

          {/* User Name */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-6 h-6 rounded-full bg-[#1a1a1f] border border-[#2c2c34] text-[#d4d4cf] flex items-center justify-center font-medium text-[10px]">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden xl:inline text-xs text-[#9e9ea7] font-medium max-w-[120px] truncate">
              {user?.name}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 text-[#666] hover:text-[#ef4444] hover:bg-[#191113] rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-navigation bar when inside /admin/* configuration areas */}
      {pathname.startsWith('/admin') && (
        <div className="w-full bg-[#0c0c0e] border-t border-[#141416] px-4 lg:px-6 h-10 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] uppercase font-bold text-[#555] tracking-wider mr-2 shrink-0">
            Catalog Config:
          </span>
          {configSubItems.map((sub) => {
            const isSubActive = pathname === sub.href;
            return (
              <Link
                key={sub.href}
                href={sub.href}
                className={`h-7 px-2.5 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isSubActive
                    ? 'bg-[#18181b] text-[#f4f4f5] border border-[#2e2e34]'
                    : 'text-[#777] hover:text-[#ccc] hover:bg-[#121214]'
                }`}
              >
                <span>{sub.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
