-- Migração original: migration_20260930_230000000
begin;
-- Upload de documentos grandes: arquivo vai direto ao Storage privado (TUS), sem Base64 no Postgres.
-- Limite efetivo sem custo (plano gratuito): 50 MB por arquivo. Para subir até 200 MB após upgrade,
-- aumentar o limite global em Storage Settings e atualizar file_size_limit do bucket (ver docs/upload-documentos.md).

alter table public.amcf_documents drop constraint if exists amcf_documents_size_bytes_check;
alter table public.amcf_documents drop constraint if exists amcf_documents_size_limit;
alter table public.amcf_documents add constraint amcf_documents_size_limit check (size_bytes > 0 and size_bytes <= 209715200);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('amcf-documentos', 'amcf-documentos', false, 52428800, array['application/pdf','image/png','image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Caminho permitido: <uuid-do-caso>/<arquivo>, sem subpastas nem "..", e somente para quem acessa o caso.
create or replace function public.amcf_can_object(object_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare parts text[]; case_part text;
begin
  if object_name is null or length(object_name) > 220 or object_name like '%..%' then return false; end if;
  parts := string_to_array(object_name, '/');
  if array_length(parts, 1) <> 2 or length(parts[2]) = 0 then return false; end if;
  case_part := parts[1];
  if case_part !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  return coalesce(public.amcf_can_case(case_part::uuid), false);
end $$;
revoke all on function public.amcf_can_object(text) from public, anon;
grant execute on function public.amcf_can_object(text) to authenticated;

-- Somente INSERT pelo navegador. Leitura e exclusão ocorrem pela função amcf-files (URL assinada de 60 s / service role).
drop policy if exists amcf_docs_insert on storage.objects;
create policy amcf_docs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'amcf-documentos' and public.amcf_can_object(name));
commit;
