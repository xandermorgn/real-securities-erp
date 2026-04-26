import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50';

  const variants = {
    primary:
      'bg-[#1E3A5F] text-white shadow-sm hover:bg-[#16304f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500/40',
    secondary: 'border border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100',
    outline:
      'border border-slate-200 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
