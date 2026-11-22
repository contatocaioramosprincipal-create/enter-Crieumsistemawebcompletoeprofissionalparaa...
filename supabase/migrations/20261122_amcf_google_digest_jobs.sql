-- Resumo diário é opcional e enviado somente para a própria conta Google autorizada.
create table if not exists public.amcf_google_digest_settings(
 owner_id uuid primary key references public.amcf_members(id) on delete cascade,
 enabled boolean not null default false,
 last_sent_on date,
 updated_at timestamptz not null default now()
);
alter table public.amcf_google_digest_settings enable row level security;
grant select,insert,update on public.amcf_google_digest_settings to authenticated;
drop policy if exists amcf_google_digest_own_read on public.amcf_google_digest_settings;
create policy amcf_google_digest_own_read on public.amcf_google_digest_settings for select to authenticated
using(owner_id=auth.uid());
drop policy if exists amcf_google_digest_own_insert on public.amcf_google_digest_settings;
create policy amcf_google_digest_own_insert on public.amcf_google_digest_settings for insert to authenticated
with check(owner_id=auth.uid() and last_sent_on is null);
drop policy if exists amcf_google_digest_own_update on public.amcf_google_digest_settings;
create policy amcf_google_digest_own_update on public.amcf_google_digest_settings for update to authenticated
using(owner_id=auth.uid()) with check(owner_id=auth.uid());

-- Calendário: eventos AMCF sob autenticação individual, sem importar compromissos pessoais.
select cron.schedule('amcf_google_calendar_sync_30m','0,30 * * * *',
$job$
select net.http_post(
 url:='https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-google-calendar',
 body:='{}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
   (select decrypted_secret from vault.decrypted_secrets where name='amcf_monitor_runner_token' limit 1)),
 timeout_milliseconds:=15000
);
$job$);
select cron.schedule('amcf_google_mail_sync_2h','10 */2 * * *',
$job$
select net.http_post(
 url:='https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-google-mail',
 body:='{"action":"sync"}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
   (select decrypted_secret from vault.decrypted_secrets where name='amcf_monitor_runner_token' limit 1)),
 timeout_milliseconds:=15000
);
$job$);
select cron.schedule('amcf_google_digest_daily','0 12 * * *',
$job$
select net.http_post(
 url:='https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-google-digest',
 body:='{}'::jsonb,
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||
   (select decrypted_secret from vault.decrypted_secrets where name='amcf_monitor_runner_token' limit 1)),
 timeout_milliseconds:=15000
);
$job$);