import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RawJob } from "./jobScraper";
import type { ResumeProfile } from "./resumeParser";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface JobMatch {
  match_score: number;
  matching_skills: string[];
  missing_skills: string[];
  recommendation: "Apply Now" | "Good Fit" | "Stretch Role" | "Skip";
  one_line_reason: string;
}

export async function matchJobWithResume(
  job: RawJob,
  profile: ResumeProfile,
  instincts?: string
): Promise<JobMatch> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      match_score: 50,
      matching_skills: [],
      missing_skills: [],
      recommendation: "Good Fit",
      one_line_reason: "AI matching unavailable",
    };
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `You are a job-matching AI. Given a candidate profile and a job description, return a JSON object.

Candidate Profile:
${JSON.stringify({ 
  skills: profile.key_skills, 
  tech_stack: profile.tech_stack, 
  experience_years: profile.years_of_experience,
  seniority: profile.seniority_level,
  roles: profile.job_titles,
  work_history: profile.work_experience.map(e => ({
    title: e.title,
    company: e.company,
    description: e.description
  }))
}, null, 2)}

Learned Instincts (Historical Preferences):
${instincts || "No learned instincts yet."}

Job Title: ${job.title}
Company: ${job.company}
Job Description:
${job.job_description.slice(0, 1500)}
Required Skills: ${job.skills_required.join(", ")}

Return ONLY a valid JSON object with this exact structure:
{
  "match_score": 75,
  "matching_skills": ["React", "TypeScript"],
  "missing_skills": ["Kubernetes"],
  "recommendation": "Good Fit",
  "one_line_reason": "Strong React match but missing DevOps experience"
}

Rules:
- match_score: integer 0–100
- recommendation must be exactly one of: "Apply Now", "Good Fit", "Stretch Role", "Skip"
- Return ONLY JSON, no markdown`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    return JSON.parse(jsonMatch[0]) as JobMatch;
  } catch {
    return {
      match_score: 40,
      matching_skills: profile.key_skills.filter((s) =>
        job.job_description.toLowerCase().includes(s.toLowerCase())
      ),
      missing_skills: [],
      recommendation: "Good Fit",
      one_line_reason: "Unable to complete AI analysis",
    };
  }
}

export async function batchMatchJobs(
  jobs: RawJob[],
  profile: ResumeProfile,
  maxJobs = 50,
  instincts?: string
): Promise<(RawJob & { match: JobMatch })[]> {
  const limitedJobs = jobs.slice(0, maxJobs);
  
  // Process in batches of 5 to avoid rate limiting
  const BATCH_SIZE = 5;
  const results: (RawJob & { match: JobMatch })[] = [];
  
  for (let i = 0; i < limitedJobs.length; i += BATCH_SIZE) {
    const batch = limitedJobs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (job) => {
        const match = await matchJobWithResume(job, profile, instincts);
        return { ...job, match };
      })
    );
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + BATCH_SIZE < limitedJobs.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  
  return results;
}
