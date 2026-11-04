-- Copiado sem alterações da migração original: migration_20260929_162421000
begin;
alter policy organizations_read on public.amcf_organizations using(public.amcf_is_manager() or (public.amcf_role() is not null and created_by=auth.uid()) or exists(select 1 from public.amcf_contacts c where c.organization_id=amcf_organizations.id and public.amcf_can_contact(c.id)));
alter policy members_read on public.amcf_members using(id=auth.uid() or public.amcf_role()='admin');
create function public.amcf_directory() returns table(id uuid,name text,role text) language sql stable security definer set search_path=public as $$ select id,name,role from public.amcf_members where status='active' and public.amcf_role() is not null order by name $$;
revoke all on function public.amcf_directory() from public; grant execute on function public.amcf_directory() to authenticated;
create or replace function public.amcf_guard_row() returns trigger language plpgsql security definer set search_path=public as $$
declare n jsonb:=to_jsonb(new); o jsonb; begin
 if tg_op='UPDATE' then
  o:=to_jsonb(old);
  if n->>'id' is distinct from o->>'id' or n->>'created_by' is distinct from o->>'created_by' or n->>'created_at' is distinct from o->>'created_at' then raise exception 'Campos de origem são imutáveis' using errcode='42501'; end if;
  if tg_table_name in ('amcf_cases','amcf_tasks','amcf_case_checklist','amcf_opportunities') and (n->>'case_id' is distinct from o->>'case_id' or n->>'contact_id' is distinct from o->>'contact_id' or n->>'opportunity_id' is distinct from o->>'opportunity_id') then raise exception 'O vínculo de origem é imutável' using errcode='42501'; end if;
  if public.amcf_role()='assistant' and (n->>'responsible_id' is distinct from o->>'responsible_id' or n->>'archived_at' is distinct from o->>'archived_at' or (tg_table_name='amcf_cases' and n->>'reference' is distinct from o->>'reference')) then raise exception 'Alteração exige responsável autorizado' using errcode='42501'; end if;
 end if;
 if tg_table_name='amcf_opportunities' then
  if exists(select 1 from public.amcf_pipeline_stages s where s.id=(n->>'stage_id')::uuid and s.outcome='lost') and nullif(trim(n->>'loss_reason'),'') is null then raise exception 'Informe o motivo de perda'; end if;
 end if;
 if tg_table_name='amcf_cases' then
  if n->>'opportunity_id' is not null and not exists(select 1 from public.amcf_opportunities p where p.id=(n->>'opportunity_id')::uuid and p.contact_id=(n->>'contact_id')::uuid) then raise exception 'Oportunidade e contato incompatíveis'; end if;
  if public.amcf_role()='assistant' and n->>'stage_id' is distinct from o->>'stage_id' and exists(select 1 from public.amcf_case_stages s where s.id=(n->>'stage_id')::uuid and s.terminal) then raise exception 'Encerramento exige responsável autorizado' using errcode='42501'; end if;
 end if;
 if tg_table_name='amcf_tasks' and n->>'case_id' is not null then
  if n->>'contact_id' is not null and not exists(select 1 from public.amcf_cases c where c.id=(n->>'case_id')::uuid and c.contact_id=(n->>'contact_id')::uuid) then raise exception 'Contato incompatível com o caso'; end if;
  if exists(select 1 from public.amcf_members where id=(n->>'responsible_id')::uuid and role='assistant') and not exists(select 1 from public.amcf_case_assignments a where a.case_id=(n->>'case_id')::uuid and a.member_id=(n->>'responsible_id')::uuid) then raise exception 'Responsável não atribuído ao caso'; end if;
 end if;
 if n ? 'responsible_id' and not exists(select 1 from public.amcf_members m where m.id=(n->>'responsible_id')::uuid and m.status='active') then raise exception 'Responsável deve estar ativo'; end if;
 if n ? 'updated_at' then new:=jsonb_populate_record(new,jsonb_build_object('updated_at',now())); end if;
 if tg_table_name='amcf_contacts' then new.email:=nullif(lower(trim(new.email)),''); new.phone:=nullif(regexp_replace(new.phone,'[^0-9]','','g'),''); end if;
 return new;
end $$;
create function public.amcf_manage_member(target uuid,new_status text,new_role text) returns void language plpgsql security definer set search_path=public as $$ begin
 if public.amcf_role() is distinct from 'admin' then raise exception 'Acesso negado' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(713579);
 if new_status not in ('pending','active','revoked') or new_role not in ('admin','doctor','assistant') then raise exception 'Estado inválido'; end if;
 if exists(select 1 from public.amcf_members where id=target and role='admin' and status='active') and (new_role<>'admin' or new_status<>'active') and (select count(*) from public.amcf_members where role='admin' and status='active')<=1 then raise exception 'Mantenha ao menos um administrador ativo'; end if;
 update public.amcf_members set status=new_status,role=new_role where id=target;
 if not found then raise exception 'Integrante não encontrado'; end if;
end $$;
revoke all on function public.amcf_manage_member(uuid,text,text) from public; grant execute on function public.amcf_manage_member(uuid,text,text) to authenticated;
create function public.amcf_dashboard() returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('contacts',(select count(*) from public.amcf_contacts where archived_at is null),'cases',(select count(*) from public.amcf_cases c join public.amcf_case_stages s on s.id=c.stage_id where not s.terminal and c.archived_at is null),'opportunities',(select count(*) from public.amcf_opportunities o join public.amcf_pipeline_stages s on s.id=o.stage_id where s.outcome='open'),'overdue',(select count(*) from public.amcf_tasks where status in ('pending','in_progress') and due_on < (now() at time zone 'America/Bahia')::date),'pipeline',(select coalesce(jsonb_agg(x),'[]') from (select s.name,s.position,count(o.id) as count from public.amcf_pipeline_stages s left join public.amcf_opportunities o on o.stage_id=s.id group by s.name,s.position order by s.position) x))
$$;
revoke all on function public.amcf_dashboard() from public; grant execute on function public.amcf_dashboard() to authenticated;
commit;