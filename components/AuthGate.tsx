'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import LoadingSpinner from './LoadingSpinner';

const PUBLIC_PATHS = new Set<string>(['/login']);

function isPublicPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (PUBLIC_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api')) return true;
  return false;
}

/**
 * Top-level gate placed inside AuthProvider. It guarantees that:
 *  - No protected page ever mounts until auth is verified.
 *  - Unauthenticated users hitting any protected path are immediately
 *    redirected to /login and only a spinner is rendered in the meantime.
 *  - Field officers are kept on /field-officer/dashboard.
 *
 * This is the single enforcement point for route access. Per-page
 * <ProtectedRoute> wrappers remain for role-based checks, but even if a
 * page forgets to wrap itself, this gate still blocks unauthorized access.
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const publicPath = isPublicPath(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !publicPath) {
      router.replace('/login');
      return;
    }

    if (user && pathname === '/login') {
      if (user.role === 'field_officer') {
        router.replace('/field-officer/dashboard');
      } else if (user.role === 'staff') {
        router.replace('/staff-portal');
      } else {
        router.replace('/');
      }
      return;
    }

    if (user && user.role === 'field_officer' && pathname && !isFieldOfficerAllowed(pathname)) {
      router.replace('/field-officer/dashboard');
    }

    if (user && user.role === 'staff' && pathname && !isStaffPortalAllowed(pathname)) {
      router.replace('/staff-portal');
    }
  }, [loading, user, pathname, publicPath, router]);

  if (publicPath) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (user.role === 'field_officer' && pathname && !isFieldOfficerAllowed(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (user.role === 'staff' && pathname && !isStaffPortalAllowed(pathname)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  return <>{children}</>;
}

function isFieldOfficerAllowed(pathname: string): boolean {
  if (pathname.startsWith('/field-officer')) return true;
  if (/^\/staff\/[^/]+\/edit\/?$/.test(pathname)) return true;
  return false;
}

function isStaffPortalAllowed(pathname: string): boolean {
  if (pathname.startsWith('/staff-portal')) return true;
  return false;
}
