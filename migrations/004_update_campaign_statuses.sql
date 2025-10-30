-- Update campaign status values to use draft/active/ended instead of inactive/active/completed
-- This migration changes the status column to support the new campaign funding flow

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

-- Comment
comment on column public.campaigns.status is 'Campaign status: draft (not funded), active (funded and live), ended (completed), cancelled';

