-- Migração original: migration_20261007_202047000
begin;

-- EVOLUÇÃO MÉDICO-PERICIAL — 4/6

create or replace function public.amcf_can_approve() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.amcf_role() in ('admin','doctor'), false)
$$;
revoke all on function public.amcf_can_approve() from public, anon;
grant execute on function public.amcf_can_approve() to authenticated;

create or replace function public.amcf_case_input_fingerprint(target uuid) returns text
language plpgsql stable security definer set search_path = public as $$
declare result text;
begin
  if target is null or not public.amcf_can_case(target) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  select md5(string_agg(line, '|' order by line)) into result from (
    select 'd:' || d.id || ':' || coalesce(d.content_hash,'') || ':' || d.text_status || ':' || d.text_pages as line from public.amcf_documents d where d.case_id = target
    union all select 'p:' || p.id || ':' || p.page_number || ':' || length(p.content) from public.amcf_document_pages p join public.amcf_documents d on d.id = p.document_id where d.case_id = target
    union all select 'm:' || m.id || ':' || m.dedupe_hash || ':' || m.review_state || ':' || m.classification || ':' || m.updated_at from public.amcf_movements m where m.case_id = target
    union all select 'e:' || e.id || ':' || e.status || ':' || e.updated_at from public.amcf_exams e where e.case_id = target
    union all select 'f:' || f.id || ':' || f.updated_at from public.amcf_exam_findings f where f.case_id = target
    union all select 'q:' || q.id || ':' || q.status || ':' || q.updated_at from public.amcf_case_questions q where q.case_id = target
    union all select 'a:' || a.id || ':' || a.status || ':' || length(a.answer) || ':' || a.updated_at from public.amcf_question_answers a where a.case_id = target
    union all select 's:' || s.id || ':' || s.status || ':' || s.updated_at from public.amcf_case_steps s where s.case_id = target
    union all select 'r:' || r.id || ':' || r.verified || ':' || r.updated_at from public.amcf_references r where r.case_id = target
  ) lines;
  return coalesce(result, md5('vazio'));
end $$;
revoke all on function public.amcf_case_input_fingerprint(uuid) from public, anon;
grant execute on function public.amcf_case_input_fingerprint(uuid) to authenticated;

