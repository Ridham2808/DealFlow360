'use client';

import React from 'react';
import AdminNavTabs from '../../../components/admin/AdminNavTabs';

export default function AdminLayout({ children }) {
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
