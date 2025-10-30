-- Add ended_at timestamp to track when campaigns end
-- This enables auto-distribution 24 hours after campaign ends

alter table public.campaigns
  add column if not exists ended_at timestamptz;

-- Create index for finding recently ended campaigns
create index if not exists idx_campaigns_ended_at on public.campaigns(ended_at)
  where ended_at is not null and distributed = false;

-- Comments
comment on column public.campaigns.ended_at is 'Timestamp when campaign status changed to ended';
