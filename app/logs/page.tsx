'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

type AuditLogEntry = {
  id: string;
  user_id: string | null;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: string | null;
  created_at: string;
};

const ENTITY_FILTERS = [
  { value: '', label: 'All' },
  { value: 'staff', label: 'Staff' },
  { value: 'point', label: 'Point' },
  { value: 'area', label: 'Area' },
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'shift', label: 'Shift' },
  { value: 'designation', label: 'Designation' },
];

const PAGE_SIZE = 100;

function actionColor(action: string): string {
  if (action.startsWith('created') || action === 'created_advance') return 'bg-emerald-50 text-emerald-700 ring-emerald-200/60';
  if (action.startsWith('updated') || action === 'updated_assignments' || action === 'updated_advances' || action === 'updated_rate_plan') return 'bg-sky-50 text-sky-700 ring-sky-200/60';
  if (action.startsWith('deleted') || action === 'deleted_advance') return 'bg-red-50 text-red-700 ring-red-200/60';
  if (action.includes('attendance')) return 'bg-amber-50 text-amber-700 ring-amber-200/60';
  if (action === 'added_staff_to_point' || action === 'reassigned_staff') return 'bg-violet-50 text-violet-700 ring-violet-200/60';
  return 'bg-slate-50 text-slate-600 ring-slate-200/60';
}

function roleBadge(role: string): string {
  switch (role) {
    case 'owner': return 'bg-purple-100 text-purple-700';
    case 'admin': return 'bg-sky-100 text-sky-700';
    case 'field_officer': return 'bg-emerald-100 text-emerald-700';
    case 'staff': return 'bg-slate-100 text-slate-600';
    default: return 'bg-slate-100 text-slate-500';
  }
}

function formatAction(action: string): string {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatEntity(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
});

export default function LogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [entityFilter, setEntityFilter] = useState('');

  const fetchLogs = useCallback(async (offset: number, append: boolean) => {
    if (!token) return;
    const setter = offset === 0 ? setLoading : setLoadingMore;
    setter(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (entityFilter) params.set('entity_type', entityFilter);
      const res = await fetch(apiUrl(`/audit-logs?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load logs');
      const data: AuditLogEntry[] = await res.json();
      setLogs((prev) => append ? [...prev, ...data] : data);
      setHasMore(data.length === PAGE_SIZE);
    } catch {
      if (!append) setLogs([]);
    } finally {
      setter(false);
    }
  }, [token, entityFilter]);

  useEffect(() => {
    void fetchLogs(0, false);
  }, [fetchLogs]);

  function handleLoadMore() {
    void fetchLogs(logs.length, true);
  }

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <PageHeader
          title="Audit Logs"
          subtitle="Track all changes made across the system"
        />

        <GlassCard className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              {loading ? 'Loading...' : `${logs.length} entries loaded`}
            </p>
            <div className="relative">
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-700 shadow-sm transition focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                {ENTITY_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        </GlassCard>

        {loading ? (
          <LoadingSpinner />
        ) : logs.length === 0 ? (
          <GlassCard>
            <div className="flex min-h-[200px] items-center justify-center">
              <p className="text-sm text-slate-400">No audit log entries found</p>
            </div>
          </GlassCard>
        ) : (
          <>
            {/* Desktop table */}
            <GlassCard className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="whitespace-nowrap px-4 py-3">Date / Time</th>
                    <th className="whitespace-nowrap px-4 py-3">User</th>
                    <th className="whitespace-nowrap px-4 py-3">Action</th>
                    <th className="whitespace-nowrap px-4 py-3">Entity</th>
                    <th className="whitespace-nowrap px-4 py-3">Name</th>
                    <th className="whitespace-nowrap px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                        {dateFormatter.format(new Date(log.created_at))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{log.user_name}</span>
                          <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize', roleBadge(log.user_role))}>
                            {log.user_role.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1', actionColor(log.action))}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                        {formatEntity(log.entity_type)}
                      </td>
                      <td className="max-w-[180px] truncate px-4 py-3 text-sm text-slate-600">
                        {log.entity_name || '—'}
                      </td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-xs text-slate-400">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassCard>

            {/* Mobile cards */}
            <div className="flex flex-col gap-2 md:hidden">
              {logs.map((log) => (
                <GlassCard key={log.id}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-700">{log.user_name}</span>
                        <span className={cn('inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-semibold capitalize', roleBadge(log.user_role))}>
                          {log.user_role.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1', actionColor(log.action))}>
                          {formatAction(log.action)}
                        </span>
                        <span className="text-xs text-slate-500">{formatEntity(log.entity_type)}</span>
                      </div>
                      {log.entity_name && (
                        <p className="mt-1 truncate text-sm text-slate-600">{log.entity_name}</p>
                      )}
                      {log.details && (
                        <p className="mt-0.5 truncate text-xs text-slate-400">{log.details}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {dateFormatter.format(new Date(log.created_at))}
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:shadow disabled:opacity-50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
