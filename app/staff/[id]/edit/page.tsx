'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/auth-context';
import Layout from '@/components/Layout';
import GlassCard from '@/components/GlassCard';
import Button from '@/components/Button';
import Input from '@/components/Input';
import Select from '@/components/Select';
import EditableSelect, { type ESOption } from '@/components/EditableSelect';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ArrowLeft, Upload, X } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { apiUrl } from '@/lib/api';
import {
  DEFAULT_SHIFTS,
  DEFAULT_DESIGNATIONS,
  isDefaultShiftId,
  isDefaultDesignationId,
} from '@/lib/owner-defaults';

type ApiShift = { id: string; name: string; start_time: string; end_time: string };
type ApiDesignation = { id: string; name: string };
type ApiPoint = { id: string; name: string; areas?: { name: string} | null };

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

function mergeDesignations(api: ApiDesignation[]): ApiDesignation[] {
  const byName = new Map(api.map((d) => [d.name.trim().toLowerCase(), d]));
  const out: ApiDesignation[] = [];
  for (const d of DEFAULT_DESIGNATIONS) {
    const key = d.name.trim().toLowerCase();
    out.push(byName.get(key) ?? { id: d.id, name: d.name });
    byName.delete(key);
  }
  for (const [, d] of byName) out.push(d);
  return out;
}

