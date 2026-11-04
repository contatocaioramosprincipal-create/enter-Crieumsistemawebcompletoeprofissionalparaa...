-- Migração original: migration_20261007_201744000
begin;

-- EVOLUÇÃO MÉDICO-PERICIAL — 2/6

alter table public.amcf_documents add column if not exists content_hash text;
alter table public.amcf_documents add column if not exists text_status text not null default 'pendente';
alter table public.amcf_documents add column if not exists text_error text;
alter table public.amcf_documents add column if not exists text_pages integer not null default 0;
alter table public.amcf_documents add column if not exists text_chars integer not null default 0;
alter table public.amcf_documents add column if not exists extracted_at timestamptz;
alter table public.amcf_documents add column if not exists extraction_engine text;
alter table public.amcf_documents add column if not exists suggested_category text;
alter table public.amcf_documents add column if not exists category_confirmed boolean not null default false;
alter table public.amcf_documents add column if not exists category_confirmed_by uuid references public.amcf_members(id);
alter table public.amcf_documents add column if not exists category_confirmed_at timestamptz;

alter table public.amcf_documents drop constraint if exists amcf_documents_text_status_check;
alter table public.amcf_documents add constraint amcf_documents_text_status_check
  check (text_status in ('pendente','processando','extraido','parcial','falha','ocr_pendente','nao_suportado'));
alter table public.amcf_documents drop constraint if exists amcf_documents_hash_format;
alter table public.amcf_documents add constraint amcf_documents_hash_format
  check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$');

create unique index if not exists amcf_documents_dedupe_idx on public.amcf_documents(case_id, content_hash) where content_hash is not null;
create index if not exists amcf_documents_text_status_idx on public.amcf_documents(case_id, text_status);

create table if not exists public.amcf_document_pages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.amcf_documents(id) on delete cascade,
  page_number integer not null check (page_number between 1 and 5000),
  content text not null default '' check (char_length(content) <= 400000),
  char_count integer not null default 0,
  extraction_status text not null default 'extraida' check (extraction_status in ('extraida','sem_texto','ocr_pendente','ocr_aplicado')),
  created_at timestamptz not null default now(),
  unique (document_id, page_number)
);
create index if not exists amcf_document_pages_doc_idx on public.amcf_document_pages(document_id, page_number);

