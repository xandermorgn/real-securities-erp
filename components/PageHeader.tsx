'use client';

import { ReactNode } from 'react';

type Badge = { label: string; variant?: 'blue' | 'green' | 'slate' };

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: Badge[];
  actions?: ReactNode;
}

const badgeStyles: Record<NonNullable<Badge['variant']>, string> = {
  blue: 'bg-sky-50 text-sky-800 ring-1 ring-sky-100',
  green: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-100',
  slate: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

export default function PageHeader({ title, subtitle, badges, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-slate-200/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {badges?.map((b) => (
            <span
              key={b.label}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyles[b.variant || 'slate']}`}
            >
              {b.label}
            </span>
          ))}
        </div>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
