import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function getDateRange(filter: 'today' | 'week' | 'custom', customStart?: Date, customEnd?: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (filter === 'today') {
    return {
      startDate: today,
      endDate: today,
    };
  }

  if (filter === 'week') {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return {
      startDate: startOfWeek,
      endDate: endOfWeek,
    };
  }

  if (filter === 'custom' && customStart && customEnd) {
    return {
      startDate: customStart,
      endDate: customEnd,
    };
  }

  return {
    startDate: today,
    endDate: today,
  };
}
