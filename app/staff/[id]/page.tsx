'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft, MapPin, Calendar, User, Briefcase, DollarSign, FileText,
  Image as ImageIcon, CreditCard, Clock, UserPlus, Edit2, ArrowRight, Pencil,
  RefreshCw, BarChart3, ChevronDown, ChevronRight, CheckCircle, XCircle, KeyRound,
} from 'lucide-react';

type StaffDetail = Record<string, unknown> & {
  id: string;
  name: string;
  dob?: string;
  blood_group?: string;
  bloodGroup?: string;
  address?: string;
  phone?: string;
  photo_url?: string;
  photoUrl?: string;
  aadhaar_url?: string;
  aadhaarUrl?: string;
  police_verification_url?: string;
  policeVerificationUrl?: string;
  joining_date?: string;
  joiningDate?: string;
  designation?: string;
  shift?: string;
  salary_type?: string;
  salaryType?: string;
  salary?: number;
  da?: number;
  pf?: number;
  esi?: number;
  bonus?: number;
  ot?: number;
  point_id?: string;
  pointId?: string;
};

type TimelineEntry = {
  id: string;
  staff_id: string;
  action_type: string;
  description: string;
  updated_by?: string | null;
  created_at: string;
};

type ShiftBreakdown = {
  shiftName: string;
  pointName: string;
  total: number;
  present: number;
  absent: number;
  leave: number;
};

type DailyLogEntry = {
  date: string;
  shiftName: string;
  pointName: string;
  status: string;
};

type RecentMonth = {
  month: string;
  present: number;
  absent: number;
  leave: number;
  total: number;
};

type StaffStats = {
  month: string;
  totalShifts: number;
  present: number;
  absent: number;
  leave: number;
  avgPresentPerMonth: number;
  avgAbsentPerMonth: number;
  avgLeavePerMonth: number;
  avgShiftsPerMonth: number;
  shiftBreakdown: ShiftBreakdown[];
  dailyLog: DailyLogEntry[];
  recentMonths: RecentMonth[];
};

type AdvanceRecord = {
  id: string;
  staff_id: string;
  amount: number;
  date: string;
  remarks?: string | null;
  created_at: string;
};

const STATUS_PILL: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  absent: 'bg-red-50 text-red-700 ring-red-200',
  leave: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  if (!y || !m) return monthKey;
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

const timelineIcons: Record<string, { icon: React.ReactNode; color: string }> = {
  joined: { icon: <UserPlus className="h-4 w-4" />, color: 'bg-green-100 ring-green-200 text-green-600' },
  point_assigned: { icon: <MapPin className="h-4 w-4" />, color: 'bg-sky-100 ring-sky-200 text-sky-600' },
  point_removed: { icon: <ArrowRight className="h-4 w-4" />, color: 'bg-orange-100 ring-orange-200 text-orange-600' },
  reassignment: { icon: <RefreshCw className="h-4 w-4" />, color: 'bg-indigo-100 ring-indigo-200 text-indigo-600' },
  details_edited: { icon: <Pencil className="h-4 w-4" />, color: 'bg-slate-100 ring-slate-200 text-slate-600' },
  shift_change: { icon: <Clock className="h-4 w-4" />, color: 'bg-purple-100 ring-purple-200 text-purple-600' },
  attendance: { icon: <Calendar className="h-4 w-4" />, color: 'bg-amber-100 ring-amber-200 text-amber-600' },
};

function getTimelineStyle(actionType: string) {
  return timelineIcons[actionType] || { icon: <Clock className="h-4 w-4" />, color: 'bg-slate-100 ring-slate-200 text-slate-600' };
}

