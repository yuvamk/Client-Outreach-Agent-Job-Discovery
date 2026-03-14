import type { RawJob } from "./jobScraper";
import type { JobMatch } from "./jobMatcher";

export interface RankedJob extends RawJob {
  _id?: string;
  match: JobMatch;
  total_score: number;
  recency_score: number;
  applicant_score: number;
  match_score_points: number;
  is_new?: boolean;
}

function getRecencyScore(postedTimestamp?: number, postedDate?: string): number {
  let ts = postedTimestamp;
  
  if (!ts && postedDate) {
    const lower = postedDate.toLowerCase();
    const now = Date.now();
    if (lower.includes("hour") || lower === "today" || lower.includes("just now")) {
      const h = parseInt(lower.match(/(\d+)h/)?.[1] || "1");
      ts = now - h * 3600000;
    } else if (lower.includes("day")) {
      const d = parseInt(lower.match(/(\d+)/)?.[1] || "2");
      ts = now - d * 86400000;
    } else if (lower.includes("week")) {
      const w = parseInt(lower.match(/(\d+)/)?.[1] || "1");
      ts = now - w * 7 * 86400000;
    } else {
      ts = now - 3 * 86400000;
    }
  }
  
  if (!ts) return 10;
  
  const hoursAgo = (Date.now() - ts) / 3600000;
  if (hoursAgo <= 24) return 50;
  if (hoursAgo <= 72) return 30;
  if (hoursAgo <= 168) return 10;
  return 0;
}

function getApplicantScore(applicantCount?: number): number {
  if (applicantCount === undefined) return 15; // Unknown = slight bonus
  if (applicantCount < 10) return 50;
  if (applicantCount < 25) return 30;
  if (applicantCount < 50) return 10;
  return 0;
}

function getMatchScorePoints(matchScore: number): number {
  // Map 0–100 Gemini score to 0–100 points
  return matchScore;
}

export function rankJobs(
  jobs: (RawJob & { match: JobMatch })[],
  previousJobKeys?: Set<string>
): RankedJob[] {
  return jobs
    .map((job): RankedJob => {
      const recency_score = getRecencyScore(job.posted_timestamp, job.posted_date);
      const applicant_score = getApplicantScore(job.applicant_count);
      const match_score_points = getMatchScorePoints(job.match.match_score);
      const total_score = recency_score + applicant_score + match_score_points;
      
      const key = job.apply_link || `${job.title}__${job.company}`;
      const is_new = previousJobKeys ? !previousJobKeys.has(key) : false;
      
      return {
        ...job,
        total_score,
        recency_score,
        applicant_score,
        match_score_points,
        is_new,
      };
    })
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 20);
}

export function filterByVibeCoderMode(jobs: RankedJob[]): RankedJob[] {
  return jobs.filter((j) => j.is_vibe_coder_friendly);
}
