import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const runtime = 'nodejs';

export interface TailoredResume {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    location?: string;
  };
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    location?: string;
    bullets: string[];
  }>;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    gpa?: string;
  }>;
  skills: {
    technical: string[];
    soft?: string[];
    tools?: string[];
  };
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
    link?: string;
  }>;
  certifications?: string[];
  tailoring_notes: string; // what was changed and why
}

export async function POST(req: NextRequest) {
  try {
    const { resumeText, job } = await req.json() as {
      resumeText: string;
      job: {
        title: string;
        company: string;
        job_description: string;
        skills_required?: string[];
        experience_required?: string;
      };
    };

    if (!resumeText || !job) {
      return NextResponse.json({ error: 'resumeText and job are required' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert resume writer and career coach. 
Your task is to tailor a resume specifically for the following job, while keeping it 100% truthful — only reorganize, emphasize, and rephrase existing content to better match the job requirements. Do NOT fabricate experience, skills, or credentials.

## Target Job
Title: ${job.title}
Company: ${job.company}
Required Skills: ${(job.skills_required || []).join(', ')}
Experience Required: ${job.experience_required || 'Not specified'}

## Job Description
${job.job_description.slice(0, 3000)}

## Original Resume
${resumeText.slice(0, 6000)}

## Instructions
1. Extract ALL information from the original resume (name, contact, experience, education, etc.)
2. Rewrite the professional SUMMARY to directly address this job's requirements
3. Reorder bullet points in each experience role to lead with the most relevant achievements for this job
4. Add/emphasize skills that match the job description keywords
5. Keep all dates, companies, and facts exactly as in the original
6. Write a brief "tailoring_notes" explaining what you changed and why

Return ONLY a valid JSON object with this exact structure:
{
  "name": "Full Name",
  "contact": { "email": "", "phone": "", "linkedin": "", "github": "", "website": "", "location": "" },
  "summary": "2-3 sentence professional summary tailored to this role",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2022 – Present",
      "location": "City, Country",
      "bullets": ["Achievement or responsibility rewritten to highlight relevant skills..."]
    }
  ],
  "education": [
    { "degree": "B.Tech Computer Science", "institution": "University Name", "year": "2020", "gpa": "8.5/10" }
  ],
  "skills": {
    "technical": ["React", "Node.js"],
    "tools": ["Git", "Docker"],
    "soft": ["Leadership", "Communication"]
  },
  "projects": [
    { "name": "Project Name", "description": "What it does", "technologies": ["React"], "link": "" }
  ],
  "certifications": ["AWS Certified Developer"],
  "tailoring_notes": "Explanation of changes made to customize this resume for the role"
}

Return ONLY the JSON, no markdown fences, no commentary.`;

    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();

    // Strip code fences if present
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse AI response as JSON');

    const tailored: TailoredResume = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ success: true, tailored });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[resume/tailor]', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
