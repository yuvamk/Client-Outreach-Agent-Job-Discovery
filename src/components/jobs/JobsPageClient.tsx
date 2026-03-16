'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bookmark, Search, Database, ChevronDown, ChevronUp, Settings2, Trash2, X } from 'lucide-react';
import ResumeUploadPanel from './ResumeUploadPanel';
import JobSearchPanel from './JobSearchPanel';
import FilterSidebar, { type FilterState } from './FilterSidebar';
import JobsGrid from './JobsGrid';
import SavedJobsTab from './SavedJobsTab';
import LiveActivityFeed, { type ActivityLog } from './LiveActivityFeed';
import TailorResumeModal from './TailorResumeModal';
import type { ResumeProfile } from '@/lib/resumeParser';
import type { RankedJob } from '@/lib/jobRanker';

type Tab = 'discover' | 'saved' | 'db';

const DEFAULT_FILTERS: FilterState = {
  sortBy: 'best_match',
  jobType: 'All',
  experienceLevel: 'All',
  platform: '',
  remoteOnly: false,
  category: '',
  dateFrom: '',
  dateTo: '',
};

const REFRESH_INTERVAL_SECS = 6 * 60 * 60;
let logIdCounter = 0;

export default function JobsPageClient() {
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [resumeText, setResumeText] = useState<string | null>(null);
  const [tailorJob, setTailorJob] = useState<RankedJob | null>(null);
  const [allJobs, setAllJobs] = useState<RankedJob[]>([]);
  const [dbJobs, setDbJobs] = useState<RankedJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<RankedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [vibeCoderMode, setVibeCoderMode] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [nextRefreshIn, setNextRefreshIn] = useState(REFRESH_INTERVAL_SECS);
  const [newJobCount, setNewJobCount] = useState(0);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [dbTotal, setDbTotal] = useState(0);
  const [setupOpen, setSetupOpen] = useState(true);

  const lastSearchRef = useRef<{ role: string; location: string; platforms: string[]; vibeCoderMode: boolean; experience?: { years: number; months: number }; autonomous: boolean } | null>(null);
  const previousJobKeysRef = useRef<Set<string>>(new Set());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const addLog = useCallback((log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    setActivityLogs(prev => [...prev.slice(-99), { ...log, id: ++logIdCounter, timestamp: new Date() }]);
  }, []);

  useEffect(() => {
    try {
      const s = localStorage.getItem('kinetic_saved_jobs');
      if (s) setSavedJobs(JSON.parse(s));
      const p = localStorage.getItem('kinetic_resume_profile');
      if (p) setProfile(JSON.parse(p));
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { localStorage.setItem('kinetic_saved_jobs', JSON.stringify(savedJobs)); }, [savedJobs]);
  useEffect(() => {
    if (profile) localStorage.setItem('kinetic_resume_profile', JSON.stringify(profile));
    else localStorage.removeItem('kinetic_resume_profile');
  }, [profile]);

  const fetchDbJobs = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.platform) params.set('platform', filters.platform);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    params.set('sortBy', filters.sortBy === 'newest' ? 'posted_timestamp' : 'total_score');
    params.set('limit', '50');
    try {
      const res = await fetch(`/api/jobs/list?${params}`);
      const data = await res.json();
      setDbJobs(data.jobs ?? []);
      setDbTotal(data.total ?? 0);
      if (data.filters) {
        setAvailableCategories(data.filters.categories ?? []);
        setAvailablePlatforms(data.filters.platforms ?? []);
      }
    } catch { /* ignore */ }
  }, [filters]);

  useEffect(() => { if (activeTab === 'db') fetchDbJobs(); }, [activeTab, fetchDbJobs]);
  useEffect(() => {
    fetch('/api/jobs/list?limit=1').then(r => r.json()).then(d => {
      if (d.filters) { setAvailableCategories(d.filters.categories ?? []); setAvailablePlatforms(d.filters.platforms ?? []); }
      if (d.total) setDbTotal(d.total);
    }).catch(() => {});
  }, []);

  const runStreamSearch = useCallback(async (params: { role: string; location: string; platforms: string[]; vibeCoderMode: boolean; experience?: { years: number; months: number }; autonomous: boolean }) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setIsStreaming(true);
    setShowTerminal(true);
    setNewJobCount(0);
    setActivityLogs([]);
    setSetupOpen(false);
    lastSearchRef.current = params;

    addLog({ phase: 'start', message: `🚀 Searching "${params.role}" on ${params.platforms.length} platform(s)…`, type: 'status' });

    try {
      const res = await fetch('/api/jobs/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: params.role, 
          location: params.location, 
          platforms: params.platforms, 
          resumeProfile: profile,
          experience: params.experience,
          autonomous: params.autonomous
        }),
        signal: abortRef.current.signal,
      });
      if (!res.ok || !res.body) throw new Error('Stream failed to start');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() ?? '';

        for (const block of blocks) {
          const eventMatch = block.match(/^event: (.+)/m);
          const dataMatch = block.match(/^data: (.+)/m);
          if (!eventMatch || !dataMatch) continue;
          const event = eventMatch[1].trim();
          let data: Record<string, unknown>;
          try { data = JSON.parse(dataMatch[1]); } catch { continue; }

          if (event === 'result') {
            const jobs = (data.jobs ?? []) as RankedJob[];
            const keys = new Set(jobs.map(j => j.apply_link || `${j.title}__${j.company}`));
            if (previousJobKeysRef.current.size > 0) setNewJobCount([...keys].filter(k => !previousJobKeysRef.current.has(k)).length);
            previousJobKeysRef.current = keys;
            setAllJobs(jobs);
            setSearched(true);
          } else if (event === 'error') {
            addLog({ phase: 'error', message: String(data.message ?? 'Unknown error'), type: 'error' });
          } else if (['status', 'scraped', 'matching'].includes(event)) {
            addLog({ phase: String(data.phase ?? event), message: String(data.message ?? ''), type: event as ActivityLog['type'], meta: data });
          }
        }
      }
      addLog({ phase: 'done', message: '✅ Done! Jobs saved to database.', type: 'status' });
      fetch('/api/jobs/list?limit=1').then(r => r.json()).then(d => {
        if (d.filters) { setAvailableCategories(d.filters.categories ?? []); setAvailablePlatforms(d.filters.platforms ?? []); }
        if (d.total) setDbTotal(d.total);
      }).catch(() => {});
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        addLog({ phase: 'error', message: `❌ ${(err as Error).message}`, type: 'error' });
      }
    } finally {
      setLoading(false);
      setIsStreaming(false);
    }
  }, [profile, addLog]);

  const handleDeleteJob = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this job from your database?')) return;
    try {
      const res = await fetch(`/api/jobs/manage?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDbJobs(prev => prev.filter(j => j._id !== id));
        setDbTotal(prev => Math.max(0, prev - 1));
        setAllJobs(prev => prev.filter(j => j._id !== id));
      }
    } catch (err) { console.error('Delete failed:', err); }
  }, []);

  const handleDeleteAll = useCallback(async () => {
    if (!confirm('⚠️ Are you sure you want to delete EVERY job from your database? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/jobs/manage?deleteAll=true', { method: 'DELETE' });
      if (res.ok) {
        setDbJobs([]);
        setDbTotal(0);
        setAllJobs([]);
      }
    } catch (err) { console.error('Delete all failed:', err); }
  }, []);

  const handleSearch = useCallback((params: { role: string; location: string; platforms: string[]; vibeCoderMode: boolean; experience?: { years: number; months: number }; autonomous: boolean }) => {
    setVibeCoderMode(params.vibeCoderMode);
    runStreamSearch(params);
  }, [runStreamSearch]);

  const startCountdown = useCallback((params: typeof lastSearchRef.current) => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setNextRefreshIn(REFRESH_INTERVAL_SECS);
    countdownRef.current = setInterval(() => setNextRefreshIn(p => p <= 1 ? REFRESH_INTERVAL_SECS : p - 1), 1000);
    refreshTimerRef.current = setInterval(() => { if (params) runStreamSearch(params); }, REFRESH_INTERVAL_SECS * 1000);
  }, [runStreamSearch]);

  useEffect(() => {
    if (!autoRefresh) {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    } else if (lastSearchRef.current) startCountdown(lastSearchRef.current);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [autoRefresh, startCountdown]);

  const handleSaveJob = useCallback((job: RankedJob) => {
    setSavedJobs(prev => prev.find(j => j.apply_link === job.apply_link)
      ? prev.filter(j => j.apply_link !== job.apply_link) : [...prev, job]);
  }, []);

  const savedJobLinks = new Set(savedJobs.map(j => j.apply_link));

  const filteredJobs = allJobs.filter(job => {
    if (vibeCoderMode && !job.is_vibe_coder_friendly) return false;
    if (filters.remoteOnly && !job.location.toLowerCase().includes('remote')) return false;
    if (filters.jobType !== 'All' && !job.job_type?.toLowerCase().includes(filters.jobType.toLowerCase())) return false;
    if (filters.platform && !job.source_platform?.toLowerCase().includes(filters.platform.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (filters.sortBy === 'newest') return (b.posted_timestamp ?? 0) - (a.posted_timestamp ?? 0);
    if (filters.sortBy === 'fewest_applicants') return (a.applicant_count ?? 999) - (b.applicant_count ?? 999);
    return b.total_score - a.total_score;
  });

  const tabs = [
    { id: 'discover' as Tab, label: 'Discover Jobs', icon: Search },
    { id: 'saved' as Tab, label: `Saved${savedJobs.length > 0 ? ` (${savedJobs.length})` : ''}`, icon: Bookmark },
    { id: 'db' as Tab, label: `All in DB${dbTotal > 0 ? ` (${dbTotal})` : ''}`, icon: Database },
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">Job Discovery</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI-powered matching · Real-time scraping · MongoDB persistence</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1 w-fit shadow-sm">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ═══ SAVED TAB ═══════════════════════════════════ */}
        {activeTab === 'saved' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <SavedJobsTab 
              savedJobs={savedJobs} 
              onRemove={link => setSavedJobs(prev => prev.filter(j => j.apply_link !== link))} 
              onTailor={setTailorJob}
            />
          </div>
        )}

        {/* ═══ DB JOBS TAB ══════════════════════════════════ */}
        {activeTab === 'db' && (
          <div className="space-y-4">
            <FilterSidebar
              filters={filters}
              onChange={f => { setFilters(f); setTimeout(fetchDbJobs, 0); }}
              autoRefresh={autoRefresh}
              onAutoRefreshToggle={setAutoRefresh}
              nextRefreshIn={nextRefreshIn}
              jobCount={dbTotal}
              availableCategories={availableCategories}
              availablePlatforms={availablePlatforms}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-white">{dbTotal}</span> jobs in database
                </p>
                <button
                  onClick={handleDeleteAll}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-wider transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Clear All Data
                </button>
              </div>
              <button
                onClick={fetchDbJobs}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Refresh List
              </button>
            </div>
            <JobsGrid 
              jobs={dbJobs as unknown as RankedJob[]} 
              savedJobLinks={savedJobLinks} 
              onSave={handleSaveJob} 
              onTailor={setTailorJob} 
              onDelete={handleDeleteJob} 
              loading={false} 
              searched={true} 
              newJobCount={0} 
            />
          </div>
        )}

        {/* ═══ DISCOVER TAB ═════════════════════════════════ */}
        {activeTab === 'discover' && (
          <div className="space-y-4">
            {/* Collapsible Setup Panel */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <button
                onClick={() => setSetupOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {profile
                      ? `${profile.seniority_level} · ${profile.preferred_roles?.[0] ?? 'Developer'}`
                      : 'Setup — Resume & Search'}
                  </span>
                  {profile && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-semibold">✓ Resume loaded</span>
                  )}
                </div>
                {setupOpen
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {setupOpen && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-slate-100 dark:border-slate-800">
                  <div className="p-5 md:border-r border-slate-100 dark:border-slate-800">
                    <ResumeUploadPanel 
                      profile={profile} 
                      onProfileChange={setProfile} 
                      onResumeTextChange={setResumeText} 
                    />
                  </div>
                  <div className="p-5">
                    <JobSearchPanel
                      profile={profile}
                      onSearch={handleSearch}
                      loading={loading}
                      vibeCoderMode={vibeCoderMode}
                      onVibeCoderToggle={setVibeCoderMode}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Horizontal Filter Bar */}
            <FilterSidebar
              filters={filters}
              onChange={setFilters}
              autoRefresh={autoRefresh}
              onAutoRefreshToggle={setAutoRefresh}
              nextRefreshIn={nextRefreshIn}
              jobCount={filteredJobs.length}
              availableCategories={availableCategories}
              availablePlatforms={availablePlatforms}
            />

            {/* Live Terminal — only shown when streaming or has logs, togglable */}
            {(isStreaming || activityLogs.length > 0) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowTerminal(s => !s)}
                    className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                  >
                    <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                    {isStreaming ? 'Live output — running…' : `Activity log (${activityLogs.length} events)`}
                    {showTerminal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  {isStreaming && (
                    <button
                      onClick={() => abortRef.current?.abort()}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 text-xs font-bold transition-all border border-red-200 dark:border-red-800"
                    >
                      <X className="w-3.5 h-3.5" /> Stop Search
                    </button>
                  )}
                </div>
                {showTerminal && <LiveActivityFeed logs={activityLogs} isActive={isStreaming} />}
              </div>
            )}

            {/* Jobs Grid */}
            <JobsGrid
              jobs={filteredJobs}
              savedJobLinks={savedJobLinks}
              onSave={handleSaveJob}
              onTailor={setTailorJob}
              loading={loading}
              searched={searched}
              newJobCount={newJobCount}
            />
          </div>
        )}
      </div>

      {/* Tailor Resume Modal */}
      {tailorJob && resumeText && (
        <TailorResumeModal
          job={tailorJob}
          resumeText={resumeText}
          onClose={() => setTailorJob(null)}
        />
      )}
      
      {tailorJob && !resumeText && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
           <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 max-w-sm text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Resume Required</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Please upload your resume in the Setup section first to enable AI tailoring.</p>
              <button 
                onClick={() => { setTailorJob(null); setSetupOpen(true); }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all"
              >
                Go to Setup
              </button>
              <button 
                onClick={() => setTailorJob(null)}
                className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-medium"
              >
                Cancel
              </button>
           </div>
        </div>
      )}
    </main>
  );
}
