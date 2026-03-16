import { GoogleGenerativeAI } from "@google/generative-ai";
import { RawJob } from "./jobScraper";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface CareerPageDiscovery {
  careersUrl: string;
  confidence: number;
  reasoning: string;
}

export class SmartCareerParser {
  /**
   * Uses AI to find the "Careers" or "Jobs" link from a home page's HTML
   */
  static async findCareersLink(html: string, baseUrl: string): Promise<string | null> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Process only the top portion of HTML to find navigation links and save tokens
    const snippet = html.slice(0, 10000); 
    
    const prompt = `
      Given the HTML snippet of a company's homepage, find the most likely URL for their "Careers", "Jobs", or "Work With Us" page.
      Base URL: ${baseUrl}
      
      Look for <a> tags with text like "Careers", "Jobs", "Join Us", "Openings", etc.
      Return ONLY a JSON object:
      {
        "careersUrl": "absolute_url",
        "confidence": 0.95,
        "reasoning": "Found in main navigation"
      }
      If not found, return {"careersUrl": null}.
      
      HTML:
      ${snippet}
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text) as CareerPageDiscovery;
      
      if (parsed.careersUrl && !parsed.careersUrl.startsWith("http")) {
        // Resolve relative URL
        try {
          const url = new URL(parsed.careersUrl, baseUrl);
          return url.toString();
        } catch { return null; }
      }
      return parsed.careersUrl;
    } catch (err) {
      console.error("Link Discovery Error:", err);
      return null;
    }
  }

  /**
   * Uses AI to extract job listings from a career page's HTML
   */
  static async extractJobs(html: string, sourceUrl: string, companyName: string): Promise<RawJob[]> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    // Process a larger chunk for the career page but still cap it
    const snippet = html.slice(0, 25000);
    
    const prompt = `
      You are an expert at extracting job listings from HTML. 
      Company: ${companyName}
      Source URL: ${sourceUrl}

      Identify all open job roles listed in the HTML snippet. For each job, extract:
      - Title
      - Location
      - Application Link (The direct link to apply or see details)
      - Brief Description/Snippet

      Return ONLY a JSON object with this structure:
      {
        "jobs": [
          { "title": "...", "location": "...", "link": "...", "description": "..." }
        ]
      }
      
      HTML:
      ${snippet}
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      const data = JSON.parse(text);
      
      if (!data.jobs || !Array.isArray(data.jobs)) return [];
      
      return data.jobs.map((j: any): RawJob => ({
        title: j.title || "Unknown Position",
        company: companyName,
        location: j.location || "Remote/Unspecified",
        posted_date: "Recently",
        posted_timestamp: Date.now(),
        skills_required: [],
        job_description: j.description || "No description provided.",
        apply_link: j.link && j.link.startsWith("http") ? j.link : new URL(j.link || "", sourceUrl).toString(),
        source_platform: "Direct Website",
        job_type: "Full-time",
      }));
    } catch (err) {
      console.error("Job Extraction Error:", err);
      return [];
    }
  }
}
