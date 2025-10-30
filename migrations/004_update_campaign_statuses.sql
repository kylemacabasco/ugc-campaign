-- Update campaign status values to use draft/active/ended instead of inactive/active/completed
-- This migration changes the status column to support the new campaign funding flow
-- Also adds transaction tracking for campaign funding

-- First, drop the existing check constraint
alter table public.campaigns 
  drop constraint if exists campaigns_status_check;

-- Update existing campaigns to use new status values
update public.campaigns
  set status = 'draft' where status = 'inactive';

update public.campaigns
  set status = 'ended' where status = 'completed';

-- Add the new check constraint with updated values
alter table public.campaigns
  add constraint campaigns_status_check 
  check (status in ('draft', 'active', 'ended', 'cancelled'));

-- Update the default value for new campaigns
alter table public.campaigns
  alter column status set default 'draft';

-- Add funding transaction tracking columns
alter table public.campaigns
  add column if not exists funding_tx_signature text;

alter table public.campaigns
  add column if not exists funded_at timestamptz;

-- Add index for transaction signature lookups
create index if not exists idx_campaigns_funding_tx on public.campaigns(funding_tx_signature)
  where funding_tx_signature is not null;

-- Comments
comment on column public.campaigns.status is 'Campaign status: draft (not funded), active (funded and live), ended (completed), cancelled';
comment on column public.campaigns.funding_tx_signature is 'Solana transaction signature for campaign funding';
comment on column public.campaigns.funded_at is 'Timestamp when campaign was funded';

