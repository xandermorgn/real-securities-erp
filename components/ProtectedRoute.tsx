'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'owner' | 'admin' | 'field_officer' | 'staff'>;
}

/**
 * Per-page role-check wrapper. The top-level <AuthGate> already blocks
 * unauthenticated access entirely; this component exists to enforce
 * role-based access inside authenticated pages.
 */
export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const authorized = !loading && !!user && (!allowedRoles || allowedRoles.includes(user.role));

  useEffect(() => {
    if (loading || !user) return;
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'field_officer') {
        router.replace('/field-officer/dashboard');
      } else if (user.role === 'staff') {
        router.replace('/staff-portal');
      } else {
        router.replace('/');
      }
    }
  }, [user, loading, router, allowedRoles]);

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}