create table if not exists public.amcf_document_jobs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.amcf_documents(id) on delete cascade,
  kind text not null check (kind in ('texto','ocr','classificacao')),
  status text not null default 'pendente' check (status in ('pendente','processando','concluido','falha','nao_configurado')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  last_error text,
  detail jsonb not null default '{}',
  requested_by uuid references public.amcf_members(id),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists amcf_document_jobs_doc_idx on public.amcf_document_jobs(document_id, created_at desc);

create table if not exists public.amcf_movements (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  occurred_on date not null,
  occurred_at timestamptz,
  title text not null check (char_length(title) between 2 and 300),
  detail text not null default '' check (char_length(detail) <= 20000),
  source text not null default 'manual' check (source in ('manual','importacao','api','adaptador')),
  external_ref text,
  dedupe_hash text not null,
  classification text not null default 'informativo' check (classification in ('informativo','requer_acao','possivel_prazo','agenda')),
  classified_by text not null default 'regra' check (classified_by in ('regra','manual','api')),
  classification_note text not null default '' check (char_length(classification_note) <= 300),
  needs_human_review boolean not null default false,
  review_state text not null default 'nova' check (review_state in ('nova','revisada','ignorada')),
  reviewed_by uuid references public.amcf_members(id),
  reviewed_at timestamptz,
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (review_state = 'nova' or reviewed_at is not null)
);
create unique index if not exists amcf_movements_dedupe_idx on public.amcf_movements(case_id, dedupe_hash);
create unique index if not exists amcf_movements_extref_idx on public.amcf_movements(case_id, source, external_ref) where external_ref is not null;
create index if not exists amcf_movements_case_idx on public.amcf_movements(case_id, occurred_on desc);
create index if not exists amcf_movements_review_idx on public.amcf_movements(case_id, review_state);

create or replace function public.amcf_classify_movement(p_title text, p_detail text default '')
returns table (classification text, needs_human_review boolean, matched text)
language plpgsql immutable as $$
declare hay text; hit text;
begin
  hay := lower(coalesce(p_title,'') || ' ' || coalesce(p_detail,''));
  hit := substring(hay from 'prazo|intima[cç][aã]o|intimac|manifesta|impugna|recurso|embargos|contesta[cç]|r[eé]plica');
  if hit is not null then return query select 'possivel_prazo'::text, true, hit; return; end if;
  hit := substring(hay from 'despacho|dec[ie]s|determina|nomea|agenda|designa|audi[eê]ncia|per[íi]cia|laudo|junta|of[ií]cio');
  if hit is not null then return query select 'agenda'::text, false, hit; return; end if;
  hit := substring(hay from 'cita[cç][aã]o|cumprimento|peti[cç][aã]o|conclus|remessa|distribu');
  if hit is not null then return query select 'requer_acao'::text, true, hit; return; end if;
  return query select 'informativo'::text, false, ''::text;
end $$;
revoke all on function public.amcf_classify_movement(text,text) from public, anon;
grant execute on function public.amcf_classify_movement(text,text) to authenticated;

create or replace function public.amcf_movement_prepare() returns trigger
language plpgsql security definer set search_path = public as $$
declare rule record;
begin
  if tg_op = 'INSERT' then
    new.dedupe_hash := md5(coalesce(new.external_ref,'') || '|' || new.occurred_on::text || '|' || coalesce(new.title,'') || '|' || left(coalesce(new.detail,''), 500));
    if coalesce(new.classified_by,'regra') = 'regra' then
      select * into rule from public.amcf_classify_movement(new.title, new.detail);
      new.classification := rule.classification;
      new.needs_human_review := rule.needs_human_review;
      new.classification_note := case when rule.matched = '' then 'Sem termo de prazo reconhecido pela regra.' else 'Termo reconhecido pela regra: ' || rule.matched end;
    end if;
  elsif coalesce(new.classified_by,'regra') = 'manual' then
    new.needs_human_review := false;
  end if;
  if new.review_state <> 'nova' and new.reviewed_at is null then new.reviewed_at := now(); end if;
  if new.review_state <> 'nova' and new.reviewed_by is null then new.reviewed_by := auth.uid(); end if;
  new.updated_at := now();
  return new;
end $$;
revoke all on function public.amcf_movement_prepare() from public, anon;

create table if not exists public.amcf_notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.amcf_members(id),
  case_id uuid references public.amcf_cases(id),
  kind text not null check (kind in ('movimentacao','prazo','laudo','documento','financeiro','sistema')),
  title text not null check (char_length(title) between 2 and 200),
  body text not null default '' check (char_length(body) <= 2000),
  resource text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists amcf_notifications_member_idx on public.amcf_notifications(member_id, read_at, created_at desc);

create or replace function public.amcf_movement_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare target record; ref text; headline text;
begin
  if new.classification not in ('requer_acao','possivel_prazo','agenda') then return new; end if;
  select reference into ref from public.amcf_cases where id = new.case_id;
  headline := case new.classification
    when 'possivel_prazo' then 'Possível prazo — confirmar com o responsável'
    when 'agenda' then 'Movimentação com possível compromisso'
    else 'Movimentação requer ação' end;
  for target in
    select m.id from public.amcf_members m where m.id = (select responsible_id from public.amcf_cases where id = new.case_id)
    union
    select a.member_id from public.amcf_case_assignments a where a.case_id = new.case_id
  loop
    insert into public.amcf_notifications (member_id, case_id, kind, title, body, resource, resource_id)
    values (target.id, new.case_id, case(new.classification) when 'possivel_prazo' then 'prazo' else 'movimentacao' end,
      headline, coalesce(ref,'Processo') || ' · ' || new.title, 'amcf_movements', new.id);
  end loop;
  return new;
end $$;
revoke all on function public.amcf_movement_notify() from public, anon;

create table if not exists public.amcf_movement_syncs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.amcf_cases(id),
  source_kind text not null check (source_kind in ('datajud','pje','esaj','adaptador','importacao')),
  status text not null check (status in ('em_andamento','concluida','parcial','falha','nao_configurada')),
  items_found integer not null default 0,
  items_new integer not null default 0,
  items_duplicated integer not null default 0,
  coverage text[] not null default '{}',
  error text,
  detail jsonb not null default '{}',
  created_by uuid references public.amcf_members(id),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists amcf_movement_syncs_case_idx on public.amcf_movement_syncs(case_id, started_at desc);

create table if not exists public.amcf_court_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(label) between 2 and 120),
  kind text not null default 'datajud' check (kind in ('datajud','pje','esaj','outro')),
  endpoint text not null default '' check (char_length(endpoint) <= 300),
  credential_name text check (credential_name is null or char_length(credential_name) between 3 and 120),
  enabled boolean not null default false,
  coverage text[] not null default '{}',
  uncovered_note text not null default '' check (char_length(uncovered_note) <= 1000),
  last_check_at timestamptz,
  last_status text not null default 'nao_verificado',
  created_by uuid references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.amcf_document_pages enable row level security;
