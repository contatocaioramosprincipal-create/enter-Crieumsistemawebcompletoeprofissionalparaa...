-- Migração original: migration_20261007_202139000
begin;

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
    if tg_table_name = 'amcf_source_refs' and (
      (new.owner_kind = 'item_analise' and exists (select 1 from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where i.id = new.owner_id and a.status in ('aprovada','substituida')))
      or (new.owner_kind = 'resposta_quesito' and exists (select 1 from public.amcf_question_answers q where q.id = new.owner_id and q.status = 'aprovada'))
      or (new.owner_kind = 'laudo' and exists (select 1 from public.amcf_reports r where r.id = new.owner_id and r.status in ('aprovado','substituido')))
    ) then
      raise exception 'Registro aprovado é imutável: fontes não podem ser alteradas.' using errcode = '42501';
    end if;
  end if;
  if tg_table_name = 'amcf_exam_findings' and (n->>'source_document_id') is not null then
    if not exists (select 1 from public.amcf_documents d where d.id = (n->>'source_document_id')::uuid and d.case_id = new.case_id) then
      raise exception 'O documento de origem do achado não pertence a este processo' using errcode = '42501';
    end if;
    if (n->>'source_page') is not null and not exists (select 1 from public.amcf_document_pages p where p.document_id = (n->>'source_document_id')::uuid and p.page_number = (n->>'source_page')::integer) then
      raise exception 'A página indicada no achado não existe neste documento';
    end if;
  end if;
  if tg_table_name = 'amcf_references' and coalesce((n->>'verified')::boolean, false) then
    if not public.amcf_is_manager() then raise exception 'Somente administrador ou médico verifica referências' using errcode = '42501'; end if;
    if not exists (select 1 from public.amcf_members m where m.id = (n->>'verified_by')::uuid and m.status = 'active') then
      new := jsonb_populate_record(new, jsonb_build_object('verified_by', auth.uid(), 'verified_at', now()));
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
  if tg_table_name = 'amcf_analysis_items' and exists (select 1 from public.amcf_case_analyses a where a.id = old.analysis_id and a.status in ('aprovada','substituida')) then
    raise exception 'Análise aprovada é imutável: itens não podem ser excluídos.' using errcode = '42501';
  end if;
  if tg_table_name = 'amcf_source_refs' and (
    (old.owner_kind = 'item_analise' and exists (select 1 from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where i.id = old.owner_id and a.status in ('aprovada','substituida')))
    or (old.owner_kind = 'resposta_quesito' and exists (select 1 from public.amcf_question_answers q where q.id = old.owner_id and q.status = 'aprovada'))
    or (old.owner_kind = 'laudo' and exists (select 1 from public.amcf_reports r where r.id = old.owner_id and r.status in ('aprovado','substituido')))
  ) then
    raise exception 'Registro aprovado é imutável: fontes não podem ser excluídas.' using errcode = '42501';
  end if;
  return old;
end $$;
revoke all on function public.amcf_medical_delete_guard() from public, anon;

create trigger delete_guard before delete on public.amcf_analysis_items for each row execute function public.amcf_medical_delete_guard();
create trigger delete_guard before delete on public.amcf_source_refs for each row execute function public.amcf_medical_delete_guard();

