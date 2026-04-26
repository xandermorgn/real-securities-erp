import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="md:pl-16">
        <MobileNav />
        <div className="mx-auto max-w-[1440px] px-4 py-5 md:px-6 md:py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
