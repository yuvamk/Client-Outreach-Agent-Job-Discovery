'use client';

import { Download, Trash2, ExternalLink, Bookmark, Sparkles } from 'lucide-react';
import type { RankedJob } from '@/lib/jobRanker';

interface Props {
  savedJobs: RankedJob[];
  onRemove: (applyLink: string) => void;
  onTailor: (job: RankedJob) => void;
}

function getMatch(j: RankedJob) {
  return j.match ?? {
    match_score: (j as unknown as Record<string, number>).match_score ?? 50,
    recommendation: (j as unknown as Record<string, string>).recommendation ?? 'Good Fit',
    one_line_reason: (j as unknown as Record<string, string>).one_line_reason ?? '',
  };
}

function exportCSV(jobs: RankedJob[]) {
  const headers = ['Title', 'Company', 'Location', 'Source', 'Posted', 'Match Score', 'Recommendation', 'Apply Link'];
  const rows = jobs.map((j) => {
    const m = getMatch(j);
    return [
      `"${j.title}"`,
      `"${j.company}"`,
      `"${j.location}"`,
      `"${j.source_platform}"`,
      `"${j.posted_date}"`,
      m.match_score,
      `"${m.recommendation}"`,
      `"${j.apply_link}"`,
    ];
  });
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `saved-jobs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SavedJobsTab({ savedJobs, onRemove, onTailor }: Props) {
  if (savedJobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <div className="text-center">
          <p className="font-semibold text-slate-600 dark:text-slate-400">No saved jobs yet</p>
          <p className="text-sm text-slate-400 mt-1">Click the bookmark icon on any job card to save it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-bold text-slate-900 dark:text-white">{savedJobs.length}</span> saved jobs
        </p>
        <button
          onClick={() => exportCSV(savedJobs)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="space-y-3">
        {savedJobs.map((job) => {
          const m = getMatch(job);
          return (
          <div
            key={job.apply_link}
            className="flex items-start gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 transition-all group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">{job.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  m.match_score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : m.match_score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}>
                  {m.match_score}% match
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{job.company}</span>
                <span>·</span>
                <span>{job.location}</span>
                <span>·</span>
                <span>{job.source_platform}</span>
              </div>
              {m.one_line_reason && (
                <p className="text-xs text-slate-400 mt-1 italic">{m.one_line_reason}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={job.apply_link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                title="Apply"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => onTailor(job)}
                className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 hover:bg-violet-100 transition-colors"
                title="Tailor Resume with AI"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onRemove(job.apply_link)}
                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-400 dark:text-red-500 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
