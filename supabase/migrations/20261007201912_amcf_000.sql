-- Migração original: migration_20261007_201912000
begin;

-- EVOLUÇÃO MÉDICO-PERICIAL — 3/6

create table if not exists public.amcf_case_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  number integer not null check (number between 1 and 999),
  author_kind text not null default 'juizo' check (author_kind in ('juizo','parte_autora','parte_re','assistente_tecnico','outro')),
  author_detail text not null default '' check (char_length(author_detail) <= 160),
  topic text not null default '' check (char_length(topic) <= 160),
  text text not null check (char_length(text) between 2 and 4000),
  status text not null default 'aberta' check (status in ('aberta','em_analise','respondida','revisada','impugnada')),
  position integer not null default 1 check (position between 1 and 999),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, number)
);
create index if not exists amcf_case_questions_case_idx on public.amcf_case_questions(case_id, position);

create table if not exists public.amcf_question_answers (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  question_id uuid not null unique references public.amcf_case_questions(id) on delete cascade,
  answer text not null default '' check (char_length(answer) <= 40000),
  status text not null default 'rascunho' check (status in ('rascunho','revisao','revisada','aprovada')),
  reviewed_by uuid references public.amcf_members(id),
  reviewed_at timestamptz,
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status = 'rascunho' or reviewed_at is not null)
);

