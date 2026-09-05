'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge, Button } from '../ui';
import { 
  Bell, 
  Search, 
  Database, 
  ShieldCheck, 
  LogOut, 
  ChevronRight,
  User
} from 'lucide-react';

const roleBadgeVariants = {
  ADMIN: 'danger',
  SALES_MANAGER: 'warning',
  FINANCE: 'success',
  SALES_REP: 'primary',
  CUSTOMER: 'neutral',
};

export default function TopNav({ 
  title = 'Internal Sales Operations Workspace', 
  breadcrumbs = [],
  action = null 
}) {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
      {/* Left: Title & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <nav className="flex items-center text-xs text-slate-500 gap-1.5 font-medium">
          <span className="text-slate-400">Workspace</span>
          {breadcrumbs.length > 0 && (
            breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                {crumb.href ? (
                  <a href={crumb.href} className="hover:text-slate-800 transition-colors">
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-slate-700 font-semibold">{crumb.label}</span>
                )}
              </React.Fragment>
            ))
          )}
        </nav>
        {breadcrumbs.length === 0 && (
          <h2 className="text-sm font-semibold text-slate-900 truncate">
            {title}
          </h2>
        )}
      </div>

      {/* Right: Quick Stats, Role, Actions, User */}
      <div className="flex items-center gap-3">
        {action && (
          <div>{action}</div>
        )}

        {/* Database indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11px] font-medium">
          <Database className="w-3 h-3 text-emerald-600" />
          <span>PostgreSQL 17</span>
        </div>

        {/* Role Badge */}
        <div className="flex items-center gap-1.5">
          <Badge variant={roleBadgeVariants[user?.role] || 'neutral'} size="sm" className="font-semibold uppercase tracking-wider text-[10px]">
            {user?.role || 'USER'}
          </Badge>
        </div>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-slate-200" />

        {/* User preview */}
        <div className="flex items-center gap-2 text-xs text-slate-700">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-semibold text-[11px]">
            {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
          </div>
          <span className="hidden sm:inline font-medium text-slate-800">{user?.name}</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          title="Sign Out"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