create or replace function public.amcf_analysis_approve(p_analysis uuid, p_note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; has_content boolean;
begin
  if not public.amcf_can_approve() then raise exception 'Somente médico responsável ou administrador aprova a análise' using errcode = '42501'; end if;
  select * into a from public.amcf_case_analyses where id = p_analysis;
  if not found then raise exception 'Análise indisponível' using errcode = '42501'; end if;
  if not public.amcf_can_case(a.case_id) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  if a.status = 'aprovada' then raise exception 'Esta versão já está aprovada' using errcode = '42501'; end if;
  select (char_length(trim(a.summary)) >= 50) or exists (select 1 from public.amcf_analysis_items where analysis_id = a.id) into has_content;
  if not has_content then raise exception 'A análise precisa de conteúdo antes da aprovação'; end if;
  perform set_config('amcf.supersede', 'on', true);
  update public.amcf_case_analyses set status = 'substituida' where case_id = a.case_id and id <> a.id and status = 'aprovada';
  perform set_config('amcf.supersede', 'off', true);
  update public.amcf_case_analyses set status = 'aprovada', approved_by = auth.uid(), approved_at = now(),
    approval_note = left(coalesce(p_note, ''), 2000) where id = a.id;
  return jsonb_build_object('ok', true, 'analysis_id', a.id, 'version', a.version, 'readiness', public.amcf_case_readiness(a.case_id));
end $$;
revoke all on function public.amcf_analysis_approve(uuid,text) from public, anon;
grant execute on function public.amcf_analysis_approve(uuid,text) to authenticated;

create or replace function public.amcf_report_approve(p_report uuid, p_note text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; ready jsonb; blocking jsonb;
begin
  if not public.amcf_can_approve() then raise exception 'Somente médico responsável ou administrador aprova o laudo' using errcode = '42501'; end if;
  select * into r from public.amcf_reports where id = p_report;
  if not found then raise exception 'Documento indisponível' using errcode = '42501'; end if;
  if not public.amcf_can_case(r.case_id) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  if r.status = 'aprovado' then raise exception 'Esta versão já está aprovada' using errcode = '42501'; end if;
  if char_length(trim(r.body)) < 200 then raise exception 'O conteúdo precisa ter ao menos 200 caracteres antes da aprovação'; end if;
  ready := public.amcf_case_readiness(r.case_id);
  blocking := ready -> 'blocking';
  if r.kind = 'laudo' and jsonb_array_length(blocking) > 0 then
    raise exception 'Aprovação bloqueada: %', (select string_agg(value, '; ') from jsonb_array_elements_text(blocking) value);
  end if;
  perform set_config('amcf.supersede', 'on', true);
  update public.amcf_reports set status = 'substituido' where case_id = r.case_id and kind = r.kind and id <> r.id and status = 'aprovado';
  perform set_config('amcf.supersede', 'off', true);
  update public.amcf_reports set status = 'aprovado', approved_by = auth.uid(), approved_at = now(),
    approval_note = left(coalesce(p_note, ''), 2000), readiness = ready where id = r.id;
  return jsonb_build_object('ok', true, 'report_id', r.id, 'version', r.version, 'readiness', ready);
end $$;
revoke all on function public.amcf_report_approve(uuid,text) from public, anon;
grant execute on function public.amcf_report_approve(uuid,text) to authenticated;

create or replace function public.amcf_analysis_compose(p_analysis uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; item_id uuid; pos integer; mov record; doc record; page_no integer; excerpt text; fnd record; q record;
        added_mov integer := 0; added_doc integer := 0; added_gap integer := 0; added_find integer := 0; added_q integer := 0;
begin
  select * into a from public.amcf_case_analyses where id = p_analysis;
  if not found then raise exception 'Análise indisponível' using errcode = '42501'; end if;
  if not public.amcf_can_case(a.case_id) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  if a.status in ('aprovada','substituida') then raise exception 'Análise aprovada é imutável: crie uma nova versão' using errcode = '42501'; end if;

  for mov in select * from public.amcf_movements where case_id = a.case_id order by occurred_on, created_at loop
    continue when exists (select 1 from public.amcf_source_refs r join public.amcf_analysis_items i on i.id = r.owner_id
                          where r.owner_kind = 'item_analise' and i.analysis_id = a.id and r.movement_id = mov.id);
    select coalesce(max(position), 0) + 1 into pos from public.amcf_analysis_items where analysis_id = a.id and section = 'cronologia';
    insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
    values (a.case_id, a.id, 'cronologia', 'registro', pos, left(mov.occurred_on::text || ' · ' || mov.title, 200), left(coalesce(mov.detail, ''), 20000), auth.uid())
    returning id into item_id;
    insert into public.amcf_source_refs(case_id, owner_kind, owner_id, source_kind, movement_id, quote, created_by)
    values (a.case_id, 'item_analise', item_id, 'movimentacao', mov.id, left(mov.title, 4000), auth.uid());
    added_mov := added_mov + 1;
  end loop;

  for doc in select * from public.amcf_documents where case_id = a.case_id order by created_at loop
    continue when exists (select 1 from public.amcf_source_refs r where r.owner_kind = 'item_analise' and r.document_id = doc.id
                          and r.owner_id in (select id from public.amcf_analysis_items where analysis_id = a.id));
    page_no := null; excerpt := null;
    select p.page_number, left(p.content, 800) into page_no, excerpt
      from public.amcf_document_pages p where p.document_id = doc.id and p.content <> '' order by p.page_number limit 1;
    if page_no is not null then
      select coalesce(max(position), 0) + 1 into pos from public.amcf_analysis_items where analysis_id = a.id and section = 'evidencias';
      insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
      values (a.case_id, a.id, 'evidencias', 'registro', pos, left(doc.title, 200), 'Trecho extraído: ' || excerpt, auth.uid())
      returning id into item_id;
      insert into public.amcf_source_refs(case_id, owner_kind, owner_id, source_kind, document_id, page_number, quote, created_by)
      values (a.case_id, 'item_analise', item_id, 'pagina_documento', doc.id, page_no, excerpt, auth.uid());
      added_doc := added_doc + 1;
    else
      select coalesce(max(position), 0) + 1 into pos from public.amcf_analysis_items where analysis_id = a.id and section = 'lacunas';
      insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
      values (a.case_id, a.id, 'lacunas', 'ausencia', pos, left(doc.title, 200), 'Documento registrado sem texto extraído (' || doc.text_status || '). Não há conteúdo textual para citar.', auth.uid())
      returning id into item_id;
      insert into public.amcf_source_refs(case_id, owner_kind, owner_id, source_kind, document_id, quote, created_by)
      values (a.case_id, 'item_analise', item_id, 'documento', doc.id, left(doc.title, 4000), auth.uid());
      added_gap := added_gap + 1;
    end if;
  end loop;

  for fnd in select f.* from public.amcf_exam_findings f where f.case_id = a.case_id order by f.created_at loop
    continue when exists (select 1 from public.amcf_source_refs r where r.owner_kind = 'item_analise' and r.finding_id = fnd.id
                          and r.owner_id in (select id from public.amcf_analysis_items where analysis_id = a.id));
    select coalesce(max(position), 0) + 1 into pos from public.amcf_analysis_items where analysis_id = a.id and section = 'evidencias';
    insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
    values (a.case_id, a.id, 'evidencias', 'registro', pos, left('Achado: ' || fnd.title, 200), left(coalesce(fnd.detail, ''), 20000), auth.uid())
    returning id into item_id;
    insert into public.amcf_source_refs(case_id, owner_kind, owner_id, source_kind, finding_id, quote, created_by)
    values (a.case_id, 'item_analise', item_id, 'achado_exame', fnd.id, left(fnd.title, 4000), auth.uid());
    added_find := added_find + 1;
  end loop;

  for q in select qs.* from public.amcf_case_questions qs
           where qs.case_id = a.case_id
             and not exists (select 1 from public.amcf_question_answers an where an.question_id = qs.id and an.answer <> '')
           order by qs.position loop
    continue when exists (select 1 from public.amcf_source_refs r where r.owner_kind = 'item_analise' and r.question_id = q.id
                          and r.owner_id in (select id from public.amcf_analysis_items where analysis_id = a.id));
    select coalesce(max(position), 0) + 1 into pos from public.amcf_analysis_items where analysis_id = a.id and section = 'lacunas';
    insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
    values (a.case_id, a.id, 'lacunas', 'ausencia', pos, left('Quesito ' || q.number || ' sem resposta', 200), left(q.text, 20000), auth.uid())
    returning id into item_id;
    insert into public.amcf_source_refs(case_id, owner_kind, owner_id, source_kind, question_id, quote, created_by)
    values (a.case_id, 'item_analise', item_id, 'quesito', q.id, left(q.text, 4000), auth.uid());
    added_q := added_q + 1;
  end loop;

  update public.amcf_case_analyses
  set method = 'composicao', engine = 'composicao_local',
      input_fingerprint = public.amcf_case_input_fingerprint(a.case_id),
      input_summary = public.amcf_case_input_summary(a.case_id)
  where id = a.id;

  return jsonb_build_object('ok', true, 'cronologia', added_mov, 'evidencias', added_doc + added_find, 'lacunas', added_gap + added_q);
end $$;
revoke all on function public.amcf_analysis_compose(uuid) from public, anon;
grant execute on function public.amcf_analysis_compose(uuid) to authenticated;

commit;