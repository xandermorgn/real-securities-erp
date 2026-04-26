'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, MapPin, Map, UserCog } from 'lucide-react';

const items = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/staff', icon: Users, label: 'Staff' },
  { href: '/areas', icon: Map, label: 'Areas' },
  { href: '/points', icon: MapPin, label: 'Points' },
  { href: '/roles', icon: UserCog, label: 'Roles' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 border-b border-slate-200 bg-white px-2 py-2 md:hidden">
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand-panel.png" alt="" className="h-10 w-auto max-w-[180px] object-contain" />
      </div>
      <nav className="mt-2 flex justify-between gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-w-[52px] flex-col items-center rounded-lg px-2 py-1.5 text-[10px] font-semibold transition ${
                active
                  ? 'bg-sky-50 text-[#1E3A5F] ring-1 ring-sky-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
