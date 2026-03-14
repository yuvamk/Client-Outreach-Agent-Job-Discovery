import { GoogleGenerativeAI } from "@google/generative-ai";

// Force Node.js runtime — pdf-parse uses pdfjs-dist which needs Node built-ins
export const googleAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface WorkExperience {
  company: string;
  title: string;
  duration: string;
  description: string;
}

export interface ResumeProfile {
  name: string;
  email: string;
  phone: string;
  location: string;
  key_skills: string[];
  soft_skills: string[];
  years_of_experience: number;
  job_titles: string[];
  tech_stack: string[];
  seniority_level: "Junior" | "Mid" | "Senior";
  preferred_roles: string[];
  industry_domains: string[];
  work_experience: WorkExperience[];
}

/**
 * Primary PDF text extractor — uses Gemini Vision (multimodal).
 * This is the most reliable method across all environments.
 */
async function extractWithGeminiVision(buffer: Buffer, mimeType: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: buffer.toString("base64"),
      },
    },
    {
      text: "Extract and return ALL the text content from this resume document exactly as it appears. Include every section: name, contact info, skills, experience, education, projects. Return ONLY the plain text, no formatting, no markdown, no commentary.",
    },
  ]);

  const text = result.response.text().trim();
  if (!text || text.length < 30) {
    throw new Error(
      "Could not extract text from this document. Please ensure it is a readable (not scanned) PDF or DOCX file."
    );
  }
  return text;
}

/**
 * Extract text from PDF buffer.
 * Tries pdf-parse first (fast + offline), falls back to Gemini Vision.
 */
export async function parseResumePDF(buffer: Buffer): Promise<string> {
  // Attempt 1: pdf-parse (works in standard Node.js; may fail in some envs)
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParseMod = require("pdf-parse");
    const pdfParse = typeof pdfParseMod === "function" ? pdfParseMod : (pdfParseMod.default ?? pdfParseMod);
    const data = await pdfParse(buffer, { max: 0 });
    const text = (data?.text ?? "").trim();
    if (text.length > 100) {
      console.log("[resumeParser] pdf-parse succeeded, chars:", text.length);
      return text;
    }
  } catch (err) {
    console.warn("[resumeParser] pdf-parse unavailable:", (err as Error).message);
  }

  // Attempt 2: Gemini Vision (no DOM dependencies, works everywhere)
  console.log("[resumeParser] Using Gemini Vision for PDF extraction");
  return extractWithGeminiVision(buffer, "application/pdf");
}

/**
 * Extract text from DOCX buffer.
 * Tries mammoth first, falls back to Gemini Vision.
 */
export async function parseResumeDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = (result?.value ?? "").trim();
    if (text.length > 100) {
      console.log("[resumeParser] mammoth succeeded, chars:", text.length);
      return text;
    }
  } catch (err) {
    console.warn("[resumeParser] mammoth unavailable:", (err as Error).message);
  }

  console.log("[resumeParser] Using Gemini Vision for DOCX extraction");
  return extractWithGeminiVision(
    buffer,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

/**
 * Analyse extracted resume text with Gemini and return a structured profile JSON.
 */
export async function analyzeResumeWithGemini(resumeText: string): Promise<ResumeProfile> {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

  const model = googleAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `You are a professional resume analyzer and job-matching expert.
Analyze the following resume text and extract structured information.

Resume Text:
${resumeText.slice(0, 8000)}

Return ONLY a valid JSON object with this exact structure:
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1 234 567 8900",
  "location": "New York, USA",
  "key_skills": ["skill1", "skill2"],
  "soft_skills": ["communication", "leadership"],
  "years_of_experience": 3,
  "job_titles": ["Software Engineer", "Frontend Developer"],
  "tech_stack": ["React", "Node.js", "TypeScript"],
  "seniority_level": "Mid",
  "preferred_roles": ["Full Stack Developer", "Frontend Engineer"],
  "industry_domains": ["SaaS", "FinTech"],
  "work_experience": [
    {
      "company": "Tech Corp",
      "title": "Senior Developer",
      "duration": "2021 - Present",
      "description": "Developed high-performance web applications using React and Node.js."
    }
  ]
}

Rules:
- seniority_level must be exactly one of: "Junior", "Mid", "Senior"
- years_of_experience must be a number
- All arrays must contain strings
- Return ONLY the JSON, no markdown, no code fences, no explanation`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  // Strip ```json ... ``` fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Gemini response");

  return JSON.parse(jsonMatch[0]) as ResumeProfile;
}
