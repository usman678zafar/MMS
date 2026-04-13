'use client'
import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Bell, Search, Loader2 } from 'lucide-react';

export default function NavigationLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] bg-slate-50 overflow-hidden">
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      
      {/* Sidebar - Desktop fixed, Mobile slide-in */}
      <div className={`fixed inset-y-0 left-0 z-30 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsMobileOpen(false)} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-8 gap-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Hamburger Button */}
              <button 
                onClick={() => setIsMobileOpen(true)}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="relative w-full max-w-md hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                />
              </div>
            </div>
            <div className="flex items-center">
              <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all">
                <Bell className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 sm:px-8 py-6 sm:py-8 w-full max-w-full overflow-hidden">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
