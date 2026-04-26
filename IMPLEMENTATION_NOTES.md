# Implementation Notes - Remaining Changes

## Completed
- ✓ SQL migration for bank details columns
- ✓ API server updated to handle bank fields
- ✓ Removed glass-shell wrapper
- ✓ Removed OwnerBadge component

## To Implement

### 1. Staff Add/Edit Form (`app/staff/add/page.tsx`)
**Add Bank Details Section** (after Salary structure):
```tsx
<GlassCard className="p-6">
  <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">Bank details</h2>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Input
      label="Bank name"
      name="bankName"
      placeholder="e.g. HDFC Bank"
      value={form.bankName}
      onChange={setField('bankName')}
    />
    <Input
      label="Account holder name"
      name="accountHolderName"
      placeholder="As per bank records"
      value={form.accountHolderName}
      onChange={setField('accountHolderName')}
    />
    <Input
      label="Account number"
      name="accountNumber"
      placeholder="1234567890"
      value={form.accountNumber}
      onChange={setField('accountNumber')}
    />
    <Input
      label="IFSC code"
      name="ifscCode"
      placeholder="HDFC0001234"
      value={form.ifscCode}
      onChange={setField('ifscCode')}
    />
    <Input
      label="Branch"
      name="branch"
      placeholder="e.g. Ahmedabad Main"
      value={form.branch}
      onChange={setField('branch')}
    />
  </div>
</GlassCard>
```

**Add to formData state**:
```ts
const [form, setForm] = useState({
  // ... existing fields
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  accountHolderName: '',
  branch: '',
});
```

**Add to handleSubmit body**:
```ts
bankName: form.bankName || null,
accountNumber: form.accountNumber || null,
ifscCode: form.ifscCode || null,
accountHolderName: form.accountHolderName || null,
branch: form.branch || null,
```

### 2. Staff Edit Page (`app/staff/[id]/edit/page.tsx`)
**Copy `app/staff/add/page.tsx` and modify:**
- Change title from "Add staff" to "Edit staff"
- Pre-fill all form fields from `GET /api/staff/:id`
- Change submit to `PUT /api/staff/:id` instead of POST
- Add "Cancel" button that goes back to detail view

### 3. Staff List (`app/staff/page.tsx`)
**Add filters above the table:**
```tsx
<GlassCard className="mb-5 p-4">
  <div className="flex flex-wrap gap-4">
    <div className="relative flex-1 min-w-[200px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        placeholder="Search by name…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9"
      />
    </div>
    <Select
      options={[
        { value: '', label: 'All designations' },
        ...uniqueDesignations.map(d => ({ value: d, label: d }))
      ]}
      value={designationFilter}
      onChange={(e) => setDesignationFilter(e.target.value)}
      className="w-[180px]"
    />
    <Select
      options={[
        { value: '', label: 'All shifts' },
        ...uniqueShifts.map(s => ({ value: s, label: s }))
      ]}
      value={shiftFilter}
      onChange={(e) => setShiftFilter(e.target.value)}
      className="w-[180px]"
    />
  </div>
</GlassCard>
```

**Add Edit button column:**
```tsx
<td className="px-4 py-3 text-right">
  <Link
    href={`/staff/${m.id}/edit`}
    onClick={(e) => e.stopPropagation()}
    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
  >
    <Pencil className="h-3.5 w-3.5" />
    Edit
  </Link>
</td>
```

### 4. Staff Detail (`app/staff/[id]/page.tsx`)
**Remove:**
- The `<details>` section with raw JSON dump
- All references to "Show raw database record"

**Add Bank Details Card** (after salary):
```tsx
<GlassCard className="p-5">
  <div className="mb-4 flex items-center gap-2 text-slate-700">
    <CreditCard className="h-4 w-4" strokeWidth={2} />
    <h3 className="text-sm font-semibold uppercase tracking-wide">Bank details</h3>
  </div>
  <div className="space-y-2 text-sm">
    <div className="flex justify-between">
      <span className="text-slate-500">Bank name</span>
      <span className="text-slate-900">{bankName || '—'}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-500">Account holder</span>
      <span className="text-slate-900">{accountHolderName || '—'}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-500">Account number</span>
      <span className="font-mono text-slate-900">{accountNumber || '—'}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-slate-500">IFSC code</span>
      <span className="font-mono text-slate-900">{ifscCode || '—'}</span>
    </div>
    {branch && (
      <div className="flex justify-between">
        <span className="text-slate-500">Branch</span>
        <span className="text-slate-900">{branch}</span>
      </div>
    )}
  </div>
</GlassCard>
```

**Add Timeline Component** (at the bottom, before closing Layout):
```tsx
<GlassCard className="p-5">
  <div className="mb-4 flex items-center gap-2 text-slate-700">
    <Clock className="h-4 w-4" strokeWidth={2} />
    <h3 className="text-sm font-semibold uppercase tracking-wide">Timeline</h3>
  </div>
  <div className="space-y-4">
    {/* Joining event */}
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
          <UserPlus className="h-4 w-4 text-green-600" />
        </div>
        <div className="h-full w-px bg-slate-200" />
      </div>
      <div className="pb-8">
        <p className="text-sm font-medium text-slate-900">Joined the organization</p>
        <p className="text-xs text-slate-500">{formatDate(joiningDate)} · {calculateDaysWorked(joiningDate)} days ago</p>
        {pointName && <p className="mt-1 text-xs text-slate-600">Assigned to {pointName}</p>}
      </div>
    </div>
    
    {/* Future: Point changes, shift changes, edits from audit log */}
    {/* Fetch from a timeline API endpoint */}
  </div>
</GlassCard>
```

### 5. Point Detail (`app/points/[id]/page.tsx`)
**Remove:**
- The `<details>` section with raw JSON dump

**Add Filters to Staff Roster:**
```tsx
<div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
  <div>
    <h3 className="text-sm font-semibold text-slate-900">Assigned staff roster</h3>
    <p className="mt-0.5 text-xs text-slate-500">
      {staff.length} total · {filteredStaff.length} shown
    </p>
  </div>
  <div className="flex gap-2">
    <Select
      options={[
        { value: '', label: 'All designations' },
        ...uniqueDesignations.map(d => ({ value: d, label: d }))
      ]}
      value={designationFilter}
      onChange={(e) => setDesignationFilter(e.target.value)}
      className="w-[160px]"
    />
    <Select
      options={[
        { value: '', label: 'All shifts' },
        ...shifts.map((s) => ({ value: s.name, label: s.name })),
      ]}
      value={shiftFilter}
      onChange={(e) => setShiftFilter(e.target.value)}
      className="w-[160px]"
    />
  </div>
</div>
```

**Add Date Picker to Attendance Stats:**
Above the stats cards, add:
```tsx
<div className="mb-4 flex items-center justify-between">
  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
    Daily attendance
  </h3>
  <DateRangePopover
    value={selectedDate}
    onChange={(d) => setSelectedDate(d)}
    mode="single"
  />
</div>
```

### 6. Remove OwnerBadge Component
**Delete file:**
- `components/OwnerBadge.tsx`

## Testing Checklist
- [ ] Run SQL migration in Supabase
- [ ] Restart API server (bank fields should work)
- [ ] Create new staff with bank details
- [ ] Edit existing staff
- [ ] Verify filters work on staff list
- [ ] Verify filters work on point roster
- [ ] Check timeline shows join date
- [ ] Verify date picker changes attendance stats

## Next Steps
After implementing these changes:
1. Build authentication system
2. Create Admin panel (separate pages)
3. Create Field Officer panel (mobile-optimized)
