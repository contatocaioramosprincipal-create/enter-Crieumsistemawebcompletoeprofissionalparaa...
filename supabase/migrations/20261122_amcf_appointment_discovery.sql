-- Radar de nomeações: busca apenas comunicações judiciais públicas por nome do perito.
-- Nenhuma menção é tratada como nomeação confirmada sem revisão humana.
create table if not exists public.amcf_appointment_search_terms (
 id uuid primary key default gen_random_uuid(),
 phrase text not null check(char_length(phrase) between 7 and 120 and phrase like '% %'),
 active boolean not null default true,
 created_by uuid references public.amcf_members(id),
 created_at timestamptz not null default now(),
 unique(phrase)
);
alter table public.amcf_appointment_search_terms enable row level security;
revoke all on public.amcf_appointment_search_terms from public,anon;
grant select,insert,update,delete on public.amcf_appointment_search_terms to authenticated;
grant all on public.amcf_appointment_search_terms to service_role;
drop policy if exists appointment_terms_read on public.amcf_appointment_search_terms;
create policy appointment_terms_read on public.amcf_appointment_search_terms for select to authenticated
 using(public.amcf_role() in ('admin','doctor','assistant'));
drop policy if exists appointment_terms_insert on public.amcf_appointment_search_terms;
create policy appointment_terms_insert on public.amcf_appointment_search_terms for insert to authenticated
 with check(public.amcf_is_manager() and created_by=auth.uid());
drop policy if exists appointment_terms_update on public.amcf_appointment_search_terms;
create policy appointment_terms_update on public.amcf_appointment_search_terms for update to authenticated
 using(public.amcf_is_manager()) with check(public.amcf_is_manager());
drop policy if exists appointment_terms_delete on public.amcf_appointment_search_terms;
create policy appointment_terms_delete on public.amcf_appointment_search_terms for delete to authenticated
 using(public.amcf_is_manager());

create table if not exists public.amcf_appointment_leads (
 id uuid primary key default gen_random_uuid(),
 external_hash text not null unique check(char_length(external_hash) between 8 and 150),
 matched_term text not null check(char_length(matched_term) between 7 and 120),
 cnj_number text,
 tribunal text not null default '' check(char_length(tribunal)<=40),
 court_unit text not null default '' check(char_length(court_unit)<=200),
 communication_type text not null default '' check(char_length(communication_type)<=150),
 available_on date,
 match_kind text not null check(match_kind in ('possivel_nomeacao','mencao')),
 excerpt text not null default '' check(char_length(excerpt)<=700),
 source_url text not null check(char_length(source_url)<=700),
 status text not null default 'pendente' check(status in ('pendente','em_analise','confirmada','descartada','vinculada')),
 linked_case_id uuid references public.amcf_cases(id) on delete set null,
 reviewed_by uuid references public.amcf_members(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint appointment_linked_case_check check(status<>'vinculada' or linked_case_id is not null)
);
create index if not exists appointment_leads_review_idx on public.amcf_appointment_leads(status,created_at desc);
create index if not exists appointment_leads_cnj_idx on public.amcf_appointment_leads(cnj_number);
alter table public.amcf_appointment_leads enable row level security;
revoke all on public.amcf_appointment_leads from public,anon;
grant select,update on public.amcf_appointment_leads to authenticated;
grant all on public.amcf_appointment_leads to service_role;
drop policy if exists appointment_leads_read on public.amcf_appointment_leads;
create policy appointment_leads_read on public.amcf_appointment_leads for select to authenticated
 using(public.amcf_role() in ('admin','doctor','assistant'));
drop policy if exists appointment_leads_update on public.amcf_appointment_leads;
create policy appointment_leads_update on public.amcf_appointment_leads for update to authenticated
 using(public.amcf_role() in ('admin','doctor','assistant') and
   (linked_case_id is null or public.amcf_can_case(linked_case_id)))
 with check(public.amcf_role() in ('admin','doctor','assistant') and
   (linked_case_id is null or public.amcf_can_case(linked_case_id)));

create table if not exists public.amcf_appointment_search_runs (
 id uuid primary key default gen_random_uuid(),
 matched_term text not null check(char_length(matched_term)<=120),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 date_from date,
 date_to date,
 status text not null check(status in ('running','ok','no_results','error')),
 found integer not null default 0,
 inserted integer not null default 0,
 error_note text check(char_length(error_note)<=300)
);
create index if not exists appointment_runs_term_idx on public.amcf_appointment_search_runs(matched_term,started_at desc);
alter table public.amcf_appointment_search_runs enable row level security;
revoke all on public.amcf_appointment_search_runs from public,anon;
grant select on public.amcf_appointment_search_runs to authenticated;
grant all on public.amcf_appointment_search_runs to service_role;
drop policy if exists appointment_runs_read on public.amcf_appointment_search_runs;
create policy appointment_runs_read on public.amcf_appointment_search_runs for select to authenticated
 using(public.amcf_role() in ('admin','doctor','assistant'));

create or replace function public.amcf_appointment_alert() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare member_row record;
begin
 if new.match_kind<>'possivel_nomeacao' then return new; end if;
 for member_row in
  select id from public.amcf_members where status='active' and role in ('admin','doctor','assistant')
 loop
  insert into public.amcf_notifications(member_id,kind,title,body,resource,resource_id)
  values(member_row.id,'sistema',
   'Possível nomeação localizada no DJEN',
   'Uma publicação pública menciona o perito e contém termos relacionados a nomeação. Confira o Radar de Nomeações antes de registrar o processo.',
   'nomeacao',new.id)
  on conflict do nothing;
 end loop;
 return new;
end $$;
revoke all on function public.amcf_appointment_alert() from public,anon,authenticated;
drop trigger if exists amcf_appointment_alert_trigger on public.amcf_appointment_leads;
create trigger amcf_appointment_alert_trigger after insert on public.amcf_appointment_leads
for each row execute function public.amcf_appointment_alert();

-- Termo inicial baseado no nome profissional informado. O médico poderá acrescentar grafias.
insert into public.amcf_appointment_search_terms(phrase,active)
 values ('Adilson Couto',true) on conflict (phrase) do nothing;

select cron.schedule('amcf_appointment_discovery_12h','40 9,21 * * *',
  $job$
  select net.http_post(
    url:='https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-appointment-discovery',
    body:='{}'::jsonb,
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='amcf_monitor_runner_token' limit 1)),
    timeout_milliseconds:=20000
  );
  $job$
);
