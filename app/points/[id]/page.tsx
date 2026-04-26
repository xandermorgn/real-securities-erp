'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import PageHeader from '@/components/PageHeader';
import GlassCard from '@/components/GlassCard';
import LoadingSpinner from '@/components/LoadingSpinner';
import Button from '@/components/Button';
import { apiUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  Plus, X, Search, Users, Mail, Phone, FileText,
  CheckCircle, XCircle, Calendar, IndianRupee,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type RosterEntry = {
  assignmentId: string;
  staffId: string;
  staffName: string;
  designation: string;
  shiftId: string;
  shiftName: string;
  photoUrl: string;
};

type Shift = { id: string; name: string };

type StaffOption = {
  id: string;
  name: string;
  designation?: string;
};

type AttendanceTotals = {
  present: number;
  absent: number;
  leave: number;
  unmarked: number;
};

type RateSlot = {
  id?: string;
  designation: string;
  count: number;
  ratePerPerson: number;
};

export default function PointDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const id = params.id as string;

  const [point, setPoint] = useState<Record<string, unknown> | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [allStaff, setAllStaff] = useState<StaffOption[]>([]);

  const [shiftFilter, setShiftFilter] = useState('');
  const [designationFilter, setDesignationFilter] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [attendanceTotals, setAttendanceTotals] = useState<AttendanceTotals>({ present: 0, absent: 0, leave: 0, unmarked: 0 });

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ staffId: '', shiftId: '' });
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [staffSearch, setStaffSearch] = useState('');

  const [rateSlots, setRateSlots] = useState<RateSlot[]>([]);
  const [rateTotal, setRateTotal] = useState(0);

  const [loading, setLoading] = useState(true);

  const fetchRoster = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/points/${id}/roster`), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      setRoster(Array.isArray(data.roster) ? data.roster : []);
    } catch {
      setRoster([]);
    }
  }, [id, token]);

  const fetchRateSlots = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/points/${id}/rate-slots`), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      const raw = Array.isArray(data?.slots) ? data.slots : [];
      const normalized: RateSlot[] = raw.map((s: Record<string, unknown>) => ({
        id: s.id as string | undefined,
        designation: String(s.designation || ''),
        count: Number(s.count || 0),
        ratePerPerson: Number(s.rate_per_person || 0),
      }));
      setRateSlots(normalized);
      setRateTotal(Number(data?.total || 0));
    } catch {
      setRateSlots([]);
      setRateTotal(0);
    }
  }, [id, token]);

  const fetchAttendance = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(apiUrl(`/admin/attendance/point/${id}?date=${attendanceDate}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      let present = 0, absent = 0, leave = 0, unmarked = 0;
      const pointShifts = Array.isArray(data?.point?.shifts) ? data.point.shifts : [];
      for (const shift of pointShifts) {
        const assignments = Array.isArray(shift?.assignments) ? shift.assignments : [];
        for (const assignment of assignments) {
          const status = assignment?.attendance?.status;
          if (status === 'present') present++;
          else if (status === 'absent') absent++;
          else if (status === 'leave') leave++;
          else unmarked++;
        }
      }
      setAttendanceTotals({ present, absent, leave, unmarked });
    } catch {
      /* leave totals as-is */
    }
  }, [id, attendanceDate, token]);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
        const [pRes, shRes] = await Promise.all([
          fetch(apiUrl(`/points/${id}`), { headers: authHeaders }),
          fetch(apiUrl('/shifts'), { headers: authHeaders }),
        ]);
        const p = await pRes.json();
        setPoint(p);
        const sh = await shRes.json();
        setShifts(Array.isArray(sh) ? sh : []);
        await fetchRoster();
        await fetchRateSlots();
      } catch {
        setPoint(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, fetchRoster, fetchRateSlots, token]);

  useEffect(() => {
    if (id && token) void fetchAttendance();
  }, [id, attendanceDate, token, fetchAttendance]);

  const loadAllStaff = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/staff'), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const data = await res.json();
      setAllStaff(Array.isArray(data) ? data : []);
    } catch {
      setAllStaff([]);
    }
  }, [token]);

  const openAddModal = () => {
    setAddForm({ staffId: '', shiftId: '' });
    setAddError('');
    setStaffSearch('');
    setShowAddModal(true);
    void loadAllStaff();
  };

  const handleAddStaff = async () => {
    if (!addForm.staffId || !addForm.shiftId) {
      setAddError('Please select both a staff member and a shift.');
      return;
    }
    setAddSaving(true);
    setAddError('');
    try {
      const res = await fetch(apiUrl(`/points/${id}/add-staff`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ staffId: addForm.staffId, shiftId: addForm.shiftId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || `Failed (${res.status})`);
      }
      await fetchRoster();
      await fetchAttendance();
      setShowAddModal(false);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Failed to add staff.');
    } finally {
      setAddSaving(false);
    }
  };

  const designations = useMemo(
    () => Array.from(new Set(roster.map((r) => r.designation).filter(Boolean))),
    [roster],
  );

  const assignedByDesignation = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of roster) {
      const key = (r.designation || '').toLowerCase();
      if (!key) continue;
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [roster]);

  const filteredRoster = useMemo(
    () =>
      roster.filter((r) => {
        if (shiftFilter && r.shiftName.toLowerCase() !== shiftFilter.toLowerCase()) return false;
        if (designationFilter && r.designation.toLowerCase() !== designationFilter.toLowerCase()) return false;
        return true;
      }),
    [roster, shiftFilter, designationFilter],
  );

  const filteredStaffOptions = useMemo(() => {
    const q = staffSearch.toLowerCase();
    return allStaff.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q) && !(s.designation ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allStaff, staffSearch]);

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout><LoadingSpinner /></Layout>
      </ProtectedRoute>
    );
  }

  if (!point) {
    return (
      <ProtectedRoute allowedRoles={['owner', 'admin']}>
        <Layout>
          <PageHeader title="Point" subtitle="Not found" />
          <Link href="/points"><Button variant="outline">Back to points</Button></Link>
        </Layout>
      </ProtectedRoute>
    );
  }

  const name = String(point.name ?? '');
  const area = point.areas as { name?: string } | undefined;
  const contact = String(point.contact_person ?? point.contactPerson ?? '');
  const phone = String(point.contact_phone ?? point.contactPhone ?? '');
  const email = String(point.contact_email ?? point.contactEmail ?? '');
  const remarks = String(point.remarks ?? '');

  return (
    <ProtectedRoute allowedRoles={['owner', 'admin']}>
      <Layout>
        <div className="mx-auto max-w-5xl space-y-5">
          <PageHeader
            title={name}
            subtitle={area?.name ? `Under ${area.name}` : 'Security checkpoint'}
            actions={
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={openAddModal}>
                  <Plus className="h-4 w-4" /> Add Staff
                </Button>
                <Link href="/points"><Button variant="outline" size="sm">All points</Button></Link>
              </div>
            }
          />

          {/* Contact & attendance stats row */}
          <div className="grid gap-5 lg:grid-cols-3">
            <GlassCard className="p-5">
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Contact details</h3>
              <div className="space-y-3 text-sm">
                {contact ? (
                  <div className="flex items-start gap-2">
                    <Users className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Person</p>
                      <p className="text-slate-700">{contact}</p>
                    </div>
                  </div>
                ) : null}
                {phone ? (
                  <div className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Phone</p>
                      <p className="text-slate-700">{phone}</p>
                    </div>
                  </div>
                ) : null}
                {email ? (
                  <div className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Email</p>
                      <p className="break-all text-slate-700">{email}</p>
                    </div>
                  </div>
                ) : null}
                {remarks ? (
                  <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Remarks</p>
                      <p className="text-slate-700">{remarks}</p>
                    </div>
                  </div>
                ) : null}
                {!contact && !phone && !email && !remarks && (
                  <p className="text-xs text-slate-400">No contact info available.</p>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Attendance stats</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Live data for {attendanceDate}
                  </p>
                </div>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-3 rounded-xl border border-green-200/60 bg-green-50/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <CheckCircle className="h-5 w-5 text-green-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-green-600">Present</p>
                    <p className="text-2xl font-bold text-green-900">{attendanceTotals.present}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-yellow-200/60 bg-yellow-50/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <Calendar className="h-5 w-5 text-yellow-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-yellow-600">Leave</p>
                    <p className="text-2xl font-bold text-yellow-900">{attendanceTotals.leave}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-red-200/60 bg-red-50/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                    <XCircle className="h-5 w-5 text-red-600" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-red-600">Absent</p>
                    <p className="text-2xl font-bold text-red-900">{attendanceTotals.absent}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200/60 bg-slate-50/40 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <Users className="h-5 w-5 text-slate-500" strokeWidth={2} />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Unmarked</p>
                    <p className="text-2xl font-bold text-slate-800">{attendanceTotals.unmarked}</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* Rate plan */}
          <GlassCard className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Rate plan</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Per-designation billing plan for this point.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-50/40 px-3 py-2">
                <IndianRupee className="h-4 w-4 text-emerald-600" />
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                    Total / month
                  </p>
                  <p className="text-base font-bold text-emerald-900">{formatCurrency(rateTotal)}</p>
                </div>
              </div>
            </div>

            {rateSlots.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 py-8 text-slate-400">
                <IndianRupee className="h-6 w-6" strokeWidth={1.5} />
                <p className="text-xs">No rate plan set yet. Edit this point to add designation slots.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60">
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Designation</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Planned</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Assigned</th>
                      <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Rate / person</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateSlots.map((slot) => {
                      const assigned = assignedByDesignation[slot.designation.toLowerCase()] || 0;
                      const subtotal = slot.count * slot.ratePerPerson;
                      const shortBy = slot.count - assigned;
                      const filled = assigned >= slot.count;
                      return (
                        <tr key={slot.id || slot.designation} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 font-medium text-slate-900">{slot.designation}</td>
                          <td className="px-4 py-3 text-slate-700">{slot.count}</td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                filled
                                  ? 'inline-flex rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200'
                                  : assigned === 0
                                  ? 'inline-flex rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200'
                                  : 'inline-flex rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200'
                              }
                            >
                              {assigned} / {slot.count}
                              {!filled && shortBy > 0 ? ` · short ${shortBy}` : ''}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">{formatCurrency(slot.ratePerPerson)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(subtotal)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-200 bg-slate-50/60">
                      <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500" colSpan={4}>
                        Total
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold text-slate-900">
                        {formatCurrency(rateTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>

          {/* Roster table */}
          <GlassCard className="p-5">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Assigned staff roster</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {roster.length} total · {filteredRoster.length} matching filter{filteredRoster.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-1">
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={designationFilter}
                    onChange={(e) => setDesignationFilter(e.target.value)}
                  >
                    <option value="">All designations</option>
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
                <div className="flex items-center gap-1">
                  <select
                    className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                    value={shiftFilter}
                    onChange={(e) => setShiftFilter(e.target.value)}
                  >
                    <option value="">All shifts</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
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

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60">
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Designation</th>
                    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoster.map((r) => (
                    <tr
                      key={r.assignmentId}
                      onClick={() => router.push(`/staff/${r.staffId}`)}
                      className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/40"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{r.staffName}</td>
                      <td className="px-4 py-3 text-slate-600">{r.designation || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{r.shiftName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredRoster.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                  <Users className="h-8 w-8" strokeWidth={1.5} />
                  <p className="text-sm">
                    {shiftFilter || designationFilter ? 'No staff match this filter.' : 'No staff assigned to this point yet.'}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </div>

        {/* Add Staff Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <GlassCard className="relative w-full max-w-md p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>

              <h2 className="mb-1 text-lg font-semibold text-slate-900">Add staff to point</h2>
              <p className="mb-5 text-xs text-slate-500">Assign a staff member with a specific shift.</p>

              {addError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {addError}
                </div>
              )}

              {/* Staff search + selection */}
              <label className="mb-1 block text-xs font-medium text-slate-600">Staff member</label>
              <div className="relative mb-4">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or designation…"
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="mb-1 w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                />
                <select
                  value={addForm.staffId}
                  onChange={(e) => setAddForm((f) => ({ ...f, staffId: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  size={Math.min(filteredStaffOptions.length + 1, 7)}
                >
                  <option value="">— select staff —</option>
                  {filteredStaffOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.designation ? ` — ${s.designation}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift selection */}
              <label className="mb-1 block text-xs font-medium text-slate-600">Shift</label>
              <select
                value={addForm.shiftId}
                onChange={(e) => setAddForm((f) => ({ ...f, shiftId: e.target.value }))}
                className="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">— select shift —</option>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddStaff} disabled={addSaving || !addForm.staffId || !addForm.shiftId}>
                  {addSaving ? 'Adding…' : 'Add'}
                </Button>
              </div>
            </GlassCard>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}