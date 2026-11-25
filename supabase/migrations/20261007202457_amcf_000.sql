-- Migração original: migration_20261007_202457000
begin;
create or replace function public.amcf_fill_case_from_parent() returns trigger
language plpgsql security definer set search_path = public as $$
declare resolved uuid;
begin
  if tg_table_name = 'amcf_analysis_items' then
    resolved := (select case_id from public.amcf_case_analyses where id = new.analysis_id);
  elsif tg_table_name = 'amcf_question_answers' then
    resolved := (select case_id from public.amcf_case_questions where id = new.question_id);
  elsif tg_table_name = 'amcf_exam_findings' then
    resolved := (select case_id from public.amcf_exams where id = new.exam_id);
  elsif tg_table_name = 'amcf_case_messages' then
    resolved := (select case_id from public.amcf_case_chats where id = new.chat_id);
  elsif tg_table_name = 'amcf_source_refs' then
    if new.owner_kind = 'item_analise' then
      resolved := (select case_id from public.amcf_analysis_items where id = new.owner_id);
    elsif new.owner_kind = 'resposta_quesito' then
      resolved := (select case_id from public.amcf_question_answers where id = new.owner_id);
    elsif new.owner_kind = 'laudo' then
      resolved := (select case_id from public.amcf_reports where id = new.owner_id);
    else
      resolved := (select case_id from public.amcf_exam_findings where id = new.owner_id);
    end if;
  else
    resolved := new.case_id;
  end if;
  if resolved is null then raise exception 'Registro de origem não encontrado' using errcode = '42501'; end if;
  if new.case_id is not null and new.case_id <> resolved then
    raise exception 'O processo informado não corresponde ao registro de origem' using errcode = '42501';
  end if;
  new.case_id := resolved;
  return new;
end $$;
revoke all on function public.amcf_fill_case_from_parent() from public, anon;

create or replace function public.amcf_medical_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare n jsonb := to_jsonb(new); o jsonb;
begin
  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    if n->>'id' is distinct from o->>'id' or n->>'created_at' is distinct from o->>'created_at' then
      raise exception 'Campos de origem são imutáveis' using errcode = '42501';
    end if;
    if n ? 'case_id' and n->>'case_id' is distinct from o->>'case_id' then
      raise exception 'O vínculo com o processo é imutável' using errcode = '42501';
    end if;
    if n ? 'created_by' and n->>'created_by' is distinct from o->>'created_by' then
      raise exception 'Campos de origem são imutáveis' using errcode = '42501';
    end if;
    if tg_table_name in ('amcf_case_analyses','amcf_reports') then
      if coalesce(current_setting('amcf.supersede', true), '') = 'on' and n->>'status' in ('substituida','substituido') then
        null;
      elsif o->>'status' in ('aprovada','aprovado','substituida','substituido') then
        raise exception 'Versão aprovada não pode ser alterada. Crie uma nova versão.' using errcode = '42501';
      end if;
    end if;
    if tg_table_name = 'amcf_analysis_items' and exists (select 1 from public.amcf_case_analyses a where a.id = (n->>'analysis_id')::uuid and a.status in ('aprovada','substituida')) then
      raise exception 'Análise aprovada é imutável. Crie uma nova versão da análise.' using errcode = '42501';
    end if;
    if tg_table_name = 'amcf_question_answers' and o->>'status' = 'aprovada' then
      raise exception 'Resposta aprovada é imutável.' using errcode = '42501';
    end if;
    if tg_table_name = 'amcf_source_refs' then
      if (new.owner_kind = 'item_analise' and exists (select 1 from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where i.id = new.owner_id and a.status in ('aprovada','substituida')))
      or (new.owner_kind = 'resposta_quesito' and exists (select 1 from public.amcf_question_answers q where q.id = new.owner_id and q.status = 'aprovada'))
      or (new.owner_kind = 'laudo' and exists (select 1 from public.amcf_reports r where r.id = new.owner_id and r.status in ('aprovado','substituido'))) then
        raise exception 'Registro aprovado é imutável: fontes não podem ser alteradas.' using errcode = '42501';
      end if;
    end if;
  end if;
  if tg_table_name = 'amcf_exam_findings' then
    if (n->>'source_document_id') is not null then
      if not exists (select 1 from public.amcf_documents d where d.id = (n->>'source_document_id')::uuid and d.case_id = new.case_id) then
        raise exception 'O documento de origem do achado não pertence a este processo' using errcode = '42501';
      end if;
      if (n->>'source_page') is not null and not exists (select 1 from public.amcf_document_pages p where p.document_id = (n->>'source_document_id')::uuid and p.page_number = (n->>'source_page')::integer) then
        raise exception 'A página indicada no achado não existe neste documento';
      end if;
    end if;
  end if;
  if tg_table_name = 'amcf_references' then
    if coalesce((n->>'verified')::boolean, false) then
      if not public.amcf_is_manager() then raise exception 'Somente administrador ou médico verifica referências' using errcode = '42501'; end if;
      if not exists (select 1 from public.amcf_members m where m.id = (n->>'verified_by')::uuid and m.status = 'active') then
        new := jsonb_populate_record(new, jsonb_build_object('verified_by', auth.uid(), 'verified_at', now()));
      end if;
    end if;
  end if;
  if tg_table_name = 'amcf_case_steps' then
    if n->>'status' = 'concluida' and (n->>'completed_at') is null then
      new := jsonb_populate_record(new, jsonb_build_object('completed_at', now()));
    elsif n->>'status' <> 'concluida' and (n->>'completed_at') is not null then
      raise exception 'Somente etapas concluídas mantêm data de conclusão' using errcode = '42501';
    end if;
  end if;
  if n ? 'updated_at' then new := jsonb_populate_record(new, jsonb_build_object('updated_at', now())); end if;
  return new;
end $$;
revoke all on function public.amcf_medical_guard() from public, anon;

create or replace function public.amcf_medical_delete_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'amcf_analysis_items' then
    if exists (select 1 from public.amcf_case_analyses a where a.id = old.analysis_id and a.status in ('aprovada','substituida')) then
      raise exception 'Análise aprovada é imutável: itens não podem ser excluídos.' using errcode = '42501';
    end if;
  end if;
  if tg_table_name = 'amcf_source_refs' then
    if (old.owner_kind = 'item_analise' and exists (select 1 from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where i.id = old.owner_id and a.status in ('aprovada','substituida')))
    or (old.owner_kind = 'resposta_quesito' and exists (select 1 from public.amcf_question_answers q where q.id = old.owner_id and q.status = 'aprovada'))
    or (old.owner_kind = 'laudo' and exists (select 1 from public.amcf_reports r where r.id = old.owner_id and r.status in ('aprovado','substituido'))) then
      raise exception 'Registro aprovado é imutável: fontes não podem ser excluídas.' using errcode = '42501';
    end if;
  end if;
  return old;
end $$;
revoke all on function public.amcf_medical_delete_guard() from public, anon;
commit;