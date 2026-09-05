'use client';

import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Banner } from '../../../components/ui';
import { ShieldCheck, FileText, CheckCircle2, DollarSign } from 'lucide-react';

export default function WorkspaceDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Hello, {user?.firstName || 'Operator'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Welcome to DealFlow360. Your role is configured with strict policy guardrails.
        </p>
      </div>

      <Banner variant="primary" title="Platform Foundation Ready">
        Layered Express backend and Next.js client foundation initialized. All endpoints are guarded by secure HTTP-only cookies and correlation IDs.
      </Banner>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Active Role</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{user?.role}</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Quotations</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">0 Active</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
              <FileText className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Pending Approvals</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">0 Requiring Review</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase">Bookings MTDC</p>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">$0.00</h4>
            </div>
            <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security & Architecture Checklist</CardTitle>
          <CardDescription>Verified components in current foundation phase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Layered Express Architecture: Routes, Controllers, Services, Repositories, Middleware</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>HTTP-only JWT Cookie Authentication & RBAC Guards</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Next.js App Router with 14 Hand-crafted Tailwind Design System Components</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Correlation ID propagation (X-Request-ID) across client & server</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
