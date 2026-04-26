'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ClipboardCheck, Home, Users, MapPin, Map, UserCog, User, LogOut, Shield, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';

const ownerNav = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Area', href: '/areas', icon: Map },
  { name: 'Points', href: '/points', icon: MapPin },
  { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
  { name: 'Field Officers', href: '/field-officers', icon: Shield },
  { name: 'Roles', href: '/roles', icon: UserCog },
  { name: 'Logs', href: '/logs', icon: FileText },
];

const adminNav = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Staff', href: '/staff', icon: Users },
  { name: 'Area', href: '/areas', icon: Map },
  { name: 'Points', href: '/points', icon: MapPin },
  { name: 'Attendance', href: '/attendance', icon: ClipboardCheck },
  { name: 'Field Officers', href: '/field-officers', icon: Shield },
  { name: 'Logs', href: '/logs', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [hover, setHover] = useState(false);
  const { user, logout } = useAuth();

  if (!user) return null;

  const nav = user.role === 'owner' ? ownerNav : adminNav;

  return (
    <aside
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={cn(
        'fixed left-0 top-0 z-50 hidden h-screen flex-col overflow-x-hidden overflow-y-auto border-r border-slate-200/60 bg-gradient-to-b from-slate-50 to-white shadow-sm backdrop-blur-xl transition-[width] duration-200 ease-out md:flex',
        hover ? 'w-48' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex shrink-0 flex-col items-center border-b border-slate-200/40 px-2 py-4">
        <Link
          href="/"
          className="flex w-full items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand-panel.png"
            alt="Real Securities"
            className={cn(
              'object-contain transition-all duration-200 ease-out',
              hover ? 'h-12 w-auto max-w-[140px]' : 'h-8 w-auto max-w-[36px]'
            )}
          />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1.5 px-2 py-4">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

          return (
            <Link
              key={item.name}
              href={item.href}
              title={item.name}
              className={cn(
                'group relative flex h-11 items-center rounded-xl text-[13px] font-medium transition-all',
                'justify-center gap-0 px-0',
                hover && 'justify-start gap-3 px-3',
                active
                  ? 'bg-white text-slate-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-slate-200/60'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-700 hover:shadow-sm'
              )}
            >
              {/* Glass effect overlay on active */}
              {active && (
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent" />
              )}
              
              <Icon className="relative z-10 h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
              <span
                className={cn(
                  'relative z-10 overflow-hidden whitespace-nowrap text-left transition-[max-width,opacity] duration-150',
                  hover ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
                )}
              >
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Owner profile */}
      <div
        className={cn(
          'shrink-0 border-t border-slate-200/40 p-2 transition-all',
          hover ? 'px-3 py-3' : 'px-2 py-3'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-xl bg-gradient-to-br from-slate-100/80 to-slate-50/60 p-2 shadow-sm ring-1 ring-slate-200/40 backdrop-blur-sm transition-all',
            hover ? 'px-2.5' : 'justify-center px-0'
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 text-white shadow-sm">
            <User className="h-4 w-4" strokeWidth={2} />
          </div>
          <div
            className={cn(
              'min-w-0 flex-1 overflow-hidden transition-[max-width,opacity] duration-150',
              hover ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
            )}
          >
            <p className="truncate text-[11px] font-semibold text-slate-700">
              {user.name}
            </p>
            <p className="truncate text-[10px] capitalize text-slate-400">
              {user.role.replace('_', ' ')}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className={cn(
            'mt-2 flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-red-600 transition hover:bg-red-50',
            !hover && 'justify-center'
          )}
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={2} />
          <span
            className={cn(
              'text-[11px] font-medium transition-[max-width,opacity] duration-150',
              hover ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
            )}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
