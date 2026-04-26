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
import { Plus, Search, Shield, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { subscribeToRealtime } from '@/lib/supabase-client';

type FieldOfficerRow = Record<string, unknown> & {
  id: string;
  name: string;
  shift?: string;
  joining_date?: string;
  joiningDate?: string;
  photo_url?: string;
  photoUrl?: string;
  field_officer_points?: Array<{
    points?: { id: string; name: string; areas?: { name: string } };
  }>;
};

export default function FieldOfficersPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [officers, setOfficers] = useState<FieldOfficerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    void fetchOfficers();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const cleanup = subscribeToRealtime('field_officers', () => {
      console.log('[Field Officers] Realtime update detected, refreshing...');
      void fetchOfficers();
    });
    return cleanup;
  }, []);

  async function fetchOfficers() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/field-officers'), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      setOfficers(Array.isArray(data) ? data : []);
    } catch {
      setOfficers([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredOfficers = officers.filter((o) =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return <ProtectedRoute allowedRoles={['owner', 'admin']}><Layout><LoadingSpinner /></Layout></ProtectedRoute>;

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <PageHeader
          title="Field Officers"
          subtitle="Manage field officers and their assigned points."
          badges={[{ label: `${officers.length} officers`, variant: 'slate' }]}
          actions={
            <Button type="button" onClick={() => router.push('/field-officers/add')}>
              <Plus className="h-4 w-4" />
              Add field officer
            </Button>
          }
        />

        <GlassCard className="mb-5 p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search by name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200/60 bg-slate-50/60">
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Officer</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Shift</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned Points</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Joined</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-20" />
                </tr>
              </thead>
              <tbody>
                {filteredOfficers.map((officer) => {
                  const photoUrl = officer.photo_url || officer.photoUrl;
                  const jDate = officer.joining_date || officer.joiningDate;
                  const points = officer.field_officer_points || [];
                  const pointCount = points.length;
                  
                  return (
                    <tr
                      key={officer.id}
                      onClick={() => router.push(`/field-officers/${officer.id}`)}
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                              <Shield className="h-4 w-4" strokeWidth={2} />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-slate-900">{officer.name}</p>
                            <p className="text-xs text-slate-400">ID {officer.id.slice(0, 8)}…</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{officer.shift || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-sm font-medium">{pointCount}</span>
                          <span className="text-xs text-slate-400">
                            {pointCount === 1 ? 'point' : 'points'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {jDate ? formatDate(String(jDate)) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/field-officers/${officer.id}/edit`);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOfficers.length === 0 && (
            <p className="px-4 py-12 text-center text-sm text-slate-500">
              {searchQuery ? 'No officers match this search.' : 'No field officers yet. Add your first field officer above.'}
            </p>
          )}
        </GlassCard>
      </Layout>
    </ProtectedRoute>
  );
}