async function uploadFile(file: File, type: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const base64 = ev.target?.result as string;
        const res = await fetch(apiUrl('/upload'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

const bloodGroups = [
  { value: '', label: 'Select' },
  ...['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((v) => ({ value: v, label: v })),
];
const salaryTypes = [
  { value: 'flat_rate', label: 'Flat Rate' },
  { value: 'compliance', label: 'Compliance' },
];

function StandalonePageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 px-3 py-4 text-slate-900 sm:px-5">
      {children}
    </main>
  );
}

export default function EditStaffPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const isFieldOfficer = user?.role === 'field_officer';
  const PageWrapper = isFieldOfficer ? StandalonePageWrapper : Layout;
  const backHref = isFieldOfficer ? '/field-officer/dashboard' : `/staff/${(params?.id as string) ?? ''}`;
  const staffId = params.id as string;
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [formMsg, setFormMsg] = useState<{ type: 'error' | 'info'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [apiShifts, setApiShifts] = useState<ApiShift[]>([]);
  const [localShifts, setLocalShifts] = useState<ApiShift[]>([]);
  const [apiDesignations, setApiDesignations] = useState<ApiDesignation[]>([]);
  const [localDesignations, setLocalDesignations] = useState<ApiDesignation[]>([]);
  const [points, setPoints] = useState<ApiPoint[]>([]);

  const [uploading, setUploading] = useState({ photo: false, aadhaar: false, police: false });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    bloodGroup: '',
    address: '',
    joiningDate: '',
    pointId: '',
    shiftId: '',
    assignments: [{ pointId: '', shiftId: '' }],
    designationId: '',
    salaryType: 'flat_rate',
    salary: '',
    salaryDate: '',
    da: '',
    pf: '',
    esi: '',
    bonus: '',
    ot: '',
    photoUrl: '',
    aadhaarUrl: '',
    policeUrl: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    branch: '',
    advances: [] as { id?: string; amount: string; date: string; remarks: string }[],
    loginId: '',
    loginPassword: '',
  });

  const allShifts = useMemo(() => {
    const base = mergeShifts(apiShifts);
    const seen = new Set(base.map((x) => x.name.trim().toLowerCase()));
    return [...base, ...localShifts.filter((l) => !seen.has(l.name.trim().toLowerCase()))];
  }, [apiShifts, localShifts]);

  const allDesignations = useMemo(() => {
    const base = mergeDesignations(apiDesignations);
    const seen = new Set(base.map((x) => x.name.trim().toLowerCase()));
    return [...base, ...localDesignations.filter((l) => !seen.has(l.name.trim().toLowerCase()))];
  }, [apiDesignations, localDesignations]);

  const shiftOptions: ESOption[] = allShifts.map((s) => ({
    id: s.id, label: s.name, canDelete: !isDefaultShiftId(s.id),
  }));

  const designationOptions: ESOption[] = allDesignations.map((d) => ({
    id: d.id, label: d.name, canDelete: !isDefaultDesignationId(d.id),
  }));

  const pointOptions = [
    { value: '', label: points.length ? 'Select point' : 'No points yet' },
    ...points.map((p) => ({ value: p.id, label: p.areas?.name ? `${p.name} — ${p.areas.name}` : p.name })),
  ];

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  const fetchDropdowns = useCallback(async () => {
    try {
      const h = token ? { Authorization: `Bearer ${token}` } : undefined;
      const opts = h ? { headers: h } : undefined;
      const [sR, dR, pR] = await Promise.all([
        fetch(apiUrl('/shifts'), opts), fetch(apiUrl('/designations'), opts), fetch(apiUrl('/points'), opts),
      ]);
      setApiShifts(await getJson<ApiShift>(sR));
      setApiDesignations(await getJson<ApiDesignation>(dR));
      setPoints(await getJson<ApiPoint>(pR));
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDropdowns();
  }, [fetchDropdowns]);

  // Fetch existing staff data
  useEffect(() => {
    if (!staffId || !token) return;
    void (async () => {
      setLoadingStaff(true);
      try {
        const hdr = { headers: { Authorization: `Bearer ${token}` } };
        const res = await fetch(apiUrl(`/staff/${staffId}`), hdr);
        if (!res.ok) throw new Error();
        const data = await res.json() as Record<string, unknown>;
        
        const [assignmentsRes, advancesRes] = await Promise.all([
          fetch(apiUrl(`/staff/${staffId}/assignments`), hdr),
          fetch(apiUrl(`/staff/${staffId}/advances`), hdr),
        ]);
        const assignmentRows = await assignmentsRes.json().catch(() => []) as Array<{ point_id?: string; pointId?: string; shift_id?: string; shiftId?: string }>;
        const loadedAssignments = assignmentRows
          .map((a) => ({ pointId: String(a.point_id || a.pointId || ''), shiftId: String(a.shift_id || a.shiftId || '') }))
          .filter((a) => a.pointId && a.shiftId);
        const advanceRows = await advancesRes.json().catch(() => []) as Array<{ id?: string; amount?: number; date?: string; remarks?: string }>;
        const loadedAdvances = (Array.isArray(advanceRows) ? advanceRows : []).map((a) => ({
          id: a.id || undefined,
          amount: String(a.amount || ''),
          date: String(a.date || ''),
          remarks: String(a.remarks || ''),
        }));

        const photoUrl = String(data.photo_url || data.photoUrl || '');
        const aadhaarUrl = String(data.aadhaar_url || data.aadhaarUrl || '');
        const policeUrl = String(data.police_verification_url || data.policeVerificationUrl || '');
        const shiftName = String(data.shift || '');
        const designationName = String(data.designation || '');
        const pointId = String(data.point_id || data.pointId || '');

        setForm({
          name: String(data.name || ''),
          phone: String(data.phone || ''),
          dob: String(data.dob || ''),
          bloodGroup: String(data.blood_group || data.bloodGroup || ''),
          address: String(data.address || ''),
          joiningDate: String(data.joining_date || data.joiningDate || ''),
          pointId,
          shiftId: '',
          assignments: loadedAssignments.length ? loadedAssignments : [{ pointId, shiftId: '' }],
          designationId: '',
          salaryType: String(data.salary_type || data.salaryType || 'flat_rate'),
          salary: String(data.salary || ''),
          salaryDate: String(data.salary_date || data.salaryDate || ''),
          da: String(data.da || ''),
          pf: String(data.pf || ''),
          esi: String(data.esi || ''),
          bonus: String(data.bonus || ''),
          ot: String(data.ot || ''),
          photoUrl,
          aadhaarUrl,
          policeUrl,
          bankName: String(data.bank_name || data.bankName || ''),
          accountNumber: String(data.account_number || data.accountNumber || ''),
          ifscCode: String(data.ifsc_code || data.ifscCode || ''),
          accountHolderName: String(data.account_holder_name || data.accountHolderName || ''),
          branch: String(data.branch || ''),
          advances: loadedAdvances,
          loginId: String(data.login_id || data.loginId || ''),
          loginPassword: '',
        });

        // After dropdowns load, find matching shift/designation by name
        const timer = setTimeout(() => {
          const matchShift = allShifts.find((s) => s.name === shiftName);
          const matchDesignation = allDesignations.find((d) => d.name === designationName);
          setForm((f) => ({
            ...f,
            shiftId: matchShift?.id || '',
            assignments: f.assignments.map((assignment, index) => ({
              ...assignment,
              shiftId: assignment.shiftId || (index === 0 ? matchShift?.id || '' : ''),
            })),
            designationId: matchDesignation?.id || '',
          }));
        }, 500);

        return () => clearTimeout(timer);
      } catch {
        setFormMsg({ type: 'error', text: 'Failed to load staff data.' });
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, [staffId, token, allShifts, allDesignations]);

  const setField = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const updateAssignment = (index: number, key: 'pointId' | 'shiftId', value: string) => {
    setForm((f) => ({
      ...f,
      assignments: f.assignments.map((assignment, i) => i === index ? { ...assignment, [key]: value } : assignment),
    }));
  };

  const addAssignmentRow = () => {
    setForm((f) => f.assignments.length >= 3 ? f : {
      ...f,
      assignments: [...f.assignments, { pointId: '', shiftId: '' }],
    });
  };

  const removeAssignmentRow = (index: number) => {
    setForm((f) => ({
      ...f,
      assignments: f.assignments.length === 1 ? f.assignments : f.assignments.filter((_, i) => i !== index),
    }));
  };

  const handleFile = async (file: File, type: 'photo' | 'aadhaar' | 'police') => {
    setUploading((u) => ({ ...u, [type]: true }));
    setFormMsg(null);
    try {
      const url = await uploadFile(file, type);
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
    const res = await fetch(apiUrl('/shifts'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify(body) });
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
  }, [fetchDropdowns, authHeaders]);

  const deleteShift = useCallback(async (id: string) => {
    if (isDefaultShiftId(id)) { setFormMsg({ type: 'info', text: 'Default shifts cannot be deleted.' }); return; }
    if (id.startsWith('local-')) { setLocalShifts((p) => p.filter((s) => s.id !== id)); setForm((f) => ({ ...f, shiftId: f.shiftId === id ? '' : f.shiftId })); return; }
    const res = await fetch(apiUrl(`/shifts/${id}`), { method: 'DELETE', headers: authHeaders });
    if (res.ok || res.status === 204) { await fetchDropdowns(); setForm((f) => ({ ...f, shiftId: f.shiftId === id ? '' : f.shiftId })); }
    else { const j = await res.json().catch(() => ({})); setFormMsg({ type: 'error', text: (j as { error?: string }).error || 'Could not delete shift' }); }
  }, [fetchDropdowns, authHeaders]);

  const addDesignation = useCallback(async (values: Record<string, string>) => {
    const name = values.name?.trim();
    if (!name) return;
    const res = await fetch(apiUrl('/designations'), { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders }, body: JSON.stringify({ name }) });
    if (res.ok) {
      const row = await res.json() as ApiDesignation;
      await fetchDropdowns();
      setForm((f) => ({ ...f, designationId: row.id }));
    } else if (res.status === 503) {
      const id = `local-${crypto.randomUUID()}`;
      setLocalDesignations((prev) => [...prev, { id, name }]);
      setForm((f) => ({ ...f, designationId: id }));
    } else {
      const j = await res.json().catch(() => ({}));
      setFormMsg({ type: 'error', text: (j as { error?: string }).error || 'Could not add designation' });
    }
  }, [fetchDropdowns, authHeaders]);

  const deleteDesignation = useCallback(async (id: string) => {
    if (isDefaultDesignationId(id)) { setFormMsg({ type: 'info', text: 'Default designations cannot be deleted.' }); return; }
    if (id.startsWith('local-')) { setLocalDesignations((p) => p.filter((d) => d.id !== id)); setForm((f) => ({ ...f, designationId: f.designationId === id ? '' : f.designationId })); return; }
    const res = await fetch(apiUrl(`/designations/${id}`), { method: 'DELETE', headers: authHeaders });
    if (res.ok || res.status === 204) { await fetchDropdowns(); setForm((f) => ({ ...f, designationId: f.designationId === id ? '' : f.designationId })); }
    else { const j = await res.json().catch(() => ({})); setFormMsg({ type: 'error', text: (j as { error?: string }).error || 'Could not delete designation' }); }
  }, [fetchDropdowns, authHeaders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormMsg({ type: 'error', text: 'Name is required.' }); return; }
    if (!form.joiningDate) { setFormMsg({ type: 'error', text: 'Date of joining is required.' }); return; }
    if (!form.designationId) { setFormMsg({ type: 'error', text: 'Please select a designation.' }); return; }
    const validAssignments = form.assignments.filter((a) => a.pointId && a.shiftId);
    if (validAssignments.length === 0) { setFormMsg({ type: 'error', text: 'Add at least one point and shift assignment.' }); return; }
    const uniqueAssignments = new Set(validAssignments.map((a) => `${a.pointId}:${a.shiftId}`));
    if (uniqueAssignments.size !== validAssignments.length) { setFormMsg({ type: 'error', text: 'Duplicate point/shift assignments are not allowed.' }); return; }

    const firstAssignment = validAssignments[0];
    const shiftName = allShifts.find((s) => s.id === firstAssignment.shiftId)?.name ?? '';
    const designationName = allDesignations.find((d) => d.id === form.designationId)?.name ?? '';

    setSubmitting(true);
    setFormMsg(null);
    try {
      const res = await fetch(apiUrl(`/staff/${staffId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: form.name.trim(),
          dob: form.dob || null,
          bloodGroup: form.bloodGroup || null,
          phone: form.phone || null,
          address: form.address || null,
          joiningDate: form.joiningDate,
          pointId: firstAssignment.pointId || null,
          shift: shiftName,
          assignments: validAssignments,
          designation: designationName,
          salaryType: form.salaryType,
          salary: parseFloat(form.salary) || 0,
          salaryDate: form.salaryDate || null,
          da: form.salaryType === 'compliance' ? parseFloat(form.da) || 0 : 0,
          pf: form.salaryType === 'compliance' ? parseFloat(form.pf) || 0 : 0,
          esi: form.salaryType === 'compliance' ? parseFloat(form.esi) || 0 : 0,
          bonus: form.salaryType === 'compliance' ? parseFloat(form.bonus) || 0 : 0,
          ot: form.salaryType === 'compliance' ? parseFloat(form.ot) || 0 : 0,
          photoUrl: form.photoUrl || null,
          aadhaarUrl: form.aadhaarUrl || null,
          policeVerificationUrl: form.policeUrl || null,
          bankName: form.bankName || null,
          accountNumber: form.accountNumber || null,
          ifscCode: form.ifscCode || null,
          accountHolderName: form.accountHolderName || null,
          branch: form.branch || null,
          loginId: form.loginId || null,
          loginPassword: form.loginPassword || null,
        }),
      });
      if (res.ok) {
        await fetch(apiUrl(`/staff/${staffId}/advances`), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            advances: form.advances
              .filter((a) => a.amount && a.date)
              .map((a) => ({
                id: a.id || undefined,
                amount: parseFloat(a.amount) || 0,
                date: a.date,
                remarks: a.remarks || null,
              })),
          }),
        }).catch(() => {});
        router.push(backHref);
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

  if (loadingStaff) return <ProtectedRoute allowedRoles={['owner', 'admin', 'field_officer']}><PageWrapper><LoadingSpinner /></PageWrapper></ProtectedRoute>;

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin', 'field_officer']}>
      <PageWrapper>
      <div className="mx-auto max-w-3xl space-y-5">
        <PageHeader
          title="Edit staff"
          subtitle={`ID ${staffId.slice(0, 8)}`}
          actions={
            <Button variant="outline" size="sm" type="button" onClick={() => router.push(backHref)}>
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
              <Select label="Blood group" options={bloodGroups} value={form.bloodGroup} onChange={setField('bloodGroup')} />
              <Input label="Phone" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={setField('phone')} />
              <Input label="Address" placeholder="Residential address" value={form.address} onChange={setField('address')} />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <UploadZone
                label="Staff photo"
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
              <div className="space-y-3 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-slate-600">Point & shift assignments *</p>
                    <p className="text-[11px] text-slate-400">Add up to 3 point/shift slots. Multi-shift staff appear once per shift in attendance.</p>
                  </div>
                  <button
                    type="button"
                    disabled={form.assignments.length >= 3}
                    onClick={addAssignmentRow}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm disabled:opacity-40"
                  >
                    Add slot
                  </button>
                </div>
                <div className="space-y-3">
                  {form.assignments.map((assignment, index) => (
                    <div key={index} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_auto]">
                      <Select
                        label={`Point ${index + 1}`}
                        options={pointOptions}
                        value={assignment.pointId}
                        onChange={(e) => updateAssignment(index, 'pointId', e.target.value)}
                      />
                      <div className="relative">
                        <EditableSelect
                          label={`Shift ${index + 1}`}
                          value={assignment.shiftId}
                          options={shiftOptions}
                          placeholder="Select shift"
                          onSelect={(id) => updateAssignment(index, 'shiftId', id)}
                          onDelete={(id) => void deleteShift(id)}
                          onAdd={(v) => void addShift(v)}
                          addFields={[
                            { key: 'name', label: 'Shift name', placeholder: 'e.g. 6 AM - 2 PM' },
                            { key: 'start_time', label: 'Start', type: 'time' },
                            { key: 'end_time', label: 'End', type: 'time' },
                          ]}
                          addLabel="Add shift"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAssignmentRow(index)}
                        className="self-end rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <EditableSelect
                  label="Designation *"
                  value={form.designationId}
                  options={designationOptions}
                  placeholder="Select designation"
                  onSelect={(id) => setForm((f) => ({ ...f, designationId: id }))}
                  onDelete={(id) => void deleteDesignation(id)}
                  onAdd={(v) => void addDesignation(v)}
                  addFields={[
                    { key: 'name', label: 'Designation', placeholder: 'e.g. CCTV Operator' },
                  ]}
                  addLabel="Add designation"
                />
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Salary structure</h2>
            <div className="mb-4">
              <Select label="Salary type" options={salaryTypes} value={form.salaryType} onChange={setField('salaryType')} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Input label="Salary *" type="number" placeholder="0" value={form.salary} onChange={setField('salary')} />
              <Input label="Salary date" type="date" value={form.salaryDate} onChange={setField('salaryDate')} hint="When salary is credited" />
              {form.salaryType === 'compliance' && (
                <>
                  <Input label="DA" type="number" placeholder="0" value={form.da} onChange={setField('da')} />
                  <Input label="PF" type="number" placeholder="0" value={form.pf} onChange={setField('pf')} />
                  <Input label="ESI" type="number" placeholder="0" value={form.esi} onChange={setField('esi')} />
                  <Input label="Bonus" type="number" placeholder="0" value={form.bonus} onChange={setField('bonus')} />
                  <Input label="OT / Other" type="number" placeholder="0" value={form.ot} onChange={setField('ot')} />
                </>
              )}
            </div>
          </GlassCard>

          {/* ── Advance ── */}
          <GlassCard className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Advance</h2>
              <button
                type="button"
                onClick={() => setForm((f) => ({
                  ...f,
                  advances: [...f.advances, { amount: '', date: new Date().toISOString().split('T')[0], remarks: '' }],
                }))}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                + Add advance
              </button>
            </div>
            {form.advances.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-400">
                No advance records yet. Click &quot;+ Add advance&quot; to record one.
              </p>
            ) : (
              <div className="space-y-3">
                {form.advances.map((adv, idx) => (
                  <div key={adv.id || idx} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                    <Input
                      label="Amount"
                      type="number"
                      placeholder="0"
                      value={adv.amount}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        advances: f.advances.map((a, i) => i === idx ? { ...a, amount: e.target.value } : a),
                      }))}
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={adv.date}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        advances: f.advances.map((a, i) => i === idx ? { ...a, date: e.target.value } : a),
                      }))}
                    />
                    <Input
                      label="Remarks"
                      placeholder="Optional note"
                      value={adv.remarks}
                      onChange={(e) => setForm((f) => ({
                        ...f,
                        advances: f.advances.map((a, i) => i === idx ? { ...a, remarks: e.target.value } : a),
                      }))}
                    />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, advances: f.advances.filter((_, i) => i !== idx) }))}
                      className="self-end rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Bank details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Bank name" placeholder="e.g. HDFC Bank" value={form.bankName} onChange={setField('bankName')} />
              <Input label="Account holder name" placeholder="As per bank records" value={form.accountHolderName} onChange={setField('accountHolderName')} />
              <Input label="Account number" placeholder="1234567890" value={form.accountNumber} onChange={setField('accountNumber')} />
              <Input label="IFSC code" placeholder="HDFC0001234" value={form.ifscCode} onChange={setField('ifscCode')} />
              <Input label="Branch" placeholder="e.g. Ahmedabad Main" value={form.branch} onChange={setField('branch')} />
            </div>
          </GlassCard>

          {/* ── Login credentials ── */}
          <GlassCard className="p-6">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Login credentials</h2>
            <p className="mb-4 text-xs text-slate-400">
              Set or update login credentials for the staff portal. Leave password blank to keep the existing password.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="User ID" placeholder="Any unique identifier" value={form.loginId} onChange={setField('loginId')} />
              <Input label="Password" placeholder="Leave blank to keep existing" value={form.loginPassword} onChange={setField('loginPassword')} />
            </div>
          </GlassCard>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting} className="flex-1">
              {submitting ? 'Saving…' : 'Save changes'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => router.push(backHref)}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
    </ProtectedRoute>
  );
}