create table if not exists public.amcf_exams (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  exam_on date not null,
  modality text not null default 'presencial' check (modality in ('presencial','telepericia','documental')),
  status text not null default 'planejado' check (status in ('planejado','realizado','cancelado')),
  place text not null default '' check (char_length(place) <= 200),
  examined_party text not null default '' check (char_length(examined_party) <= 200),
  method_notes text not null default '' check (char_length(method_notes) <= 8000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amcf_exams_case_idx on public.amcf_exams(case_id, exam_on desc);

create table if not exists public.amcf_exam_findings (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  exam_id uuid not null references public.amcf_exams(id) on delete cascade,
  kind text not null default 'achado' check (kind in ('achado','medicao','documental','entrevista','exame_fisico')),
  title text not null check (char_length(title) between 2 and 200),
  detail text not null default '' check (char_length(detail) <= 8000),
  source_document_id uuid references public.amcf_documents(id),
  source_page integer check (source_page is null or source_page between 1 and 5000),
  recorded_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amcf_exam_findings_exam_idx on public.amcf_exam_findings(exam_id, created_at);

create table if not exists public.amcf_references (
  id uuid primary key default gen_random_uuid(),
  case_id uuid references public.amcf_cases(id),
  kind text not null default 'norma' check (kind in ('norma','doutrina','artigo','jurisprudencia','protocolo')),
  citation text not null check (char_length(citation) between 4 and 600),
  identifier text not null default '' check (char_length(identifier) <= 300),
  verified boolean not null default false,
  verified_by uuid references public.amcf_members(id),
  verified_at timestamptz,
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verified = false or char_length(identifier) >= 4)
);

create table if not exists public.amcf_report_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 3 and 120),
  scope text not null default 'laudo' check (scope in ('laudo','peticao','esclarecimento','parecer')),
  body text not null default '' check (char_length(body) <= 60000),
  is_default boolean not null default false,
  created_by uuid references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.amcf_case_analyses (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  version integer not null check (version between 1 and 999),
  title text not null default 'Análise pericial' check (char_length(title) between 3 and 200),
  status text not null default 'rascunho' check (status in ('rascunho','revisao','aprovada','substituida')),
  summary text not null default '' check (char_length(summary) <= 60000),
  method text not null default 'manual' check (method in ('manual','composicao')),
  engine text not null default 'composicao_local' check (char_length(engine) <= 60),
  input_fingerprint text,
  input_summary jsonb not null default '{}',
  warnings jsonb not null default '[]',
  approved_by uuid references public.amcf_members(id),
  approved_at timestamptz,
  approval_note text not null default '' check (char_length(approval_note) <= 2000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, version),
  check (status <> 'aprovada' or approved_at is not null)
);
create index if not exists amcf_case_analyses_case_idx on public.amcf_case_analyses(case_id, version desc);

create table if not exists public.amcf_analysis_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  analysis_id uuid not null references public.amcf_case_analyses(id) on delete cascade,
  section text not null check (section in ('resumo','cronologia','controversoes','divergencias','evidencias','lacunas')),
  kind text not null default 'registro' check (kind in ('alegacao','registro','inferencia','ausencia')),
  position integer not null default 1 check (position between 1 and 999),
  title text not null check (char_length(title) between 2 and 200),
  content text not null default '' check (char_length(content) <= 20000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amcf_analysis_items_analysis_idx on public.amcf_analysis_items(analysis_id, section, position);

create table if not exists public.amcf_reports (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  kind text not null default 'laudo' check (kind in ('laudo','peticao','esclarecimento')),
  title text not null check (char_length(title) between 3 and 200),
  version integer not null check (version between 1 and 999),
  status text not null default 'rascunho' check (status in ('rascunho','revisao','aprovado','substituido')),
  body text not null default '' check (char_length(body) <= 200000),
  template_id uuid references public.amcf_report_templates(id),
  analysis_id uuid references public.amcf_case_analyses(id),
  based_on uuid references public.amcf_reports(id),
  readiness jsonb not null default '{}',
  approved_by uuid references public.amcf_members(id),
  approved_at timestamptz,
  approval_note text not null default '' check (char_length(approval_note) <= 2000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (case_id, kind, version),
  check (status <> 'aprovado' or approved_at is not null)
);
create index if not exists amcf_reports_case_idx on public.amcf_reports(case_id, kind, version desc);

create table if not exists public.amcf_source_refs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  owner_kind text not null check (owner_kind in ('item_analise','resposta_quesito','laudo','achado_exame')),
  owner_id uuid not null,
  source_kind text not null check (source_kind in ('documento','pagina_documento','movimentacao','achado_exame','quesito','registro_manual','referencia')),
  document_id uuid references public.amcf_documents(id),
  page_number integer check (page_number is null or page_number between 1 and 5000),
  movement_id uuid references public.amcf_movements(id),
  finding_id uuid references public.amcf_exam_findings(id),
  question_id uuid references public.amcf_case_questions(id),
  reference_id uuid references public.amcf_references(id),
  quote text not null default '' check (char_length(quote) <= 4000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  check (source_kind <> 'registro_manual' or quote <> ''),
  check (source_kind <> 'pagina_documento' or (document_id is not null and page_number is not null))
);
create index if not exists amcf_source_refs_owner_idx on public.amcf_source_refs(owner_kind, owner_id);
create index if not exists amcf_source_refs_case_idx on public.amcf_source_refs(case_id);

create table if not exists public.amcf_case_financial_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  kind text not null check (kind in ('deposito','liberacao','alvara','honorario','despesa')),
  description text not null check (char_length(description) between 3 and 200),
  amount_cents bigint not null check (amount_cents >= 0),
  expected_on date,
  settled_on date,
  status text not null default 'previsto' check (status in ('previsto','confirmado','cancelado')),
  reference text not null default '' check (char_length(reference) <= 120),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'confirmado' or settled_on is not null)
);
create index if not exists amcf_case_financial_events_case_idx on public.amcf_case_financial_events(case_id, expected_on);

create table if not exists public.amcf_case_chats (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  title text not null default 'Consulta ao processo' check (char_length(title) between 3 and 160),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amcf_case_chats_case_idx on public.amcf_case_chats(case_id, created_at desc);

create table if not exists public.amcf_case_messages (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  chat_id uuid not null references public.amcf_case_chats(id) on delete cascade,
  role text not null check (role in ('pergunta','resposta')),
  content text not null check (char_length(content) between 1 and 20000),
  sources jsonb not null default '[]',
  engine text not null default 'busca_local' check (engine in ('busca_local','assistida_ia')),
  engine_note text not null default '' check (char_length(engine_note) <= 500),
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now()
);
create index if not exists amcf_case_messages_chat_idx on public.amcf_case_messages(chat_id, created_at);

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
    if tg_table_name in ('amcf_case_analyses','amcf_reports') and o->>'status' in ('aprovada','aprovado') then
      raise exception 'Versão aprovada não pode ser alterada. Crie uma nova versão.' using errcode = '42501';
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

create or replace function public.amcf_fill_case_from_parent() returns trigger
language plpgsql security definer set search_path = public as $$
declare resolved uuid;
begin
  resolved := case tg_table_name
    when 'amcf_analysis_items' then (select case_id from public.amcf_case_analyses where id = new.analysis_id)
    when 'amcf_question_answers' then (select case_id from public.amcf_case_questions where id = new.question_id)
    when 'amcf_exam_findings' then (select case_id from public.amcf_exams where id = new.exam_id)
    when 'amcf_case_messages' then (select case_id from public.amcf_case_chats where id = new.chat_id)
    when 'amcf_source_refs' then (case new.owner_kind
        when 'item_analise' then (select case_id from public.amcf_analysis_items where id = new.owner_id)
        when 'resposta_quesito' then (select case_id from public.amcf_question_answers where id = new.owner_id)
        when 'laudo' then (select case_id from public.amcf_reports where id = new.owner_id)
        when 'achado_exame' then (select case_id from public.amcf_exam_findings where id = new.owner_id)
      end)
    else new.case_id end;
  if resolved is null then raise exception 'Registro de origem não encontrado' using errcode = '42501'; end if;
  if new.case_id is not null and new.case_id <> resolved then
    raise exception 'O processo informado não corresponde ao registro de origem' using errcode = '42501';
  end if;
  new.case_id := resolved;
  return new;
end $$;
revoke all on function public.amcf_fill_case_from_parent() from public, anon;

create or replace function public.amcf_guard_source_ref() returns trigger
language plpgsql security definer set search_path = public as $$
declare pointers integer;
begin
  pointers := (case when new.document_id is null then 0 else 1 end)
            + (case when new.movement_id is null then 0 else 1 end)
            + (case when new.finding_id is null then 0 else 1 end)
            + (case when new.question_id is null then 0 else 1 end)
            + (case when new.reference_id is null then 0 else 1 end);
  if pointers > 1 then raise exception 'Cite apenas uma fonte por registro'; end if;
  if new.source_kind in ('documento','pagina_documento') then
    if new.document_id is null then raise exception 'Selecione o documento da fonte'; end if;
    if not exists (select 1 from public.amcf_documents d where d.id = new.document_id and d.case_id = new.case_id) then
      raise exception 'O documento citado não pertence a este processo' using errcode = '42501';
    end if;
    if new.source_kind = 'pagina_documento' and not exists (select 1 from public.amcf_document_pages p where p.document_id = new.document_id and p.page_number = new.page_number) then
      raise exception 'A página citada ainda não foi processada neste documento';
    end if;
  elsif new.source_kind = 'movimentacao' then
    if new.movement_id is null or not exists (select 1 from public.amcf_movements m where m.id = new.movement_id and m.case_id = new.case_id) then
      raise exception 'A movimentação citada não pertence a este processo' using errcode = '42501';
    end if;
  elsif new.source_kind = 'achado_exame' then
    if new.finding_id is null or not exists (select 1 from public.amcf_exam_findings f where f.id = new.finding_id and f.case_id = new.case_id) then
      raise exception 'O achado citado não pertence a este processo' using errcode = '42501';
    end if;
  elsif new.source_kind = 'quesito' then
    if new.question_id is null or not exists (select 1 from public.amcf_case_questions q where q.id = new.question_id and q.case_id = new.case_id) then
      raise exception 'O quesito citado não pertence a este processo' using errcode = '42501';
    end if;
  elsif new.source_kind = 'referencia' then
    if new.reference_id is null or not exists (select 1 from public.amcf_references r where r.id = new.reference_id and (r.case_id is null or r.case_id = new.case_id) and r.verified) then
      raise exception 'Somente referências verificadas podem ser citadas' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.amcf_guard_source_ref() from public, anon;

create or replace function public.amcf_question_followup() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.amcf_case_questions q
  set status = case
      when new.answer = '' then 'em_analise'
      when new.status in ('revisada','aprovada') then 'revisada'
      else 'respondida' end,
      updated_at = now()
  where q.id = new.question_id and q.status <> 'impugnada';
  return new;
end $$;
revoke all on function public.amcf_question_followup() from public, anon;

alter table public.amcf_case_questions enable row level security;
alter table public.amcf_question_answers enable row level security;
alter table public.amcf_exams enable row level security;
alter table public.amcf_exam_findings enable row level security;
alter table public.amcf_references enable row level security;
alter table public.amcf_report_templates enable row level security;
alter table public.amcf_case_analyses enable row level security;
alter table public.amcf_analysis_items enable row level security;
alter table public.amcf_reports enable row level security;
alter table public.amcf_source_refs enable row level security;
alter table public.amcf_case_financial_events enable row level security;
alter table public.amcf_case_chats enable row level security;
alter table public.amcf_case_messages enable row level security;

create policy questions_read on public.amcf_case_questions for select to authenticated using (public.amcf_can_case(case_id));
create policy questions_insert on public.amcf_case_questions for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy questions_update on public.amcf_case_questions for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy questions_delete on public.amcf_case_questions for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy answers_read on public.amcf_question_answers for select to authenticated using (public.amcf_can_case(case_id));
create policy answers_insert on public.amcf_question_answers for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy answers_update on public.amcf_question_answers for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy answers_delete on public.amcf_question_answers for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy exams_read on public.amcf_exams for select to authenticated using (public.amcf_can_case(case_id));
create policy exams_insert on public.amcf_exams for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy exams_update on public.amcf_exams for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy exams_delete on public.amcf_exams for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy findings_read on public.amcf_exam_findings for select to authenticated using (public.amcf_can_case(case_id));
create policy findings_insert on public.amcf_exam_findings for insert to authenticated with check (public.amcf_can_case(case_id) and recorded_by = auth.uid());
create policy findings_update on public.amcf_exam_findings for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy findings_delete on public.amcf_exam_findings for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy references_read on public.amcf_references for select to authenticated using (public.amcf_is_manager() or (case_id is not null and public.amcf_can_case(case_id)));
create policy references_insert on public.amcf_references for insert to authenticated with check (created_by = auth.uid() and (case_id is null or public.amcf_can_case(case_id)));
create policy references_update on public.amcf_references for update to authenticated using (public.amcf_is_manager() or (case_id is not null and public.amcf_can_case(case_id))) with check ((case_id is null or public.amcf_can_case(case_id)) and (public.amcf_is_manager() or not verified));
create policy references_delete on public.amcf_references for delete to authenticated using (public.amcf_is_manager());

create policy templates_read on public.amcf_report_templates for select to authenticated using (public.amcf_role() is not null);
create policy templates_manage on public.amcf_report_templates for all to authenticated using (public.amcf_is_manager()) with check (public.amcf_is_manager());

create policy analyses_read on public.amcf_case_analyses for select to authenticated using (public.amcf_can_case(case_id));
create policy analyses_insert on public.amcf_case_analyses for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy analyses_update on public.amcf_case_analyses for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));

