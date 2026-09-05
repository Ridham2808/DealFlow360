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
  Settings,
  Menu,
  X
} from 'lucide-react';

export default function TopNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setIsProductOpen(false);
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const userRole = user?.role || 'SALES_REP';

  const ALL_NAV_ITEMS = [
    { 
      label: 'Dashboard',     
      href: '/dashboard',     
      match: '/dashboard',
      roles: ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FINANCE'] 
    },
    { 
      label: 'Quotations',    
      href: '/quotations',    
      match: '/quotations',
      roles: ['ADMIN', 'SALES_MANAGER', 'SALES_REP', 'FINANCE'] 
    },
    { 
      label: 'Approvals',    
      href: '/approvals',    
      match: '/approvals',
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP'] 
    },
    { 
      label: 'Fulfillment',    
      href: '/fulfillment',    
      match: '/fulfillment',
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE'] 
    },
    { 
      label: 'Subscriptions',    
      href: '/subscriptions',    
      match: '/subscriptions',
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP'] 
    },
    { 
      label: 'Invoices',    
      href: '/invoices',    
      match: '/invoices',
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP'] 
    },
    { 
      label: 'Deal Health',    
      href: '/deal-health',    
      match: '/deal-health',
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP'] 
    },
    { 
      label: 'Reports',    
      href: '/reports',    
      match: '/reports',
      roles: ['ADMIN', 'SALES_MANAGER', 'FINANCE', 'SALES_REP'] 
    },
  ];


  const ALL_PRODUCT_SUB_ITEMS = [
    { 
      label: 'Users & Customers',  
      desc: 'Team members, roles & portal access',
      href: '/admin/users',   
      icon: Users,
      roles: ['ADMIN']
    },
    { 
      label: 'Products & Variants',  
      desc: 'SKU specifications, units & variants',
      href: '/admin/products',   
      icon: Package,
      roles: ['ADMIN', 'SALES_MANAGER']
    },
    { 
      label: 'Price Lists',          
      desc: 'Tier-based custom item prices',
      href: '/admin/pricelists', 
      icon: Tags,
      roles: ['ADMIN', 'SALES_MANAGER']
    },
    { 
      label: 'Discounts & Ceilings', 
      desc: 'Margin floors & approval escalation',
      href: '/admin/discounts',  
      icon: Sliders,
      roles: ['ADMIN', 'SALES_MANAGER']
    },
    { 
      label: 'Warehouses & Stock',   
      desc: 'Depot inventory & threshold alerts',
      href: '/admin/warehouses', 
      icon: Warehouse,
      roles: ['ADMIN']
    },
  ];

  const navItems = ALL_NAV_ITEMS.filter((item) =>
    item.roles ? item.roles.includes(userRole) : true
  );

  const productSubItems = ALL_PRODUCT_SUB_ITEMS.filter((item) =>
    item.roles ? item.roles.includes(userRole) : true
  );

  const hasProductAccess = productSubItems.length > 0;
  const isProductActive = pathname.startsWith('/admin');

  return (
    <header className="w-full bg-[#080808] border-b border-[#1c1d22] sticky top-0 z-50 select-none shadow-sm flex-shrink-0">
      <div className="w-full max-w-[1720px] mx-auto px-3 sm:px-5 lg:px-6 h-[70px] flex items-center justify-between gap-2">
        {/* Left: Brand Logo + Primary Nav */}
        <div className="flex items-center gap-3 xl:gap-5 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ededeb] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm p-1.5 overflow-hidden">
              <img src="/logo.png" alt="DealFlow360 Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[15px] sm:text-[16px] font-bold tracking-tight text-[#d4d4cf] group-hover:text-white transition-colors">
              DealFlow<span className="text-[#666]">360</span>
            </span>
          </Link>

          {/* Desktop Navigation Pills — Clean, Auto-fit without clipping */}
          <nav className="hidden lg:flex items-center gap-1 shrink min-w-0">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`h-9 px-2.5 xl:px-3 rounded-lg text-xs xl:text-[13px] font-medium flex items-center whitespace-nowrap transition-all ${
                    active
                      ? 'bg-[#2563eb] text-white font-semibold shadow-sm'
                      : 'text-[#888891] hover:text-[#ededed] hover:bg-[#14151b] border border-transparent'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {/* Product Dropdown Pill (Only shown if role has permission) */}
            {hasProductAccess && (
              <div className="relative shrink-0" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsProductOpen((prev) => !prev)}
                  className={`h-9 px-2.5 xl:px-3 rounded-lg text-xs xl:text-[13px] font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
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
                  <div className="absolute left-0 mt-3 w-72 bg-[#0c0d11] border border-[#222228] rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)] p-2 z-50 animate-in fade-in slide-in-from-top-1.5 duration-100">
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
            )}
          </nav>
        </div>

        {/* Right Section: Database Status, Role, User Profile, Logout */}
        <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
          {/* Go to Back-end Button (Admin only) */}
          {user?.role === 'ADMIN' && (
            <Link
              href="/admin/users"
              title="Go to Back-end Configuration"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#14151b] hover:bg-[#1a1b24] border border-[#22232a] hover:border-[#32333f] text-[#c4c4cc] hover:text-white text-xs font-medium transition-all"
            >
              <Settings className="w-3.5 h-3.5 text-[#888]" />
              <span className="hidden sm:inline">Go to Back-end</span>
            </Link>
          )}

          {/* PostgreSQL Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0f1412] text-[#34d399] border border-[#16382a] text-[10px] font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            <span>PG 17</span>
          </div>

          {/* User Role Badge */}
          <div className="px-2 py-0.5 rounded border border-[#27272a] bg-[#121215] text-[#a1a1aa] text-[10px] font-mono uppercase tracking-wider font-semibold">
            {user?.role || 'USER'}
          </div>

          {/* Divider */}
          <div className="h-4 w-[1px] bg-[#1c1c20] hidden sm:block" />

          {/* User Profile */}
          <div className="flex items-center gap-2 text-xs">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#1a1a1f] border border-[#2c2c34] text-[#d4d4cf] flex items-center justify-center font-semibold text-xs shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <span className="hidden 2xl:inline text-xs text-[#9e9ea7] font-medium max-w-[110px] truncate">
              {user?.name}
            </span>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 sm:p-2 text-[#666] hover:text-[#ef4444] hover:bg-[#191113] rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile / Tablet Menu Button (< lg screens) */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-1.5 rounded-lg border border-[#262838] bg-[#14151e] text-[#888] hover:text-white lg:hidden cursor-pointer"
            title="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-[#181924] bg-[#0c0d12] px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[80vh] overflow-y-auto">
          <div className="text-[10px] font-mono uppercase text-[#666] tracking-wider px-2 py-1">
            Navigation
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`h-9 px-3 rounded-lg text-xs font-medium flex items-center transition-all ${
                    active
                      ? 'bg-[#2563eb] text-white font-semibold'
                      : 'text-[#888891] hover:text-white hover:bg-[#14151b]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          {hasProductAccess && (
            <>
              <div className="text-[10px] font-mono uppercase text-[#666] tracking-wider px-2 pt-2 border-t border-[#181924]">
                Catalog & Admin Controls
              </div>
              <div className="space-y-1">
                {productSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = pathname === sub.href;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                        isSubActive
                          ? 'bg-[#181922] text-white border border-[#2b2e40]'
                          : 'text-[#888891] hover:text-white hover:bg-[#14151e]'
                      }`}
                    >
                      <SubIcon className="w-4 h-4 text-[#3b82f6]" />
                      <span className="font-medium">{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}
