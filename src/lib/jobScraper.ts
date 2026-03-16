export interface RawJob {
  title: string;
  company: string;
  location: string;
  posted_date: string;
  posted_timestamp?: number;
  applicant_count?: number;
  experience_required?: string;
  salary?: string;
  skills_required: string[];
  job_description: string;
  apply_link: string;
  source_platform: string;
  job_type: string;
  is_vibe_coder_friendly?: boolean;
}

import { SmartCareerParser } from "./SmartCareerParser";

const VIBE_CODER_KEYWORDS = [
  "ai developer", "prompt engineer", "llm engineer", "ai-assisted",
  "vibe coding", "no-code", "low-code", "cursor", "replit", "bolt",
  "ai tools", "gpt", "claude", "gemini", "copilot", "automation engineer",
  "ai workflow", "agent builder", "ai product", "langchain", "openai",
  "machine learning", "generative ai", "large language model", "fine-tuning",
];

export function isVibeCoderFriendly(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase();
  return VIBE_CODER_KEYWORDS.some((kw) => text.includes(kw));
}

export function parsePostedDate(dateStr: string): number {
  const now = Date.now();
  if (!dateStr) return now - 7 * 24 * 60 * 60 * 1000;
  const lower = dateStr.toLowerCase();
  if (lower.includes("hour") || lower.includes("just now") || lower.includes("today")) {
    const hours = parseInt(lower.match(/(\d+)\s*hour/)?.[1] || "1");
    return now - hours * 60 * 60 * 1000;
  }
  if (lower.includes("day")) {
    const days = parseInt(lower.match(/(\d+)\s*day/)?.[1] || "1");
    return now - days * 24 * 60 * 60 * 1000;
  }
  if (lower.includes("week")) {
    const weeks = parseInt(lower.match(/(\d+)\s*week/)?.[1] || "1");
    return now - weeks * 7 * 24 * 60 * 60 * 1000;
  }
  if (lower.includes("month")) {
    const months = parseInt(lower.match(/(\d+)\s*month/)?.[1] || "1");
    return now - months * 30 * 24 * 60 * 60 * 1000;
  }
  const dateMs = Date.parse(dateStr);
  if (!isNaN(dateMs)) return dateMs;
  return now - 3 * 24 * 60 * 60 * 1000;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 2000);
}

function relativeDate(ts: number): string {
  const diffMs = Date.now() - ts;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ── 1. Remotive API ───────────────────────────────────────────────────────────
async function scrapeRemotive(role: string): Promise<RawJob[]> {
  try {
    const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(role)}&limit=50`;
    const res = await fetch(url, { headers: { "User-Agent": "KineticJobsBot/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((j: Record<string, unknown>): RawJob => ({
      title: String(j.title || ""),
      company: String(j.company_name || ""),
      location: String(j.candidate_required_location || "Remote"),
      posted_date: j.publication_date ? relativeDate(Date.parse(String(j.publication_date))) : "Recently",
      posted_timestamp: j.publication_date ? Date.parse(String(j.publication_date)) : Date.now(),
      salary: j.salary ? String(j.salary) : undefined,
      skills_required: Array.isArray(j.tags) ? (j.tags as string[]) : [],
      job_description: stripHtml(String(j.description || "")),
      apply_link: String(j.url || ""),
      source_platform: "Remotive",
      job_type: String(j.job_type || "Full-time"),
      is_vibe_coder_friendly: isVibeCoderFriendly(String(j.title || ""), String(j.description || "")),
    }));
  } catch { return []; }
}

// ── 2. RemoteOK API ──────────────────────────────────────────────────────────
async function scrapeRemoteOK(role: string): Promise<RawJob[]> {
  try {
    const tag = encodeURIComponent(role.toLowerCase().replace(/\s+/g, "-"));
    const url = `https://remoteok.com/api?tag=${tag}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "KineticJobsBot/1.0", "Accept": "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = Array.isArray(data) ? data.filter((j: Record<string, unknown>) => j.position) : [];
    return jobs.slice(0, 40).map((j: Record<string, unknown>): RawJob => {
      const ts = j.date ? Date.parse(String(j.date)) : Date.now();
      const tags: string[] = Array.isArray(j.tags) ? (j.tags as string[]) : [];
      return {
        title: String(j.position || ""),
        company: String(j.company || ""),
        location: "Remote",
        posted_date: relativeDate(ts),
        posted_timestamp: ts,
        salary: j.salary ? String(j.salary) : undefined,
        skills_required: tags,
        job_description: stripHtml(String(j.description || "")),
        apply_link: String(j.url || j.apply_url || `https://remoteok.com/l/${j.id || ""}`),
        source_platform: "RemoteOK",
        job_type: "Full-time",
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.position || ""), String(j.description || "")),
      };
    });
  } catch { return []; }
}

