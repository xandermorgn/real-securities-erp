'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { ArrowLeft, User, Briefcase, FileText, MapPin, Edit2, Clock, UserPlus, Plus, Trash2, X, CreditCard } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type CreditRecord = {
  id: string;
  amount: number;
  label?: string | null;
  from_date: string;
  to_date: string;
  note?: string | null;
  created_at: string;
};

type FieldOfficerDetail = Record<string, unknown> & {
  id: string;
  name: string;
  dob?: string;
  address?: string;
  shift?: string;
  joining_date?: string;
  field_officer_points?: Array<{
    point_id: string;
    assigned_at?: string;
    points?: {
      id: string;
      name: string;
      areas?: { name: string };
    };
  }>;
};

export default function FieldOfficerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;
  const [officer, setOfficer] = useState<FieldOfficerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Credits state
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [showAddCredit, setShowAddCredit] = useState(false);
  const [creditForm, setCreditForm] = useState({ amount: '', label: '', fromDate: '', toDate: '', note: '' });
  const [savingCredit, setSavingCredit] = useState(false);
  const [creditMsg, setCreditMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [officerRes, creditsRes] = await Promise.all([
          fetch(apiUrl(`/field-officers/${id}`), { headers: authHeaders }),
          fetch(apiUrl(`/field-officers/${id}/credits`), { headers: authHeaders }),
        ]);
        if (officerRes.ok) setOfficer(await officerRes.json());
        if (creditsRes.ok) setCredits(await creditsRes.json());
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [id, token]);

  const addCredit = async () => {
    if (!creditForm.amount || !creditForm.fromDate || !creditForm.toDate) {
      setCreditMsg('Amount, From date, and To date are required.');
      return;
    }
    setSavingCredit(true);
    setCreditMsg('');
    try {
      const res = await fetch(apiUrl(`/field-officers/${id}/credits`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          amount: Number(creditForm.amount),
          label: creditForm.label || null,
          fromDate: creditForm.fromDate,
          toDate: creditForm.toDate,
          note: creditForm.note || null,
        }),
      });
      if (res.ok) {
        const newRecord = await res.json() as CreditRecord;
        setCredits((prev) => [newRecord, ...prev]);
        setCreditForm({ amount: '', label: '', fromDate: '', toDate: '', note: '' });
        setShowAddCredit(false);
      } else {
        // Try JSON first, then plain text — surfaces HTML 404s and pg errors clearly
        let detail = '';
        const text = await res.text().catch(() => '');
        try { detail = JSON.parse(text)?.error || ''; } catch { detail = text.slice(0, 200); }
        setCreditMsg(`Failed to add credit (${res.status}): ${detail || 'no response body'}`);
      }
    } catch (e) {
      setCreditMsg(`Network error: ${e instanceof Error ? e.message : 'unknown'}`);
    } finally {
      setSavingCredit(false);
    }
  };

  const deleteCredit = async (creditId: string) => {
    try {
      await fetch(apiUrl(`/field-officers/${id}/credits/${creditId}`), {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      setCredits((prev) => prev.filter((c) => c.id !== creditId));
    } catch { /* silent */ }
  };

  if (loading) return <ProtectedRoute allowedRoles={['owner', 'admin']}><Layout><LoadingSpinner /></Layout></ProtectedRoute>;

  if (!officer) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout>
          <PageHeader title="Field Officer" subtitle="Not found" />
          <Link href="/field-officers"><Button variant="outline">Back to field officers</Button></Link>
        </Layout>
      </ProtectedRoute>
    );
  }

  const photoUrl = officer.photo_url || officer.photoUrl ? String(officer.photo_url || officer.photoUrl) : '';
  const aadhaarUrl = officer.aadhaar_url || officer.aadhaarUrl ? String(officer.aadhaar_url || officer.aadhaarUrl) : '';
  const policeUrl = officer.police_verification_url || officer.policeVerificationUrl ? String(officer.police_verification_url || officer.policeVerificationUrl) : '';
  const dob = officer.dob ? String(officer.dob) : '';
  const address = officer.address ? String(officer.address) : '';
  const shift = officer.shift ? String(officer.shift) : '';
  const bloodGroup = officer.blood_group || officer.bloodGroup ? String(officer.blood_group || officer.bloodGroup) : '';
  const joiningDate = officer.joining_date || officer.joiningDate ? String(officer.joining_date || officer.joiningDate) : '';
  const assignedPoints = officer.field_officer_points || [];

  const calculateDaysWorked = (joinDate: string) => {
    const join = new Date(joinDate);
    const now = new Date();
    const diff = Math.floor((now.getTime() - join.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <div className="mx-auto max-w-5xl space-y-5">
          <PageHeader
            title={officer.name}
            subtitle={`Field Officer · ID ${id.slice(0, 8)}`}
            actions={
              <>
                <Button size="sm" onClick={() => router.push(`/field-officers/${id}/edit`)}>
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </>
            }
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-2 text-slate-700">
                <User className="h-4 w-4" strokeWidth={2} />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Personal info</h3>
              </div>
              <div className="space-y-2 text-sm">
                {dob && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date of birth</span>
                    <span className="text-slate-900">{formatDate(dob)}</span>
                  </div>
                )}
                {bloodGroup && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Blood group</span>
                    <span className="text-slate-900">{String(bloodGroup)}</span>
                  </div>
                )}
                {address && (
                  <div className="flex flex-col gap-1">
                    <span className="text-slate-500">Address</span>
                    <span className="text-slate-900">{address}</span>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-2 text-slate-700">
                <Briefcase className="h-4 w-4" strokeWidth={2} />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Work info</h3>
              </div>
              <div className="space-y-2 text-sm">
                {joiningDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Joining date</span>
                    <span className="text-slate-900">{formatDate(String(joiningDate))}</span>
                  </div>
                )}
                {shift && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Shift</span>
                    <span className="text-slate-900">{shift}</span>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Assigned Points */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Assigned points</h3>
            </div>
            {assignedPoints.length === 0 ? (
              <p className="text-sm text-slate-400">No points assigned yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {assignedPoints.map((ap) => {
                  const point = ap.points;
                  if (!point) return null;
                  const displayName = point.areas?.name ? `${point.name} — ${point.areas.name}` : point.name;
                  return (
                    <Link
                      key={ap.point_id}
                      href={`/points/${point.id}`}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm transition hover:border-sky-300 hover:bg-sky-50"
                    >
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate font-medium text-slate-900">{displayName}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Documents */}
          {(photoUrl || aadhaarUrl || policeUrl) && (
            <GlassCard className="p-5">
              <div className="mb-4 flex items-center gap-2 text-slate-700">
                <FileText className="h-4 w-4" strokeWidth={2} />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Documents & Photos</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {photoUrl && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Officer photo</p>
                    <a href={String(photoUrl)} target="_blank" rel="noopener noreferrer" className="block">
                      <div className="relative h-32 overflow-hidden rounded-lg border border-slate-200">
                        <Image src={String(photoUrl)} alt="Officer photo" fill className="object-cover transition hover:scale-105" unoptimized />
                      </div>
                    </a>
                  </div>
                )}
                {aadhaarUrl && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Aadhaar card</p>
                    <a href={String(aadhaarUrl)} target="_blank" rel="noopener noreferrer" className="block">
                      {String(aadhaarUrl).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="relative h-32 overflow-hidden rounded-lg border border-slate-200">
                          <Image src={String(aadhaarUrl)} alt="Aadhaar" fill className="object-cover transition hover:scale-105" unoptimized />
                        </div>
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100">
                          <FileText className="h-8 w-8" />
                        </div>
                      )}
                    </a>
                  </div>
                )}
                {policeUrl && (
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Police verification</p>
                    <a href={String(policeUrl)} target="_blank" rel="noopener noreferrer" className="block">
                      {String(policeUrl).match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                        <div className="relative h-32 overflow-hidden rounded-lg border border-slate-200">
                          <Image src={String(policeUrl)} alt="Police verification" fill className="object-cover transition hover:scale-105" unoptimized />
                        </div>
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100">
                          <FileText className="h-8 w-8" />
                        </div>
                      )}
                    </a>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Timeline */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <Clock className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Timeline</h3>
            </div>
            <div className="space-y-4">
              {joiningDate && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 ring-2 ring-blue-200">
                      <UserPlus className="h-4 w-4 text-blue-600" strokeWidth={2} />
                    </div>
                    <div className="mt-1 h-full w-px bg-slate-200" />
                  </div>
                  <div className="pb-6">
                    <p className="text-sm font-medium text-slate-900">Joined as field officer</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(String(joiningDate))} · {calculateDaysWorked(String(joiningDate))} days ago
                    </p>
                    {assignedPoints.length > 0 && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="h-3 w-3" />
                        Assigned to: {assignedPoints.map((ap) => ap.points?.name || 'Unknown').join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Credits */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-700">
                <CreditCard className="h-4 w-4" strokeWidth={2} />
                <h3 className="text-sm font-semibold uppercase tracking-wide">Credits</h3>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddCredit(true); setCreditMsg(''); }}
                className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add credit
              </button>
            </div>

            {showAddCredit && (
              <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">New credit entry</p>
                  <button type="button" onClick={() => setShowAddCredit(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {creditMsg && <p className="mb-3 text-xs text-red-600">{creditMsg}</p>}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Amount (₹) *"
                    type="number"
                    placeholder="e.g. 15000"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm((f) => ({ ...f, amount: e.target.value }))}
                  />
                  <Input
                    label="Label"
                    placeholder="e.g. Salary June, Bonus"
                    value={creditForm.label}
                    onChange={(e) => setCreditForm((f) => ({ ...f, label: e.target.value }))}
                  />
                  <Input
                    label="From date *"
                    type="date"
                    value={creditForm.fromDate}
                    onChange={(e) => setCreditForm((f) => ({ ...f, fromDate: e.target.value }))}
                  />
                  <Input
                    label="To date *"
                    type="date"
                    value={creditForm.toDate}
                    onChange={(e) => setCreditForm((f) => ({ ...f, toDate: e.target.value }))}
                  />
                  <Input
                    label="Note"
                    placeholder="Optional note"
                    value={creditForm.note}
                    onChange={(e) => setCreditForm((f) => ({ ...f, note: e.target.value }))}
                    className="sm:col-span-2"
                  />
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    disabled={savingCredit}
                    onClick={() => void addCredit()}
                    className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                  >
                    {savingCredit ? 'Saving...' : 'Save credit'}
                  </button>
                </div>
              </div>
            )}

            {credits.length === 0 ? (
              <p className="text-sm text-slate-400">No credits added yet.</p>
            ) : (
              <div className="space-y-2">
                {credits.map((credit) => (
                  <div
                    key={credit.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          ₹{Number(credit.amount).toLocaleString('en-IN')}
                        </span>
                        {credit.label && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {credit.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(credit.from_date)} → {formatDate(credit.to_date)}
                      </p>
                      {credit.note && <p className="mt-0.5 text-xs text-slate-400">{credit.note}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteCredit(credit.id)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      title="Delete credit"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-500">Total credits</span>
                  <span className="font-bold text-slate-900">
                    ₹{credits.reduce((sum, c) => sum + Number(c.amount), 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}
          </GlassCard>

        </div>
      </Layout>
    </ProtectedRoute>
  );
}
