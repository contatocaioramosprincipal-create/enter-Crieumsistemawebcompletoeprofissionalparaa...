-- Copiado sem alterações da migração original: migration_20260929_162328000
begin;
create table public.amcf_members (
 id uuid primary key, name text not null check(char_length(name) between 2 and 120), email text not null unique,
 role text not null check(role in ('admin','doctor','assistant')), status text not null default 'pending' check(status in ('pending','active','revoked')), created_at timestamptz not null default now()
);
alter table public.amcf_members enable row level security;
create function public.amcf_role() returns text language sql stable security definer set search_path = public as $$ select role from public.amcf_members where id = auth.uid() and status = 'active' and coalesce(auth.jwt()->>'aal','') = 'aal2' $$;
revoke all on function public.amcf_role() from public; grant execute on function public.amcf_role() to authenticated;
create function public.amcf_is_manager() returns boolean language sql stable security definer set search_path = public as $$ select coalesce(public.amcf_role() in ('admin','doctor'),false) $$;
revoke all on function public.amcf_is_manager() from public; grant execute on function public.amcf_is_manager() to authenticated;
create policy members_read on public.amcf_members for select to authenticated using (id = auth.uid() or (public.amcf_role() is not null and status = 'active') or public.amcf_role() = 'admin');

create table public.amcf_settings (id boolean primary key default true check(id), environment text not null default 'demo' check(environment = 'demo'), whatsapp text not null default '+5571997357789', timezone text not null default 'America/Bahia', updated_at timestamptz not null default now());
alter table public.amcf_settings enable row level security;
create policy settings_read on public.amcf_settings for select to authenticated using(public.amcf_role() is not null);
create policy settings_update on public.amcf_settings for update to authenticated using(public.amcf_role()='admin') with check(public.amcf_role()='admin');
insert into public.amcf_settings(id) values(true);

