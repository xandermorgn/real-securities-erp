import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export default function GlassCard({
  children,
  className,
  onClick,
  hoverable = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'glass-card',
        hoverable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
