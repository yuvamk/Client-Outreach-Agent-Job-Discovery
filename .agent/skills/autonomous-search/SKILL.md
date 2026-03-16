# Autonomous Search Skill

Define the workflow for multi-wave job discovery.

## Workflow Phases

1. **Strategic Planning**: Identify platforms and keywords based on target role.
2. **Scraping Waves**: Deploy agents to specific platforms in waves of 3-5.
3. **Refinement Loop**: Analyze results and adjust planning for the next wave if quantity/quality is low.
4. **Final Synthesize**: Rank and deduplicate all discovered jobs.

## Invariants
- Never double-scrape the same URL in a single session.
- Always check the database for existing matches before starting AI matching.
