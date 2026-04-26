'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/lib/auth-context';
import { apiUrl } from '@/lib/api';
import { subscribeToRealtime } from '@/lib/supabase-client';
import { CalendarDays, CheckCircle, Edit2, LogOut, MapPin, Shield, XCircle } from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'leave';
type LockReason = 'not_open' | 'closed' | 'already_marked' | null;

type Assignment = {
  assignmentId: string;
  staff: {
    id: string;
    name: string;
    designation?: string | null;
    photoUrl?: string | null;
  };
  attendance?: {
    status: AttendanceStatus;
    marked_at?: string | null;
    marked_by_role?: string | null;
  } | null;
  locked: boolean;
  lockReason: LockReason;
};

type ShiftBlock = {
  shiftId: string;
  name: string;
  start_time: string;
  end_time: string;
  windowOpensAt: string;
  windowClosesAt: string;
  assignments: Assignment[];
};

type FOPoint = {
  id: string;
  name: string;
  areaName?: string | null;
  shifts: ShiftBlock[];
};

type FieldOfficerPayload = {
  date: string;
  serverNow: string;
  fieldOfficer?: {
    id: string;
    name: string;
    shift?: string | null;
    photoUrl?: string | null;
  };
  points: FOPoint[];
  error?: string;
};

const statusConfig: Record<AttendanceStatus, { label: string; className: string; icon: React.ReactNode }> = {
  present: {
    label: 'Present',
    className: 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-emerald-100',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  absent: {
    label: 'Absent',
    className: 'border-red-300 bg-red-50 text-red-700 ring-red-100',
    icon: <XCircle className="h-4 w-4" />,
  },
  leave: {
    label: 'Leave',
    className: 'border-amber-300 bg-amber-50 text-amber-700 ring-amber-100',
    icon: <CalendarDays className="h-4 w-4" />,
  },
};

function timeLabel(value: string) {
  return value?.slice(0, 5) || '--:--';
}