alter table public.amcf_document_jobs enable row level security;
alter table public.amcf_movements enable row level security;
alter table public.amcf_movement_syncs enable row level security;
alter table public.amcf_notifications enable row level security;
alter table public.amcf_court_sources enable row level security;

create policy document_pages_read on public.amcf_document_pages for select to authenticated using (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id)));
create policy document_pages_insert on public.amcf_document_pages for insert to authenticated with check (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id)));
create policy document_pages_update on public.amcf_document_pages for update to authenticated using (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id))) with check (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id)));
create policy document_pages_delete on public.amcf_document_pages for delete to authenticated using (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id) and public.amcf_is_manager()));

create policy document_jobs_read on public.amcf_document_jobs for select to authenticated using (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id)));
create policy document_jobs_insert on public.amcf_document_jobs for insert to authenticated with check (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id)));
create policy document_jobs_update on public.amcf_document_jobs for update to authenticated using (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id))) with check (exists(select 1 from public.amcf_documents d where d.id = document_id and public.amcf_can_case(d.case_id)));

create policy movements_read on public.amcf_movements for select to authenticated using (public.amcf_can_case(case_id));
create policy movements_insert on public.amcf_movements for insert to authenticated with check (public.amcf_can_case(case_id) and created_by = auth.uid());
create policy movements_update on public.amcf_movements for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));
create policy movements_delete on public.amcf_movements for delete to authenticated using (public.amcf_can_case(case_id) and public.amcf_is_manager());

create policy movement_syncs_read on public.amcf_movement_syncs for select to authenticated using (public.amcf_can_case(case_id));
create policy movement_syncs_insert on public.amcf_movement_syncs for insert to authenticated with check (public.amcf_can_case(case_id));
create policy movement_syncs_update on public.amcf_movement_syncs for update to authenticated using (public.amcf_can_case(case_id)) with check (public.amcf_can_case(case_id));

create policy court_sources_read on public.amcf_court_sources for select to authenticated using (public.amcf_is_manager());
create policy court_sources_manage on public.amcf_court_sources for all to authenticated using (public.amcf_role() = 'admin') with check (public.amcf_role() = 'admin');

create policy notifications_own_read on public.amcf_notifications for select to authenticated using (member_id = auth.uid());
create policy notifications_own_update on public.amcf_notifications for update to authenticated using (member_id = auth.uid()) with check (member_id = auth.uid());

create trigger guard_row before insert or update on public.amcf_movements for each row execute function public.amcf_medical_guard();
create trigger prepare_row before insert or update on public.amcf_movements for each row execute function public.amcf_movement_prepare();
create trigger notify_row after insert on public.amcf_movements for each row execute function public.amcf_movement_notify();
create trigger guard_row before insert or update on public.amcf_movement_syncs for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_court_sources for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_document_pages for each row execute function public.amcf_medical_guard();
create trigger guard_row before insert or update on public.amcf_document_jobs for each row execute function public.amcf_medical_guard();

create trigger audit_row after insert or update or delete on public.amcf_movements for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_movement_syncs for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_court_sources for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_document_pages for each row execute function public.amcf_audit_row();
create trigger audit_row after insert or update or delete on public.amcf_document_jobs for each row execute function public.amcf_audit_row();

revoke all on public.amcf_document_pages, public.amcf_document_jobs, public.amcf_movements, public.amcf_movement_syncs, public.amcf_notifications, public.amcf_court_sources from anon;
grant select, insert, update, delete on public.amcf_document_pages, public.amcf_document_jobs, public.amcf_movements, public.amcf_movement_syncs, public.amcf_notifications, public.amcf_court_sources to authenticated;

commit;