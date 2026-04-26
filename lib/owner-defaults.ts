/** Owner spec defaults — used when API returns nothing so forms stay usable. */

export type DefaultShift = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
};

export const DEFAULT_SHIFTS: DefaultShift[] = [
  { id: 'default-8-8', name: '8 AM - 8 PM', start_time: '08:00:00', end_time: '20:00:00' },
  { id: 'default-8p-8a', name: '8 PM - 8 AM', start_time: '20:00:00', end_time: '08:00:00' },
  { id: 'default-8-4', name: '8 AM - 4 PM', start_time: '08:00:00', end_time: '16:00:00' },
  { id: 'default-4-12', name: '4 PM - 12 AM', start_time: '16:00:00', end_time: '00:00:00' },
  { id: 'default-12-8', name: '12 AM - 8 AM', start_time: '00:00:00', end_time: '08:00:00' },
];

export type DefaultDesignation = { id: string; name: string };

export const DEFAULT_DESIGNATIONS: DefaultDesignation[] = [
  { id: 'default-guard', name: 'Guard' },
  { id: 'default-supervisor', name: 'Supervisor' },
  { id: 'default-head-guard', name: 'Head Guard' },
  { id: 'default-dog', name: 'Dog Squad' },
  { id: 'default-so', name: 'Security Officer' },
  { id: 'default-gunman', name: 'Gunman' },
  { id: 'default-laborer', name: 'Laborer' },
  { id: 'default-forklift', name: 'Forklift' },
  { id: 'default-op', name: 'OP' },
  { id: 'default-bo', name: 'BO' },
  { id: 'default-housekeeping', name: 'Housekeeping' },
];

export function isDefaultShiftId(id: string) {
  return id.startsWith('default-');
}

export function isDefaultDesignationId(id: string) {
  return id.startsWith('default-');
}
