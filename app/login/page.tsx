'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading: authLoading } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'field_officer') {
        router.replace('/field-officer/dashboard');
      } else if (user.role === 'staff') {
        router.replace('/staff-portal');
      } else {
        router.replace('/');
      }
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const authed = await login(identifier, password);
      if (authed.role === 'field_officer') {
        router.replace('/field-officer/dashboard');
      } else if (authed.role === 'staff') {
        router.replace('/staff-portal');
      } else {
        router.replace('/');
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-sm text-slate-500">Loading...</div>
      </div>
    );
  }

  // Don't show login form if already logged in (will redirect)
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-sm text-slate-500">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <GlassCard className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-panel.png"
            alt="Real Security Investigations"
            className="mx-auto mb-4 h-20 w-auto object-contain"
          />
          <p className="text-sm text-slate-500">ERP System Login</p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="User ID"
            type="text"
            placeholder="Enter your user ID"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            label="Password"
            type="text"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

      </GlassCard>
    </div>
  );
}
