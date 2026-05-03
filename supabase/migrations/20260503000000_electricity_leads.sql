-- electricity_leads: stores lead form submissions from powerdoneright.com
create table if not exists electricity_leads (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz default now(),
  name                  text not null,
  email                 text not null,
  phone                 text,
  property_name         text,
  monthly_bill_estimate numeric,
  service_zip           text,
  source                text default 'power-done-right',
  status                text default 'new'
);

-- Enable RLS
alter table electricity_leads enable row level security;

-- Allow anonymous (public) inserts — the site submits without auth
create policy "anon can insert leads"
  on electricity_leads
  for insert
  to anon
  with check (true);
