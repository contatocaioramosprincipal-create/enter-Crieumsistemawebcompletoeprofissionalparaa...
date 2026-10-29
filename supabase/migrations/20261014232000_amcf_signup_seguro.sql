-- Registro seguro de novos usuários no projeto Supabase independente.
-- Novo usuário é sempre ASSISTENTE PENDENTE; somente admin pode ativar/promover.
drop policy if exists members_signup on public.amcf_members;
create or replace function public.amcf_register_auth_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare safe_name text;
begin
 safe_name := left(trim(coalesce(new.raw_user_meta_data->>'name','')),120);
 if char_length(safe_name)<2 then safe_name := 'Novo integrante'; end if;
 insert into public.amcf_members(id,name,email,role,status)
 values (new.id,safe_name,lower(new.email),'assistant','pending')
 on conflict (id) do nothing;
 return new;
end $$;
revoke all on function public.amcf_register_auth_user() from public, anon, authenticated;
drop trigger if exists amcf_register_user_on_signup on auth.users;
create trigger amcf_register_user_on_signup
 after insert on auth.users for each row execute function public.amcf_register_auth_user();
-- O trigger não promove nenhum usuário a admin nem médico.
