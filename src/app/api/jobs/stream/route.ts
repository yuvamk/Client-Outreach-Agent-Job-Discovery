import { NextRequest, NextResponse } from 'next/server';
import { buildScraperTasks, RawJob } from '@/lib/jobScraper';
import { AutonomousSearchManager } from '@/lib/AutonomousSearchManager';
import { matchJobWithResume, batchMatchJobs } from '@/lib/jobMatcher';
import { InstinctStore } from '@/lib/InstinctStore';
import { JobAuditor } from '@/lib/JobAuditor';
import { rankJobs } from '@/lib/jobRanker';
import dbConnect from '@/lib/mongodb';
import JobModel from '@/models/Job';
import type { ResumeProfile } from '@/lib/resumeParser';

// Helper to wait for a bit
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 min for large scrapes

export async function POST(req: NextRequest) {
  const {
    role, location = 'Remote',
    platforms = ['remotive', 'remoteok', 'jobicy', 'arbeitnow', 'weworkremotely'],
    resumeProfile,
    experience,
    autonomous = false
  }: { 
    role: string; 
    location?: string; 
    platforms?: string[]; 
    resumeProfile?: ResumeProfile; 
    experience?: { years: number; months: number };
    autonomous?: boolean;
  } = await req.json();

  if (!role?.trim()) {
    return NextResponse.json({ error: 'Role is required' }, { status: 400 });
  }

  const sseEvent = (event: string, data: object) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: object) => {
        try { controller.enqueue(encoder.encode(sseEvent(event, data))); } catch { /* closed */ }
      };

      try {
        send('status', { phase: 'db', message: '🗄️ Connecting to database…' });
        await dbConnect();

        const allJobsRaw: RawJob[] = [];

        // Phase 2: Scraping
        if (autonomous) {
          send('status', { phase: 'autonomous', message: '🧠 Entering Autonomous Mode (ECC Pattern)…' });
          const manager = new AutonomousSearchManager(role, location, (msg) => {
            send('status', { phase: 'autonomous', message: msg });
          });

          // Deep discovery loop (effectively infinite until stopped)
          for (let wave = 1; wave <= 100; wave++) {
            if (controller.desiredSize === null) break;
            const strategy = await manager.planStrategy(wave, allJobsRaw.length > 0 ? `Found ${allJobsRaw.length} jobs so far.` : "Initial wave.");
            const waveJobs = await manager.executeWave(strategy);
            allJobsRaw.push(...waveJobs);
            send('status', { phase: 'autonomous', message: `✅ Wave ${wave} complete. Found ${waveJobs.length} jobs.` });
            if (wave < 2) await sleep(1000);
          }
        } else {
          const tasks = buildScraperTasks(role.trim(), location.trim(), platforms, (msg) => {
            send('status', { phase: 'scraping', message: msg });
          });
          send('status', {
            phase: 'scraping',
            message: `🔍 Scraping ${tasks.length} platform(s): ${tasks.map(t => t.label).join(', ')}…`,
          });

          for (const task of tasks) {
            if (controller.desiredSize === null) break;
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
              send('scraped', { platform: task.label, count: 0, message: `⚠️ ${task.label}: failed` });
            }
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

        // Audit & Sanitize (Phase 4 ECC)
        send('status', { phase: 'auditing', message: `🛡️ Auditing ${unique.length} results for quality…` });
        const audited = await JobAuditor.auditBatch(unique);
        const filteredCount = unique.length - audited.length;
        if (filteredCount > 0) {
          send('status', { phase: 'auditing', message: `⚠️ Filtered ${filteredCount} low-quality results.` });
        }

        // Check Existing
        const uniqueKeys = audited.map(j => j.apply_link || `${j.title}__${j.company}`);
        const existingJobs = await JobModel.find({ apply_link: { $in: uniqueKeys } }, { apply_link: 1 }).lean();
        const existingKeys = new Set(existingJobs.map(j => j.apply_link));
        const newJobs = audited.filter(j => !existingKeys.has(j.apply_link || `${j.title}__${j.company}`));

        send('status', {
          phase: 'matching',
          message: `🤖 Matching ${newJobs.length} new jobs (${existingKeys.size} already in DB skipped)…`,
          total: newJobs.length,
        });

        // Phase 3: AI Matching
        const toMatch = [...newJobs].sort((a, b) => (b.posted_timestamp ?? 0) - (a.posted_timestamp ?? 0));
        const activeInstincts = await InstinctStore.getActiveInstincts();
        
        const finalProfile = resumeProfile && experience ? {
          ...resumeProfile,
          years_of_experience: experience.years + (experience.months / 12)
        } : resumeProfile;

        if (finalProfile && toMatch.length > 0) {
          const BATCH_SIZE = 5;
          for (let i = 0; i < toMatch.length; i += BATCH_SIZE) {
            if (controller.desiredSize === null) break;
            const batch = toMatch.slice(i, i + BATCH_SIZE);
            const matchedResults = await batchMatchJobs(batch, finalProfile, BATCH_SIZE, activeInstincts);
            
            for (let j = 0; j < matchedResults.length; j++) {
              const res = matchedResults[j];
              const currentIndex = i + j + 1;
              send('matching', {
                index: currentIndex,
                total: toMatch.length,
                job_title: res.title,
                company: res.company,
                message: `🤖 Analyzed (${currentIndex}/${toMatch.length}): "${res.title}" @ ${res.company}`,
              });

              try {
                // Decompose res to avoid Mongoose validation issues with nested objects/extra fields
                const { match, ...jobData } = res;
                
                await JobModel.findOneAndUpdate(
                  { apply_link: jobData.apply_link || `${jobData.title}__${jobData.company}` },
                  {
                    ...jobData,
                    match_score: match.match_score,
                    matching_skills: match.matching_skills,
                    missing_skills: match.missing_skills,
                    recommendation: match.recommendation,
                    one_line_reason: match.one_line_reason,
                    total_score: (match.match_score * 0.7) + (jobData.is_vibe_coder_friendly ? 30 : 0),
                    category: role.trim().toLowerCase(),
                    scraped_at: new Date(), // Always update the scrape timestamp
                  },
                  { upsert: true, new: true, runValidators: true }
                );
              } catch (err) { 
                console.error('Save error for', res.title, ':', err);
                send('status', { phase: 'error', message: `⚠️ Failed to save: ${res.title}` });
              }
            }
          }
        } else if (!finalProfile) {
          send('status', { phase: 'matching', message: '⚠️ Upload resume for personalized AI matching.' });
        }

        send('status', { phase: 'complete', message: `✅ Complete! matched and saved new jobs.` });
        await sleep(500);

      } catch (err) {
        console.error('Streaming error:', err);
        send('error', { message: err instanceof Error ? err.message : 'Unknown error' });
      } finally {
        try { controller.close(); } catch { /* ignore */ }
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
