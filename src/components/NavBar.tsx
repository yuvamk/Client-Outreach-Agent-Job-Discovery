'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Briefcase, Zap } from 'lucide-react';

export default function NavBar() {
  const pathname = usePathname();

  const tabs = [
    { href: '/', label: 'Client Outreach', icon: Search },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center h-14 gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">Kinetic AI</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto">
          <span className="text-xs text-slate-400 dark:text-slate-600 font-mono">gemini-powered</span>
        </div>
      </div>
    </nav>
  );
}
