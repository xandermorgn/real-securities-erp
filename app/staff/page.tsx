'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import LoadingSpinner from '@/components/LoadingSpinner';
import Input from '@/components/Input';
import { Plus, Search, Pencil, X } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { subscribeToRealtime } from '@/lib/supabase-client';

type StaffRow = Record<string, unknown> & {
  id: string;
  name: string;
  designation?: string;
  salary?: number;
  shift?: string;
  joining_date?: string;
  joiningDate?: string;
  photo_url?: string;
  photoUrl?: string;
};

export default function StaffPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [designations, setDesignations] = useState<string[]>([]);
  const [shifts, setShifts] = useState<string[]>([]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    void fetchStaff();
  }, []);

  // Real-time subscription for instant updates
  useEffect(() => {
    const cleanup = subscribeToRealtime('staff', () => {
      console.log('[Staff] Realtime update detected, refreshing...');
      void fetchStaff();
    });
    return cleanup;
  }, []);

  async function fetchStaff() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/staff'), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setStaff(list);
      const uniqueDesignations = Array.from(new Set(list.map((s: Record<string, unknown>) => String(s.designation || '')).filter(Boolean)));
      const uniqueShifts = Array.from(new Set(list.map((s: Record<string, unknown>) => String(s.shift || '')).filter(Boolean)));
      setDesignations(uniqueDesignations);
      setShifts(uniqueShifts);
    } catch {
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredStaff = staff.filter((s) => {
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (designationFilter && String(s.designation || '').trim().toLowerCase() !== designationFilter.trim().toLowerCase()) return false;
    if (shiftFilter && String(s.shift || '').trim().toLowerCase() !== shiftFilter.trim().toLowerCase()) return false;
    return true;
  });

  if (loading) return <ProtectedRoute allowedRoles={['owner', 'admin']}><Layout><LoadingSpinner /></Layout></ProtectedRoute>;

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
      <PageHeader
        title="Staff"
        subtitle="Full roster with photos, assignments, and salaries."
        badges={[{ label: `${staff.length} people`, variant: 'slate' }]}
        actions={
          <Button type="button" onClick={() => router.push('/staff/add')}>
            <Plus className="h-4 w-4" />
            Add staff
          </Button>
        }
      />

      <GlassCard className="mb-5 p-4">
        <div className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Designation:</label>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
              >
                <option value="">All</option>
                {designations.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {designationFilter && (
                <button type="button" onClick={() => setDesignationFilter('')} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Shift:</label>
              <select
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value)}
              >
                <option value="">All</option>
                {shifts.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {shiftFilter && (
                <button type="button" onClick={() => setShiftFilter('')} className="text-slate-400 hover:text-slate-700">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 bg-slate-50/60">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Staff</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Designation</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Salary</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Point</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Shift</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">User ID</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Password</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-20" />
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((m) => {
                const photoUrl = m.photo_url || m.photoUrl;
                const pointName = (m.points as { name?: string } | undefined)?.name;
                const jDate = m.joining_date || m.joiningDate;
                return (
                  <tr
                    key={m.id}
                    onClick={() => router.push(`/staff/${m.id}`)}
                    className="cursor-pointer border-b border-slate-100 last:border-0 transition hover:bg-slate-50/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={String(photoUrl)}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{m.name}</p>
                          <p className="text-xs text-slate-400">ID {m.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{m.designation || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatCurrency(Number(m.salary) || 0)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{pointName || '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{m.shift || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{(m as Record<string, unknown>).login_id ? String((m as Record<string, unknown>).login_id) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{(m as Record<string, unknown>).login_password ? String((m as Record<string, unknown>).login_password) : '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {jDate ? formatDate(String(jDate)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/staff/${m.id}/edit`);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredStaff.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            {searchQuery ? 'No staff match this search.' : 'No staff yet. Add your first staff member above.'}
          </p>
        )}
      </GlassCard>
    </Layout>
    </ProtectedRoute>
  );
}
