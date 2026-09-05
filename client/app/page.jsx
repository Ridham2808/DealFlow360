'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (user.role === 'CUSTOMER') {
          router.replace('/portal');
        } else {
          router.replace('/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#080808] text-zinc-400 font-mono text-xs">
      <div className="w-10 h-10 rounded-xl bg-[#ededeb] flex items-center justify-center p-1.5 animate-pulse shadow-sm overflow-hidden">
        <img src="/logo.png" alt="DealFlow360 Logo" className="w-full h-full object-contain" />
      </div>
      <p className="text-xs text-[#666] font-mono">Initializing DealFlow360 System...</p>
    </div>
  );
}

