Build a V1 web app called “ECAG News Processor” that replaces my Make.com scenario.

Tech stack:
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres) OR Clerk+Postgres (pick Supabase for speed)
- Background jobs: use a simple queue approach (Supabase table-based job queue + cron-like polling worker route, or Vercel Cron hitting an API route). Keep it simple and reliable.
- LLM: OpenAI API (single model), output must be strict JSON.

Core V1 scope (do not add extra features):
1) Auth
- Email/password auth via Supabase.
- Only logged-in users can access the app.

2) Sources
- A “Sources” page where user can add:
  - RSS feed URL OR a single website/article URL
  - Optional label/name
- List sources with status (active/inactive). Allow toggle active.
- Minimal validation: must be a valid URL.

3) Fetch + Process
- A “Run” button on each source and a global “Run all active sources”.
- For RSS sources: fetch latest items (limit 5 per run), dedupe by URL.
- For single URL sources: process that URL.
- For each URL:
  - Fetch HTML
  - Extract main article content (use a lightweight readability approach; choose one library and implement server-side)
  - Generate:
    - title_en
    - brief_en (3–4 sentences)
    - article_en (250–400 words) with section titles as plain text lines (NO Markdown symbols), paragraphs separated by blank lines, and Key takeaways as lines starting with “- ”
    - title_ge, brief_ge, article_ge (Georgian translations)
    - source_url
  - Hard rules for LLM:
    - Use ONLY facts present in extracted text
    - Keep ALL numbers exactly unchanged (digits, %, currencies, ranges)
    - If unsure, omit
    - No emojis, no hashtags
    - Return ONLY valid JSON with fixed keys

4) Storage
- Save raw_html, extracted_text, and final_json output for every processed URL.
- Show processing status: queued / processing / done / failed with error message.
- Dedupe: do not reprocess same URL if already processed unless user clicks “Re-run”.

5) Results UI
- “Articles” page: list processed items (title, source, date, status).
- Article detail page shows:
  - Source link
  - Show English: brief + article
  - Divider
  - Show Georgian: brief + article
- Add “Download” buttons:
  - Download as .docx (generated server-side)
  - Download as .md (simple)
(If docx is too much, do .md only, but try docx.)

6) Jobs
- Implement a minimal job queue:
  - Table “jobs” (id, type, payload, status, attempts, last_error, created_at, updated_at)
  - When user clicks Run, enqueue jobs.
  - Worker endpoint processes N jobs per call.
  - Add Vercel Cron config to call worker every 5 minutes.
- Rate limiting / safety:
  - Process max 3 articles per worker run.
  - Retry failed jobs up to 2 times.

Database schema (Supabase SQL) must be included:
- sources: id, user_id, type (rss|url), url, label, is_active, created_at
- articles: id, user_id, source_id nullable, url, title_en, title_ge, status, raw_html, extracted_text, brief_en, brief_ge, article_en, article_ge, llm_json, error, created_at, updated_at
- jobs: as above

Deliverables:
- Full Next.js project code with clear folder structure.
- Supabase SQL migrations.
- Environment variables template (.env.example).
- Minimal UI, clean and functional (no overdesign).
- README with setup steps and how to deploy on Vercel + Supabase.

Do NOT:
- Add analytics, roles, teams, multi-tenant orgs, approvals, tagging, scheduling beyond the cron worker.
- Add complex RSS UI. Keep it basic.
- Add anything not required for the above.

Start by scaffolding the project and schema, then implement API routes, then UI pages.
