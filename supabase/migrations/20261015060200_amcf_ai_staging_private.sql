-- Área de quarentena da IA. Não é repositório de documentos clínicos oficiais.
create table if not exists public.amcf_ai_staged_files (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid not null references auth.users(id) on delete cascade,
 case_id uuid not null references public.amcf_cases(id) on delete cascade,
 conversation_id uuid not null,
 storage_path text not null unique,
 media_type text not null check(media_type in ('application/pdf','image/png','image/jpeg')),
 byte_limit integer not null check(byte_limit between 1 and 10485760),
 status text not null default 'reserved' check(status in ('reserved','uploaded','quarantined')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default (now()+interval '24 hours')
);
create index if not exists amcf_ai_staged_expiry_idx on public.amcf_ai_staged_files(expires_at);
create index if not exists amcf_ai_staged_owner_idx on public.amcf_ai_staged_files(actor_id,created_at desc);
alter table public.amcf_ai_staged_files enable row level security;
revoke all on public.amcf_ai_staged_files from PUBLIC,anon,authenticated;
grant select,insert,update,delete on public.amcf_ai_staged_files to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('amcf-ai-staging','amcf-ai-staging',false,10485760,array['application/pdf','image/png','image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create or replace function public.amcf_ai_security_flags() returns jsonb
language sql security definer set search_path='' as $f$
select jsonb_build_object(
'uploads_enabled',coalesce((select decrypted_secret='true' from vault.decrypted_secrets where name='amcf_ai_uploads_enabled' limit 1),false),
'llm_attachment_transfer_enabled',coalesce((select decrypted_secret='true' from vault.decrypted_secrets where name='amcf_ai_transfer_enabled' limit 1),false)
) $f$;
revoke all on function public.amcf_ai_security_flags() from PUBLIC,anon,authenticated;
grant execute on function public.amcf_ai_security_flags() to service_role;
create or replace function public.amcf_ai_cleanup_token() returns text
language sql security definer set search_path='' as $f$
select decrypted_secret from vault.decrypted_secrets where name='amcf_ai_cleanup_token' limit 1 $f$;
revoke all on function public.amcf_ai_cleanup_token() from PUBLIC,anon,authenticated;
grant execute on function public.amcf_ai_cleanup_token() to service_role;
-- A instalação inicial cria segredos sem imprimi-los em arquivos.
select vault.create_secret('false','amcf_ai_uploads_enabled','Bloqueio inicial dos anexos da IA')
where not exists(select 1 from vault.secrets where name='amcf_ai_uploads_enabled');
select vault.create_secret('false','amcf_ai_transfer_enabled','Bloqueio inicial da transmissão de anexos ao n8n')
where not exists(select 1 from vault.secrets where name='amcf_ai_transfer_enabled');
select vault.create_secret(encode(gen_random_bytes(48),'hex'),'amcf_ai_cleanup_token','Token de uso exclusivo da limpeza agendada')
where not exists(select 1 from vault.secrets where name='amcf_ai_cleanup_token');
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
do $job$ begin if not exists(select 1 from cron.job where jobname='amcf_ai_staging_cleanup_hourly') then
 perform cron.schedule('amcf_ai_staging_cleanup_hourly','25 * * * *',
 $sql$select net.http_post(
url:='https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-ai-cleanup',
body:='{}'::jsonb,
headers:=jsonb_build_object('Content-Type','application/json',
'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='amcf_ai_cleanup_token' limit 1)),timeout_milliseconds:=10000);$sql$);
end if;end $job$;