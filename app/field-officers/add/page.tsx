'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import EditableSelect, { type ESOption } from '@/components/EditableSelect';
import { ArrowLeft, Upload, X, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  DEFAULT_SHIFTS,
  isDefaultShiftId,
} from '@/lib/owner-defaults';

type ApiShift = { id: string; name: string; start_time: string; end_time: string };
type ApiPoint = { id: string; name: string; areas?: { name: string } | null };
type ApiUser = { id: string; name: string; role: string; email?: string; phone?: string };

async function getJson<T>(res: Response): Promise<T[]> {
  try { const j = await res.json(); return Array.isArray(j) ? (j as T[]) : []; } catch { return []; }
}

function mergeShifts(api: ApiShift[]): ApiShift[] {
  const byName = new Map(api.map((s) => [s.name.trim().toLowerCase(), s]));
  const out: ApiShift[] = [];
  for (const d of DEFAULT_SHIFTS) {
    const key = d.name.trim().toLowerCase();
    out.push(byName.get(key) ?? { id: d.id, name: d.name, start_time: d.start_time, end_time: d.end_time });
    byName.delete(key);
  }
  for (const [, s] of byName) out.push(s);
  return out;
}

async function uploadFile(file: File, type: string, authToken?: string | null): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string;
        const res = await fetch(apiUrl('/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
          body: JSON.stringify({ base64, mimeType: file.type, filename: `${type}-${file.name}` }),
        });
        if (!res.ok) { const j = await res.json().catch(() => ({})); reject(new Error((j as { error?: string }).error || 'Upload failed')); return; }
        const { url } = await res.json() as { url: string };
        resolve(url);
      } catch (e) { reject(e); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function UploadZone({
  label, accept, value, uploading, onFile, onClear,
}: {
  label: string;
  accept?: string;
  value?: string;
  uploading?: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isImage = value && !value.endsWith('.pdf');

  return (
    <div>
      <label className="mb-1 block text-[13px] font-medium text-slate-600">{label}</label>
      <div
        className="relative flex min-h-[80px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 text-slate-400 transition hover:border-slate-400 hover:bg-slate-100/60"
        onClick={() => !value && ref.current?.click()}
      >
        <input
          ref={ref}
          type="file"
          accept={accept || 'image/*,.pdf'}
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }}
        />
        {uploading ? (
          <p className="text-xs">Uploading…</p>
        ) : value ? (
          <div className="relative w-full p-2">
            {isImage ? (
              <div className="relative mx-auto h-20 w-20">
                <Image src={value} alt={label} fill className="rounded-lg object-cover" unoptimized />
              </div>
            ) : (
              <p className="px-2 text-center text-xs text-slate-600 break-all">{value}</p>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/70 text-white hover:bg-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-4">
            <Upload className="h-5 w-5" strokeWidth={1.5} />
            <span className="text-[11px]">Click to upload</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AddFieldOfficerPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [formMsg, setFormMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [apiShifts, setApiShifts] = useState<ApiShift[]>([]);
  const [localShifts, setLocalShifts] = useState<ApiShift[]>([]);
  const [points, setPoints] = useState<ApiPoint[]>([]);
  const [fieldOfficerUsers, setFieldOfficerUsers] = useState<ApiUser[]>([]);
  const [uploading, setUploading] = useState({ photo: false, aadhaar: false, police: false });

  const [form, setForm] = useState({
    name: '',
    dob: '',
    bloodGroup: '',
    address: '',
    joiningDate: '',
    shiftId: '',
    pointIds: [] as string[],
    photoUrl: '',
    aadhaarUrl: '',
    policeUrl: '',
    email: '',
    phone: '',
    password: '',
  });

  const allShifts = useMemo(() => {
    const base = mergeShifts(apiShifts);
    const seen = new Set(base.map((x) => x.name.trim().toLowerCase()));
    return [...base, ...localShifts.filter((l) => !seen.has(l.name.trim().toLowerCase()))];
  }, [apiShifts, localShifts]);

  const shiftOptions: ESOption[] = allShifts.map((s) => ({
    id: s.id, label: s.name, canDelete: !isDefaultShiftId(s.id),
  }));

  const fetchDropdowns = useCallback(async () => {
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [sR, pR, uR] = await Promise.all([
        fetch(apiUrl('/shifts'), { headers: authHeaders }), fetch(apiUrl('/points'), { headers: authHeaders }), fetch(apiUrl('/users'), { headers: authHeaders }),
      ]);
      setApiShifts(await getJson<ApiShift>(sR));
      setPoints(await getJson<ApiPoint>(pR));
      const users = await getJson<ApiUser>(uR);
      setFieldOfficerUsers(users.filter((u) => u.role === 'field_officer'));
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDropdowns();
  }, [fetchDropdowns]);

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFile = async (file: File, type: 'photo' | 'aadhaar' | 'police') => {
    setUploading((u) => ({ ...u, [type]: true }));
    setFormMsg(null);
    try {
      const url = await uploadFile(file, type, token);
      if (type === 'photo') setForm((f) => ({ ...f, photoUrl: url }));
      if (type === 'aadhaar') setForm((f) => ({ ...f, aadhaarUrl: url }));
      if (type === 'police') setForm((f) => ({ ...f, policeUrl: url }));
    } catch (e) {
      setFormMsg({ type: 'error', text: `Upload failed: ${e instanceof Error ? e.message : 'Unknown error'}` });
    } finally {
      setUploading((u) => ({ ...u, [type]: false }));
    }
  };

  const addShift = useCallback(async (values: Record<string, string>) => {
    const name = values.name?.trim();
    if (!name) return;
    const body = { name, start_time: values.start_time ? `${values.start_time}:00` : '00:00:00', end_time: values.end_time ? `${values.end_time}:00` : '00:00:00' };
    const res = await fetch(apiUrl('/shifts'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
    if (res.ok) {
      const row = await res.json() as ApiShift;
      await fetchDropdowns();
      setForm((f) => ({ ...f, shiftId: row.id }));
    } else if (res.status === 503) {
      const id = `local-${crypto.randomUUID()}`;
      setLocalShifts((prev) => [...prev, { id, ...body }]);
      setForm((f) => ({ ...f, shiftId: id }));
    } else {
      const j = await res.json().catch(() => ({}));
      setFormMsg({ type: 'error', text: (j as { error?: string }).error || 'Could not add shift' });
    }
  }, [fetchDropdowns]);

  const deleteShift = useCallback(async (id: string) => {
    if (isDefaultShiftId(id)) { setFormMsg({ type: 'info', text: 'Default shifts cannot be deleted.' }); return; }
    if (id.startsWith('local-')) { setLocalShifts((p) => p.filter((s) => s.id !== id)); setForm((f) => ({ ...f, shiftId: f.shiftId === id ? '' : f.shiftId })); return; }
    const res = await fetch(apiUrl(`/shifts/${id}`), { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (res.ok || res.status === 204) { await fetchDropdowns(); setForm((f) => ({ ...f, shiftId: f.shiftId === id ? '' : f.shiftId })); }
    else { const j = await res.json().catch(() => ({})); setFormMsg({ type: 'error', text: (j as { error?: string }).error || 'Could not delete shift' }); }
  }, [fetchDropdowns]);

  const togglePoint = (pointId: string) => {
    setForm((f) => ({
      ...f,
      pointIds: f.pointIds.includes(pointId)
        ? f.pointIds.filter((id) => id !== pointId)
        : [...f.pointIds, pointId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormMsg({ type: 'error', text: 'Name is required.' }); return; }
    if (!form.joiningDate) { setFormMsg({ type: 'error', text: 'Date of joining is required.' }); return; }
    if (!form.shiftId) { setFormMsg({ type: 'error', text: 'Please select a shift.' }); return; }
    if (!form.email.trim() && !form.phone.trim()) {
      setFormMsg({ type: 'error', text: 'Provide either email or phone for login.' }); return;
    }
    if (!form.password || form.password.length < 6) {
      setFormMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return;
    }

    const shiftName = allShifts.find((s) => s.id === form.shiftId)?.name ?? '';

    setSubmitting(true);
    setFormMsg(null);
    try {
      const res = await fetch(apiUrl('/field-officers'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: form.name.trim(),
          dob: form.dob || null,
          bloodGroup: form.bloodGroup || null,
          address: form.address || null,
          joiningDate: form.joiningDate,
          shift: shiftName,
          photoUrl: form.photoUrl || null,
          aadhaarUrl: form.aadhaarUrl || null,
          policeVerificationUrl: form.policeUrl || null,
          pointIds: form.pointIds,
          email: form.email || null,
          phone: form.phone || null,
          password: form.password || null,
        }),
      });
      if (res.ok) {
        router.push('/field-officers');
      } else {
        const j = await res.json().catch(() => ({}));
        setFormMsg({ type: 'error', text: (j as { error?: string }).error || `Server error ${res.status}` });
      }
    } catch {
      setFormMsg({ type: 'error', text: 'Network error — is the API server running?' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <div className="mx-auto max-w-3xl space-y-5">
          <PageHeader
            title="Add field officer"
            actions={
              <Button variant="outline" size="sm" type="button" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            }
          />

          {formMsg && (
            <p className={`rounded-xl px-4 py-2.5 text-sm ${formMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}>
              {formMsg.text}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <GlassCard className="p-6">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Basic information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Full name *" placeholder="e.g. Rahul Singh" value={form.name} onChange={setField('name')} />
                <Input label="Date of birth" type="date" value={form.dob} onChange={setField('dob')} />
                <Input label="Blood group" placeholder="e.g. A+" value={form.bloodGroup} onChange={setField('bloodGroup')} />
                <Input label="Address" placeholder="Residential address" value={form.address} onChange={setField('address')} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <UploadZone
                  label="Officer photo"
                  accept="image/*"
                  value={form.photoUrl}
                  uploading={uploading.photo}
                  onFile={(f) => void handleFile(f, 'photo')}
                  onClear={() => setForm((f) => ({ ...f, photoUrl: '' }))}
                />
                <UploadZone
                  label="Aadhaar card"
                  accept="image/*,.pdf"
                  value={form.aadhaarUrl}
                  uploading={uploading.aadhaar}
                  onFile={(f) => void handleFile(f, 'aadhaar')}
                  onClear={() => setForm((f) => ({ ...f, aadhaarUrl: '' }))}
                />
                <UploadZone
                  label="Police verification"
                  accept="image/*,.pdf"
                  value={form.policeUrl}
                  uploading={uploading.police}
                  onFile={(f) => void handleFile(f, 'police')}
                  onClear={() => setForm((f) => ({ ...f, policeUrl: '' }))}
                />
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Work information</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Date of joining *" type="date" value={form.joiningDate} onChange={setField('joiningDate')} />

                <div className="relative">
                  <EditableSelect
                    label="Shift *"
                    value={form.shiftId}
                    options={shiftOptions}
                    placeholder="Select shift"
                    onSelect={(id) => setForm((f) => ({ ...f, shiftId: id }))}
                    onDelete={(id) => void deleteShift(id)}
                    onAdd={(v) => void addShift(v)}
                    addFields={[
                      { key: 'name', label: 'Shift name', placeholder: 'e.g. 6 AM – 2 PM' },
                      { key: 'start_time', label: 'Start', type: 'time' },
                      { key: 'end_time', label: 'End', type: 'time' },
                    ]}
                    addLabel="Add shift"
                  />
                </div>

              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Login credentials</h2>
              <p className="mb-5 text-xs text-slate-500">
                Required. Field officer logs in with either email or phone, plus this password.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Email *"
                  type="email"
                  placeholder="officer@example.com"
                  value={form.email}
                  onChange={setField('email')}
                />
                <Input
                  label="Phone *"
                  type="tel"
                  placeholder="+91 1234567890"
                  value={form.phone}
                  onChange={setField('phone')}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="Password *"
                    type="password"
                    placeholder="Create password (min 6 chars)"
                    value={form.password}
                    onChange={setField('password')}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Point assignments</h2>
              <p className="mb-4 text-xs text-slate-500">
                Select multiple points that this field officer will manage. They will only see staff assigned to these points.
              </p>
              
              {points.length === 0 ? (
                <p className="rounded-lg bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No points available.{' '}
                  <Link href="/points" className="font-medium text-sky-600 underline">
                    Create points first →
                  </Link>
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {points.map((point) => {
                    const isSelected = form.pointIds.includes(point.id);
                    const displayName = point.areas?.name ? `${point.name} — ${point.areas.name}` : point.name;
                    return (
                      <button
                        key={point.id}
                        type="button"
                        onClick={() => togglePoint(point.id)}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 text-sky-900'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                          isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                        </div>
                        <span className="min-w-0 flex-1 truncate font-medium">{displayName}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="mt-3 text-xs text-slate-400">
                Selected: {form.pointIds.length} {form.pointIds.length === 1 ? 'point' : 'points'}
              </p>
            </GlassCard>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? 'Creating…' : 'Create field officer'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