// ── 3. Jobicy API ─────────────────────────────────────────────────────────────
async function scrapeJobicy(role: string): Promise<RawJob[]> {
  try {
    const keyword = encodeURIComponent(role);
    const url = `https://jobicy.com/api/v2/remote-jobs?count=50&tag=${keyword}&jobType=full-time`;
    const res = await fetch(url, { headers: { "User-Agent": "KineticJobsBot/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.jobs || []).map((j: Record<string, unknown>): RawJob => {
      const ts = j.pubDate ? Date.parse(String(j.pubDate)) : Date.now();
      return {
        title: String(j.jobTitle || ""),
        company: String(j.companyName || ""),
        location: String(j.jobGeo || "Remote"),
        posted_date: relativeDate(ts),
        posted_timestamp: ts,
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin}–$${j.annualSalaryMax} ${j.salaryCurrency || ""}`.trim() : undefined,
        skills_required: Array.isArray(j.jobIndustry) ? (j.jobIndustry as string[]) : [],
        job_description: stripHtml(String(j.jobDescription || j.jobExcerpt || "")),
        apply_link: String(j.url || ""),
        source_platform: "Jobicy",
        job_type: String(j.jobType || "Full-time"),
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.jobTitle || ""), String(j.jobDescription || "")),
      };
    });
  } catch { return []; }
}

// ── 4. Arbeitnow API ─────────────────────────────────────────────────────────
async function scrapeArbeitnow(role: string): Promise<RawJob[]> {
  try {
    const url = `https://www.arbeitnow.com/api/job-board-api?search=${encodeURIComponent(role)}`;
    const res = await fetch(url, { headers: { "User-Agent": "KineticJobsBot/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).slice(0, 40).map((j: Record<string, unknown>): RawJob => {
      const ts = j.created_at ? (Number(j.created_at) * 1000) : Date.now();
      const tags: string[] = Array.isArray(j.tags) ? (j.tags as string[]) : [];
      return {
        title: String(j.title || ""),
        company: String(j.company_name || ""),
        location: j.remote ? "Remote" : String(j.location || ""),
        posted_date: relativeDate(ts),
        posted_timestamp: ts,
        skills_required: tags,
        job_description: stripHtml(String(j.description || "")),
        apply_link: String(j.url || ""),
        source_platform: "Arbeitnow",
        job_type: String((j.job_types as string[])?.[0] || "Full-time"),
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.title || ""), String(j.description || "")),
      };
    });
  } catch { return []; }
}

// ── 5. The Muse API ───────────────────────────────────────────────────────────
async function scrapeTheMuse(role: string): Promise<RawJob[]> {
  try {
    const url = `https://www.themuse.com/api/public/jobs?page=1&descending=true&query=${encodeURIComponent(role)}&location=Flexible+%2F+Remote`;
    const res = await fetch(url, { headers: { "User-Agent": "KineticJobsBot/1.0" }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 30).map((j: Record<string, unknown>): RawJob => {
      const ts = j.publication_date ? Date.parse(String(j.publication_date)) : Date.now();
      const locations = Array.isArray(j.locations) ? (j.locations as Array<{ name: string }>).map(l => l.name).join(", ") : "Remote";
      const company = (j.company as Record<string, unknown>);
      const refs = (j.refs as Record<string, unknown>) || {};
      return {
        title: String(j.name || ""),
        company: String(company?.name || ""),
        location: locations || "Remote",
        posted_date: relativeDate(ts),
        posted_timestamp: ts,
        skills_required: [],
        job_description: stripHtml(String(j.contents || "")),
        apply_link: String(refs?.landing_page || j.refs || ""),
        source_platform: "The Muse",
        job_type: String((j.type as string) || "Full-time"),
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.name || ""), String(j.contents || "")),
      };
    });
  } catch { return []; }
}

// ── 6. We Work Remotely RSS ───────────────────────────────────────────────────
async function scrapeWeWorkRemotely(role: string): Promise<RawJob[]> {
  try {
    const rssUrl = `https://weworkremotely.com/remote-jobs/search.rss?term=${encodeURIComponent(role)}`;
    const res = await fetch(rssUrl, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    return items.slice(0, 30).map((item): RawJob => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || "Unknown";
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || item.match(/https:\/\/weworkremotely\.com[^\s<]*/)?.[0] || "";
      const description = item.match(/<description><!\[CDATA\[([\.\s\S]*?)\]\]><\/description>/)?.[1] || "";
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || "";
      const titleParts = title.split(": ");
      const company = titleParts.length > 1 ? titleParts[0].trim() : "Unknown";
      const jobTitle = titleParts.length > 1 ? titleParts.slice(1).join(": ").trim() : title;
      const cleanDesc = stripHtml(description);
      const ts = pubDate ? Date.parse(pubDate) : Date.now() - 2 * 24 * 60 * 60 * 1000;
      return {
        title: jobTitle, company, location: "Remote",
        posted_date: relativeDate(ts), posted_timestamp: ts,
        skills_required: [], job_description: cleanDesc,
        apply_link: link.startsWith("http") ? link : `https://weworkremotely.com${link}`,
        source_platform: "We Work Remotely", job_type: "Full-time",
        is_vibe_coder_friendly: isVibeCoderFriendly(jobTitle, cleanDesc),
      };
    });
  } catch { return []; }
}

// ── 7. Findwork.dev API ───────────────────────────────────────────────────────
async function scrapeFindwork(role: string): Promise<RawJob[]> {
  try {
    const url = `https://findwork.dev/api/jobs/?search=${encodeURIComponent(role)}&remote=true&order_by=-date`;
    const res = await fetch(url, {
      headers: { "User-Agent": "KineticJobsBot/1.0", "Authorization": `Token ${process.env.FINDWORK_API_KEY || ""}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 30).map((j: Record<string, unknown>): RawJob => {
      const ts = j.date_posted ? Date.parse(String(j.date_posted)) : Date.now();
      const keywords: string[] = Array.isArray(j.keywords) ? (j.keywords as string[]) : [];
      return {
        title: String(j.role || ""),
        company: String(j.company_name || ""),
        location: j.remote ? "Remote" : String(j.location || ""),
        posted_date: relativeDate(ts), posted_timestamp: ts,
        skills_required: keywords,
        job_description: keywords.join(", "),
        apply_link: String(j.url || ""),
        source_platform: "Findwork",
        job_type: "Full-time",
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.role || ""), keywords.join(" ")),
      };
    });
  } catch { return []; }
}

// ── 8. Adzuna API ─────────────────────────────────────────────────────────────
async function scrapeAdzuna(role: string, location: string): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return [];
  try {
    const country = "gb"; // UK has broadest coverage; use "us" for US-focused
    const loc = location && location.toLowerCase() !== "remote" ? `&where=${encodeURIComponent(location)}` : "";
    const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${apiKey}&results_per_page=50&what=${encodeURIComponent(role)}&content-type=application/json${loc}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((j: Record<string, unknown>): RawJob => {
      const ts = j.created ? Date.parse(String(j.created)) : Date.now();
      const company = (j.company as Record<string, unknown>) || {};
      const category = (j.category as Record<string, unknown>) || {};
      const loc2 = (j.location as Record<string, unknown>) || {};
      return {
        title: String(j.title || ""),
        company: String(company.display_name || ""),
        location: String(loc2.display_name || ""),
        posted_date: relativeDate(ts), posted_timestamp: ts,
        salary: j.salary_min ? `£${j.salary_min}–£${j.salary_max}`.trim() : undefined,
        skills_required: [String(category.label || "")].filter(Boolean),
        job_description: stripHtml(String(j.description || "")),
        apply_link: String(j.redirect_url || ""),
        source_platform: "Adzuna",
        job_type: String(j.contract_type || "Full-time"),
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.title || ""), String(j.description || "")),
      };
    });
  } catch { return []; }
}

// ── 9. JSearch (RapidAPI — LinkedIn/Indeed/Glassdoor/Naukri) ─────────────────
async function scrapeJSearch(role: string, location: string): Promise<RawJob[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) return [];
  try {
    const query = location && location.toLowerCase() !== "remote" ? `${role} in ${location}` : role;
    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.searchParams.set("query", query);
    url.searchParams.set("page", "1");
    url.searchParams.set("num_pages", "5"); // more pages = more results
    url.searchParams.set("date_posted", "week");
    const res = await fetch(url.toString(), {
      headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "jsearch.p.rapidapi.com" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map((j: Record<string, unknown>): RawJob => {
      const postedTs = j.job_posted_at_timestamp
        ? Number(j.job_posted_at_timestamp) * 1000
        : Date.parse(String(j.job_posted_at_datetime_utc || "")) || Date.now();
      const desc = stripHtml(String(j.job_description || ""));
      const skills = j.job_required_skills || (j.job_highlights as Record<string, unknown>)?.Qualifications || [];
      return {
        title: String(j.job_title || ""),
        company: String(j.employer_name || ""),
        location: j.job_is_remote ? "Remote" : `${j.job_city || ""}, ${j.job_country || ""}`.trim().replace(/^,|,$/, ""),
        posted_date: relativeDate(postedTs),
        posted_timestamp: postedTs,
        experience_required: (j.job_required_experience as Record<string, unknown>)?.required_experience_in_months
          ? `${Math.round(Number((j.job_required_experience as Record<string, unknown>).required_experience_in_months) / 12)}+ years` : undefined,
        salary: j.job_min_salary ? `${j.job_salary_currency || "$"}${j.job_min_salary}–${j.job_max_salary} ${j.job_salary_period || ""}`.trim() : undefined,
        skills_required: Array.isArray(skills) ? (skills as string[]).slice(0, 10) : [],
        job_description: desc,
        apply_link: String(j.job_apply_link || j.job_google_link || ""),
        source_platform: String(j.job_publisher || "JSearch"),
        job_type: String(j.job_employment_type || "Full-time"),
        is_vibe_coder_friendly: isVibeCoderFriendly(String(j.job_title || ""), desc),
      };
    });
  } catch { return []; }
}

// ── 10. HackerNews Who's Hiring (Algolia API) ────────────────────────────────
async function scrapeHNHiring(role: string): Promise<RawJob[]> {
  try {
    // Query HN's Algolia API for "who is hiring" posts
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(role)}&tags=comment,story_15971104,story_39peculiar&hitsPerPage=30`;
    // Use the latest Ask HN: Who's Hiring thread via Algolia
    const algoliaUrl = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(role + " | remote")}&tags=comment&numericFilters=story_id>39000000&hitsPerPage=40`;
    const res = await fetch(algoliaUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json();
    const jobs: RawJob[] = [];
    for (const hit of (data.hits || []).slice(0, 30)) {
      const text: string = String(hit.comment_text || hit.text || "");
      if (!text || text.length < 50) continue;
      const clean = stripHtml(text);
      const firstLine = clean.split("\n")[0]?.slice(0, 120) || "Developer Position";
      // Extract company (usually first word(s) before | or –)
      const company = firstLine.split(/[|–-]/)[0]?.trim() || "Unknown";
      const isRemote = /remote/i.test(clean);
      if (!isRemote && !clean.toLowerCase().includes(role.toLowerCase())) continue;
      jobs.push({
        title: firstLine.includes("|") ? firstLine.split("|")[1]?.trim() || role : role,
        company,
        location: isRemote ? "Remote" : "See posting",
        posted_date: relativeDate(hit.created_at_i ? hit.created_at_i * 1000 : Date.now()),
        posted_timestamp: hit.created_at_i ? hit.created_at_i * 1000 : Date.now(),
        skills_required: [],
        job_description: clean.slice(0, 2000),
        apply_link: `https://news.ycombinator.com/item?id=${hit.objectID}`,
        source_platform: "HackerNews Hiring",
        job_type: "Full-time",
        is_vibe_coder_friendly: isVibeCoderFriendly(firstLine, clean),
      });
    }
    return jobs;
  } catch { return []; }
}

