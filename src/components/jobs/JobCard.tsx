'use client';

import { useState } from 'react';
import {
  ExternalLink, Bookmark, BookmarkCheck, ChevronDown, ChevronUp,
  Clock, Users, MapPin, Building2, Star, Zap, AlertCircle, CheckCircle, TrendingUp, Sparkles, Trash2
} from 'lucide-react';
import type { RankedJob } from '@/lib/jobRanker';

interface Props {
  job: RankedJob;
  isSaved: boolean;
  onSave: (job: RankedJob) => void;
  onTailor: (job: RankedJob) => void;
  onDelete?: (jobId: string) => void;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    : score >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800';

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border text-xs font-bold ${color}`}>
      <Star className="w-3 h-3" />
      {score}%
    </div>
  );
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  'Apply Now': 'bg-emerald-500 text-white',
  'Good Fit': 'bg-blue-500 text-white',
  'Stretch Role': 'bg-amber-500 text-white',
  'Skip': 'bg-slate-400 text-white',
};

const PLATFORM_COLORS: Record<string, string> = {
  'Remotive': 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
  'We Work Remotely': 'bg-teal-50 text-teal-600 dark:bg-teal-950/30 dark:text-teal-400',
  'JSearch': 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
  'LinkedIn': 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400',
};

export default function JobCard({ job, isSaved, onSave, onTailor, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Normalize match data — live jobs have job.match nested, DB jobs have fields at root
  const matchData = job.match ?? {
    match_score: (job as unknown as Record<string, number>).match_score ?? 50,
    matching_skills: (job as unknown as Record<string, string[]>).matching_skills ?? [],
    missing_skills: (job as unknown as Record<string, string[]>).missing_skills ?? [],
    recommendation: (job as unknown as Record<string, string>).recommendation ?? 'Good Fit',
    one_line_reason: (job as unknown as Record<string, string>).one_line_reason ?? '',
  };

  const platformColor = PLATFORM_COLORS[job.source_platform] || 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';

  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden ${
      isSaved ? 'border-violet-300 dark:border-violet-700' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
    } hover:shadow-lg hover:shadow-slate-100 dark:hover:shadow-slate-950`}>
      {/* NEW badge */}
      {job.is_new && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 text-white shadow">
            🆕 NEW
          </span>
        </div>
      )}

      <div className="p-4">
        {/* Top row: title + score */}
        <div className="flex items-start gap-3 pr-12">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-snug">
                {job.title}
              </h3>
              {job.is_vibe_coder_friendly && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-300 border border-violet-200 dark:border-violet-800">
                  <Zap className="w-2.5 h-2.5" /> Vibe Coder
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <Building2 className="w-3 h-3" /> {job.company}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="w-3 h-3" /> {job.location}
              </span>
            </div>
          </div>
          <ScoreBadge score={matchData.match_score} />
        </div>

        {/* Meta row */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${platformColor}`}>
            {job.source_platform}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3" /> {job.posted_date}
          </span>
          {job.applicant_count !== undefined && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Users className="w-3 h-3" /> {job.applicant_count} applicants
            </span>
          )}
          {job.salary && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              💰 {job.salary}
            </span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RECOMMENDATION_STYLES[matchData.recommendation] || 'bg-slate-500 text-white'}`}>
            {matchData.recommendation}
          </span>
        </div>

        {/* Score breakdown mini */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 flex gap-2">
            <div className="h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex-1">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-violet-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, job.total_score / 2)}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">Score: {job.total_score}</span>
        </div>

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Show less' : 'View details'}
        </button>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
            {/* One-line reason */}
            {matchData.one_line_reason && (
              <div className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <TrendingUp className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-600 dark:text-slate-300">{matchData.one_line_reason}</p>
              </div>
            )}

            {/* Matching Skills */}
            {matchData.matching_skills?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Matching Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchData.matching_skills.map((s) => (
                    <span key={s} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle className="w-2.5 h-2.5" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Skills */}
            {matchData.missing_skills?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Skills to Learn</p>
                <div className="flex flex-wrap gap-1.5">
                  {matchData.missing_skills.map((s) => (
                    <span key={s} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-2.5 h-2.5" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Job Description */}
            {job.job_description && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Description</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-6">
                  {job.job_description}
                </p>
              </div>
            )}

            {/* Experience / Job Type */}
            <div className="flex gap-3 flex-wrap text-[10px] text-slate-500">
              {job.experience_required && <span>🎯 {job.experience_required}</span>}
              {job.job_type && <span>💼 {job.job_type}</span>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <a
              href={job.apply_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-all active:scale-[0.98]"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Direct Apply
            </a>
            <button
              onClick={() => onSave(job)}
              className={`p-2 rounded-xl border text-sm transition-all ${
                isSaved
                  ? 'bg-violet-50 dark:bg-violet-950/30 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-400'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-violet-500 hover:border-violet-300'
              }`}
              title={isSaved ? 'Unsave job' : 'Save job'}
            >
              {isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
            
            {onDelete && job._id && (
              <button
                onClick={() => onDelete(job._id as string)}
                className="p-2 rounded-xl border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shrink-0"
                title="Delete from database"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <button
            onClick={() => onTailor(job)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" /> Tailor Resume with AI
          </button>
        </div>
      </div>
    </div>
  );
}
