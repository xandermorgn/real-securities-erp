'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface PointRow {
  id: string;
  name: string;
  rate?: number;
}

interface AreaDetail {
  id: string;
  name: string;
  rate: number;
  points?: PointRow[];
}

export default function AreaDetailPage() {
  const params = useParams();
  const { token } = useAuth();
  const id = params.id as string;
  const [area, setArea] = useState<AreaDetail | null>(null);
  const [staffByPoint, setStaffByPoint] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [aRes, sRes] = await Promise.all([
          fetch(apiUrl(`/areas/${id}`), { headers: authHeaders }),
          fetch(apiUrl('/staff'), { headers: authHeaders }),
        ]);
        const a = await aRes.json();
        const staff = await sRes.json();
        setArea(a);

        const counts: Record<string, number> = {};
        if (Array.isArray(staff)) {
          for (const s of staff) {
            const pid = (s as { point_id?: string }).point_id ?? (s as { pointId?: string }).pointId;
            if (pid) counts[pid] = (counts[pid] || 0) + 1;
          }
        }
        setStaffByPoint(counts);
      } catch (e) {
        console.error(e);
        setArea(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout>
          <LoadingSpinner />
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!area) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout>
          <PageHeader title="Area" subtitle="Not found." />
          <Link href="/areas">
            <Button variant="outline">Back to areas</Button>
          </Link>
        </Layout>
      </ProtectedRoute>
    );
  }

  const points = area.points ?? [];

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
      <PageHeader
        title={area.name}
        subtitle="Drilldown: points in this area and guard counts (from staff assignments)."
        badges={[
          { label: `${points.length} points`, variant: 'blue' },
          { label: formatCurrency(area.rate), variant: 'slate' },
        ]}
        actions={
          <Link href="/areas">
            <Button variant="outline">All areas</Button>
          </Link>
        }
      />

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 font-medium text-slate-600">Point</th>
                <th className="px-4 py-3 font-medium text-slate-600">Rate</th>
                <th className="px-4 py-3 font-medium text-slate-600">Guards (assigned)</th>
                <th className="w-24 px-4 py-3 font-medium text-slate-600" />
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {formatCurrency(p.rate ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{staffByPoint[p.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/points/${p.id}`}
                      className="inline-flex items-center text-slate-500 hover:text-slate-800"
                    >
                      View
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {points.length === 0 && (
          <p className="p-8 text-center text-sm text-slate-500">No points in this area yet.</p>
        )}
      </GlassCard>
    </Layout>
    </ProtectedRoute>
  );
}
