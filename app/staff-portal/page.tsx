'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useAuth } from '@/lib/auth-context';
import { apiUrl } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { subscribeToRealtime } from '@/lib/supabase-client';
import {
  CalendarDays, CheckCircle, DollarSign, LogOut, MapPin, Shield,
  User, XCircle, Clock, Wallet,
} from 'lucide-react';

type AttendanceStatus = 'present' | 'absent' | 'leave';
type LockReason = 'not_open' | 'closed' | 'already_marked' | null;

type ShiftBlock = {
  assignmentId: string;
  shiftId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  pointId: string;
  pointName: string;
  areaName: string | null;
  windowOpensAt: string;
  windowClosesAt: string;
  attendance: {
    status: AttendanceStatus;
    marked_at?: string | null;
    marked_by_role?: string | null;
  } | null;
  locked: boolean;
  lockReason: LockReason;
};

type AdvanceRecord = {
  id: string;
  amount: number;
  date: string;
  remarks?: string | null;
};

type StaffPortalPayload = {
  date: string;
  serverNow: string;
  staff: {
    id: string;
    name: string;
    designation: string | null;
    photoUrl: string | null;
    salary: number;
    salaryType: string | null;
    salaryDate: string | null;
    joiningDate: string | null;
  };
  totalAdvance: number;
  recentAdvances: AdvanceRecord[];
  shifts: ShiftBlock[];
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

function lockText(shift: ShiftBlock) {
  if (shift.lockReason === 'not_open') return 'Attendance window has not opened.';
  if (shift.lockReason === 'closed') return 'Window closed. Contact admin to change.';
  if (shift.lockReason === 'already_marked') {
    return `Marked ${shift.attendance?.status || ''}${shift.attendance?.marked_at ? ` at ${formatClock(shift.attendance.marked_at)}` : ''}. Contact admin to change.`;
  }
  return '';
}

export default function StaffPortalPage() {
  const { token, logout } = useAuth();
  const [payload, setPayload] = useState<StaffPortalPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState('');
  const [message, setMessage] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());
  const [showAdvances, setShowAdvances] = useState(false);

  const headers = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }), [token]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/staff-portal/me'), { headers });
      const data = await res.json().catch(() => ({})) as StaffPortalPayload;
      if (!res.ok) {
        setPayload(null);
        setMessage({ type: 'error', text: data.error || 'Could not load your portal.' });
        return;
      }
      setPayload(data);
      setNow(Date.now());
    } catch {
      setPayload(null);
      setMessage({ type: 'error', text: 'Network error. Check if API server is running.' });
    } finally {
      setLoading(false);
    }
  }, [headers, token]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(() => void fetchData(), 60000);
    return () => window.clearInterval(refresh);
  }, [fetchData]);

  useEffect(() => {
    const c1 = subscribeToRealtime('attendance', () => void fetchData());
    const c2 = subscribeToRealtime('staff_assignments', () => void fetchData());
    return () => { c1?.(); c2?.(); };
  }, [fetchData]);

  const counts = useMemo(() => {
    const shifts = payload?.shifts || [];
    return shifts.reduce(
      (acc, s) => {
        const status = s.attendance?.status;
        if (status === 'present') acc.present += 1;
        else if (status === 'absent') acc.absent += 1;
        else if (status === 'leave') acc.leave += 1;
        return acc;
      },
      { present: 0, absent: 0, leave: 0 },
    );
  }, [payload]);

  const markAttendance = async (shift: ShiftBlock, status: AttendanceStatus) => {
    if (!token || shift.locked) return;
    const key = `${shift.assignmentId}:${status}`;
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch(apiUrl('/staff-portal/attendance'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ assignmentId: shift.assignmentId, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: (data as { error?: string }).error || 'Attendance save failed.' });
      }
      await fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Network error while saving attendance.' });
    } finally {
      setSavingKey('');
    }
  };

  const staff = payload?.staff;
  const shifts = payload?.shifts || [];

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-3 py-4 text-slate-900 sm:px-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4">

          {/* Header */}
          <header className="flex items-center justify-between gap-3 rounded-3xl border border-white/70 bg-white/80 p-3 shadow-sm backdrop-blur-xl">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{staff?.name || 'Staff Portal'}</p>
                <p className="truncate text-xs text-slate-500">
                  {staff?.designation || 'Staff'} · {payload?.date || 'Loading'}
                </p>
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

          {loading ? (
            <GlassCard className="flex min-h-[300px] items-center justify-center p-8">
              <LoadingSpinner />
            </GlassCard>
          ) : !staff ? (
            <GlassCard className="p-8 text-center">
              <User className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">Staff profile not found.</p>
              <p className="mt-1 text-xs text-slate-500">Admin must create staff with login credentials linked to your account.</p>
            </GlassCard>
          ) : (
            <>
              {/* Info cards */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <GlassCard className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Salary</p>
                    <p className="truncate text-sm font-bold text-slate-900">{formatCurrency(staff.salary)}</p>
                  </div>
                </GlassCard>

                <GlassCard
                  className="flex cursor-pointer items-center gap-3 p-3 transition hover:ring-2 hover:ring-amber-200"
                  onClick={() => setShowAdvances(!showAdvances)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Advance</p>
                    <p className="truncate text-sm font-bold text-amber-800">{formatCurrency(payload?.totalAdvance || 0)}</p>
                  </div>
                </GlassCard>

                <GlassCard className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Shifts</p>
                    <p className="truncate text-sm font-bold text-slate-900">{shifts.length}</p>
                  </div>
                </GlassCard>

                <GlassCard className="flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Points</p>
                    <p className="truncate text-sm font-bold text-slate-900">
                      {new Set(shifts.map((s) => s.pointName)).size}
                    </p>
                  </div>
                </GlassCard>
              </div>

              {/* Advance breakdown (expandable) */}
              {showAdvances && (payload?.recentAdvances?.length || 0) > 0 && (
                <GlassCard className="p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Recent advances</h3>
                  <div className="space-y-2">
                    {(payload?.recentAdvances || []).map((adv) => (
                      <div key={adv.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-800">{formatCurrency(Number(adv.amount))}</p>
                          <p className="text-[11px] text-slate-500">{adv.remarks || '—'}</p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(adv.date)}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              )}

              {/* Attendance stat pills */}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Present" value={counts.present} className="border-emerald-100 bg-emerald-50 text-emerald-700" />
                <Stat label="Absent" value={counts.absent} className="border-red-100 bg-red-50 text-red-700" />
                <Stat label="Leave" value={counts.leave} className="border-amber-100 bg-amber-50 text-amber-700" />
              </div>

              {/* Shifts & attendance */}
              <section className="space-y-4">
                {shifts.length === 0 && (
                  <GlassCard className="p-6 text-center text-sm text-slate-500">
                    No shift assignments found. Contact admin.
                  </GlassCard>
                )}

                {shifts.map((shift) => {
                  const state = windowState(shift, now);
                  const activeStatus = shift.attendance?.status;
                  const lock = lockText(shift);
                  return (
                    <GlassCard key={shift.assignmentId} className="overflow-hidden p-0">
                      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900">{shift.shiftName}</h2>
                          <p className="text-xs text-slate-500">
                            {timeLabel(shift.startTime)} – {timeLabel(shift.endTime)} · {shift.pointName}
                            {shift.areaName ? ` (${shift.areaName})` : ''}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.tone}`}>{state.label}</span>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
                            const cfg = statusConfig[status];
                            const active = activeStatus === status;
                            const saving = savingKey === `${shift.assignmentId}:${status}`;
                            return (
                              <button
                                key={status}
                                type="button"
                                disabled={Boolean(savingKey) || shift.locked}
                                onClick={() => void markAttendance(shift, status)}
                                className={`flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border px-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                                  active ? `${cfg.className} ring-2` : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                }`}
                              >
                                {cfg.icon}
                                {saving ? 'Saving' : cfg.label}
                              </button>
                            );
                          })}
                        </div>
                        {lock && <p className="mt-2 text-[11px] font-medium text-slate-500">{lock}</p>}
                      </div>
                    </GlassCard>
                  );
                })}
              </section>

              {/* Salary date info */}
              {staff.salaryDate && (
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>Salary date: <span className="font-medium text-slate-900">{formatDate(String(staff.salaryDate))}</span></span>
                  </div>
                </GlassCard>
              )}
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
