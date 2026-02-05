create extension if not exists "uuid-ossp";

create table if not exists public.sources (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('rss', 'url')),
  url text not null,
  label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid references public.sources(id) on delete set null,
  url text not null,
  title_en text,
  title_ge text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  raw_html text,
  extracted_text text,
  brief_en text,
  brief_ge text,
  article_en text,
  article_ge text,
  llm_json jsonb,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sources_user_id_idx on public.sources(user_id);
create index if not exists articles_user_id_idx on public.articles(user_id);
create index if not exists articles_url_idx on public.articles(url);
create index if not exists articles_status_idx on public.articles(status);
create index if not exists jobs_status_idx on public.jobs(status);

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.jobs enable row level security;

create policy "sources_select_own" on public.sources
  for select using (auth.uid() = user_id);
create policy "sources_insert_own" on public.sources
  for insert with check (auth.uid() = user_id);
create policy "sources_update_own" on public.sources
  for update using (auth.uid() = user_id);
create policy "sources_delete_own" on public.sources
  for delete using (auth.uid() = user_id);

create policy "articles_select_own" on public.articles
  for select using (auth.uid() = user_id);
create policy "articles_insert_own" on public.articles
  for insert with check (auth.uid() = user_id);
create policy "articles_update_own" on public.articles
  for update using (auth.uid() = user_id);
create policy "articles_delete_own" on public.articles
  for delete using (auth.uid() = user_id);

create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);
create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id);
create policy "jobs_delete_own" on public.jobs
  for delete using (auth.uid() = user_id);