create policy analysis_items_read on public.amcf_analysis_items for select to authenticated using (public.amcf_can_case(case_id));
create policy analysis_items_insert on public.amcf_analysis_items for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy analysis_items_update on public.amcf_analysis_items for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy analysis_items_delete on public.amcf_analysis_items for delete to authenticated using (public.amcf_can_case(case_id));

create policy reports_read on public.amcf_reports for select to authenticated using (public.amcf_can_case(case_id));
create policy reports_insert on public.amcf_reports for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy reports_update on public.amcf_reports for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy reports_delete on public.amcf_reports for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy source_refs_read on public.amcf_source_refs for select to authenticated using (public.amcf_can_case(case_id));
create policy source_refs_insert on public.amcf_source_refs for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy source_refs_update on public.amcf_source_refs for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy source_refs_delete on public.amcf_source_refs for delete to authenticated using (public.amcf_can_case(case_id));

create policy financial_events_read on public.amcf_case_financial_events for select to authenticated using (public.amcf_is_manager());
create policy financial_events_insert on public.amcf_case_financial_events for insert to authenticated with check (public.amcf_is_manager() and public.amcf_can_case(case_id) and created_by = auth.uid());
create policy financial_events_update on public.amcf_case_financial_events for update to authenticated using (public.amcf_is_manager()) with check (public.amcf_is_manager());
create policy financial_events_delete on public.amcf_case_financial_events for delete to authenticated using (public.amcf_role() = 'admin');

