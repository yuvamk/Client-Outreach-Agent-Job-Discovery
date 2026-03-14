import { NextRequest, NextResponse } from "next/server";
import { scrapeJobs } from "@/lib/jobScraper";
import { batchMatchJobs } from "@/lib/jobMatcher";
import { rankJobs } from "@/lib/jobRanker";
import type { ResumeProfile } from "@/lib/resumeParser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      role,
      location = "Remote",
      platforms = ["remotive", "weworkremotely"],
      resumeProfile,
    }: {
      role: string;
      location?: string;
      platforms?: string[];
      resumeProfile?: ResumeProfile;
    } = body;

    if (!role?.trim()) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    // 1. Scrape jobs from selected platforms
    const rawJobs = await scrapeJobs(role.trim(), location.trim(), platforms);

    if (rawJobs.length === 0) {
      return NextResponse.json({
        jobs: [],
        message: "No jobs found. Try different keywords or platforms.",
        stats: { total_scraped: 0, platforms_used: platforms },
      });
    }

    // 2. If we have a resume profile, do AI matching; otherwise use defaults
    let matchedJobs;
    if (resumeProfile) {
      matchedJobs = await batchMatchJobs(rawJobs, resumeProfile, 30);
    } else {
      // No resume: assign default match scores based on keyword overlap with role
      matchedJobs = rawJobs.map((job) => ({
        ...job,
        match: {
          match_score: 50,
          matching_skills: [],
          missing_skills: [],
          recommendation: "Good Fit" as const,
          one_line_reason: "Upload your resume for personalized matching",
        },
      }));
    }

    // 3. Rank and filter to top 20
    const rankedJobs = rankJobs(matchedJobs);

    return NextResponse.json({
      jobs: rankedJobs,
      stats: {
        total_scraped: rawJobs.length,
        platforms_used: platforms,
        ranked_shown: rankedJobs.length,
      },
    });
  } catch (error: any) {
    console.error("Job search API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
