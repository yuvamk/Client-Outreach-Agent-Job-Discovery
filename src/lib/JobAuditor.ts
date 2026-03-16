import { RawJob } from "./jobScraper";

export interface AuditResult {
  isValid: boolean;
  score: number;
  flags: string[];
  sanitizedDescription?: string;
}

export class JobAuditor {
  /**
   * Audits a job for quality and completeness
   */
  static async audit(job: RawJob): Promise<AuditResult> {
    const flags: string[] = [];
    let score = 100;

    // 1. Check for thin content
    if (job.job_description.length < 200) {
      flags.push("Thin content (description too short)");
      score -= 30;
    }

    // 2. Check for missing critical info
    if (!job.apply_link || job.apply_link.includes("data:image")) {
      flags.push("Invalid application link");
      score -= 50;
    }

    if (!job.company || job.company.toLowerCase() === "unknown") {
      flags.push("Unknown company");
      score -= 20;
    }

    // 3. Check for "junk" titles
    const junkKeywords = ["scam", "test", "demo", "placeholder"];
    if (junkKeywords.some(k => job.title.toLowerCase().includes(k))) {
      flags.push("Suspicious title keywords");
      score -= 40;
    }

    // 4. Check for broken or internal links
    if (job.apply_link && (job.apply_link.startsWith("/") || job.apply_link.startsWith("mailto:"))) {
      flags.push("Non-direct application link (internal or email)");
      score -= 10;
    }

    return {
      isValid: score > 40,
      score: Math.max(0, score),
      flags,
      sanitizedDescription: job.job_description.trim()
    };
  }

  /**
   * Sanitizes a batch of jobs
   */
  static async auditBatch(jobs: RawJob[]): Promise<RawJob[]> {
    const results = await Promise.all(jobs.map(async j => {
      const audit = await this.audit(j);
      if (!audit.isValid) return null;
      return {
        ...j,
        job_description: audit.sanitizedDescription || j.job_description
      };
    }));

    return results.filter((j): j is RawJob => j !== null);
  }
}
