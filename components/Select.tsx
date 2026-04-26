'use client';

import { SelectHTMLAttributes, forwardRef } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <div className="mb-1 flex items-start gap-1.5">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            {hint ? (
              <span
                className="inline-flex shrink-0 text-slate-400 hover:text-slate-600"
                title={hint}
              >
                <Info className="mt-0.5 h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{hint}</span>
              </span>
            ) : null}
          </div>
        )}
        {hint && !label ? (
          <p className="mb-1 text-xs text-slate-500">{hint}</p>
        ) : null}
        <select
          ref={ref}
          className={cn(
            'glass-input w-full px-3 py-2 text-sm text-slate-900',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value || option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
