export interface User {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'field_officer';
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Staff {
  id: string;
  name: string;
  dob: Date;
  bloodGroup: string;
  address: string;
  aadhaarUrl?: string;
  policeVerificationUrl?: string;
  photoUrl?: string;
  salaryType: 'flat_rate' | 'compliance';
  salary: number;
  da: number;
  pf: number;
  esi: number;
  bonus: number;
  ot: number;
  designation: string;
  shift: string;
  joiningDate: Date;
  pointId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Area {
  id: string;
  name: string;
  rate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Point {
  id: string;
  name: string;
  areaId: string;
  rate: number;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Attendance {
  id: string;
  staffId: string;
  pointId: string;
  date: Date;
  status: 'present' | 'leave' | 'absent';
  shift: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AttendanceStats {
  present: number;
  leave: number;
  absent: number;
  total: number;
  presentPercentage: number;
  leavePercentage: number;
  absentPercentage: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export type DateFilter = 'today' | 'week' | 'custom';

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface Designation {
  id: string;
  name: string;
}
