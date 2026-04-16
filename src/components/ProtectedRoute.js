'use client'
import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PERMISSIONS } from '@/lib/rbac';

export default function ProtectedRoute({ children, requiredPermission, fallbackPath = '/dashboard' }) {
  const { profile, loading, hasPermission } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && profile) {
      if (!hasPermission(requiredPermission)) {
        router.replace(fallbackPath);
      }
    }
  }, [loading, profile, hasPermission, requiredPermission, fallbackPath, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!profile) {
    return null; // Will be handled by NavigationLayout
  }

  if (!hasPermission(requiredPermission)) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
