-- CashPulse Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)

-- ============================================================
-- USERS & AUTH (extends Supabase Auth)
-- ============================================================

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  company_name text,
  industry text,
  invoice_volume text,
  plan text default 'free' check (plan in ('free', 'starter', 'growth', 'scale')),
  paypal_subscription_id text,
  onboarded boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- INVOICES (uploaded by customers)
-- ============================================================

create table public.invoices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  invoice_number text,
  customer_name text not null,
  customer_email text,
  amount numeric(12,2) not null,
  due_date date not null,
  issue_date date,
  status text default 'unpaid' check (status in ('unpaid', 'overdue', 'partial', 'paid', 'written_off')),
  days_overdue integer default 0,
  risk_score numeric(3,1) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.invoices enable row level security;

create policy "Users can manage own invoices"
  on public.invoices for all
  using (auth.uid() = user_id);

create index idx_invoices_user on public.invoices(user_id);
create index idx_invoices_status on public.invoices(status);


-- ============================================================
-- EMAIL LOG (all sent emails tracked)
-- ============================================================

create table public.email_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  invoice_id uuid references public.invoices(id) on delete set null,
  to_email text not null,
  subject text not null,
  body text not null,
  email_type text check (email_type in ('reminder', 'followup', 'escalation', 'final', 'cold_outreach')),
  status text default 'sent' check (status in ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  sent_at timestamptz default now()
);

alter table public.email_log enable row level security;

create policy "Users can view own emails"
  on public.email_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own emails"
  on public.email_log for insert
  with check (auth.uid() = user_id);


-- ============================================================
-- LEADS (for our sales agent)
-- ============================================================

create table public.leads (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  contact_name text,
  contact_email text unique,
  contact_title text,
  industry text,
  employee_count integer,
  website text,
  score integer default 0,
  stage text default 'new' check (stage in ('new', 'contacted', 'replied', 'trial', 'customer', 'lost')),
  source text default 'apollo',
  sequence_step integer default 0,
  last_contacted_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- No RLS on leads — only accessed by server-side sales agent
create index idx_leads_stage on public.leads(stage);
create index idx_leads_score on public.leads(score desc);
create index idx_leads_email on public.leads(contact_email);
create index idx_leads_sequence on public.leads(stage, sequence_step, last_contacted_at);


-- ============================================================
-- LEAD ACTIVITY LOG
-- ============================================================

create table public.lead_activity (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.leads(id) on delete cascade not null,
  action text not null,
  details text,
  created_at timestamptz default now()
);

create index idx_lead_activity_lead on public.lead_activity(lead_id);


-- ============================================================
-- SUBSCRIPTIONS (PayPal webhook data)
-- ============================================================

create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  paypal_subscription_id text unique not null,
  plan text not null check (plan in ('starter', 'growth', 'scale')),
  status text default 'active' check (status in ('active', 'cancelled', 'suspended', 'expired')),
  amount numeric(8,2),
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create index idx_subscriptions_user on public.subscriptions(user_id);
create index idx_subscriptions_paypal on public.subscriptions(paypal_subscription_id);


-- ============================================================
-- PAYMENTS LOG
-- ============================================================

create table public.payments (
  id uuid default gen_random_uuid() primary key,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  paypal_payment_id text,
  amount numeric(8,2) not null,
  currency text default 'USD',
  status text default 'completed',
  created_at timestamptz default now()
);

alter table public.payments enable row level security;

create policy "Users can view own payments"
  on public.payments for select
  using (auth.uid() = user_id);


-- ============================================================
-- USEFUL VIEWS
-- ============================================================

-- Dashboard stats per user
create or replace view public.user_dashboard_stats as
select
  user_id,
  count(*) as total_invoices,
  count(*) filter (where status = 'overdue') as overdue_count,
  coalesce(sum(amount) filter (where status != 'paid'), 0) as total_outstanding,
  coalesce(sum(amount) filter (where status = 'overdue'), 0) as overdue_amount,
  coalesce(sum(amount) filter (where status = 'paid'), 0) as collected_amount,
  coalesce(avg(risk_score), 0) as avg_risk_score
from public.invoices
group by user_id;


-- ============================================================
-- NEXUS — AI Company OS Reports
-- Run this block to add NEXUS monitoring to CashPulse
-- ============================================================

create table public.nexus_reports (
  id text primary key,
  timestamp timestamptz not null default now(),
  system_health text check (system_health in ('GREEN', 'YELLOW', 'RED', 'UNKNOWN')),
  overall_score integer check (overall_score between 0 and 100),
  domain_scores jsonb default '[]'::jsonb,
  fix_plan jsonb default '{}'::jsonb,
  board_summary text,
  eval_reports jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- Only service role can write NEXUS reports (not end users)
alter table public.nexus_reports enable row level security;

create policy "Service role only"
  on public.nexus_reports
  using (false);  -- no user can read via anon key; service role bypasses RLS

-- Index for fast time-series queries
create index nexus_reports_timestamp_idx on public.nexus_reports (timestamp desc);

-- ============================================================
-- WAITLIST (email capture from landing page)
-- ============================================================

create table public.waitlist (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;

-- Only service role can read/write waitlist
create policy "Service role only" on public.waitlist
  for all using (auth.role() = 'service_role');