function formatClock(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function countdown(ms: number) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function windowState(shift: ShiftBlock, now: number) {
  const opens = shift?.windowOpensAt ? new Date(shift.windowOpensAt).getTime() : NaN;
  const closes = shift?.windowClosesAt ? new Date(shift.windowClosesAt).getTime() : NaN;
  if (Number.isNaN(opens) || Number.isNaN(closes)) {
    return { label: 'Schedule unavailable', tone: 'bg-slate-100 text-slate-600' };
  }
  if (now < opens) return { label: `Opens in ${countdown(opens - now)}`, tone: 'bg-slate-100 text-slate-600' };
  if (now <= closes) return { label: `Closes in ${countdown(closes - now)}`, tone: 'bg-emerald-50 text-emerald-700' };
  return { label: 'Marking closed', tone: 'bg-red-50 text-red-700' };
}

function lockText(assignment: Assignment) {
  if (!assignment) return '';
  if (assignment.lockReason === 'not_open') return 'Attendance window has not opened.';
  if (assignment.lockReason === 'closed') return 'Window closed. Contact admin to change.';
  if (assignment.lockReason === 'already_marked') {
    return `Marked ${assignment.attendance?.status || ''}${assignment.attendance?.marked_at ? ` at ${formatClock(assignment.attendance.marked_at)}` : ''}. Contact admin to change.`;
  }
  return '';
}

export default function FieldOfficerDashboard() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = useState<FieldOfficerPayload | null>(null);
  const [selectedPointId, setSelectedPointId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchPanel = useCallback(async () => {
    if (!token) return;
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/field-officer/me'), { headers });
      const data = await res.json().catch(() => ({})) as FieldOfficerPayload;
      if (!res.ok) {
        setPayload(null);
        setMessage({ type: 'error', text: data.error || 'Could not load field officer panel.' });
        return;
      }
      setPayload(data);
      setNow(Date.now());
      const points = Array.isArray(data?.points) ? data.points : [];
      setSelectedPointId((current) => {
        if (current && points.some((point) => point.id === current)) return current;
        return points[0]?.id || '';
      });
    } catch {
      setPayload(null);
      setMessage({ type: 'error', text: 'Network error. Check if API server is running.' });
    } finally {
      setLoading(false);
    }
  }, [headers, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPanel();
  }, [fetchPanel]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => void fetchPanel(), 60000);
    return () => window.clearInterval(refresh);
  }, [fetchPanel]);

  useEffect(() => {
    const cleanupAttendance = subscribeToRealtime('attendance', () => void fetchPanel());
    const cleanupAssignments = subscribeToRealtime('staff_assignments', () => void fetchPanel());
    const cleanupStaff = subscribeToRealtime('staff', () => void fetchPanel());
    return () => {
      cleanupAttendance?.();
      cleanupAssignments?.();
      cleanupStaff?.();
    };
  }, [fetchPanel]);

  const allPoints: FOPoint[] = Array.isArray(payload?.points) ? payload!.points : [];
  const selectedPoint = allPoints.find((point) => point.id === selectedPointId) || allPoints[0];
  const selectedShifts: ShiftBlock[] = Array.isArray(selectedPoint?.shifts) ? selectedPoint!.shifts : [];
  const allAssignments: Assignment[] = selectedShifts.flatMap((shift) =>
    Array.isArray(shift?.assignments) ? shift.assignments : []
  );
  const counts = allAssignments.reduce(
    (acc, assignment) => {
      const status = assignment.attendance?.status;
      if (status === 'present') acc.present += 1;
      else if (status === 'absent') acc.absent += 1;
      else if (status === 'leave') acc.leave += 1;
      return acc;
    },
    { present: 0, absent: 0, leave: 0 }
  );

  const markAttendance = async (assignment: Assignment, status: AttendanceStatus) => {
    if (!token || !assignment?.assignmentId || assignment.locked) return;
    const key = `${assignment.assignmentId}:${status}`;
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/field-officer/attendance'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ assignmentId: assignment.assignmentId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: (data as { error?: string }).error || 'Attendance save failed.' });
        await fetchPanel();
        return;
      }
      await fetchPanel();
    } catch {
      setMessage({ type: 'error', text: 'Network error while saving attendance.' });
    } finally {
      setSavingKey('');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['field_officer']}>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-3 py-4 text-slate-900 sm:px-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          <header className="flex items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{payload?.fieldOfficer?.name || 'Field Officer'}</p>
                <p className="truncate text-xs text-slate-500">Today only · {payload?.date || 'Loading'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </header>

          {message && (
            <div className={`rounded-2xl px-4 py-3 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'}`}>
              {message.text}
            </div>
          )}

          <GlassCard className="p-4">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assigned point
            </label>
            <select
              value={selectedPoint?.id || ''}
              onChange={(e) => setSelectedPointId(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              {allPoints.map((point) => (
                <option key={point.id} value={point.id}>
                  {point.name}{point.areaName ? ` - ${point.areaName}` : ''}
                </option>
              ))}
            </select>
          </GlassCard>

          {loading ? (
            <GlassCard className="flex min-h-[300px] items-center justify-center p-8">
              <LoadingSpinner />
            </GlassCard>
          ) : allPoints.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <MapPin className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">No assigned points yet.</p>
              <p className="mt-1 text-xs text-slate-500">Admin must assign points to this field officer.</p>
            </GlassCard>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Present" value={counts.present} className="border-emerald-100 bg-emerald-50 text-emerald-700" />
                <Stat label="Absent" value={counts.absent} className="border-red-100 bg-red-50 text-red-700" />
                <Stat label="Leave" value={counts.leave} className="border-amber-100 bg-amber-50 text-amber-700" />
              </div>

              <section className="space-y-4">
                {selectedShifts.length === 0 && (
                  <GlassCard className="p-6 text-center text-sm text-slate-500">
                    No staff have been assigned to a shift at this point yet.
                  </GlassCard>
                )}
                {selectedShifts.map((shift) => {
                  const state = windowState(shift, now);
                  const assignmentsForShift = Array.isArray(shift?.assignments) ? shift.assignments : [];
                  return (
                    <GlassCard key={shift.shiftId} className="overflow-hidden p-0">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900">{shift.name}</h2>
                          <p className="text-xs text-slate-500">{timeLabel(shift.start_time)} - {timeLabel(shift.end_time)}</p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {assignmentsForShift.map((assignment) => {
                          const staff = assignment?.staff || { id: '', name: 'Unknown staff', photoUrl: null, designation: null };
                          const activeStatus = assignment?.attendance?.status;
                          const lockMessage = lockText(assignment);
                          return (
                            <div key={assignment.assignmentId} className="p-3">
                              <div className="flex items-start gap-3">
                                {staff.photoUrl ? (
                                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                                    <Image src={staff.photoUrl} alt="" fill className="object-cover" unoptimized />
                                  </div>
                                ) : (
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-600">
                                    {(staff.name || '?').slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-slate-900">{staff.name}</p>
                                      <p className="truncate text-xs text-slate-500">
                                        {staff.designation || 'Staff'} · {shift.name}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => staff.id && router.push(`/staff/${staff.id}/edit`)}
                                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm"
                                      title="Edit guard information"
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                                      const cfg = statusConfig[status];
                                      const active = activeStatus === status;
                                      const saving = savingKey === `${assignment.assignmentId}:${status}`;
                                      return (
                                        <button
                                          key={status}
                                          type="button"
                                          disabled={Boolean(savingKey) || Boolean(assignment?.locked)}
                                          onClick={() => void markAttendance(assignment, status)}
                                          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                                            active ? `${cfg.className} ring-2` : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                          }`}
                                        >
                                          {cfg.icon}
                                          {saving ? 'Saving' : cfg.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {lockMessage && <p className="mt-2 text-[11px] font-medium text-slate-500">{lockMessage}</p>}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </GlassCard>
                  );
                })}
              </section>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-2xl border p-3 text-center ${className}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] font-medium uppercase">{label}</p>
    </div>
  );
}
