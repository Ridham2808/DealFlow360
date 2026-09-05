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
          router.replace('/workspace/dashboard');
        }
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#09090b] text-zinc-400 font-mono text-xs">
      <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-mono font-bold animate-pulse">
        ⚡
      </div>
      <p className="text-xs text-zinc-400 font-mono">Initializing DealFlow360 System...</p>
    </div>
  );
}

