'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Plus, MapPin, X, Edit2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { subscribeToRealtime } from '@/lib/supabase-client';
import Link from 'next/link';

interface Area {
  id: string;
  name: string;
  points?: { id: string; name: string }[];
}

export default function AreasPage() {
  const { token } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [areaName, setAreaName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchAreas();
  }, []);

  // Real-time subscription
  useEffect(() => {
    const cleanup = subscribeToRealtime('areas', () => {
      console.log('[Areas] Realtime update detected, refreshing...');
      void fetchAreas();
    });
    return cleanup;
  }, []);

  async function fetchAreas() {
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/areas'), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      setAreas(Array.isArray(data) ? data : []);
    } catch {
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }

  const openModal = (area?: Area) => {
    if (area) {
      setEditingId(area.id);
      setAreaName(area.name);
    } else {
      setEditingId(null);
      setAreaName('');
    }
    setErr(null);
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setErr(null); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = areaName.trim();
    if (!name) { setErr('Area name is required.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(apiUrl(editingId ? `/areas/${editingId}` : '/areas'), {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        closeModal();
        void fetchAreas();
      } else {
        const j = await res.json().catch(() => ({}));
        setErr((j as { error?: string }).error || `Server error ${res.status}`);
      }
    } catch {
      setErr('Network error — is the API server running?');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ProtectedRoute allowedRoles={['owner', 'admin']}><Layout><LoadingSpinner /></Layout></ProtectedRoute>;

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
      <PageHeader
        title="Area"
        subtitle="Areas group your security points."
        badges={[{ label: `${areas.length} area${areas.length !== 1 ? 's' : ''}`, variant: 'slate' }]}
        actions={
          <Button type="button" onClick={() => openModal()}>
            <Plus className="h-4 w-4" />
            Add area
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <GlassCard key={area.id} hoverable className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">{area.name}</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {area.points?.length ?? 0} point{(area.points?.length ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <MapPin className="h-4.5 w-4.5" strokeWidth={1.75} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link href={`/areas/${area.id}`} className="flex-1">
                <Button variant="outline" className="w-full" type="button" size="sm">
                  View
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  openModal(area);
                }}
                className="px-3"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      {areas.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center text-slate-500">
          <MapPin className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
          <p className="text-sm">No areas yet. Create your first area above.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4 backdrop-blur-[2px]">
          <GlassCard className="w-full max-w-sm p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{editingId ? 'Edit area' : 'New area'}</h2>
              <button type="button" onClick={closeModal} className="rounded-md p-1 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Area name"
                placeholder="e.g. Zone A"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                autoFocus
              />
              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create area'}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </Layout>
    </ProtectedRoute>
  );
}
