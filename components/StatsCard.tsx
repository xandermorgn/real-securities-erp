import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  percentage?: number;
  icon?: React.ReactNode;
  color?: string;
  footnote?: string;
}

export default function StatsCard({
  title,
  value,
  percentage,
  icon,
  color = 'indigo',
  footnote,
}: StatsCardProps) {
  const colorClasses: { [key: string]: string } = {
    indigo: 'text-sky-800',
    green: 'text-emerald-800',
    yellow: 'text-amber-800',
    red: 'text-red-800',
  };

  const iconBg: { [key: string]: string } = {
    indigo: 'border-sky-400/25 bg-sky-400/15 text-sky-900',
    green: 'border-emerald-400/25 bg-emerald-400/15 text-emerald-900',
    yellow: 'border-amber-400/25 bg-amber-400/15 text-amber-900',
    red: 'border-red-400/25 bg-red-400/15 text-red-900',
  };

  return (
    <div
      className={cn(
        'flex-1 rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 shadow-sm'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {percentage !== undefined && (
            <p className={cn('mt-1 text-sm font-semibold', colorClasses[color])}>{percentage}%</p>
          )}
          {footnote ? <p className="mt-1 text-xs text-slate-500">{footnote}</p> : null}
        </div>
        {icon && (
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-inner shadow-white/30 backdrop-blur-sm',
              iconBg[color] || iconBg.indigo
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
