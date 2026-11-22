-- Cron do DataJud: consulta exclusivamente números CNJ públicos, sem gerar prazos ou conclusões.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name='amcf_monitor_runner_token') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'),'amcf_monitor_runner_token','Token interno exclusivo do monitor judicial do AMCF');
  end if;
end $$;

create or replace function public.amcf_verify_monitor_token(p_token text)
returns boolean language sql stable security definer set search_path=public,pg_temp
as $$
  select coalesce(length(p_token)=64 and exists(
    select 1 from vault.decrypted_secrets
    where name='amcf_monitor_runner_token' and decrypted_secret=p_token
  ),false);
$$;
revoke all on function public.amcf_verify_monitor_token(text) from public,anon,authenticated;
grant execute on function public.amcf_verify_monitor_token(text) to service_role;

select cron.schedule('amcf_datajud_public_monitor_4h','5 */4 * * *',
  $job$
    select case when coalesce(length(public.amcf_datajud_key()),0)>=20 then
      net.http_post(
        url:='https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-judicial-monitor',
        body:='{}'::jsonb,
        headers:=jsonb_build_object(
          'Content-Type','application/json',
          'Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='amcf_monitor_runner_token' limit 1)
        ),
        timeout_milliseconds:=15000
      )
    else null end;
  $job$
);