// ── 11. Google Search (Puppeteer) ─────────────────────────────────────────────
async function scrapeGoogleJobs(role: string, location: string, onProgress?: (msg: string) => void): Promise<RawJob[]> {
  try {
    onProgress?.(`Starting Deep Career Scraper for "${role}" in "${location}"...`);

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ 
      headless: true, 
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1280,1000"] 
    });

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 1000 });
      
      // Phase 1: Discover Company Domains
      const discoverQuery = `${role} companies ${location} -site:linkedin.com -site:indeed.com -site:glassdoor.com`;
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(discoverQuery)}`, { waitUntil: "networkidle2" });
      
      // Handle consent
      try {
        const consentButton = await page.$('button[aria-label="Accept all"]');
        if (consentButton) {
          await consentButton.click();
          await page.waitForNavigation({ waitUntil: "networkidle2" });
        }
      } catch { /* ignore */ }

      onProgress?.(`Discovery page loaded. Identifying company websites...`);

      const allFoundJobs: RawJob[] = [];
      const seenDomains = new Set<string>();
      let pageNum = 0;
      const MAX_PAGES = 5; // Search up to 5 pages of Google Results per task wave

      while (pageNum < MAX_PAGES) {
        onProgress?.(`Processing Google search page ${pageNum + 1}...`);
        
        const targets = await page.evaluate(() => {
          const links: { url: string; title: string }[] = [];
          const jobBoards = ['linkedin', 'indeed', 'glassdoor', 'ziprecruiter', 'monster', 'simplyhired', 'careerbuilder', 'jooble', 'remotive', 'remoteok', 'weworkremotely', 'jobicy', 'arbeitnow', 'themuse', 'adzuna', 'jsearch', 'findwork'];
          
          document.querySelectorAll(".g a, .MjjYud a").forEach((el: any) => {
            const url = el.href;
            if (url && !url.includes("google.com") && !url.includes("social") && url.length > 10) {
              const domain = new URL(url).hostname.toLowerCase();
              const isJobBoard = jobBoards.some(board => domain.includes(board));
              if (!isJobBoard) {
                links.push({ url, title: el.querySelector("h3")?.textContent || "" });
              }
            }
          });
          return links;
        });

        for (const target of targets) {
          try {
            const domain = new URL(target.url).hostname;
            if (seenDomains.has(domain) || domain.includes("job") || domain.includes("board")) continue;
            seenDomains.add(domain);

            onProgress?.(`🕵️ Deep analyzing: ${domain}...`);
            
            const companyBaseUrl = `https://${domain}`;
            await page.goto(companyBaseUrl, { waitUntil: "networkidle2", timeout: 15000 });
            const homeHtml = await page.content();
            
            const careerUrl = await SmartCareerParser.findCareersLink(homeHtml, companyBaseUrl);
            
            if (careerUrl) {
              onProgress?.(`  🎯 Found Career Page: ${new URL(careerUrl).pathname}`);
              await page.goto(careerUrl, { waitUntil: "networkidle2", timeout: 20000 });
              await new Promise(r => setTimeout(r, 2000));
              const careerHtml = await page.content();
              
              const companyName = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
              const extracted = await SmartCareerParser.extractJobs(careerHtml, careerUrl, companyName);
              
              if (extracted.length > 0) {
                onProgress?.(`  ✅ Extracted ${extracted.length} jobs from ${domain}`);
                allFoundJobs.push(...extracted);
              }
            }
          } catch (err) {
            onProgress?.(`  ⚠️ Skip ${target.url}: ${err instanceof Error ? err.message : 'timeout'}`);
          }
        }

        // Try to go to next page
        const nextButton = await page.$('a#pnnext');
        if (nextButton) {
          await Promise.all([
            nextButton.click(),
            page.waitForNavigation({ waitUntil: "networkidle2" })
          ]);
          pageNum++;
        } else {
          break; // No more pages
        }
      }

      onProgress?.(`Deep Discovery complete. Found ${allFoundJobs.length} direct jobs.`);
      return allFoundJobs.map(j => ({
        ...j,
        is_vibe_coder_friendly: isVibeCoderFriendly(j.title, j.job_description)
      }));

    } finally {
      await browser.close();
    }
  } catch (err) { 
    onProgress?.(`❌ Google Scrape Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    return []; 
  }
}

// ── Main Scraper Orchestrator ─────────────────────────────────────────────────

export interface ScraperTask {
  id: string;
  label: string;
  fn: () => Promise<RawJob[]>;
}

export function buildScraperTasks(
  role: string,
  location: string,
  platforms: string[],
  onProgress?: (msg: string) => void
): ScraperTask[] {
  const all: ScraperTask[] = [
    { id: "remotive",       label: "Remotive",              fn: () => scrapeRemotive(role) },
    { id: "remoteok",       label: "RemoteOK",              fn: () => scrapeRemoteOK(role) },
    { id: "jobicy",         label: "Jobicy",                fn: () => scrapeJobicy(role) },
    { id: "arbeitnow",      label: "Arbeitnow",             fn: () => scrapeArbeitnow(role) },
    { id: "weworkremotely", label: "We Work Remotely",      fn: () => scrapeWeWorkRemotely(role) },
    { id: "themuse",        label: "The Muse",              fn: () => scrapeTheMuse(role) },
    { id: "findwork",       label: "Findwork.dev",          fn: () => scrapeFindwork(role) },
    { id: "hn",             label: "HackerNews Hiring",     fn: () => scrapeHNHiring(role) },
    { id: "adzuna",         label: "Adzuna",                fn: () => scrapeAdzuna(role, location) },
    { id: "jsearch",        label: "LinkedIn/Indeed (JSearch)", fn: () => scrapeJSearch(role, location) },
    { id: "google",         label: "Google Search",         fn: () => scrapeGoogleJobs(role, location, onProgress) },
  ];
  // "all" pseudo-platform means select everything
  if (platforms.includes("all")) return all;
  return all.filter(t => platforms.includes(t.id));
}

export async function scrapeJobs(
  role: string,
  location: string,
  platforms: string[],
  onProgress?: (msg: string) => void
): Promise<RawJob[]> {
  const tasks = buildScraperTasks(role, location, platforms, onProgress);
  const results = await Promise.allSettled(tasks.map(t => t.fn()));
  const allJobs: RawJob[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") allJobs.push(...result.value);
  }
  // Deduplicate by apply_link (or title+company fallback)
  const seen = new Set<string>();
  return allJobs.filter((job) => {
    const key = job.apply_link || `${job.title}__${job.company}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
