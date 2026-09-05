'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Users, 
  Package, 
  Tags, 
  Sliders, 
  ShieldAlert, 
  Warehouse 
} from 'lucide-react';

export default function AdminNavTabs() {
  const pathname = usePathname();

  const tabs = [
    { label: 'Users & Customers', href: '/admin/users', icon: Users },
    { label: 'Products & Variants', href: '/admin/products', icon: Package },
    { label: 'Price Lists', href: '/admin/pricelists', icon: Tags },
    { label: 'Discounts & Rules', href: '/admin/discounts', icon: Sliders },
    { label: 'Warehouses & Stock', href: '/admin/warehouses', icon: Warehouse },
  ];

  return (
    <div className="w-full bg-[#090a0d] border-b border-[#18181f] px-4 lg:px-8 py-2">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] uppercase font-mono font-bold text-[#555] tracking-wider mr-2 shrink-0">
          Admin Config:
        </span>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`h-7 px-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#181920] text-white border border-[#2a2b34] shadow-[0_1px_3px_rgba(0,0,0,0.6)] font-semibold'
                  : 'text-[#888891] hover:text-[#d4d4d8] hover:bg-[#121318] border border-transparent'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#3b82f6]' : 'text-[#666]'}`} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
