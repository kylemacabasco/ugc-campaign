-- Campaigns table
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  
  title text not null,
  description text,
  
  campaign_amount numeric not null check (campaign_amount > 0),
  rate_per_1k_views numeric not null check (rate_per_1k_views > 0),
  
  status text not null default 'inactive' check (status in ('inactive', 'active', 'completed', 'cancelled')),
  
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaigns enable row level security;

-- RLS policies for campaigns
drop policy if exists "campaigns: read all" on public.campaigns;
create policy "campaigns: read all"
  on public.campaigns for select
  using (true);

drop policy if exists "campaigns: insert" on public.campaigns;
create policy "campaigns: insert"
  on public.campaigns for insert
  with check (true);

drop policy if exists "campaigns: update" on public.campaigns;
create policy "campaigns: update"
  on public.campaigns for update
  using (true);

-- Trigger for updated_at
drop trigger if exists trg_campaigns_touch on public.campaigns;
create trigger trg_campaigns_touch
  before update on public.campaigns
  for each row execute function update_updated_at_column();

-- Indexes
create index if not exists idx_campaigns_creator on public.campaigns(creator_id);
create index if not exists idx_campaigns_status on public.campaigns(status);

-- Submissions table
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  
  video_url text not null,
  platform text not null default 'youtube' check (platform = 'youtube'),
  
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  validation_notes text,
  
  view_count bigint default 0,
  earned_amount numeric default 0,
  
  metadata jsonb default '{}'::jsonb,
  
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
comment on table public.campaigns is 'UGC campaigns with funding and view-based payouts';
comment on table public.submissions is 'Video submissions to campaigns (YouTube only)';
