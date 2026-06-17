-- Add service_address so the street address extracted from an uploaded bill
-- can be stored alongside the existing service_city / service_state / service_zip.
alter table public.electricity_leads add column if not exists service_address text;