create policy chats_read on public.amcf_case_chats for select to authenticated using (public.amcf_can_case(case_id));
create policy chats_insert on public.amcf_case_chats for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy chats_update on public.amcf_case_chats for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy chats_delete on public.amcf_case_chats for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy messages_read on public.amcf_case_messages for select to authenticated using (public.amcf_can_case(case_id));
create policy messages_insert on public.amcf_case_messages for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy messages_delete on public.amcf_case_messages for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create trigger guard_row before insert or update on public.amcf_case_questions for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_question_answers for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_exams for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_exam_findings for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_references for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_report_templates for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_case_analyses for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_analysis_items for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_reports for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_source_refs for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_case_financial_events for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_case_chats for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_case_messages for each row execute function public.amcf_medical_guard();

create trigger fill_case before insert on public.amcf_analysis_items for each row execute function public.amcf_fill_case_from_parent();
create trigger fill_case before insert on public.amcf_question_answers for each row execute function public.amcf_fill_case_from_parent();
create trigger fill_case before insert on public.amcf_exam_findings for each row execute function public.amcf_fill_case_from_parent();
create trigger fill_case before insert on public.amcf_case_messages for each row execute function public.amcf_fill_case_from_parent();
create trigger fill_case before insert on public.amcf_source_refs for each row execute function public.amcf_fill_case_from_parent();

