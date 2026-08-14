create table profiles (
  id uuid primary key,
  locale text,
  country_code text,
  consent_version text,
  created_at timestamptz default now()
);

create table debt_portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  portfolio_name text,
  country_code text not null,
  currency text not null,
  available_extra_payment numeric default 0,
  created_at timestamptz default now()
);

create table debts (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references debt_portfolios(id) on delete cascade,
  debt_type text not null,
  balance numeric not null check (balance >= 0),
  rate_type text not null check (rate_type in ('APR','EAR','TEA','TCEA','ZERO')),
  annual_rate numeric not null check (annual_rate >= 0),
  minimum_payment numeric not null check (minimum_payment >= 0),
  recurring_fee numeric default 0,
  remaining_installments integer default 0,
  payment_frequency text default 'MONTHLY',
  next_due_date date,
  early_payment_allowed boolean default true
);

create table simulation_runs (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references debt_portfolios(id) on delete cascade,
  model_version text not null,
  result jsonb not null,
  created_at timestamptz default now()
);

alter table debt_portfolios enable row level security;
alter table debts enable row level security;
alter table simulation_runs enable row level security;

create policy own_portfolios on debt_portfolios
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy own_debts on debts
  using (exists (select 1 from debt_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()))
  with check (exists (select 1 from debt_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()));

create policy own_runs on simulation_runs
  using (exists (select 1 from debt_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()))
  with check (exists (select 1 from debt_portfolios p where p.id = portfolio_id and p.user_id = auth.uid()));
