import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildScraperTasks, RawJob } from "./jobScraper";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface SearchStrategy {
  waveNumber: number;
  tasks: {
    platform: string;
    keywords: string;
    description: string;
  }[];
  reasoning: string;
}

export class AutonomousSearchManager {
  private role: string;
  private location: string;
  private onProgress?: (msg: string) => void;

  constructor(role: string, location: string, onProgress?: (msg: string) => void) {
    this.role = role;
    this.location = location;
    this.onProgress = onProgress;
  }

  /**
   * Plans a search strategy using Gemini
   */
  async planStrategy(wave: number, previousResultsSummary?: string): Promise<SearchStrategy> {
    this.onProgress?.(`Planning search strategy for Wave ${wave}...`);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
      You are an Autonomous Job Search Orchestrator. 
      Target Role: "${this.role}"
      Target Location: "${this.location}"
      Current Wave: ${wave}
      
      ${previousResultsSummary ? `Previous Results Summary: ${previousResultsSummary}` : ""}

      Plan a search strategy for this wave. Choose 3-5 platform tasks.
      For each task, provide:
      1. Platform ID (one of: remotive, remoteok, jobicy, arbeitnow, weworkremotely, themuse, findwork, hn, adzuna, jsearch, google)
      2. Specific keywords or search variations to use (creative directions)
      3. A brief reason for this task.

      Constraint: Do not repeat exact keyword/platform combinations from previous waves.
      
      CRITICAL FOR GOOGLE SEARCH:
      - Do NOT use site-specific filters like "site:linkedin.com" or "site:indeed.com".
      - Aim for "Deep Discovery": Find company domains directly.
      - Use broad searches like "AI startups [Role]" or "companies building [Tech]".
      - The goal is to find company career pages, NOT job board listings.
      
      Output ONLY a valid JSON object:
      {
        "waveNumber": ${wave},
        "tasks": [
          { "platform": "platform_id", "keywords": "broad discovery keywords", "description": "reasoning" }
        ],
        "reasoning": "overall strategy for this wave"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in AI response");
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("Strategy Planning Error:", err);
      // Fallback strategy if AI fails
      return {
        waveNumber: wave,
        tasks: [
          { platform: "google", keywords: `${this.role} ${this.location}`, description: "Basic search fallback" },
          { platform: "remoteok", keywords: this.role, description: "Niche fallback" }
        ],
        reasoning: "Fallback strategy due to AI planning error."
      };
    }
  }

  /**
   * Executes a wave of search tasks
   */
  async executeWave(strategy: SearchStrategy): Promise<RawJob[]> {
    this.onProgress?.(`🚀 Beginning Wave ${strategy.waveNumber}: ${strategy.reasoning}`);
    
    const allJobs: RawJob[] = [];
    
    for (const task of strategy.tasks) {
      this.onProgress?.(`📡 Task: [${task.platform}] searching for "${task.keywords}"...`);
      try {
        const scraperTasks = buildScraperTasks(task.keywords, this.location, [task.platform], (m) => this.onProgress?.(`  [${task.platform}] ${m}`));
        const results = await Promise.allSettled(scraperTasks.map(t => t.fn()));
        
        for (const res of results) {
          if (res.status === "fulfilled") {
            allJobs.push(...res.value);
          }
        }
      } catch (err) {
        this.onProgress?.(`⚠️ Task [${task.platform}] failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }
    
    return allJobs;
  }
}
