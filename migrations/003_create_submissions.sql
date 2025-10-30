-- Submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  
  video_url text not null,
  platform text not null default 'youtube' check (platform = 'youtube'),
  
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  
  view_count bigint default 0,
  earned_amount numeric default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint submissions_unique_video_per_campaign unique (campaign_id, user_id, video_url)
);

alter table public.submissions enable row level security;

-- RLS policies for submissions
drop policy if exists "submissions: read all" on public.submissions;
create policy "submissions: read all"
  on public.submissions for select
  using (true);

drop policy if exists "submissions: insert" on public.submissions;
create policy "submissions: insert"
  on public.submissions for insert
  with check (true);

drop policy if exists "submissions: update" on public.submissions;
create policy "submissions: update"
  on public.submissions for update
  using (true);

-- Trigger for updated_at
drop trigger if exists trg_submissions_touch on public.submissions;
create trigger trg_submissions_touch
  before update on public.submissions
  for each row execute function update_updated_at_column();

-- Indexes
create index if not exists idx_submissions_campaign on public.submissions(campaign_id);
create index if not exists idx_submissions_user on public.submissions(user_id);
create index if not exists idx_submissions_status on public.submissions(status);

-- Comments
comment on table public.submissions is 'Video submissions to campaigns (YouTube only)';