export default function StaffDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;
  const [staff, setStaff] = useState<StaffDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [advances, setAdvances] = useState<AdvanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [statsMonth, setStatsMonth] = useState<string>(() => currentMonthKey());
  const [stats, setStats] = useState<StaffStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [staffRes, timelineRes, advancesRes] = await Promise.all([
          fetch(apiUrl(`/staff/${id}`), { headers: authHeaders }),
          fetch(apiUrl(`/staff/${id}/timeline`), { headers: authHeaders }),
          fetch(apiUrl(`/staff/${id}/advances`), { headers: authHeaders }),
        ]);
        if (!staffRes.ok) throw new Error();
        setStaff(await staffRes.json());
        const tData = await timelineRes.json().catch(() => []);
        setTimeline(Array.isArray(tData) ? tData : []);
        const aData = await advancesRes.json().catch(() => []);
        setAdvances(Array.isArray(aData) ? aData : []);
      } catch {
        setStaff(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setStatsLoading(true);
      try {
        const r = await fetch(apiUrl(`/staff/${id}/stats?month=${statsMonth}`), {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!r.ok) throw new Error();
        const data = (await r.json()) as StaffStats;
        setStats(data);
        setExpandedShift(null);
      } catch {
        setStats(null);
      } finally {
        setStatsLoading(false);
      }
    })();
  }, [id, statsMonth, token]);

  const monthOptions = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      out.push({ key, label: formatMonthLabel(key) });
    }
    return out;
  }, []);

  const dailyLogByShift = useMemo(() => {
    const map: Record<string, DailyLogEntry[]> = {};
    if (!stats) return map;
    for (const entry of stats.dailyLog) {
      const key = `${entry.shiftName}|||${entry.pointName}`;
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => (a.date < b.date ? 1 : -1));
    }
    return map;
  }, [stats]);

  if (loading) return <ProtectedRoute allowedRoles={['owner', 'admin']}><Layout><LoadingSpinner /></Layout></ProtectedRoute>;

  if (!staff) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout>
          <PageHeader title="Staff" subtitle="Not found" />
          <Link href="/staff"><Button variant="outline">Back to staff</Button></Link>
        </Layout>
      </ProtectedRoute>
    );
  }

  const photoUrl = staff.photo_url || staff.photoUrl;
  const aadhaarUrl = staff.aadhaar_url || staff.aadhaarUrl;
  const policeUrl = staff.police_verification_url || staff.policeVerificationUrl;
  const bloodGroup = staff.blood_group || staff.bloodGroup;
  const joiningDate = staff.joining_date || staff.joiningDate;
  const salaryType = staff.salary_type || staff.salaryType;
  const salaryDate = String((staff as Record<string, unknown>).salary_date || (staff as Record<string, unknown>).salaryDate || '');
  const pointName = (staff.points as { name?: string } | undefined)?.name;
  const isCompliance = String(salaryType || '') === 'compliance';
  const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const bankName = (staff as Record<string, unknown>).bank_name || (staff as Record<string, unknown>).bankName;
  const accountNumber = (staff as Record<string, unknown>).account_number || (staff as Record<string, unknown>).accountNumber;
  const ifscCode = (staff as Record<string, unknown>).ifsc_code || (staff as Record<string, unknown>).ifscCode;
  const accountHolderName = (staff as Record<string, unknown>).account_holder_name || (staff as Record<string, unknown>).accountHolderName;
  const branch = (staff as Record<string, unknown>).branch;

  const loginId = (staff as Record<string, unknown>).login_id;
  const loginPassword = (staff as Record<string, unknown>).login_password;
  const hasLogin = (staff as Record<string, unknown>).has_login;

  const salary = Number(staff.salary) || 0;
  const da = Number(staff.da) || 0;
  const pf = Number(staff.pf) || 0;
  const esi = Number(staff.esi) || 0;
  const bonus = Number(staff.bonus) || 0;
  const ot = Number(staff.ot) || 0;
  const total = salary + da + pf + esi + bonus + ot;

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
          title={staff.name}
          subtitle={`${staff.designation || 'Staff'} · ID ${id.slice(0, 8)}`}
          actions={
            <>
              <Button size="sm" onClick={() => router.push(`/staff/${id}/edit`)}>
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

        {/* Profile + Photos row */}
        <div className="grid gap-5 lg:grid-cols-4">
          {/* Profile */}
          <GlassCard className="p-5">
            <div className="flex flex-col items-center text-center">
              {photoUrl ? (
                <div className="relative mb-4 h-28 w-28 overflow-hidden rounded-2xl ring-2 ring-slate-200">
                  <Image src={String(photoUrl)} alt={staff.name} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="mb-4 flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 ring-2 ring-slate-200">
                  <User className="h-12 w-12 text-slate-400" strokeWidth={1.5} />
                </div>
              )}
              <h3 className="text-base font-semibold text-slate-900">{staff.name}</h3>
              <p className="mt-0.5 text-sm text-slate-500">{staff.designation || 'Staff'}</p>
              {pointName && (
                <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                  {pointName}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
              {bloodGroup && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Blood</span>
                  <span className="font-medium text-slate-900">{bloodGroup}</span>
                </div>
              )}
              {staff.dob && (
                <div className="flex justify-between">
                  <span className="text-slate-500">DOB</span>
                  <span className="text-slate-700">{formatDate(String(staff.dob))}</span>
                </div>
              )}
              {joiningDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span className="text-slate-700">{formatDate(String(joiningDate))}</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Documents */}
          <GlassCard className="p-5 lg:col-span-3">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <FileText className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Documents & Photos</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Staff photo</p>
                {photoUrl ? (
                  <a href={String(photoUrl)} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative h-32 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-slate-300">
                      <Image src={String(photoUrl)} alt="Staff" fill className="object-cover" unoptimized />
                    </div>
                  </a>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                    <ImageIcon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Aadhaar card</p>
                {aadhaarUrl ? (
                  <a href={String(aadhaarUrl)} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative h-32 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-slate-300">
                      <Image src={String(aadhaarUrl)} alt="Aadhaar" fill className="object-cover" unoptimized />
                    </div>
                  </a>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                    <FileText className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">Police verification</p>
                {policeUrl ? (
                  <a href={String(policeUrl)} target="_blank" rel="noopener noreferrer" className="block">
                    <div className="relative h-32 overflow-hidden rounded-lg ring-1 ring-slate-200 transition hover:ring-slate-300">
                      <Image src={String(policeUrl)} alt="Police verification" fill className="object-cover" unoptimized />
                    </div>
                  </a>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg bg-slate-50 text-slate-400">
                    <FileText className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Work & salary row */}
        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <Briefcase className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Work information</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Shift</span>
                <span className="text-slate-900">{staff.shift || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Designation</span>
                <span className="text-slate-900">{staff.designation || '—'}</span>
              </div>
              {joiningDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Date of joining</span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(String(joiningDate))}
                  </span>
                </div>
              )}
              {staff.phone && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Phone</span>
                  <span className="text-right text-slate-700">{staff.phone}</span>
                </div>
              )}
              {staff.address && (
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Address</span>
                  <span className="text-right text-slate-700">{staff.address}</span>
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <DollarSign className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Salary structure</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500">Type</span>
                <span className="font-medium text-slate-700">
                  {salaryType === 'flat_rate' ? 'Flat Rate' : salaryType === 'compliance' ? 'Compliance' : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Base salary</span>
                <span className="font-medium text-slate-900">{formatCurrency(salary)}</span>
              </div>
              {salaryDate && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Salary date</span>
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    {formatDate(String(salaryDate))}
                  </span>
                </div>
              )}
              {isCompliance && da > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">DA</span>
                  <span className="text-slate-700">{formatCurrency(da)}</span>
                </div>
              )}
              {isCompliance && pf > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">PF</span>
                  <span className="text-slate-700">{formatCurrency(pf)}</span>
                </div>
              )}
              {isCompliance && esi > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">ESI</span>
                  <span className="text-slate-700">{formatCurrency(esi)}</span>
                </div>
              )}
              {isCompliance && bonus > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bonus</span>
                  <span className="text-slate-700">{formatCurrency(bonus)}</span>
                </div>
              )}
              {isCompliance && ot > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">OT / Other</span>
                  <span className="text-slate-700">{formatCurrency(ot)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                <span className="text-slate-700">Total</span>
                <span className="text-slate-900">{formatCurrency(isCompliance ? total : salary)}</span>
              </div>
            </div>
          </GlassCard>

          {/* Advance */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <DollarSign className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Advance records</h3>
            </div>
            {advances.length === 0 ? (
              <p className="text-xs text-slate-400">No advance records on file.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[380px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/60">
                        <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                        <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                        <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advances.map((adv) => (
                        <tr key={adv.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-2 text-slate-700">{formatDate(adv.date)}</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-900">{formatCurrency(Number(adv.amount))}</td>
                          <td className="px-4 py-2 text-slate-500">{adv.remarks || '—'}</td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                        <td className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Total advance</td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900">{formatCurrency(totalAdvances)}</td>
                        <td className="px-4 py-2 text-xs text-slate-400">{advances.length} record{advances.length !== 1 ? 's' : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </GlassCard>

          {/* Bank details */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <CreditCard className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Bank details</h3>
            </div>
            <div className="space-y-2 text-sm">
              {bankName ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank name</span>
                  <span className="text-slate-900">{String(bankName)}</span>
                </div>
              ) : null}
              {accountHolderName ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Account holder</span>
                  <span className="text-slate-900">{String(accountHolderName)}</span>
                </div>
              ) : null}
              {accountNumber ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Account number</span>
                  <span className="font-mono text-slate-900">{String(accountNumber)}</span>
                </div>
              ) : null}
              {ifscCode ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC code</span>
                  <span className="font-mono text-slate-900">{String(ifscCode)}</span>
                </div>
              ) : null}
              {branch ? (
                <div className="flex justify-between">
                  <span className="text-slate-500">Branch</span>
                  <span className="text-slate-900">{String(branch)}</span>
                </div>
              ) : null}
              {!bankName && !accountNumber && !ifscCode && !accountHolderName && !branch && (
                <p className="text-xs text-slate-400">No bank details on file.</p>
              )}
            </div>
          </GlassCard>

          {/* Login credentials (visible to admin/owner only) */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center gap-2 text-slate-700">
              <KeyRound className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">Login credentials</h3>
            </div>
            {hasLogin ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-slate-900">{String(loginId || '—')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Password</span>
                  <span className="font-mono text-slate-900">{String(loginPassword || '—')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No login credentials set. Edit staff to add credentials.</p>
            )}
          </GlassCard>
        </div>

        {/* Attendance & shift stats */}
        <GlassCard className="p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <BarChart3 className="h-4 w-4" strokeWidth={2} />
              <h3 className="text-sm font-semibold uppercase tracking-wide">
                Attendance & shift stats
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-500">Month</label>
              <select
                value={statsMonth}
                onChange={(e) => setStatsMonth(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {statsLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : stats ? (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-sky-200/60 bg-sky-50/40 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-sky-600">Total shifts</p>
                  <p className="mt-1 text-2xl font-bold text-sky-900">{stats.totalShifts}</p>
                  <p className="mt-0.5 text-[11px] text-sky-700/70">
                    avg {stats.avgShiftsPerMonth} / mo
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200/60 bg-emerald-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">Present</p>
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.present}</p>
                  <p className="mt-0.5 text-[11px] text-emerald-700/70">
                    avg {stats.avgPresentPerMonth} / mo
                  </p>
                </div>
                <div className="rounded-xl border border-red-200/60 bg-red-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-red-700">Absent</p>
                    <XCircle className="h-4 w-4 text-red-500" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-red-900">{stats.absent}</p>
                  <p className="mt-0.5 text-[11px] text-red-700/70">
                    avg {stats.avgAbsentPerMonth} / mo
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Leave</p>
                    <Calendar className="h-4 w-4 text-amber-500" />
                  </div>
                  <p className="mt-1 text-2xl font-bold text-amber-900">{stats.leave}</p>
                  <p className="mt-0.5 text-[11px] text-amber-700/70">
                    avg {stats.avgLeavePerMonth} / mo
                  </p>
                </div>
              </div>

              {/* Shift breakdown */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Shift breakdown · {formatMonthLabel(stats.month)}
                </p>
                {stats.shiftBreakdown.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-400">
                    No attendance recorded for this month yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stats.shiftBreakdown.map((row) => {
                      const key = `${row.shiftName}|||${row.pointName}`;
                      const isOpen = expandedShift === key;
                      const log = dailyLogByShift[key] || [];
                      return (
                        <div
                          key={key}
                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                        >
                          <button
                            type="button"
                            onClick={() => setExpandedShift(isOpen ? null : key)}
                            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{row.shiftName}</p>
                              <p className="truncate text-xs text-slate-500">{row.pointName}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-700">
                                {row.total} shifts
                              </span>
                              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                                P {row.present}
                              </span>
                              <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-700 ring-1 ring-red-200">
                                A {row.absent}
                              </span>
                              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-700 ring-1 ring-amber-200">
                                L {row.leave}
                              </span>
                            </div>
                          </button>
                          {isOpen && (
                            <div className="border-t border-slate-100 bg-slate-50/40">
                              <table className="w-full text-left text-sm">
                                <thead>
                                  <tr className="border-b border-slate-200/60">
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Shift</th>
                                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Point</th>
                                    <th className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {log.map((entry, i) => {
                                    const statusKey = String(entry.status || '').toLowerCase();
                                    const pillCls = STATUS_PILL[statusKey] || 'bg-slate-50 text-slate-600 ring-slate-200';
                                    return (
                                      <tr
                                        key={`${entry.date}-${i}`}
                                        className="border-b border-slate-100 last:border-0"
                                      >
                                        <td className="px-4 py-2 text-slate-700">{formatDate(entry.date)}</td>
                                        <td className="px-4 py-2 text-slate-600">{entry.shiftName}</td>
                                        <td className="px-4 py-2 text-slate-600">{entry.pointName}</td>
                                        <td className="px-4 py-2 text-right">
                                          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ring-1 ${pillCls}`}>
                                            {entry.status || '—'}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/40 px-4 py-6 text-center text-xs text-slate-400">
              Stats unavailable.
            </p>
          )}
        </GlassCard>

        {/* Timeline */}
        <GlassCard className="p-5">
          <div className="mb-4 flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4" strokeWidth={2} />
            <h3 className="text-sm font-semibold uppercase tracking-wide">Timeline</h3>
          </div>
          <div className="space-y-0">
            {joiningDate && timeline.length === 0 && (
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 ring-2 ring-green-200">
                    <UserPlus className="h-4 w-4 text-green-600" strokeWidth={2} />
                  </div>
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-slate-900">Joined the organization</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDate(String(joiningDate))} · {calculateDaysWorked(String(joiningDate))} days ago
                  </p>
                  {pointName && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3 w-3" />
                      Assigned to {pointName}
                    </p>
                  )}
                </div>
              </div>
            )}

            {timeline.map((entry, idx) => {
              const style = getTimelineStyle(entry.action_type);
              const isLast = idx === timeline.length - 1;
              const entryDate = new Date(entry.created_at);
              const dateStr = entryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
              const timeStr = entryDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
              return (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full ring-2 ${style.color}`}>
                      {style.icon}
                    </div>
                    {!isLast && <div className="mt-1 h-full w-px bg-slate-200" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-medium text-slate-900">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{dateStr} at {timeStr}</p>
                  </div>
                </div>
              );
            })}

            {timeline.length === 0 && !joiningDate && (
              <p className="text-xs text-slate-400">No timeline events recorded yet.</p>
            )}
          </div>
        </GlassCard>

      </div>
    </Layout>
    </ProtectedRoute>
  );
}
