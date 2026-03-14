'use client';

import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, X, RefreshCw, Timer } from 'lucide-react';

export interface FilterState {
  sortBy: 'best_match' | 'newest' | 'fewest_applicants';
  jobType: string;
  experienceLevel: string;
  platform: string;
  remoteOnly: boolean;
  category: string;
  dateFrom: string;
  dateTo: string;
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  autoRefresh: boolean;
  onAutoRefreshToggle: (v: boolean) => void;
  nextRefreshIn?: number;
  jobCount: number;
  availableCategories?: string[];
  availablePlatforms?: string[];
}

const JOB_TYPES = ['All', 'Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'];
const EXPERIENCE = ['All', 'Junior', 'Mid', 'Senior'];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${
        active
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}

function Dropdown({ label, children }: { label: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl hover:border-blue-400 transition-colors whitespace-nowrap"
      >
        {label}
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 space-y-1.5 min-w-[180px]">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

export default function FilterSidebar({
  filters, onChange, autoRefresh, onAutoRefreshToggle, nextRefreshIn, jobCount,
  availableCategories = [], availablePlatforms = [],
}: Props) {
  const set = (partial: Partial<FilterState>) => onChange({ ...filters, ...partial });

  const hasDateFilter = filters.dateFrom || filters.dateTo;
  const activeCategoryCount = filters.category ? 1 : 0;
  const activePlatformCount = filters.platform ? 1 : 0;
  const activeCount = (filters.jobType !== 'All' ? 1 : 0) + (filters.experienceLevel !== 'All' ? 1 : 0)
    + (filters.remoteOnly ? 1 : 0) + activeCategoryCount + activePlatformCount + (hasDateFilter ? 1 : 0);

  const platformList = availablePlatforms.length > 0 ? availablePlatforms : ['All'];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex-wrap">
        <div className="flex items-center gap-2 shrink-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-white">Filters</span>
          {activeCount > 0 && (
            <span className="text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">{activeCount}</span>
          )}
          <span className="text-xs text-slate-400 ml-1">{jobCount} jobs</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap ml-0 sm:ml-2">
          {/* Sort */}
          <Dropdown label={
            filters.sortBy === 'best_match' ? '⭐ Best Match'
              : filters.sortBy === 'newest' ? '🕐 Newest'
              : '👥 Fewest Applicants'
          }>
            {(['best_match', 'newest', 'fewest_applicants'] as const).map(v => (
              <button key={v} onClick={() => set({ sortBy: v })}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${filters.sortBy === v ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                {v === 'best_match' ? '⭐ Best Match' : v === 'newest' ? '🕐 Newest First' : '👥 Fewest Applicants'}
              </button>
            ))}
          </Dropdown>

          {/* Job Type */}
          <Dropdown label={filters.jobType === 'All' ? 'Job Type' : filters.jobType}>
            <div className="flex flex-wrap gap-1.5 p-1">
              {JOB_TYPES.map(t => (
                <Pill key={t} active={filters.jobType === t} onClick={() => set({ jobType: t })}>{t}</Pill>
              ))}
            </div>
          </Dropdown>

          {/* Experience */}
          <Dropdown label={filters.experienceLevel === 'All' ? 'Experience' : filters.experienceLevel}>
            <div className="flex flex-wrap gap-1.5 p-1">
              {EXPERIENCE.map(e => (
                <Pill key={e} active={filters.experienceLevel === e} onClick={() => set({ experienceLevel: e })}>{e}</Pill>
              ))}
            </div>
          </Dropdown>

          {/* Category */}
          {(availableCategories.length > 0) && (
            <Dropdown label={filters.category || 'Category'}>
              <div className="flex flex-wrap gap-1.5 p-1 max-w-[220px]">
                <Pill active={!filters.category} onClick={() => set({ category: '' })}>All</Pill>
                {availableCategories.slice(0, 10).map(c => (
                  <Pill key={c} active={filters.category === c} onClick={() => set({ category: c })}>{c}</Pill>
                ))}
              </div>
            </Dropdown>
          )}

          {/* Platform */}
          {platformList.length > 1 && (
            <Dropdown label={filters.platform || 'Platform'}>
              <div className="flex flex-wrap gap-1.5 p-1 max-w-[220px]">
                <Pill active={!filters.platform} onClick={() => set({ platform: '' })}>All</Pill>
                {platformList.map(p => (
                  <Pill key={p} active={filters.platform === p} onClick={() => set({ platform: p })}>{p}</Pill>
                ))}
              </div>
            </Dropdown>
          )}

          {/* Date range */}
          <Dropdown label={hasDateFilter ? '📅 Date ✓' : '📅 Date'}>
            <div className="space-y-2 p-1 min-w-[200px]">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">From</label>
                <input type="date" value={filters.dateFrom} onChange={e => set({ dateFrom: e.target.value })}
                  className="w-full text-sm px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-1">To</label>
                <input type="date" value={filters.dateTo} onChange={e => set({ dateTo: e.target.value })}
                  className="w-full text-sm px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
              {hasDateFilter && (
                <button onClick={() => set({ dateFrom: '', dateTo: '' })} className="text-xs text-red-400 hover:text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Clear</button>
              )}
            </div>
          </Dropdown>

          {/* Remote Only toggle */}
          <button
            onClick={() => set({ remoteOnly: !filters.remoteOnly })}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border transition-all ${
              filters.remoteOnly
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-emerald-300'
            }`}
          >
            🌐 Remote Only
          </button>

          {/* Auto-Refresh */}
          <button
            onClick={() => onAutoRefreshToggle(!autoRefresh)}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-xl border transition-all ${
              autoRefresh
                ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            Auto
            {autoRefresh && nextRefreshIn !== undefined && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold">
                <Timer className="w-3 h-3" />
                {Math.floor(nextRefreshIn / 60)}:{String(nextRefreshIn % 60).padStart(2, '0')}
              </span>
            )}
          </button>

          {/* Clear all */}
          {activeCount > 0 && (
            <button
              onClick={() => onChange({ sortBy: 'best_match', jobType: 'All', experienceLevel: 'All', platform: '', remoteOnly: false, category: '', dateFrom: '', dateTo: '' })}
              className="text-xs text-red-400 hover:text-red-500 font-medium flex items-center gap-1 px-2 py-2"
            >
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
