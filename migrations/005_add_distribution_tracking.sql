-- Add distribution tracking to campaigns
-- This allows tracking when payouts have been distributed to creators

alter table public.campaigns
  add column if not exists distributed boolean not null default false;

alter table public.campaigns
  add column if not exists distributed_at timestamptz;

-- Index for finding undistributed campaigns
create index if not exists idx_campaigns_distributed on public.campaigns(distributed)
  where distributed = false;

-- Comments
comment on column public.campaigns.distributed is 'Whether payouts have been distributed to creators';
comment on column public.campaigns.distributed_at is 'Timestamp when payouts were distributed';

