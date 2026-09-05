'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import AdminNavTabs from '../../../components/admin/AdminNavTabs';

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowedRoles = ['ADMIN', 'SALES_MANAGER'];

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || !user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return (
    <div className="w-full space-y-6">
      {/* Secondary Admin Config Bar */}
      <AdminNavTabs />
      <div>
        {children}
      </div>
    </div>
  );
}