create trigger source_ref_check before insert or update on public.amcf_source_refs for each row execute function public.amcf_guard_source_ref();
create trigger question_followup after insert or update on public.amcf_question_answers for each row execute function public.amcf_question_followup();

create trigger audit_row after insert or update or delete on public.amcf_case_questions for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_question_answers for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_exams for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_exam_findings for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_references for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_report_templates for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_case_analyses for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_analysis_items for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_reports for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_source_refs for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_case_financial_events for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_case_chats for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_case_messages for each row execute function public.amcf_audit_row();

revoke all on public.amcf_case_questions, public.amcf_question_answers, public.amcf_exams, public.amcf_exam_findings, public.amcf_references, public.amcf_report_templates, public.amcf_case_analyses, public.amcf_analysis_items, public.amcf_reports, public.amcf_source_refs, public.amcf_case_financial_events, public.amcf_case_chats, public.amcf_case_messages from anon;
grant select, insert, update, delete on public.amcf_case_questions, public.amcf_question_answers, public.amcf_exams, public.amcf_exam_findings, public.amcf_references, public.amcf_report_templates, public.amcf_analysis_items, public.amcf_source_refs, public.amcf_case_financial_events, public.amcf_case_chats, public.amcf_case_messages to authenticated;
grant select, insert, update on public.amcf_case_analyses, public.amcf_reports to authenticated;

commit;