create table public.amcf_organizations (id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 2 and 160), created_by uuid not null default auth.uid() references public.amcf_members(id), created_at timestamptz not null default now());
create table public.amcf_contacts (id uuid primary key default gen_random_uuid(), name text not null check(char_length(name) between 2 and 160), kind text not null default 'lawyer' check(kind in ('lawyer','office','client','partner','doctor','other')), organization_id uuid references public.amcf_organizations(id), email text, phone text, source text not null default '', notes text not null default '' check(char_length(notes)<=4000), responsible_id uuid not null default auth.uid() references public.amcf_members(id), created_by uuid not null default auth.uid() references public.amcf_members(id), archived_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index amcf_contacts_email_idx on public.amcf_contacts(lower(email));
create index amcf_contacts_phone_idx on public.amcf_contacts(phone);
create index amcf_contacts_responsible_idx on public.amcf_contacts(responsible_id);
create table public.amcf_pipeline_stages (id uuid primary key default gen_random_uuid(), name text not null unique, position integer not null unique, outcome text not null default 'open' check(outcome in ('open','won','lost')));
create table public.amcf_case_stages (id uuid primary key default gen_random_uuid(), name text not null unique, position integer not null unique, terminal boolean not null default false);
insert into public.amcf_pipeline_stages(name,position,outcome) values ('Novo contato',1,'open'),('Em qualificação',2,'open'),('Proposta em preparação',3,'open'),('Em negociação',4,'open'),('Ganha',5,'won'),('Perdida',6,'lost');
insert into public.amcf_case_stages(name,position,terminal) values ('Triagem',1,false),('Proposta',2,false),('Contratação',3,false),('Documentação',4,false),('Análise técnica',5,false),('Quesitos',6,false),('Acompanhamento pericial',7,false),('Parecer',8,false),('Análise do laudo',9,false),('Concluído',10,true),('Arquivado',11,true);
create table public.amcf_opportunities (id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 200), contact_id uuid not null references public.amcf_contacts(id), stage_id uuid not null references public.amcf_pipeline_stages(id), service text not null check(char_length(service) between 2 and 160), responsible_id uuid not null default auth.uid() references public.amcf_members(id), loss_reason text, next_step text not null default '', created_by uuid not null default auth.uid() references public.amcf_members(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.amcf_opportunity_values (opportunity_id uuid primary key references public.amcf_opportunities(id), amount_cents bigint not null check(amount_cents >=0));
create table public.amcf_cases (id uuid primary key default gen_random_uuid(), reference text not null unique check(char_length(reference) between 3 and 40), title text not null check(char_length(title) between 3 and 200), contact_id uuid not null references public.amcf_contacts(id), opportunity_id uuid unique references public.amcf_opportunities(id), service text not null check(char_length(service) between 2 and 160), administrative_summary text not null default '' check(char_length(administrative_summary)<=4000), stage_id uuid not null references public.amcf_case_stages(id), responsible_id uuid not null references public.amcf_members(id), opened_on date not null default current_date, due_on date, archived_at timestamptz, created_by uuid not null default auth.uid() references public.amcf_members(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(due_on is null or due_on >= opened_on));
create table public.amcf_case_assignments (case_id uuid not null references public.amcf_cases(id), member_id uuid not null references public.amcf_members(id), created_at timestamptz not null default now(), primary key(case_id,member_id));
create index amcf_case_assignments_member_idx on public.amcf_case_assignments(member_id,case_id);
create index amcf_cases_due_idx on public.amcf_cases(due_on);
create index amcf_cases_contact_idx on public.amcf_cases(contact_id);
create index amcf_opportunities_contact_idx on public.amcf_opportunities(contact_id);
create function public.amcf_can_case(target uuid) returns boolean language sql stable security definer set search_path = public as $$ select public.amcf_is_manager() or (public.amcf_role()='assistant' and exists(select 1 from public.amcf_case_assignments where case_id=target and member_id=auth.uid())) $$;
create function public.amcf_can_contact(target uuid) returns boolean language sql stable security definer set search_path = public as $$ select public.amcf_is_manager() or (public.amcf_role()='assistant' and (exists(select 1 from public.amcf_contacts where id=target and responsible_id=auth.uid()) or exists(select 1 from public.amcf_cases c join public.amcf_case_assignments a on a.case_id=c.id where c.contact_id=target and a.member_id=auth.uid()))) $$;
revoke all on function public.amcf_can_case(uuid), public.amcf_can_contact(uuid) from public; grant execute on function public.amcf_can_case(uuid), public.amcf_can_contact(uuid) to authenticated;
create table public.amcf_interactions (id uuid primary key default gen_random_uuid(), contact_id uuid not null references public.amcf_contacts(id), case_id uuid references public.amcf_cases(id), kind text not null default 'note' check(kind in ('note','call','meeting','email')), summary text not null check(char_length(summary) between 1 and 4000), next_step text not null default '', next_on date, created_by uuid not null default auth.uid() references public.amcf_members(id), created_at timestamptz not null default now());
create table public.amcf_case_checklist (id uuid primary key default gen_random_uuid(), case_id uuid not null references public.amcf_cases(id), title text not null check(char_length(title) between 2 and 200), completed boolean not null default false, created_by uuid not null default auth.uid() references public.amcf_members(id), created_at timestamptz not null default now());
create table public.amcf_tasks (id uuid primary key default gen_random_uuid(), title text not null check(char_length(title) between 3 and 200), description text not null default '' check(char_length(description)<=2000), case_id uuid references public.amcf_cases(id), contact_id uuid references public.amcf_contacts(id), responsible_id uuid not null default auth.uid() references public.amcf_members(id), priority text not null default 'normal' check(priority in ('low','normal','high','urgent')), status text not null default 'pending' check(status in ('pending','in_progress','done','cancelled')), due_on date not null, created_by uuid not null default auth.uid() references public.amcf_members(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check(case_id is not null or contact_id is not null));
create index amcf_tasks_due_idx on public.amcf_tasks(due_on,status);
create index amcf_tasks_case_idx on public.amcf_tasks(case_id);
create table public.amcf_audit_events (id bigint generated always as identity primary key, actor_id uuid, action text not null, resource text not null, resource_id uuid, case_id uuid, changed_fields text[] not null default '{}', created_at timestamptz not null default now());
create index amcf_audit_case_idx on public.amcf_audit_events(case_id,created_at desc);

alter table public.amcf_organizations enable row level security;
alter table public.amcf_contacts enable row level security;
alter table public.amcf_pipeline_stages enable row level security;
alter table public.amcf_case_stages enable row level security;
alter table public.amcf_opportunities enable row level security;
alter table public.amcf_opportunity_values enable row level security;
alter table public.amcf_cases enable row level security;
alter table public.amcf_case_assignments enable row level security;
alter table public.amcf_interactions enable row level security;
alter table public.amcf_case_checklist enable row level security;
alter table public.amcf_tasks enable row level security;
alter table public.amcf_audit_events enable row level security;

create policy organizations_read on public.amcf_organizations for select to authenticated using(public.amcf_is_manager() or (public.amcf_role() is not null and created_by=auth.uid()) or exists(select 1 from public.amcf_contacts c where c.organization_id=id and public.amcf_can_contact(c.id)));
create policy organizations_insert on public.amcf_organizations for insert to authenticated with check(public.amcf_role() is not null and created_by=auth.uid());
create policy organizations_update on public.amcf_organizations for update to authenticated using(public.amcf_is_manager()) with check(public.amcf_is_manager());
create policy contacts_read on public.amcf_contacts for select to authenticated using(public.amcf_can_contact(id));
create policy contacts_insert on public.amcf_contacts for insert to authenticated with check(public.amcf_role() is not null and created_by=auth.uid() and (public.amcf_is_manager() or responsible_id=auth.uid()));
create policy contacts_update on public.amcf_contacts for update to authenticated using(public.amcf_is_manager() or (public.amcf_role()='assistant' and responsible_id=auth.uid())) with check(public.amcf_is_manager() or (public.amcf_role()='assistant' and responsible_id=auth.uid() and archived_at is null));
create policy pipeline_read on public.amcf_pipeline_stages for select to authenticated using(public.amcf_role() is not null);
create policy pipeline_manage on public.amcf_pipeline_stages for all to authenticated using(public.amcf_role()='admin') with check(public.amcf_role()='admin');
create policy stages_read on public.amcf_case_stages for select to authenticated using(public.amcf_role() is not null);
create policy stages_manage on public.amcf_case_stages for all to authenticated using(public.amcf_role()='admin') with check(public.amcf_role()='admin');
create policy opportunities_read on public.amcf_opportunities for select to authenticated using(public.amcf_is_manager() or (public.amcf_role()='assistant' and responsible_id=auth.uid()));
create policy opportunities_insert on public.amcf_opportunities for insert to authenticated with check(public.amcf_role() is not null and created_by=auth.uid() and public.amcf_can_contact(contact_id) and (public.amcf_is_manager() or responsible_id=auth.uid()));
create policy opportunities_update on public.amcf_opportunities for update to authenticated using(public.amcf_is_manager() or (public.amcf_role()='assistant' and responsible_id=auth.uid())) with check(public.amcf_can_contact(contact_id) and (public.amcf_is_manager() or (public.amcf_role()='assistant' and responsible_id=auth.uid())));
create policy opportunity_values_manage on public.amcf_opportunity_values for all to authenticated using(public.amcf_is_manager()) with check(public.amcf_is_manager());
create policy cases_read on public.amcf_cases for select to authenticated using(public.amcf_can_case(id));
create policy cases_insert on public.amcf_cases for insert to authenticated with check(public.amcf_is_manager() and created_by=auth.uid());
create policy cases_update on public.amcf_cases for update to authenticated using(public.amcf_can_case(id)) with check(public.amcf_can_case(id));
create policy assignments_read on public.amcf_case_assignments for select to authenticated using(public.amcf_can_case(case_id));
create policy assignments_manage on public.amcf_case_assignments for all to authenticated using(public.amcf_is_manager()) with check(public.amcf_is_manager() and exists(select 1 from public.amcf_members m where m.id=member_id and m.status='active'));
create policy interactions_read on public.amcf_interactions for select to authenticated using((case_id is not null and public.amcf_can_case(case_id)) or (case_id is null and public.amcf_can_contact(contact_id)));
create policy interactions_insert on public.amcf_interactions for insert to authenticated with check(created_by=auth.uid() and ((case_id is not null and public.amcf_can_case(case_id) and exists(select 1 from public.amcf_cases c where c.id=case_id and c.contact_id=amcf_interactions.contact_id)) or (case_id is null and public.amcf_can_contact(contact_id))));
create policy checklist_read on public.amcf_case_checklist for select to authenticated using(public.amcf_can_case(case_id));
create policy checklist_insert on public.amcf_case_checklist for insert to authenticated with check(public.amcf_can_case(case_id) and created_by=auth.uid());
create policy checklist_update on public.amcf_case_checklist for update to authenticated using(public.amcf_can_case(case_id)) with check(public.amcf_can_case(case_id));
create policy checklist_delete on public.amcf_case_checklist for delete to authenticated using(public.amcf_is_manager());
create policy tasks_read on public.amcf_tasks for select to authenticated using(public.amcf_is_manager() or (public.amcf_role()='assistant' and ((case_id is not null and public.amcf_can_case(case_id)) or (case_id is null and responsible_id=auth.uid() and public.amcf_can_contact(contact_id)))));
create policy tasks_insert on public.amcf_tasks for insert to authenticated with check(created_by=auth.uid() and (public.amcf_is_manager() or (public.amcf_role()='assistant' and responsible_id=auth.uid() and ((case_id is not null and public.amcf_can_case(case_id)) or (case_id is null and public.amcf_can_contact(contact_id))))));
create policy tasks_update on public.amcf_tasks for update to authenticated using(public.amcf_is_manager() or (public.amcf_role()='assistant' and ((case_id is not null and public.amcf_can_case(case_id)) or (case_id is null and responsible_id=auth.uid() and public.amcf_can_contact(contact_id))))) with check(public.amcf_is_manager() or (public.amcf_role()='assistant' and ((case_id is not null and public.amcf_can_case(case_id)) or (case_id is null and responsible_id=auth.uid() and public.amcf_can_contact(contact_id)))));
create policy audit_read on public.amcf_audit_events for select to authenticated using(public.amcf_is_manager() or (case_id is not null and public.amcf_can_case(case_id)));

create function public.amcf_guard_row() returns trigger language plpgsql security definer set search_path=public as $$
declare changed text[]; target uuid;
begin
 if tg_op='UPDATE' then
  if to_jsonb(new)->>'id' is distinct from to_jsonb(old)->>'id' or to_jsonb(new)->>'created_by' is distinct from to_jsonb(old)->>'created_by' or to_jsonb(new)->>'created_at' is distinct from to_jsonb(old)->>'created_at' then raise exception 'Campos de origem são imutáveis' using errcode='42501'; end if;
  if tg_table_name in ('amcf_cases','amcf_tasks','amcf_case_checklist','amcf_opportunities') then
   if (to_jsonb(new)->>'case_id') is distinct from (to_jsonb(old)->>'case_id') or (to_jsonb(new)->>'contact_id') is distinct from (to_jsonb(old)->>'contact_id') or (to_jsonb(new)->>'opportunity_id') is distinct from (to_jsonb(old)->>'opportunity_id') then raise exception 'O vínculo de origem é imutável' using errcode='42501'; end if;
  end if;
  if public.amcf_role()='assistant' and ((to_jsonb(new)->>'responsible_id') is distinct from (to_jsonb(old)->>'responsible_id') or (to_jsonb(new)->>'archived_at') is distinct from (to_jsonb(old)->>'archived_at') or (tg_table_name='amcf_cases' and (to_jsonb(new)->>'reference') is distinct from (to_jsonb(old)->>'reference'))) then raise exception 'Alteração exige responsável autorizado' using errcode='42501'; end if;
 end if;
 if tg_table_name='amcf_opportunities' and exists(select 1 from public.amcf_pipeline_stages s where s.id=new.stage_id and s.outcome='lost') and nullif(trim(new.loss_reason),'') is null then raise exception 'Informe o motivo de perda'; end if;
 if tg_table_name='amcf_cases' then
  if new.opportunity_id is not null and not exists(select 1 from public.amcf_opportunities o where o.id=new.opportunity_id and o.contact_id=new.contact_id) then raise exception 'Oportunidade e contato incompatíveis'; end if;
 end if;
 if tg_table_name='amcf_tasks' and new.case_id is not null then
  if new.contact_id is not null and not exists(select 1 from public.amcf_cases c where c.id=new.case_id and c.contact_id=new.contact_id) then raise exception 'Contato incompatível com o caso'; end if;
  if exists(select 1 from public.amcf_members where id=new.responsible_id and role='assistant') and not exists(select 1 from public.amcf_case_assignments a where a.case_id=new.case_id and a.member_id=new.responsible_id) then raise exception 'Responsável não atribuído ao caso'; end if;
 end if;
 if to_jsonb(new) ? 'responsible_id' and not exists(select 1 from public.amcf_members m where m.id=(to_jsonb(new)->>'responsible_id')::uuid and m.status='active') then raise exception 'Responsável deve estar ativo'; end if;
 if to_jsonb(new) ? 'updated_at' then new := jsonb_populate_record(new,jsonb_build_object('updated_at',now())); end if;
 if tg_table_name='amcf_contacts' then new.email:=nullif(lower(trim(new.email)),''); new.phone:=nullif(regexp_replace(new.phone,'[^0-9]','','g'),''); end if;
 return new;
end $$;
revoke all on function public.amcf_guard_row() from public;
create function public.amcf_audit_row() returns trigger language plpgsql security definer set search_path=public as $$
declare payload jsonb; previous jsonb; fields text[]; target_case uuid; target_id uuid;
begin
 payload:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 previous:=case when tg_op='UPDATE' then to_jsonb(old) else '{}'::jsonb end;
 select array_agg(key order by key) into fields from jsonb_each(payload) where value is distinct from previous->key and key not in ('updated_at');
 target_id:=coalesce(payload->>'id',payload->>'opportunity_id',payload->>'case_id')::uuid;
 target_case:=case when tg_table_name='amcf_cases' then target_id else (payload->>'case_id')::uuid end;
 insert into public.amcf_audit_events(actor_id,action,resource,resource_id,case_id,changed_fields) values(auth.uid(),tg_op,tg_table_name,target_id,target_case,coalesce(fields,'{}'));
 return coalesce(new,old);
end $$;
revoke all on function public.amcf_audit_row() from public;
do $$ declare t text; begin
 foreach t in array array['amcf_contacts','amcf_opportunities','amcf_cases','amcf_case_checklist','amcf_tasks'] loop execute format('create trigger guard_row before insert or update on public.%I for each row execute function public.amcf_guard_row()',t); end loop;
 foreach t in array array['amcf_members','amcf_contacts','amcf_organizations','amcf_opportunities','amcf_opportunity_values','amcf_cases','amcf_case_assignments','amcf_interactions','amcf_case_checklist','amcf_tasks'] loop execute format('create trigger audit_row after insert or update or delete on public.%I for each row execute function public.amcf_audit_row()',t); end loop;
end $$;
create function public.amcf_access_context() returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('member',(select jsonb_build_object('id',id,'name',name,'email',email,'role',role,'status',status) from public.amcf_members where id=auth.uid()),'mfa',coalesce(auth.jwt()->>'aal','')='aal2','capabilities',jsonb_build_object('manage',public.amcf_is_manager(),'team',coalesce(public.amcf_role()='admin',false),'finance',public.amcf_is_manager(),'operate',public.amcf_role() is not null))
$$;
revoke all on function public.amcf_access_context() from public; grant execute on function public.amcf_access_context() to authenticated;
grant usage on schema public to authenticated;
grant select,insert,update,delete on public.amcf_members,public.amcf_settings,public.amcf_organizations,public.amcf_contacts,public.amcf_pipeline_stages,public.amcf_case_stages,public.amcf_opportunities,public.amcf_opportunity_values,public.amcf_cases,public.amcf_case_assignments,public.amcf_interactions,public.amcf_case_checklist,public.amcf_tasks,public.amcf_audit_events to authenticated;
commit;