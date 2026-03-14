'use client';

import { Loader2, Briefcase, Bell } from 'lucide-react';
import JobCard from './JobCard';
import type { RankedJob } from '@/lib/jobRanker';

interface Props {
  jobs: RankedJob[];
  savedJobLinks: Set<string>;
  onSave: (job: RankedJob) => void;
  onTailorDetails?: (job: RankedJob) => void; // For detail view if any
  onTailor: (job: RankedJob) => void;
  onDelete?: (jobId: string) => void;
  loading: boolean;
  searched: boolean;
  newJobCount: number;
}

const SKELETONS = Array.from({ length: 6 });

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 animate-pulse">
      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg w-3/4" />
      <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg w-1/2" />
      <div className="flex gap-2">
        <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full" />
        <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-xl w-full mt-2" />
    </div>
  );
}

export default function JobsGrid({ jobs, savedJobLinks, onSave, onTailor, onDelete, loading, searched, newJobCount }: Props) {
  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Scraping jobs & running AI matching…
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SKELETONS.map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!searched) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-100 to-violet-100 dark:from-blue-950/40 dark:to-violet-950/40 flex items-center justify-center">
          <Briefcase className="w-10 h-10 text-blue-400" />
        </div>
        <div className="text-center max-w-sm">
          <h3 className="font-bold text-slate-700 dark:text-slate-300 text-lg">Ready to find your next role?</h3>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">
            Upload your resume for AI-powered matching, then search across Remotive, We Work Remotely, LinkedIn, and more — all in one click.
          </p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
          <Briefcase className="w-8 h-8 text-amber-400" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-700 dark:text-slate-300">No jobs found</p>
          <p className="text-sm text-slate-400 mt-1">Try different keywords, platforms, or disable Vibe Coder Mode.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* New Jobs Banner */}
      {newJobCount > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-bounce" />
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
            🆕 {newJobCount} new job{newJobCount > 1 ? 's' : ''} found since last refresh!
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <JobCard
            key={job.apply_link || `${job.title}__${job.company}`}
            job={job}
            isSaved={savedJobLinks.has(job.apply_link)}
            onSave={onSave}
            onTailor={onTailor}
            onDelete={onDelete}
          />
        ))}
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        ⚠️ Job data is scraped in real-time. Apply links redirect to original platforms. Showing top {jobs.length} results by AI score.
      </p>
    </div>
  );
}
