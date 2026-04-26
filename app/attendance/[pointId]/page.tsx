'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import PageHeader from '@/components/PageHeader';
import { apiUrl } from '@/lib/api';
import { subscribeToRealtime } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, CalendarDays, CheckCircle, XCircle } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'leave';
type AttendanceRow = { status: AttendanceStatus; marked_at?: string | null; marked_by_role?: string | null } | null;
type Assignment = {
  assignmentId: string;
  staff: { id: string; name: string; designation?: string | null; photoUrl?: string | null };
  attendance: AttendanceRow;
};
type ShiftBlock = {
  shiftId: string;
  name: string;
  start_time: string;
  end_time: string;
  assignments: Assignment[];
};
type PointPayload = {
  date: string;
  point: {
    id: string;
    name: string;
    areaName?: string | null;
    shifts: ShiftBlock[];
  } | null;
  error?: string;
};

const statusConfig: Record<AttendanceStatus, { label: string; icon: React.ReactNode; className: string }> = {
  present: { label: 'Present', icon: <CheckCircle className="h-4 w-4" />, className: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
  absent: { label: 'Absent', icon: <XCircle className="h-4 w-4" />, className: 'border-red-300 bg-red-50 text-red-700' },
  leave: { label: 'Leave', icon: <CalendarDays className="h-4 w-4" />, className: 'border-amber-300 bg-amber-50 text-amber-700' },
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function timeLabel(value: string) {
  return value?.slice(0, 5) || '--:--';
}

export default function AttendancePointPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const pointId = params.pointId as string;
  const [date, setDate] = useState(todayKey);
  const [payload, setPayload] = useState<PointPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchPoint = useCallback(async () => {
    if (!token || !pointId) return;
    setMessage(null);
    try {
      const res = await fetch(apiUrl(`/admin/attendance/point/${pointId}?date=${date}`), { headers });
      const data = await res.json().catch(() => ({})) as PointPayload;
      if (!res.ok) {
        setPayload(null);
        setMessage({ type: 'error', text: data.error || 'Could not load attendance.' });
        return;
      }
      setPayload(data);
    } catch {
      setPayload(null);
      setMessage({ type: 'error', text: 'Network error. Check if API server is running.' });
    } finally {
      setLoading(false);
    }
  }, [date, headers, pointId, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPoint();
  }, [fetchPoint]);

  useEffect(() => {
    const cleanupAttendance = subscribeToRealtime('attendance', () => void fetchPoint());
    const cleanupAssignments = subscribeToRealtime('staff_assignments', () => void fetchPoint());
    return () => {
      cleanupAttendance?.();
      cleanupAssignments?.();
    };
  }, [fetchPoint]);

  const markAttendance = async (assignment: Assignment, status: AttendanceStatus) => {
    if (!token) return;
    const key = `${assignment.assignmentId}:${status}`;
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/admin/attendance'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ assignmentId: assignment.assignmentId, date, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: (data as { error?: string }).error || 'Attendance update failed.' });
        return;
      }
      await fetchPoint();
    } catch {
      setMessage({ type: 'error', text: 'Network error while saving attendance.' });
    } finally {
      setSavingKey('');
    }
  };

  const totals = useMemo(() => {
    const counts = { present: 0, absent: 0, leave: 0, unmarked: 0, total: 0 };
    const shifts = Array.isArray(payload?.point?.shifts) ? payload!.point!.shifts : [];
    for (const shift of shifts) {
      const assignments = Array.isArray(shift?.assignments) ? shift.assignments : [];
      for (const assignment of assignments) {
        counts.total += 1;
        const status = assignment?.attendance?.status;
        if (status === 'present') counts.present += 1;
        else if (status === 'absent') counts.absent += 1;
        else if (status === 'leave') counts.leave += 1;
        else counts.unmarked += 1;
      }
    }
    return counts;
  }, [payload]);

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            title={payload?.point?.name || 'Attendance'}
            subtitle={payload?.point?.areaName || 'Shift-wise attendance control'}
            actions={
              <Button type="button" variant="outline" size="sm" onClick={() => router.push('/attendance')}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            }
          />

          <GlassCard className="p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid grid-cols-4 gap-2 text-center sm:min-w-[420px]">
                <Stat label="Present" value={totals.present} tone="emerald" />
                <Stat label="Absent" value={totals.absent} tone="red" />
                <Stat label="Leave" value={totals.leave} tone="amber" />
                <Stat label="Unmarked" value={totals.unmarked} tone="slate" />
              </div>
              <input
                type="date"
                value={date}
                max={todayKey()}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </GlassCard>

          {message && (
            <p className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
              {message.text}
            </p>
          )}

          {loading ? (
            <GlassCard className="flex min-h-[260px] items-center justify-center p-6">
              <LoadingSpinner />
            </GlassCard>
          ) : !payload?.point ? (
            <GlassCard className="p-8 text-center text-sm text-slate-500">
              No assignments found for this point.
            </GlassCard>
          ) : (Array.isArray(payload.point.shifts) ? payload.point.shifts : []).length === 0 ? (
            <GlassCard className="p-8 text-center text-sm text-slate-500">
              No staff have been assigned to a shift here yet.
            </GlassCard>
          ) : (
            <div className="space-y-5">
              {(payload.point.shifts || []).map((shift) => (
                <GlassCard key={shift.shiftId} className="overflow-hidden p-0">
                  <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                    <h2 className="text-base font-semibold text-slate-900">{shift.name}</h2>
                    <p className="text-sm text-slate-500">{timeLabel(shift.start_time)} - {timeLabel(shift.end_time)}</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(Array.isArray(shift?.assignments) ? shift.assignments : []).map((assignment) => (
                      <div key={assignment.assignmentId} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{assignment?.staff?.name || 'Unknown staff'}</p>
                          <p className="text-sm text-slate-500">
                            {assignment?.staff?.designation || 'Staff'} · {assignment?.attendance?.status || 'unmarked'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                            const active = assignment.attendance?.status === status;
                            const saving = savingKey === `${assignment.assignmentId}:${status}`;
                            const cfg = statusConfig[status];
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={Boolean(savingKey)}
                                onClick={() => void markAttendance(assignment, status)}
                                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                                  active ? cfg.className : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                {cfg.icon}
                                {saving ? 'Saving...' : cfg.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
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
