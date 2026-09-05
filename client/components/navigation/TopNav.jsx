'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { 
  LogOut, 
  ChevronDown, 
  Package, 
  Tags, 
  Sliders, 
  Warehouse,
  ArrowRight,
  Users,
  Settings
} from 'lucide-react';

export default function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isProductOpen, setIsProductOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsProductOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsProductOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsProductOpen(false);
  }, [pathname]);

  const navItems = [
    { label: 'Dashboard',     href: '/dashboard',     match: '/dashboard' },
    { label: 'Quotations',    href: '/quotations',    match: '/quotations' },
    { label: 'Approvals',     href: '/approvals',     match: '/approvals' },
    { label: 'Fulfillment',   href: '/fulfillment',   match: '/fulfillment' },
    { label: 'Subscriptions', href: '/subscriptions', match: '/subscriptions' },
    { label: 'Invoices',      href: '/invoices',      match: '/invoices' },
    { label: 'Deal Health',   href: '/deal-health',   match: '/deal-health' },
    { label: 'Reports',       href: '/reports',       match: '/reports' },
  ];

  const productSubItems = [
    { 
      label: 'Users & Customers',  
      desc: 'Team members, roles & portal access',
      href: '/admin/users',   
      icon: Users 
    },
    { 
      label: 'Products & Variants',  
      desc: 'SKU specifications, units & variants',
      href: '/admin/products',   
      icon: Package 
    },
    { 
      label: 'Price Lists',          
      desc: 'Tier-based custom item prices',
      href: '/admin/pricelists', 
      icon: Tags 
    },
    { 
      label: 'Discounts & Ceilings', 
      desc: 'Margin floors & approval escalation',
      href: '/admin/discounts',  
      icon: Sliders 
    },
    { 
      label: 'Warehouses & Stock',   
      desc: 'Depot inventory & threshold alerts',
      href: '/admin/warehouses', 
      icon: Warehouse 
    },
  ];

  const isProductActive = pathname.startsWith('/admin');

  return (
    <header className="w-full bg-[#080808] border-b border-[#18181b] sticky top-0 z-50 select-none">
      <div className="w-full px-4 lg:px-6 h-14 flex items-center justify-between gap-3">
        {/* Left: Brand Logo + Primary Nav */}
        <div className="flex items-center gap-5 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group mr-2">
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

          {/* Center Navigation Pills - Faithful to Linear UI Specification */}
          <nav className="hidden md:flex items-center gap-1 py-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center transition-all ${
                    active
                      ? 'bg-[#2563eb] text-white font-semibold shadow-sm'
                      : 'text-[#888891] hover:text-[#ededed] hover:bg-[#14151b] border border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Product Dropdown Pill */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProductOpen((prev) => !prev)}
                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  isProductActive
                    ? 'bg-[#2563eb] text-white font-semibold shadow-sm'
                    : isProductOpen
                    ? 'bg-[#18181f] text-white border border-[#2b2d3d]'
                    : 'text-[#888891] hover:text-[#ededed] hover:bg-[#14151b] border border-transparent'
                }`}
              >
                <span>Product</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${isProductOpen ? 'rotate-180 text-white' : 'text-[#777]'}`} />
              </button>

              {/* Product Dropdown Menu */}
              {isProductOpen && (
                <div className="absolute left-0 mt-2 w-72 bg-[#0c0d11] border border-[#222228] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] p-2 z-50 animate-in fade-in slide-in-from-top-1.5 duration-100">
                  <div className="px-2.5 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#555] border-b border-[#18181f] mb-1">
                    Catalog & Governance
                  </div>

                  <div className="space-y-0.5">
                    {productSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = pathname === sub.href;

                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsProductOpen(false)}
                          className={`flex items-start gap-3 p-2.5 rounded-xl text-xs transition-all group ${
                            isSubActive
                              ? 'bg-[#181920] border border-[#282932] text-white'
                              : 'text-[#9e9ea7] hover:bg-[#13141a] hover:text-white border border-transparent'
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg border mt-0.5 ${
                            isSubActive
                              ? 'bg-[#2563eb]/20 border-[#2563eb]/40 text-[#60a5fa]'
                              : 'bg-[#14151b] border-[#1e1f26] text-[#71717a] group-hover:text-[#a1a1aa] group-hover:border-[#2a2b34]'
                          }`}>
                            <SubIcon className="w-4 h-4" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-[13px] leading-tight flex items-center justify-between">
                              <span className={isSubActive ? 'text-white' : 'text-[#ededed] group-hover:text-white'}>
                                {sub.label}
                              </span>
                              <ArrowRight className="w-3 h-3 text-[#555] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <p className="text-[11px] text-[#555] group-hover:text-[#71717a] mt-0.5 leading-snug">
                              {sub.desc}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Right Section: Database Status, Role, User Profile, Logout */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Go to Back-end Button (Admin only) */}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/users"
              title="Go to Back-end Configuration"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#14151b] hover:bg-[#1a1b24] border border-[#22232a] hover:border-[#32333f] text-[#c4c4cc] hover:text-white text-xs font-medium transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-[#888]" />
              <span>Go to Back-end</span>
            </Link>
          )}

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

          {/* User Profile */}
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
            className="p-1.5 text-[#666] hover:text-[#ef4444] hover:bg-[#191113] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
