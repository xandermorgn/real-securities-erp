'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  differenceInCalendarDays,
  endOfWeek,
  startOfWeek,
} from 'date-fns';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import DateRangePopover, { type DateRangeValue } from '@/components/DateRangePopover';
import { CheckCircle, XCircle, CalendarDays, LineChart } from 'lucide-react';
import { AttendanceStats } from '@/types';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { subscribeToRealtime } from '@/lib/supabase-client';

type DailyMatrixStaff = {
  id: string;
  name: string;
  designation?: string | null;
  shift?: string | null;
  status: 'present' | 'absent' | 'leave' | 'unmarked';
};

type DailyMatrixPoint = {
  id: string;
  name: string;
  areaName?: string | null;
  counts: {
    present: number;
    absent: number;
    leave: number;
    unmarked: number;
    total: number;
  };
  staff: DailyMatrixStaff[];
};

type DailyMatrix = {
  date: string;
  totals: {
    present: number;
    absent: number;
    leave: number;
    unmarked: number;
    total: number;
  };
  points: DailyMatrixPoint[];
};

function defaultWeekRange(): DateRangeValue {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 0 }),
    end: endOfWeek(now, { weekStartsOn: 0 }),
  };
}

export default function Dashboard() {
  const { token } = useAuth();
  const [attendanceRange, setAttendanceRange] = useState<DateRangeValue>(defaultWeekRange);
  const [averagesRange, setAveragesRange] = useState<DateRangeValue>(defaultWeekRange);

  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [averageStats, setAverageStats] = useState<AttendanceStats | null>(null);
  const [matrixDate, setMatrixDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dailyMatrix, setDailyMatrix] = useState<DailyMatrix | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [loadingAverages, setLoadingAverages] = useState(true);
  const [loadingMatrix, setLoadingMatrix] = useState(true);

  const fetchAttendance = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      const { start, end } = attendanceRange;
      const qs = `startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      const response = await fetch(apiUrl(`/dashboard/attendance?${qs}`), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      setAttendanceStats(data);
    } catch (e) {
      console.error(e);
      setAttendanceStats(null);
    } finally {
      setLoadingAttendance(false);
    }
  }, [attendanceRange, token]);

  const fetchAverages = useCallback(async () => {
    setLoadingAverages(true);
    try {
      const { start, end } = averagesRange;
      const qs = `startDate=${start.toISOString()}&endDate=${end.toISOString()}`;
      const response = await fetch(apiUrl(`/dashboard/attendance?${qs}`), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      setAverageStats(data);
    } catch (e) {
      console.error(e);
      setAverageStats(null);
    } finally {
      setLoadingAverages(false);
    }
  }, [averagesRange, token]);

  const fetchDailyMatrix = useCallback(async () => {
    setLoadingMatrix(true);
    try {
      const response = await fetch(apiUrl(`/dashboard/daily-matrix?date=${matrixDate}`), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await response.json();
      setDailyMatrix(data);
    } catch (e) {
      console.error(e);
      setDailyMatrix(null);
    } finally {
      setLoadingMatrix(false);
    }
  }, [matrixDate, token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAverages();
  }, [fetchAverages]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDailyMatrix();
  }, [fetchDailyMatrix]);

  // Real-time subscription for attendance updates
  useEffect(() => {
    const cleanup = subscribeToRealtime('attendance', () => {
      console.log('[Dashboard] Realtime update detected, refreshing stats...');
      void fetchAttendance();
      void fetchAverages();
      void fetchDailyMatrix();
    });
    return cleanup;
  }, [fetchAttendance, fetchAverages, fetchDailyMatrix]);

  const avgDays = (range: DateRangeValue) =>
    differenceInCalendarDays(range.end, range.start) + 1;

  const dailyAvg = (total: number, range: DateRangeValue) => {
    const d = avgDays(range);
    if (d <= 0) return 0;
    return Math.round(total / d);
  };

  const combinedAverage = (stats: AttendanceStats | null, range: DateRangeValue) => {
    if (!stats) return 0;
    const ap = dailyAvg(stats.present, range);
    const al = dailyAvg(stats.leave, range);
    const aa = dailyAvg(stats.absent, range);
    return Math.round((ap + al + aa) / 3);
  };

  if (loadingAttendance && !attendanceStats) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout>
          <LoadingSpinner />
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <PageHeader
        title="Dashboard"
        subtitle="Tap the calendar icon to change the range for each section."
        badges={[
          { label: 'Live range', variant: 'blue' },
          { label: 'Attendance', variant: 'green' },
        ]}
      />

      <div className="space-y-8">
        <GlassCard className="p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Attendance overview
              </h2>
              <p className="mt-1 text-sm text-slate-600/90">
                Present, leave, and absent with percentages for the active range.
              </p>
            </div>
            <DateRangePopover
              value={attendanceRange}
              onChange={setAttendanceRange}
              rangeLabel="Attendance date range"
              align="end"
            />
          </div>

          {loadingAttendance ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatsCard
                title="Present"
                value={attendanceStats?.present ?? 0}
                percentage={attendanceStats?.presentPercentage ?? 0}
                icon={<CheckCircle className="h-5 w-5" strokeWidth={1.75} />}
                color="green"
              />
              <StatsCard
                title="Leave"
                value={attendanceStats?.leave ?? 0}
                percentage={attendanceStats?.leavePercentage ?? 0}
                icon={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
                color="yellow"
              />
              <StatsCard
                title="Absent"
                value={attendanceStats?.absent ?? 0}
                percentage={attendanceStats?.absentPercentage ?? 0}
                icon={<XCircle className="h-5 w-5" strokeWidth={1.75} />}
                color="red"
              />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Averages &amp; stats
              </h2>
              <p className="mt-1 text-sm text-slate-600/90">
                Daily averages for the range plus combined average — separate filter from
                attendance.
              </p>
            </div>
            <DateRangePopover
              value={averagesRange}
              onChange={setAveragesRange}
              rangeLabel="Averages date range"
              align="end"
            />
          </div>

          {loadingAverages ? (
            <LoadingSpinner />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Average present / day"
                value={dailyAvg(averageStats?.present ?? 0, averagesRange)}
                footnote={`Over ${avgDays(averagesRange)} day(s)`}
                icon={<CheckCircle className="h-5 w-5" strokeWidth={1.75} />}
                color="green"
              />
              <StatsCard
                title="Average leave / day"
                value={dailyAvg(averageStats?.leave ?? 0, averagesRange)}
                footnote={`Over ${avgDays(averagesRange)} day(s)`}
                icon={<CalendarDays className="h-5 w-5" strokeWidth={1.75} />}
                color="yellow"
              />
              <StatsCard
                title="Average absent / day"
                value={dailyAvg(averageStats?.absent ?? 0, averagesRange)}
                footnote={`Over ${avgDays(averagesRange)} day(s)`}
                icon={<XCircle className="h-5 w-5" strokeWidth={1.75} />}
                color="red"
              />
              <StatsCard
                title="Combined average"
                value={combinedAverage(averageStats, averagesRange)}
                footnote="Mean of the three daily averages"
                icon={<LineChart className="h-5 w-5" strokeWidth={1.75} />}
                color="indigo"
              />
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6 md:p-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="text-lg font-semibold tracking-tight text-slate-900">
                Daily present / absent matrix
              </h2>
              <p className="mt-1 text-sm text-slate-600/90">
                Point-wise daily attendance from Field Officer updates.
              </p>
            </div>
            <input
              type="date"
              value={matrixDate}
              onChange={(e) => setMatrixDate(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {loadingMatrix ? (
            <LoadingSpinner />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total staff</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{dailyMatrix?.totals.total ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Present</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-800">{dailyMatrix?.totals.present ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-red-600">Absent</p>
                  <p className="mt-1 text-2xl font-bold text-red-800">{dailyMatrix?.totals.absent ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Leave</p>
                  <p className="mt-1 text-2xl font-bold text-amber-800">{dailyMatrix?.totals.leave ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unmarked</p>
                  <p className="mt-1 text-2xl font-bold text-slate-700">{dailyMatrix?.totals.unmarked ?? 0}</p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="max-h-[520px] overflow-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-50">
                      <tr className="border-b border-slate-200">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Point</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-emerald-600">Present</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-red-600">Absent</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-amber-600">Leave</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Unmarked</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(dailyMatrix?.points || []).map((point) => (
                        <tr key={point.id} className="border-b border-slate-100 align-top last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">{point.name}</p>
                            <p className="text-xs text-slate-400">{point.areaName || 'No area'}</p>
                          </td>
                          <td className="px-4 py-3 text-center font-semibold text-emerald-700">{point.counts.present}</td>
                          <td className="px-4 py-3 text-center font-semibold text-red-700">{point.counts.absent}</td>
                          <td className="px-4 py-3 text-center font-semibold text-amber-700">{point.counts.leave}</td>
                          <td className="px-4 py-3 text-center font-semibold text-slate-500">{point.counts.unmarked}</td>
                          <td className="px-4 py-3">
                            <div className="flex max-w-xl flex-wrap gap-1.5">
                              {point.staff.map((member) => (
                                <span
                                  key={member.id}
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                    member.status === 'present'
                                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                      : member.status === 'absent'
                                        ? 'bg-red-50 text-red-700 ring-1 ring-red-100'
                                        : member.status === 'leave'
                                          ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
                                          : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                                  }`}
                                >
                                  {member.name}: {member.status}
                                </span>
                              ))}
                              {point.staff.length === 0 && (
                                <span className="text-xs text-slate-400">No staff assigned</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </Layout>
    </ProtectedRoute>
  );
}
