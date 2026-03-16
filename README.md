# 🤖 Client Outreach Agent - Job Discovery Edition

[![Deep Discovery](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-blueviolet)](https://deepmind.google/technologies/gemini/)
[![Framework](https://img.shields.io/badge/Framework-Next.js%2015-black)](https://nextjs.org/)
[![Scraping](https://img.shields.io/badge/Engine-Puppeteer-orange)](https://pptr.dev/)
[![Database](https://img.shields.io/badge/DB-MongoDB-green)](https://www.mongodb.com/)

> **The ultimate autonomous job discovery and outreach machine.** 
> This agent doesn't just search job boards; it traverses the entire internet, finds direct company career pages, and learns your preferences in real-time.

---

## 📽️ Experience the Power
*Check out the [Walkthrough](./brain/walkthrough.md) for a deep dive into the latest agentic features.*

---

## 🚀 Elite Features

### 1. 🧠 Autonomous Strategic Orchestrator
Unlike traditional search tools, this agent uses a **Multi-Wave Strategic Brain** to plan its discovery process.
- **Wave-based Planning**: The AI plans up to 100 waves of search, adjusting keywords and platforms based on previous results.
- **Creative Directions**: It explores synonyms and related roles (e.g., "Vibe Coder", "AI Architect") to find hidden gems.
- **Self-Correction**: If a wave yields no results, the AI pivots its strategy automatically.

### 2. 🌍 Global Deep Career Scraper
Go beyond overcrowded job boards. Our **Deep Discovery Engine** finds jobs where they are born:
- **Domain Discovery**: Automatically identifies company websites matching your niche.
- **Career Page Detection**: Intelligently finds "Join Us" or "Careers" links on any domain.
- **Agentic Extraction**: Uses AI to "read" the career page HTML and extract listings, regardless of the site's layout or language.

### 3. 🧠 Instinct System (Personalized Learning)
The agent grows smarter with every interaction.
- **Historical Analysis**: Every time you save or delete a job, the agent records an **Instinct**.
- **Refined Matching**: These instincts are fed back into the AI's matching logic to ensure your recommendations evolve toward your perfect fit.

### 4. 🛡️ Automated Quality Guardrails
Never see a "junk" job again.
- **The Job Auditor**: Every listing undergoes an automated audit for broken links, thin descriptions, and suspicious content before it enters your dashboard.

---

## 🛠️ How it was Made (Tech & Architecture)

### Core Technologies
- **Frontend**: Next.js 15 (App Router) with a premium, glassmorphic UI.
- **AI Brain**: Google **Gemini 2.5 Flash** for high-speed, high-reasoning strategic planning and job matching.
- **Scraping**: A hybrid engine combining **Puppeteer** (for deep web scraping) and 10+ REST/RSS APIs (Remotive, RemoteOK, etc.).
- **Backend**: Next.js Server Actions and API Routes with SSE (Server-Sent Events) for real-time progress streaming.
- **Database**: **MongoDB** for persistent storage of jobs, resume profiles, and learned instincts.

### The Agentic Workflow
1. **Plan**: AI analyzes your profile and generates a multi-task search strategy.
2. **Execute**: The Orchestrator runs scraper tasks in parallel across Google Search and job boards.
3. **Deep Scrape**: Puppeteer navigates found company websites to extract direct listings.
4. **Audit**: The Auditor filters out low-quality results.
5. **Match**: The Matcher scores results based on your Resume + Learned Instincts.
6. **Learn**: Your feedback updates the Instinct Store, closing the loop.

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB instance (Atlas or local)
- Google AI Studio API Key (Gemini)

### Installation
1. **Clone the repo**:
   ```bash
   git clone https://github.com/yuvamk/Client-Outreach-Agent-Job-Discovery.git
   cd client-outreach-agent
   ```
2. **Setup Environment**:
   Create a `.env.local` file:
   ```env
   MONGODB_URI=your_mongodb_uri
   GEMINI_API_KEY=your_gemini_key
   ```
3. **Install & Run**:
   ```bash
   npm install
   npm run dev
   ```

---

## 🔮 Futuristic Approach
This project isn't just a tool; it's a **Living Agent**. 
- **Infinite Search**: Capable of paginating through thousands of results across the open web.
- **Zero-knowledge Extraction**: Can extract data from websites it has never encountered before using LLM reasoning.
- **Personalized Evolution**: The more you use it, the more it becomes an extension of your professional identity.

---
*Created with ❤️ by Yuvam Kumar and the Kinetic Team.*