create or replace function public.amcf_case_input_summary(target uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if target is null or not public.amcf_can_case(target) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  return jsonb_build_object(
    'documents', (select count(*) from public.amcf_documents d where d.case_id = target),
    'documents_with_text', (select count(*) from public.amcf_documents d where d.case_id = target and d.text_status in ('extraido','parcial')),
    'documents_without_text', (select count(*) from public.amcf_documents d where d.case_id = target and d.text_status in ('pendente','processando','falha','ocr_pendente')),
    'pages', (select count(*) from public.amcf_document_pages p join public.amcf_documents d on d.id = p.document_id where d.case_id = target),
    'movements', (select count(*) from public.amcf_movements m where m.case_id = target),
    'movements_unreviewed', (select count(*) from public.amcf_movements m where m.case_id = target and m.review_state = 'nova'),
    'exams', (select count(*) from public.amcf_exams e where e.case_id = target),
    'findings', (select count(*) from public.amcf_exam_findings f where f.case_id = target),
    'questions', (select count(*) from public.amcf_case_questions q where q.case_id = target),
    'questions_open', (select count(*) from public.amcf_case_questions q where q.case_id = target and q.status in ('aberta','em_analise')),
    'answers_reviewed', (select count(*) from public.amcf_question_answers a where a.case_id = target and a.status in ('revisada','aprovada')),
    'references', (select count(*) from public.amcf_references r where r.case_id = target or r.case_id is null),
    'references_verified', (select count(*) from public.amcf_references r where (r.case_id = target or r.case_id is null) and r.verified),
    'steps_open', (select count(*) from public.amcf_case_steps s where s.case_id = target and s.status in ('pendente','em_andamento'))
  );
end $$;
revoke all on function public.amcf_case_input_summary(uuid) from public, anon;
grant execute on function public.amcf_case_input_summary(uuid) to authenticated;

create or replace function public.amcf_case_readiness(target uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare questions_total integer; questions_pending integer; answers_not_reviewed integer;
        unsourced_items integer; docs_without_text integer; movements_unreviewed integer;
        refs_unverified integer; blocking text[] := '{}'; warnings text[] := '{}';
begin
  if target is null or not public.amcf_can_case(target) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  select count(*) into questions_total from public.amcf_case_questions q where q.case_id = target;
  select count(*) into questions_pending from public.amcf_case_questions q where q.case_id = target and q.status in ('aberta','em_analise');
  select count(*) into answers_not_reviewed from public.amcf_question_answers a where a.case_id = target and a.status in ('rascunho','revisao');
  select count(*) into unsourced_items from public.amcf_analysis_items i join public.amcf_case_analyses an on an.id = i.analysis_id
    where an.case_id = target and an.status in ('rascunho','revisao') and i.kind in ('registro','inferencia')
    and not exists (select 1 from public.amcf_source_refs r where r.owner_kind = 'item_analise' and r.owner_id = i.id);
  select count(*) into docs_without_text from public.amcf_documents d where d.case_id = target and d.text_status in ('pendente','falha','ocr_pendente','processando');
  select count(*) into movements_unreviewed from public.amcf_movements m where m.case_id = target and m.review_state = 'nova';
  select count(*) into refs_unverified from public.amcf_references r where (r.case_id = target or r.case_id is null) and not r.verified;
  if questions_pending > 0 then blocking := blocking || (questions_pending || ' quesito(s) sem resposta revisada'); end if;
  if answers_not_reviewed > 0 then warnings := warnings || (answers_not_reviewed || ' resposta(s) ainda não revisada(s)') ; end if;
  if unsourced_items > 0 then warnings := warnings || (unsourced_items || ' item(ns) da análise sem fonte citada'); end if;
  if docs_without_text > 0 then warnings := warnings || (docs_without_text || ' documento(s) sem texto extraído'); end if;
  if movements_unreviewed > 0 then warnings := warnings || (movements_unreviewed || ' movimentação(ões) não revisada(s)'); end if;
  if refs_unverified > 0 then warnings := warnings || (refs_unverified || ' referência(s) não verificada(s)'); end if;
  return jsonb_build_object(
    'questions_total', questions_total, 'questions_pending', questions_pending,
    'answers_not_reviewed', answers_not_reviewed, 'unsourced_items', unsourced_items,
    'documents_without_text', docs_without_text, 'movements_unreviewed', movements_unreviewed,
    'references_unverified', refs_unverified,
    'blocking', to_jsonb(blocking), 'warnings', to_jsonb(warnings),
    'can_approve_now', cardinality(blocking) = 0
  );
end $$;
revoke all on function public.amcf_case_readiness(uuid) from public, anon;
grant execute on function public.amcf_case_readiness(uuid) to authenticated;

create or replace function public.amcf_analysis_create(p_case uuid, p_title text default 'Análise pericial', p_from uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare next_version integer; new_id uuid;
begin
  if not public.amcf_can_case(p_case) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  select coalesce(max(version), 0) + 1 into next_version from public.amcf_case_analyses where case_id = p_case;
  insert into public.amcf_case_analyses(case_id, version, title, method, engine, input_fingerprint, input_summary, created_by)
  values (p_case, next_version, coalesce(nullif(trim(p_title), ''), 'Análise pericial'), 'manual', 'composicao_local',
          public.amcf_case_input_fingerprint(p_case), public.amcf_case_input_summary(p_case), auth.uid())
  returning id into new_id;
  if p_from is not null and exists (select 1 from public.amcf_case_analyses where id = p_from and case_id = p_case) then
    insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
    select case_id, new_id, section, kind, position, title, content, auth.uid() from public.amcf_analysis_items where analysis_id = p_from;
  end if;
  return new_id;
end $$;
revoke all on function public.amcf_analysis_create(uuid,text,uuid) from public, anon;
grant execute on function public.amcf_analysis_create(uuid,text,uuid) to authenticated;

create or replace function public.amcf_analysis_compose(p_analysis uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; item_id uuid; pos integer; mov record; doc record; first_page record; fnd record; q record;
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
    select p.page_number, left(p.content, 800) as excerpt from public.amcf_document_pages p where p.document_id = doc.id and p.content <> '' order by p.page_number limit 1 into first_page;
    if first_page.page_number is not null then
      select coalesce(max(position), 0) + 1 into pos from public.amcf_analysis_items where analysis_id = a.id and section = 'evidencias';
      insert into public.amcf_analysis_items(case_id, analysis_id, section, kind, position, title, content, created_by)
      values (a.case_id, a.id, 'evidencias', 'registro', pos, left(doc.title, 200), 'Trecho extraído: ' || first_page.excerpt, auth.uid())
      returning id into item_id;
      insert into public.amcf_source_refs(case_id, owner_kind, owner_id, source_kind, document_id, page_number, quote, created_by)
      values (a.case_id, 'item_analise', item_id, 'pagina_documento', doc.id, first_page.page_number, first_page.excerpt, auth.uid());
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

create or replace function public.amcf_case_search(p_case uuid, p_term text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare cleaned text; like_term text;
begin
  if not public.amcf_can_case(p_case) then raise exception 'Sem acesso a este processo' using errcode = '42501'; end if;
  cleaned := trim(coalesce(p_term, ''));
  if char_length(cleaned) < 3 then raise exception 'Informe ao menos 3 caracteres para a busca'; end if;
  like_term := '%' || replace(replace(cleaned, '%', ''), '_', '') || '%';
  return jsonb_build_object(
    'term', cleaned,
    'pages', coalesce((select jsonb_agg(x) from (
      select d.id as document_id, d.title as document_title, p.page_number, left(p.content, 900) as excerpt,
             strpos(lower(p.content), lower(cleaned)) as at
      from public.amcf_document_pages p join public.amcf_documents d on d.id = p.document_id
      where d.case_id = p_case and p.content ilike like_term
      order by d.created_at desc, p.page_number limit 15) x), '[]'),
    'movements', coalesce((select jsonb_agg(x) from (
      select m.id, m.occurred_on, m.title, m.classification, m.review_state, left(m.detail, 900) as excerpt
      from public.amcf_movements m where m.case_id = p_case and (m.title ilike like_term or m.detail ilike like_term)
      order by m.occurred_on desc limit 15) x), '[]'),
    'findings', coalesce((select jsonb_agg(x) from (
      select f.id, f.title, f.kind, left(f.detail, 900) as excerpt, f.source_document_id, f.source_page
      from public.amcf_exam_findings f where f.case_id = p_case and (f.title ilike like_term or f.detail ilike like_term)
      order by f.created_at desc limit 15) x), '[]'),
    'questions', coalesce((select jsonb_agg(x) from (
      select q.id, q.number, q.status, q.text, left(coalesce(a.answer, ''), 900) as answer
      from public.amcf_case_questions q left join public.amcf_question_answers a on a.question_id = q.id
      where q.case_id = p_case and (q.text ilike like_term or a.answer ilike like_term)
      order by q.position limit 15) x), '[]')
  );
end $$;
revoke all on function public.amcf_case_search(uuid,text) from public, anon;
grant execute on function public.amcf_case_search(uuid,text) to authenticated;

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
  update public.amcf_case_analyses set status = 'aprovada', approved_by = auth.uid(), approved_at = now(),
    approval_note = left(coalesce(p_note, ''), 2000) where id = a.id;
  update public.amcf_case_analyses set status = 'substituida' where case_id = a.case_id and id <> a.id and status = 'aprovada';
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
  update public.amcf_reports set status = 'aprovado', approved_by = auth.uid(), approved_at = now(),
    approval_note = left(coalesce(p_note, ''), 2000), readiness = ready where id = r.id;
  update public.amcf_reports set status = 'substituido' where case_id = r.case_id and kind = r.kind and id <> r.id and status = 'aprovado';
  return jsonb_build_object('ok', true, 'report_id', r.id, 'version', r.version, 'readiness', ready);
end $$;
revoke all on function public.amcf_report_approve(uuid,text) from public, anon;
grant execute on function public.amcf_report_approve(uuid,text) to authenticated;

create or replace function public.amcf_my_day() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); manager boolean; finance boolean;
begin
  if public.amcf_role() is null then raise exception 'Acesso negado' using errcode = '42501'; end if;
  manager := public.amcf_is_manager();
  finance := public.amcf_is_manager();
  return jsonb_build_object(
    'generated_at', now(),
    'finance_visible', finance,
    'tasks', (select coalesce(jsonb_agg(x), '[]') from (
      select t.id, t.title, t.due_on, t.priority, t.status, c.reference, c.id as case_id
      from public.amcf_tasks t left join public.amcf_cases c on c.id = t.case_id
      where t.status in ('pending','in_progress')
        and (t.responsible_id = me or (t.case_id is not null and (manager or public.amcf_can_case(t.case_id))))
      order by t.due_on limit 25) x),
    'movements', (select coalesce(jsonb_agg(x), '[]') from (
      select m.id, m.title, m.occurred_on, m.classification, m.needs_human_review, c.reference, c.id as case_id
      from public.amcf_movements m join public.amcf_cases c on c.id = m.case_id
      where m.review_state = 'nova' and (manager or public.amcf_can_case(c.id))
      order by m.occurred_on desc limit 25) x),
    'steps', (select coalesce(jsonb_agg(x), '[]') from (
      select s.id, s.label, s.next_action, s.next_action_on, s.status, c.reference, c.id as case_id
      from public.amcf_case_steps s join public.amcf_cases c on c.id = s.case_id
      where s.status in ('pendente','em_andamento') and s.next_action_on is not null and (manager or public.amcf_can_case(c.id))
      order by s.next_action_on limit 25) x),
    'questions', (select coalesce(jsonb_agg(x), '[]') from (
      select q.id, q.number, q.text, q.status, c.reference, c.id as case_id
      from public.amcf_case_questions q join public.amcf_cases c on c.id = q.case_id
      where q.status in ('aberta','em_analise') and (manager or public.amcf_can_case(c.id))
      order by q.created_at limit 25) x),
    'documents', (select coalesce(jsonb_agg(x), '[]') from (
      select d.id, d.title, d.text_status, c.reference, c.id as case_id
      from public.amcf_documents d join public.amcf_cases c on c.id = d.case_id
      where d.text_status in ('pendente','falha','ocr_pendente') and (manager or public.amcf_can_case(c.id))
      order by d.created_at limit 25) x),
    'reports', (select coalesce(jsonb_agg(x), '[]') from (
      select r.id, r.title, r.kind, r.status, r.version, c.reference, c.id as case_id
      from public.amcf_reports r join public.amcf_cases c on c.id = r.case_id
      where r.status in ('rascunho','revisao') and (manager or public.amcf_can_case(c.id))
      order by r.updated_at desc limit 25) x),
    'approvals', (select coalesce(jsonb_agg(x), '[]') from (
      select r.id, r.title, r.kind, r.version, c.reference, c.id as case_id
      from public.amcf_reports r join public.amcf_cases c on c.id = r.case_id
      where r.status = 'revisao' and public.amcf_can_approve() and (manager or public.amcf_can_case(c.id))
      order by r.updated_at limit 25) x),
    'syncs', (select coalesce(jsonb_agg(x), '[]') from (
      select s.id, s.status, s.source_kind, s.error, s.started_at, c.reference, c.id as case_id
      from public.amcf_movement_syncs s join public.amcf_cases c on c.id = s.case_id
      where s.status in ('falha','nao_configurada') and (manager or public.amcf_can_case(c.id))
      order by s.started_at desc limit 10) x),
    'deposits', case when finance then (select coalesce(jsonb_agg(x), '[]') from (
      select f.id, f.kind, f.description, f.amount_cents, f.expected_on, f.status, c.reference, c.id as case_id
      from public.amcf_case_financial_events f join public.amcf_cases c on c.id = f.case_id
      where f.status = 'previsto' order by f.expected_on nulls last limit 10) x) else '[]'::jsonb end,
    'receivables', case when finance then (select coalesce(jsonb_agg(x), '[]') from (
      select r.id, r.description, r.amount_cents, r.due_on, r.status, c.reference
      from public.amcf_receivables r left join public.amcf_cases c on c.id = r.case_id
      where r.status = 'pending' order by r.due_on limit 10) x) else '[]'::jsonb end,
    'notifications', (select coalesce(jsonb_agg(x), '[]') from (
      select n.id, n.kind, n.title, n.body, n.case_id, n.resource, n.resource_id, n.created_at
      from public.amcf_notifications n where n.member_id = me and n.read_at is null
      order by n.created_at desc limit 25) x)
  );
end $$;
revoke all on function public.amcf_my_day() from public, anon;
grant execute on function public.amcf_my_day() to authenticated;

create or replace function public.amcf_api_movement_upsert(p_token text, p_external_ref text, p_case_id uuid, p_occurred_on date, p_title text, p_detail text default null, p_classification text default null)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare k uuid; existing uuid; new_id uuid;
begin
  k := public.amcf_api_key(p_token, 'movements:write');
  if k is null then return jsonb_build_object('ok', false, 'error', 'token inválido ou sem escopo movements:write'); end if;
  if p_external_ref is null or char_length(p_external_ref) < 3 then return jsonb_build_object('ok', false, 'error', 'external_ref obrigatório'); end if;
  if p_case_id is null or not exists (select 1 from public.amcf_cases where id = p_case_id) then return jsonb_build_object('ok', false, 'error', 'case_id inválido'); end if;
  if p_occurred_on is null then return jsonb_build_object('ok', false, 'error', 'occurred_on obrigatório'); end if;
  if p_title is null or char_length(trim(p_title)) < 2 then return jsonb_build_object('ok', false, 'error', 'title obrigatório'); end if;
  if p_classification is not null and p_classification not in ('informativo','requer_acao','possivel_prazo','agenda') then
    return jsonb_build_object('ok', false, 'error', 'classificação inválida');
  end if;
  select resource_id into existing from public.amcf_integration_refs where key_id = k and resource = 'movement' and external_ref = p_external_ref;
  if existing is not null then
    update public.amcf_movements set occurred_on = p_occurred_on, title = trim(p_title), detail = coalesce(p_detail, detail),
      classified_by = case when p_classification is null then classified_by else 'api' end,
      classification = coalesce(p_classification, classification)
    where id = existing and case_id = p_case_id;
    perform public.amcf_api_log(k, 'movement.upsert', true, 'amcf_movements', existing, p_external_ref, 'atualizado');
    return jsonb_build_object('ok', true, 'movement_id', existing, 'duplicated', true);
  end if;
  insert into public.amcf_movements(case_id, occurred_on, title, detail, source, external_ref, dedupe_hash,
      classification, classified_by, created_by)
  values (p_case_id, p_occurred_on, trim(p_title), coalesce(p_detail, ''), 'api', p_external_ref,
      md5(coalesce(p_external_ref,'') || '|' || p_occurred_on::text || '|' || coalesce(trim(p_title),'') || '|' || left(coalesce(p_detail,''), 500)),
      coalesce(p_classification, 'informativo'), case when p_classification is null then 'regra' else 'api' end,
      public.amcf_api_owner(k))
  on conflict (case_id, dedupe_hash) do nothing
  returning id into new_id;
  if new_id is null then
    select id into new_id from public.amcf_movements where case_id = p_case_id
      and dedupe_hash = md5(coalesce(p_external_ref,'') || '|' || p_occurred_on::text || '|' || coalesce(trim(p_title),'') || '|' || left(coalesce(p_detail,''), 500));
  end if;
  insert into public.amcf_integration_refs(key_id, resource, external_ref, resource_id) values (k, 'movement', p_external_ref, new_id)
    on conflict (key_id, resource, external_ref) do nothing;
  perform public.amcf_api_log(k, 'movement.upsert', true, 'amcf_movements', new_id, p_external_ref);
  return jsonb_build_object('ok', true, 'movement_id', new_id, 'duplicated', false);
end $$;
revoke all on function public.amcf_api_movement_upsert(text,text,uuid,date,text,text,text) from public;
grant execute on function public.amcf_api_movement_upsert(text,text,uuid,date,text,text,text) to anon, authenticated;

create or replace function public.amcf_api_case_read(p_token text, p_case_id uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare k uuid; payload jsonb;
begin
  k := public.amcf_api_key(p_token, 'cases:read');
  if k is null then return jsonb_build_object('ok', false, 'error', 'token inválido ou sem escopo cases:read'); end if;
  select jsonb_build_object(
    'id', c.id, 'reference', c.reference, 'title', c.title, 'cnj_number', c.cnj_number,
    'action_type', c.action_type, 'court', c.court, 'court_unit', c.court_unit,
    'claimant', c.claimant, 'defendant', c.defendant, 'stage', (select name from public.amcf_case_stages s where s.id = c.stage_id),
    'opened_on', c.opened_on, 'due_on', c.due_on, 'archived', c.archived_at is not null,
    'next_action', public.amcf_case_next_action(c.id),
    'movements', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'occurred_on', m.occurred_on, 'title', m.title, 'classification', m.classification, 'review_state', m.review_state) order by m.occurred_on desc) from public.amcf_movements m where m.case_id = c.id), '[]')
  ) into payload from public.amcf_cases c where c.id = p_case_id;
  if payload is null then return jsonb_build_object('ok', false, 'error', 'processo inexistente'); end if;
  perform public.amcf_api_log(k, 'case.read', true, 'amcf_cases', p_case_id);
  return jsonb_build_object('ok', true, 'case', payload);
end $$;
revoke all on function public.amcf_api_case_read(text,uuid) from public;
grant execute on function public.amcf_api_case_read(text,uuid) to anon, authenticated;

insert into public.amcf_report_templates (name, scope, body, is_default)
select 'Laudo pericial — modelo inicial', 'laudo', 'IDENTIFICAÇÃO DO PROCESSO
Processo: {{cnj}}
Autor(es): {{autor}}
Réu(s): {{re}}
Vara/Unidade: {{vara}}

OBJETO DA PERÍCIA
{{objeto}}

HISTÓRICO E CRONOLOGIA
{{cronologia}}

EXAME PERICIAL E ACHADOS
{{achados}}

QUESITOS E RESPOSTAS
{{quesitos}}

CONSIDERAÇÕES E CONCLUSÃO
{{conclusao}}

LIMITAÇÕES E RECURSOS DISPONÍVEIS
{{limitacoes}}', true
where not exists (select 1 from public.amcf_report_templates t where t.scope = 'laudo');

insert into public.amcf_report_templates (name, scope, body, is_default)
select 'Petição de esclarecimentos — modelo inicial', 'esclarecimento', 'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(ÍZA) DE DIREITO

Processo: {{cnj}}

Objeto: esclarecimentos sobre o laudo pericial apresentado.

I. DA DELIMITAÇÃO DO PEDIDO
{{delimitacao}}

II. DOS ESCLARECIMENTOS
{{esclarecimentos}}

III. DAS FONTES CONSULTADAS
{{fontes}}

Termos em que se requer o acolhimento dos esclarecimentos prestados.', false
where not exists (select 1 from public.amcf_report_templates t where t.scope = 'esclarecimento');

commit;