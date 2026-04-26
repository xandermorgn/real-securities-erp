import { InputHTMLAttributes, forwardRef } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <div className="mb-1 flex items-start gap-1.5">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            {hint ? (
              <span className="inline-flex shrink-0 text-slate-400 hover:text-slate-600" title={hint}>
                <Info className="mt-0.5 h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">{hint}</span>
              </span>
            ) : null}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'glass-input w-full px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400',
            error && 'border-red-500',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
