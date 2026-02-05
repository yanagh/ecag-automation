# ECAG News Processor (V1)

A minimal Next.js + Supabase app that ingests RSS or single URLs, extracts articles, and uses OpenAI to generate English + Georgian summaries and full articles. Includes a simple table-based job queue and a cron-triggered worker.

## Features
- Email/password auth (Supabase)
- Sources (RSS feeds or single URLs) with active/inactive toggle
- Manual run per source or run all active sources
- Processing pipeline: fetch HTML → extract text → LLM → store outputs
- Articles list + detail, with .md and .docx downloads
- Simple job queue + Vercel Cron worker

## Tech Stack
- Next.js (App Router) + TypeScript
- Tailwind CSS
- Supabase (Auth + Postgres)
- OpenAI API (single model)

## Setup

### 1) Install dependencies
```bash
npm install
```

### 2) Create Supabase project
- Create a new project in Supabase.
- In the SQL editor, run the migration in `supabase/migrations/0001_init.sql`.
- Enable Email/Password auth (Authentication → Providers).

### 3) Environment variables
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `WORKER_SECRET` (any strong random string)
- `NEXT_PUBLIC_SITE_URL` (for redirects; use your local or Vercel URL)

### 4) Run locally
```bash
npm run dev
```

Open `http://localhost:3000`.

## How It Works
- Sources are stored in `sources`.
- When you click **Run**, a job is enqueued in `jobs` and an article row is created in `articles` with status `queued`.
- The worker (`/api/worker`) processes up to 3 jobs per call, retries failures up to 2 times, and updates article status.

## Vercel Deployment
1. Create a new Vercel project from this repo.
2. Add all `.env.local` variables to Vercel Project Settings → Environment Variables.
3. The `vercel.json` cron will hit `/api/worker` every 5 minutes.

### Securing the worker
The worker requires a secret. Ensure the cron request includes it:
- Recommended: set a URL param in the cron path (example below), or
- Use a header `x-worker-secret` (if your cron supports headers).

To use a URL param, update the cron path in `vercel.json` after deployment:
```json
{
  "crons": [
    {
      "path": "/api/worker?secret=YOUR_SECRET",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

## Folder Structure
- `src/app` → routes, pages, API handlers
- `src/lib` → Supabase clients, queue helpers, LLM, extraction
- `supabase/migrations` → SQL schema

## Notes
- The LLM is constrained to return strict JSON only.
- Dedupe is by URL unless you click **Re-run** on an article.
- Deployment test: this line can be removed after the first Vercel build.
