import { NextRequest, NextResponse } from 'next/server';
import { buildScraperTasks } from '@/lib/jobScraper';
import { matchJobWithResume } from '@/lib/jobMatcher';
import { rankJobs } from '@/lib/jobRanker';
import dbConnect from '@/lib/mongodb';
import JobModel from '@/models/Job';
import type { ResumeProfile } from '@/lib/resumeParser';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for large scrapes

function sseEvent(event: string, data: object): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const {
    role, location = 'Remote',
    platforms = ['remotive', 'remoteok', 'jobicy', 'arbeitnow', 'weworkremotely'],
    resumeProfile,
  }: { role: string; location?: string; platforms?: string[]; resumeProfile?: ResumeProfile } = await req.json();

  if (!role?.trim()) {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try { controller.enqueue(encoder.encode(sseEvent(event, data))); } catch { /* closed */ }
      };

      try {
        // Phase 1: DB Connect
        send('status', { phase: 'db', message: '🗄️ Connecting to database…' });
        await dbConnect();

        // Phase 2: Scrape all selected platforms sequentially with live updates
        const tasks = buildScraperTasks(role.trim(), location.trim(), platforms);
        send('status', {
          phase: 'scraping',
          message: `🔍 Scraping ${tasks.length} platform(s): ${tasks.map(t => t.label).join(', ')}…`,
        });

        const allRaw: ReturnType<typeof buildScraperTasks>[number] extends { fn: () => Promise<infer T> } ? T : never[] = [];
        const allJobsRaw: Awaited<ReturnType<(typeof tasks)[number]['fn']>> = [];

        for (const task of tasks) {
          send('status', { phase: 'scraping', message: `🔍 Scraping ${task.label}…`, platform: task.id });
          try {
            const jobs = await task.fn();
            allJobsRaw.push(...jobs);
            send('scraped', {
              platform: task.label,
              count: jobs.length,
              message: `✅ ${task.label}: found ${jobs.length} job${jobs.length !== 1 ? 's' : ''}`,
            });
          } catch (err) {
            send('scraped', {
              platform: task.label,
              count: 0,
              message: `⚠️ ${task.label}: failed (${err instanceof Error ? err.message : 'error'})`,
            });
          }
        }

        // Deduplicate
        const seen = new Set<string>();
        const unique = allJobsRaw.filter((j) => {
          const k = j.apply_link || `${j.title}__${j.company}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        // Phase 2.5: Check DB for existing jobs to avoid re-matching
        const uniqueKeys = unique.map(j => j.apply_link || `${j.title}__${j.company}`);
        const existingJobs = await JobModel.find({ 
          apply_link: { $in: uniqueKeys } 
        }, { apply_link: 1, title: 1, company: 1 }).lean();
        
        const existingKeys = new Set(existingJobs.map(j => j.apply_link || `${j.title}__${j.company}`));
        const newJobs = unique.filter(j => !existingKeys.has(j.apply_link || `${j.title}__${j.company}`));

        send('status', {
          phase: 'matching',
          message: `🤖 AI matching ${newJobs.length} new jobs (${existingKeys.size} already in DB skipped)…`,
          total: newJobs.length,
        });

        // Phase 3: AI Matching — batch matching for NEW jobs only
        const sortedForMatch = [...newJobs].sort((a, b) => (b.posted_timestamp ?? 0) - (a.posted_timestamp ?? 0));
        const toMatch = sortedForMatch.slice(0, 50);
        const matched = [];

        for (let i = 0; i < toMatch.length; i++) {
          const job = toMatch[i];
          send('matching', {
            index: i + 1,
            total: toMatch.length,
            job_title: job.title,
            company: job.company,
            message: `🤖 Matching (${i + 1}/${toMatch.length}): "${job.title}" @ ${job.company}`,
          });

          const match = resumeProfile
            ? await matchJobWithResume(job, resumeProfile)
            : {
                match_score: 50,
                matching_skills: [],
                missing_skills: [],
                recommendation: 'Good Fit' as const,
                one_line_reason: 'Upload resume for personalized AI matching',
              };

          matched.push({ ...job, match });

          // Brief delay between Gemini calls to avoid rate limiting
          if (resumeProfile && i < toMatch.length - 1) await new Promise(r => setTimeout(r, 250));
        }

        // Phase 4: Rank (using matched new jobs + existing jobs if needed, but for simplicity just current session)
        send('status', { phase: 'ranking', message: `🏆 Ranking ${matched.length} new jobs…` });
        const ranked = rankJobs(matched);

        // Phase 5: Save NEW jobs to DB
        send('status', { phase: 'saving', message: `💾 Saving ${newJobs.length} new jobs to database…` });
        let savedCount = 0;

        for (const job of newJobs) {
          const matchedJob = matched.find(m => (m.apply_link || `${m.title}__${m.company}`) === (job.apply_link || `${job.title}__${job.company}`));
          try {
            await JobModel.findOneAndUpdate(
              { apply_link: job.apply_link || `${job.title}__${job.company}` },
              {
                ...job,
                match_score: matchedJob?.match.match_score ?? 50,
                matching_skills: matchedJob?.match.matching_skills ?? [],
                missing_skills: matchedJob?.match.missing_skills ?? [],
                recommendation: matchedJob?.match.recommendation ?? 'Good Fit',
                one_line_reason: matchedJob?.match.one_line_reason ?? '',
                total_score: ranked.find(r => r.apply_link === job.apply_link)?.total_score ?? 50,
                category: role.trim().toLowerCase(),
                search_role: role.trim(),
                search_location: location.trim(),
                scraped_at: new Date(),
              },
              { upsert: true, new: true }
            );
            savedCount++;
          } catch { /* skip */ }
        }

        send('status', { phase: 'done', message: `✅ Complete! ${savedCount} new jobs saved, ${ranked.length} ranked.` });
        send('result', { jobs: ranked, stats: { total: unique.length, matched: matched.length, ranked: ranked.length, saved: savedCount, existing: existingKeys.size } });

      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        send('error', { message: `❌ Error: ${msg}` });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
