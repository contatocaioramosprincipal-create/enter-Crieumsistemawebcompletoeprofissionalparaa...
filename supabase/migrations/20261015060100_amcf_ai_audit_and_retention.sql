-- NÃO armazenar textos de conversas, laudos, prompts ou prontuários.
create table if not exists public.amcf_ai_audit_events (
 id uuid primary key default gen_random_uuid(),
 occurred_at timestamptz not null default now(),
 actor_id uuid references auth.users(id) on delete set null,
 case_id uuid references public.amcf_cases(id) on delete set null,
 action text not null check (action in ('chat','attachment_reserve','attachment_finalize','attachment_delete','authorization_denied','configuration_test')),
 outcome text not null check (outcome in ('success','failure','denied','pending')),
 status_code integer check(status_code between 100 and 599),
 duration_ms integer check(duration_ms between 0 and 300000),
 request_id uuid not null default gen_random_uuid(),
 details jsonb not null default '{}'::jsonb,
 constraint details_metadata_only check(jsonb_typeof(details)='object' and
 not(details ?| array['prompt','chatInput','answer','text','transcription','file','content','name','email','phone','medicalRecord']))
);
create index if not exists amcf_ai_audit_time on public.amcf_ai_audit_events(occurred_at desc);
create index if not exists amcf_ai_audit_actor_time on public.amcf_ai_audit_events(actor_id,occurred_at desc);
alter table public.amcf_ai_audit_events enable row level security;
revoke all on public.amcf_ai_audit_events from PUBLIC,anon,authenticated;
grant select,insert,delete on public.amcf_ai_audit_events to service_role;
create or replace function public.amcf_ai_prune_audit_events() returns integer language plpgsql
security definer set search_path=public,pg_temp as $f$ declare n integer;
begin delete from public.amcf_ai_audit_events where occurred_at<now()-interval '180 days'; get diagnostics n=row_count;return n;end $f$;
revoke all on function public.amcf_ai_prune_audit_events() from PUBLIC,anon,authenticated;
grant execute on function public.amcf_ai_prune_audit_events() to service_role;
create extension if not exists pg_cron with schema pg_catalog;
do $job$ begin if not exists(select 1 from cron.job where jobname='amcf_ai_metadata_180d') then
 perform cron.schedule('amcf_ai_metadata_180d','15 3 * * *','select public.amcf_ai_prune_audit_events();');
end if;end $job$;