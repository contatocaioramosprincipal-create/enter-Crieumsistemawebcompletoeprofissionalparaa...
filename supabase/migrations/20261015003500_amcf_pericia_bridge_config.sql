-- Configuração secreta AMCF -> n8n: somente service_role pode ler o Vault.
-- Os valores reais são criados separadamente no painel ou SQL administrativo.
-- NÃO armazenar segredos em migrações ou repositórios Git.
create or replace function public.amcf_pericia_bridge_config()
returns jsonb language sql security definer set search_path = ''
as $$
select jsonb_build_object(
  'url',(select decrypted_secret from vault.decrypted_secrets where name='amcf_pericia_webhook_url' limit 1),
  'header_key',(select decrypted_secret from vault.decrypted_secrets where name='amcf_pericia_webhook_key' limit 1),
  'enabled',coalesce((select decrypted_secret='true' from vault.decrypted_secrets where name='amcf_pericia_webhook_enabled' limit 1),false)
) $$;
revoke all on function public.amcf_pericia_bridge_config() from public,anon,authenticated;
grant execute on function public.amcf_pericia_bridge_config() to service_role;
