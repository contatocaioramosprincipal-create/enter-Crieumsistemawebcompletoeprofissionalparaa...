-- Publicações DJEN de fonte oficial, somente leitura para integrantes com acesso ao processo.
create table if not exists public.amcf_djen_publications(
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.amcf_cases(id) on delete cascade,
 external_hash text not null check(length(external_hash) between 8 and 128),
 tribunal text not null default '',
 communication_type text not null default '',
 available_on date,
 published_on date,
 summary text not null default '' check(length(summary)<=3000),
 official_url text,
 imported_at timestamptz not null default now(),
 unique(case_id,external_hash)
);
create index if not exists amcf_djen_publications_case_idx on public.amcf_djen_publications(case_id,imported_at desc);
alter table public.amcf_djen_publications enable row level security;
grant select on public.amcf_djen_publications to authenticated;
drop policy if exists amcf_djen_read on public.amcf_djen_publications;
create policy amcf_djen_read on public.amcf_djen_publications for select to authenticated
using(public.amcf_can_case(case_id));
create table if not exists public.amcf_djen_syncs(
 id uuid primary key default gen_random_uuid(),
 case_id uuid not null references public.amcf_cases(id) on delete cascade,
 status text not null check(status in ('ok','failure','no_results')),
 checked_at timestamptz not null default now(),
 found integer not null default 0,
 inserted integer not null default 0,
 note text not null default '' check(length(note)<=300)
);
create index if not exists amcf_djen_syncs_case_idx on public.amcf_djen_syncs(case_id,checked_at desc);
alter table public.amcf_djen_syncs enable row level security;
grant select on public.amcf_djen_syncs to authenticated;
drop policy if exists amcf_djen_syncs_read on public.amcf_djen_syncs;
create policy amcf_djen_syncs_read on public.amcf_djen_syncs for select to authenticated
using(public.amcf_can_case(case_id));
select cron.schedule('amcf_djen_public_monitor_6h','20 */6 * * *',
$job$
select net.http_post(
 url := 'https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-djen-monitor',
 body := '{}'::jsonb,
 headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
   (select decrypted_secret from vault.decrypted_secrets where name='amcf_monitor_runner_token' limit 1)),
 timeout_milliseconds := 15000
);
$job$);