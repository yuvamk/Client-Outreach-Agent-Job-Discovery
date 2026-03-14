'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, Zap, Globe, RefreshCw, CheckSquare, Square } from 'lucide-react';
import type { ResumeProfile } from '@/lib/resumeParser';

interface Props {
  profile: ResumeProfile | null;
  onSearch: (params: { role: string; location: string; platforms: string[]; vibeCoderMode: boolean }) => void;
  loading: boolean;
  vibeCoderMode: boolean;
  onVibeCoderToggle: (v: boolean) => void;
}

const PLATFORMS = [
  { id: 'remotive',       label: 'Remotive',           free: true,  emoji: '🌐' },
  { id: 'remoteok',       label: 'RemoteOK',           free: true,  emoji: '🏠' },
  { id: 'jobicy',         label: 'Jobicy',             free: true,  emoji: '🎯' },
  { id: 'arbeitnow',      label: 'Arbeitnow',          free: true,  emoji: '🇪🇺' },
  { id: 'weworkremotely', label: 'We Work Remotely',   free: true,  emoji: '💼' },
  { id: 'themuse',        label: 'The Muse',           free: true,  emoji: '🎨' },
  { id: 'hn',             label: 'HN Hiring',          free: true,  emoji: '🟠' },
  { id: 'findwork',       label: 'Findwork.dev',       free: true,  emoji: '🔍' },
  { id: 'adzuna',         label: 'Adzuna',             free: false, emoji: '📋', needsKey: 'ADZUNA_APP_ID' },
  { id: 'jsearch',        label: 'LinkedIn / Indeed',  free: false, emoji: '💎', needsKey: 'RAPIDAPI_KEY' },
];

const FREE_PLATFORM_IDS = PLATFORMS.filter(p => p.free).map(p => p.id);

export default function JobSearchPanel({ profile, onSearch, loading, vibeCoderMode, onVibeCoderToggle }: Props) {
  const [role, setRole] = useState('');
  const [location, setLocation] = useState('Remote');
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>(FREE_PLATFORM_IDS);

  // Auto-fill role from resume
  useEffect(() => {
    if (profile?.preferred_roles?.[0] && !role) {
      setRole(profile.preferred_roles[0]);
    }
  }, [profile, role]);

  const allSelected = PLATFORMS.every(p => platforms.includes(p.id));
  const freeSelected = FREE_PLATFORM_IDS.every(id => platforms.includes(id));

  const togglePlatform = (id: string) => {
    setPlatforms(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setPlatforms(allSelected ? [] : PLATFORMS.map(p => p.id));
  };

  const handleSelectFree = () => {
    if (freeSelected) {
      setPlatforms(prev => prev.filter(id => !FREE_PLATFORM_IDS.includes(id)));
    } else {
      setPlatforms(prev => [...new Set([...prev, ...FREE_PLATFORM_IDS])]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!role.trim() || platforms.length === 0) return;
    onSearch({ role: role.trim(), location: remoteOnly ? 'Remote' : location, platforms, vibeCoderMode });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
          <Search className="w-3.5 h-3.5 text-white" />
        </div>
        <h2 className="font-semibold text-slate-900 dark:text-white text-sm">Job Search</h2>
        <span className="text-xs text-slate-400">{platforms.length} platform{platforms.length !== 1 ? 's' : ''} selected</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
            Job Role / Keywords
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text" value={role} onChange={e => setRole(e.target.value)}
              placeholder="e.g. Frontend Developer, AI Engineer…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Location</label>
            <button type="button" onClick={() => setRemoteOnly(!remoteOnly)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all font-medium ${
                remoteOnly ? 'bg-blue-50 border-blue-300 text-blue-600 dark:bg-blue-950/30 dark:border-blue-700 dark:text-blue-400'
                           : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
              }`}>
              <Globe className="w-3 h-3" /> Remote Only {remoteOnly ? '✓' : ''}
            </button>
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={remoteOnly ? 'Remote' : location}
              onChange={e => setLocation(e.target.value)} disabled={remoteOnly}
              placeholder="City, Country…"
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
          </div>
        </div>

        {/* Platforms */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Platforms
            </label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSelectFree}
                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-medium">
                {freeSelected ? 'Deselect free' : 'All free'}
              </button>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <button type="button" onClick={handleSelectAll}
                className="text-[10px] text-slate-500 hover:underline font-medium">
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {PLATFORMS.map(({ id, label, free, emoji, needsKey }) => {
              const checked = platforms.includes(id);
              return (
                <button key={id} type="button" onClick={() => togglePlatform(id)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                    checked
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {checked
                    ? <CheckSquare className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
                  <span className="truncate flex-1">{emoji} {label}</span>
                  {!free && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 font-bold shrink-0">KEY</span>
                  )}
                </button>
              );
            })}
          </div>

          {platforms.length === 0 && (
            <p className="text-xs text-red-400 mt-1.5">Select at least one platform</p>
          )}

          <p className="text-[10px] text-slate-400 mt-2">
            💡 All free platforms need no API keys. Results from more platforms = more total jobs found.
          </p>
        </div>

        {/* Vibe Coder Mode */}
        <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
          vibeCoderMode
            ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-300 dark:border-violet-700'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${vibeCoderMode ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'} transition-colors`}>
              <Zap className={`w-3.5 h-3.5 ${vibeCoderMode ? 'text-white' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${vibeCoderMode ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-300'}`}>
                ⚡ Vibe Coder Mode
              </p>
              <p className="text-[10px] text-slate-400">AI/LLM/Prompt Engineer jobs only</p>
            </div>
          </div>
          <button type="button" onClick={() => onVibeCoderToggle(!vibeCoderMode)}
            className={`relative w-10 h-5 rounded-full transition-all duration-200 ${vibeCoderMode ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${vibeCoderMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Submit */}
        <button type="submit" disabled={loading || !role.trim() || platforms.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold text-sm transition-all duration-200 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Searching {platforms.length} platforms…</>
            : <><Search className="w-4 h-4" /> Search {platforms.length} Platform{platforms.length !== 1 ? 's' : ''}</>
          }
        </button>
      </form>
    </div>
  );
}
