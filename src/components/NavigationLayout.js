'use client'
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from './Header';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function NavigationLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />
      
      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 w-full max-w-full">
        <div className="max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
