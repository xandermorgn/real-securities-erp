'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import PageHeader from '@/components/PageHeader';
import { apiUrl } from '@/lib/api';
import { subscribeToRealtime } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { ArrowRight, CalendarCheck } from 'lucide-react';

type PointSummary = {
  id: string;
  name: string;
  areaName?: string | null;
  counts: { present: number; absent: number; leave: number; unmarked: number; total: number };
};

export default function AttendancePage() {
  const { token } = useAuth();
  const [points, setPoints] = useState<PointSummary[]>([]);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPoints = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const res = await fetch(apiUrl('/admin/attendance/points'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({})) as { date?: string; points?: PointSummary[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'Could not load attendance points.');
        setPoints([]);
        return;
      }
      setDate(data.date || '');
      setPoints(data.points || []);
    } catch {
      setError('Network error. Check if API server is running.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPoints();
  }, [fetchPoints]);

  useEffect(() => {
    const cleanupAttendance = subscribeToRealtime('attendance', () => void fetchPoints());
    const cleanupAssignments = subscribeToRealtime('staff_assignments', () => void fetchPoints());
    return () => {
      cleanupAttendance?.();
      cleanupAssignments?.();
    };
  }, [fetchPoints]);

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            title="Attendance"
            subtitle={date ? `Point-wise attendance for ${date}` : 'Point-wise attendance control'}
          />

          {error && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          {loading ? (
            <GlassCard className="flex min-h-[240px] items-center justify-center p-6">
              <LoadingSpinner />
            </GlassCard>
          ) : points.length === 0 ? (
            <GlassCard className="p-8 text-center text-sm text-slate-500">
              No point assignments found yet. Add staff assignments first.
            </GlassCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {points.map((point) => (
                <Link key={point.id} href={`/attendance/${point.id}`}>
                  <GlassCard className="group h-full p-5 transition hover:-translate-y-0.5 hover:shadow-xl">
                    <div className="mb-5 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">{point.name}</h2>
                        <p className="text-sm text-slate-500">{point.areaName || 'No area linked'}</p>
                      </div>
                      <ArrowRight className="mt-2 h-5 w-5 text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500" />
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <Stat label="Present" value={point.counts.present} tone="emerald" />
                      <Stat label="Absent" value={point.counts.absent} tone="red" />
                      <Stat label="Leave" value={point.counts.leave} tone="amber" />
                      <Stat label="Unmarked" value={point.counts.unmarked} tone="slate" />
                    </div>
                  </GlassCard>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'red' | 'amber' | 'slate' }) {
  const classes = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className={`rounded-2xl px-2 py-3 ${classes[tone]}`}>
      <p className="text-lg font-semibold">{value}</p>
      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}
