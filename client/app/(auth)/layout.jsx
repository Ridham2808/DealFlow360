'use client';

import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center px-4">
      {children}
    </div>
  );
}
