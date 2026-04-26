'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Plus, MapPin, Users, X, Edit2, IndianRupee, Trash2 } from 'lucide-react';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { subscribeToRealtime } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';

interface Point {
  id: string;
  name: string;
  area_id?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  remarks?: string;
  areas?: { name: string };
  staff?: unknown[];
}

type RateSlot = {
  designation: string;
  count: number;
  ratePerPerson: number;
};

type RateSummary = { slots: RateSlot[]; total: number };

type Designation = { id: string; name: string };

export default function PointsPage() {
  const { token } = useAuth();
  const [points, setPoints] = useState<Point[]>([]);
  const [areas, setAreas] = useState<{ id: string; name: string }[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [staffByDesignation, setStaffByDesignation] = useState<Record<string, number>>({});
  const [rateSummaries, setRateSummaries] = useState<Record<string, RateSummary>>({});

  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', areaId: '', contactPerson: '', contactPhone: '', contactEmail: '', remarks: '',
  });

  const [slots, setSlots] = useState<RateSlot[]>([]);
  const [pendingDesignation, setPendingDesignation] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    void fetchData();
  }, []);

  useEffect(() => {
    const cleanup = subscribeToRealtime('points', () => {
      console.log('[Points] Realtime update detected, refreshing...');
      void fetchData();
    });
    return cleanup;
  }, []);

  useEffect(() => {
    const cleanup = subscribeToRealtime('point_rate_slots', () => {
      void fetchData();
    });
    return cleanup;
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [pr, ar, dr, sr] = await Promise.all([
        fetch(apiUrl('/points'), { headers: authHeaders }),
        fetch(apiUrl('/areas'), { headers: authHeaders }),
        fetch(apiUrl('/designations'), { headers: authHeaders }),
        fetch(apiUrl('/staff'), { headers: authHeaders }),
      ]);
      const pd = await pr.json();
      const ad = await ar.json();
      const dd = await dr.json();
      const sd = await sr.json();
      const pointsList: Point[] = Array.isArray(pd) ? pd : [];
      setPoints(pointsList);
      setAreas(Array.isArray(ad) ? ad : []);
      setDesignations(Array.isArray(dd) ? dd : []);

      const counts: Record<string, number> = {};
      if (Array.isArray(sd)) {
        for (const s of sd as { designation?: string }[]) {
          const key = (s.designation || '').trim();
          if (!key) continue;
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      setStaffByDesignation(counts);

      const summaryEntries = await Promise.all(
        pointsList.map(async (pt) => {
          try {
            const r = await fetch(apiUrl(`/points/${pt.id}/rate-slots`), { headers: authHeaders });
            const j = await r.json();
            const rawSlots = Array.isArray(j.slots) ? j.slots : [];
            const normalized: RateSlot[] = rawSlots.map((s: Record<string, unknown>) => ({
              designation: String(s.designation || ''),
              count: Number(s.count || 0),
              ratePerPerson: Number(s.rate_per_person || 0),
            }));
            const total = Number(j.total || 0);
            return [pt.id, { slots: normalized, total } as RateSummary] as const;
          } catch {
            return [pt.id, { slots: [], total: 0 } as RateSummary] as const;
          }
        }),
      );
      const map: Record<string, RateSummary> = {};
      for (const [id, summary] of summaryEntries) map[id] = summary;
      setRateSummaries(map);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const openModal = async (pt?: Point) => {
    if (pt) {
      setEditingId(pt.id);
      setForm({
        name: pt.name,
        areaId: pt.area_id || '',
        contactPerson: pt.contact_person || '',
        contactPhone: pt.contact_phone || '',
        contactEmail: pt.contact_email || '',
        remarks: pt.remarks || '',
      });
      const cached = rateSummaries[pt.id];
      if (cached) {
        setSlots(cached.slots);
      } else {
        setSlots([]);
        try {
          const r = await fetch(apiUrl(`/points/${pt.id}/rate-slots`), {
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          });
          const j = await r.json();
          const raw = Array.isArray(j.slots) ? j.slots : [];
          setSlots(
            raw.map((s: Record<string, unknown>) => ({
              designation: String(s.designation || ''),
              count: Number(s.count || 0),
              ratePerPerson: Number(s.rate_per_person || 0),
            })),
          );
        } catch {
          setSlots([]);
        }
      }
    } else {
      setEditingId(null);
      setForm({ name: '', areaId: '', contactPerson: '', contactPhone: '', contactEmail: '', remarks: '' });
      setSlots([]);
    }
    setPendingDesignation('');
    setErr(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setErr(null);
    setEditingId(null);
    setSlots([]);
    setPendingDesignation('');
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const addSlot = () => {
    const designation = pendingDesignation.trim();
    if (!designation) return;
    if (slots.some((s) => s.designation.toLowerCase() === designation.toLowerCase())) {
      setErr(`"${designation}" is already in the rate plan.`);
      return;
    }
    setSlots((prev) => [...prev, { designation, count: 1, ratePerPerson: 0 }]);
    setPendingDesignation('');
    setErr(null);
  };

  const updateSlot = (index: number, key: 'count' | 'ratePerPerson', value: number) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: Math.max(0, value) } : s)));
  };

  const removeSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const slotsTotal = useMemo(
    () => slots.reduce((sum, s) => sum + Number(s.count || 0) * Number(s.ratePerPerson || 0), 0),
    [slots],
  );

  const availableDesignations = useMemo(() => {
    const used = new Set(slots.map((s) => s.designation.toLowerCase()));
    return designations.filter((d) => !used.has(d.name.toLowerCase()));
  }, [designations, slots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Point name is required.'); return; }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(apiUrl(editingId ? `/points/${editingId}` : '/points'), {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: form.name.trim(),
          areaId: form.areaId || null,
          contactPerson: form.contactPerson || null,
          contactPhone: form.contactPhone || null,
          contactEmail: form.contactEmail || null,
          remarks: form.remarks || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr((j as { error?: string }).error || `Server error ${res.status}`);
        return;
      }
      const saved = await res.json().catch(() => null) as { id?: string } | null;
      const targetId = editingId || saved?.id;

      if (targetId) {
        const slotsRes = await fetch(apiUrl(`/points/${targetId}/rate-slots`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ slots }),
        });
        if (!slotsRes.ok) {
          const j = await slotsRes.json().catch(() => ({}));
          setErr((j as { error?: string }).error || `Failed to save rate plan (${slotsRes.status})`);
          return;
        }
      }

      closeModal();
      void fetchData();
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
        title="Points"
        subtitle="Security checkpoints linked to areas."
        badges={[{ label: `${points.length} point${points.length !== 1 ? 's' : ''}`, variant: 'slate' }]}
        actions={
          <Button type="button" onClick={() => void openModal()}>
            <Plus className="h-4 w-4" />
            Add point
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((pt) => {
          const summary = rateSummaries[pt.id];
          return (
            <GlassCard key={pt.id} hoverable className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">{pt.name}</h3>
                  <p className="mt-0.5 text-sm text-sky-600">{pt.areas?.name || 'No area'}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <MapPin className="h-4.5 w-4.5" strokeWidth={1.75} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
                <Users className="h-4 w-4" />
                <span>{(pt.staff as unknown[])?.length || 0} assigned</span>
              </div>
              {summary && summary.slots.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-slate-400">
                    <span>Rate plan</span>
                    <span className="text-slate-700">{formatCurrency(summary.total)}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {summary.slots.map((s) => (
                      <span
                        key={s.designation}
                        className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-[11px] text-slate-600 ring-1 ring-slate-200"
                      >
                        <span className="font-medium text-slate-800">{s.count}</span>
                        <span>{s.designation}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {pt.contact_person && (
                <p className="mt-2 text-sm text-slate-500 truncate">Contact: {pt.contact_person}</p>
              )}
              <div className="mt-4 flex gap-2">
                <Link href={`/points/${pt.id}`} className="flex-1">
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
                    void openModal(pt);
                  }}
                  className="px-3"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {points.length === 0 && (
        <div className="mt-8 flex flex-col items-center gap-3 text-center text-slate-500">
          <MapPin className="h-10 w-10 text-slate-300" strokeWidth={1.5} />
          <p className="text-sm">
            No points yet.{' '}
            {areas.length === 0 ? (
              <Link href="/areas" className="font-medium text-sky-600 underline underline-offset-2">
                Create an area first.
              </Link>
            ) : (
              'Click Add point to get started.'
            )}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/20 p-4 backdrop-blur-[2px]">
          <GlassCard className="my-8 w-full max-w-2xl p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">{editingId ? 'Edit point' : 'New point'}</h2>
              <button type="button" onClick={closeModal} className="rounded-md p-1 text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input label="Point name" placeholder="e.g. Gate 1" value={form.name} onChange={set('name')} />
                <Select
                  label="Area"
                  options={[
                    { value: '', label: areas.length ? 'Select area' : 'No areas — create one first' },
                    ...areas.map((a) => ({ value: a.id, label: a.name })),
                  ]}
                  value={form.areaId}
                  onChange={set('areaId')}
                />
                <Input label="Contact person" placeholder="e.g. Rahul Sharma" value={form.contactPerson} onChange={set('contactPerson')} />
                <Input label="Contact phone" type="tel" placeholder="+91 98765 43210" value={form.contactPhone} onChange={set('contactPhone')} />
                <Input label="Contact email" type="email" placeholder="name@example.com" value={form.contactEmail} onChange={set('contactEmail')} />
              </div>
              <Input label="Remarks" placeholder="Any notes about this point" value={form.remarks} onChange={set('remarks')} />

              <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Staff rate plan</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Pick the designations you need at this point and set per-person monthly rates.
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Total / month</p>
                    <p className="font-semibold text-slate-900">{formatCurrency(slotsTotal)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-2">
                  <Select
                    label="Add designation"
                    options={[
                      { value: '', label: availableDesignations.length ? 'Select designation' : 'No more designations available' },
                      ...availableDesignations.map((d) => ({ value: d.name, label: d.name })),
                    ]}
                    value={pendingDesignation}
                    onChange={(e) => setPendingDesignation(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={addSlot}
                    disabled={!pendingDesignation}
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>

                {slots.length === 0 ? (
                  <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-400">
                    No designations added yet. Add at least one to set the rate.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {slots.map((s, idx) => {
                      const subtotal = Number(s.count || 0) * Number(s.ratePerPerson || 0);
                      const available = staffByDesignation[s.designation] || 0;
                      return (
                        <div
                          key={`${s.designation}-${idx}`}
                          className="grid grid-cols-12 items-end gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                        >
                          <div className="col-span-12 sm:col-span-4">
                            <p className="text-xs font-medium text-slate-500">Designation</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{s.designation}</p>
                            <p className="text-[11px] text-slate-400">
                              {available} available in staff
                            </p>
                          </div>
                          <div className="col-span-4 sm:col-span-2">
                            <label className="text-xs font-medium text-slate-500">Count</label>
                            <input
                              type="number"
                              min={0}
                              value={s.count}
                              onChange={(e) => updateSlot(idx, 'count', Number(e.target.value))}
                              className="mt-1 h-9 w-full rounded-lg border border-slate-300 px-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            />
                          </div>
                          <div className="col-span-8 sm:col-span-3">
                            <label className="text-xs font-medium text-slate-500">Rate / person</label>
                            <div className="relative mt-1">
                              <IndianRupee className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                value={s.ratePerPerson}
                                onChange={(e) => updateSlot(idx, 'ratePerPerson', Number(e.target.value))}
                                className="h-9 w-full rounded-lg border border-slate-300 pl-7 pr-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                              />
                            </div>
                          </div>
                          <div className="col-span-8 sm:col-span-2">
                            <p className="text-xs font-medium text-slate-500">Subtotal</p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-900">
                              {formatCurrency(subtotal)}
                            </p>
                          </div>
                          <div className="col-span-4 flex justify-end sm:col-span-1">
                            <button
                              type="button"
                              onClick={() => removeSlot(idx)}
                              className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
              <div className="flex gap-2 pt-1">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create point'}
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
