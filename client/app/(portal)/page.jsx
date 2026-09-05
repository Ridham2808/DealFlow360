'use client';

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, EmptyState, Banner } from '../../components/ui';
import { FileText } from 'lucide-react';

export default function CustomerPortalPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review and approve customized commercial quotations shared with your organization.
        </p>
      </div>

      <Banner variant="primary" title="Customer Portal Boundary">
        This portal strictly isolates customer visibility. In subsequent phases, quotations, orders, and invoices associated with your verified customer account will appear here.
      </Banner>

      <Card>
        <CardHeader>
          <CardTitle>Active Quotations</CardTitle>
          <CardDescription>Quotations submitted for your organization&apos;s review and acceptance</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={FileText}
            title="No quotations currently pending"
            description="Your sales representative will publish formal proposals and pricing quotes here for digital approval."
          />
        </CardContent>
      </Card>
    </div>
  );
}
