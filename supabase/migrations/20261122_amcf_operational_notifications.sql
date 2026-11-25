-- AMCF: notificações confiáveis, sem cálculo automático de prazos judiciais.
create unique index if not exists amcf_notifications_event_unique
  on public.amcf_notifications(member_id,kind,resource,resource_id)
  where resource is not null and resource_id is not null;
create index if not exists amcf_notifications_unread_idx
  on public.amcf_notifications(member_id,created_at desc) where read_at is null;

create or replace function public.amcf_notify_movement() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
declare target uuid;
begin
  if new.classification not in ('requer_acao','possivel_prazo','agenda') then return new; end if;
  for target in
    select member_id from (
      select c.responsible_id as member_id from public.amcf_cases c where c.id = new.case_id
      union
      select a.member_id from public.amcf_case_assignments a where a.case_id = new.case_id
    ) m join public.amcf_members mb on mb.id=m.member_id and mb.status='active'
  loop
    insert into public.amcf_notifications(member_id,case_id,kind,title,body,resource,resource_id)
    values(target,new.case_id,'movimentacao',
      case when new.classification='possivel_prazo' then 'Possível prazo: revisão necessária'
      when new.classification='agenda' then 'Movimentação de agenda: conferir'
      else 'Movimentação exige atenção' end,
      left('Data da movimentação: '||new.occurred_on::text||'. Confira o processo e a fonte oficial antes de qualquer providência.',2000),
      'movimentacao',new.id)
    on conflict do nothing;
  end loop;
  return new;
end $$;
revoke all on function public.amcf_notify_movement() from public, anon, authenticated;
drop trigger if exists amcf_movement_notification_trigger on public.amcf_movements;
create trigger amcf_movement_notification_trigger
  after insert on public.amcf_movements for each row execute function public.amcf_notify_movement();

create or replace function public.amcf_daily_operational_review()
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare local_today date := (now() at time zone 'America/Sao_Paulo')::date;
        generated integer := 0;
        row_count integer;
begin
  -- Due dates are entered by humans; they are NOT computed judicial deadlines.
  insert into public.amcf_notifications(member_id,case_id,kind,title,body,resource,resource_id)
  select t.responsible_id,t.case_id,'prazo',
    case when t.due_on < local_today then 'Tarefa vencida: conferência necessária'
         else 'Tarefa próxima do vencimento' end,
    left('Vencimento cadastrado: '||t.due_on::text||'. Revise o processo e confirme os prazos legais na fonte oficial.',2000),
    'tarefa',t.id
  from public.amcf_tasks t
  join public.amcf_members mb on mb.id=t.responsible_id and mb.status='active'
  where t.status in ('pending','in_progress') and t.due_on <= local_today+3
  on conflict do nothing;
  get diagnostics row_count = row_count;
  generated := generated + row_count;

  insert into public.amcf_notifications(member_id,case_id,kind,title,body,resource,resource_id)
  select c.responsible_id,s.case_id,'prazo','Próxima ação do processo: conferir',
    left('Etapa: '||s.label||'. Data administrativa cadastrada: '||s.next_action_on::text||'. Confira a agenda e a fonte oficial.',2000),
    'etapa',s.id
  from public.amcf_case_steps s
  join public.amcf_cases c on c.id=s.case_id and c.archived_at is null
  join public.amcf_members mb on mb.id=c.responsible_id and mb.status='active'
  where s.status in ('pendente','em_andamento') and s.next_action_on is not null and s.next_action_on<=local_today+3
  on conflict do nothing;
  get diagnostics row_count = row_count;
  generated := generated + row_count;

  insert into public.amcf_notifications(member_id,case_id,kind,title,body,resource,resource_id)
  select c.responsible_id,d.case_id,'documento','Falha de leitura documental: revisar',
    'O texto de um documento não foi extraído. Confira manualmente o PDF/imagem e seus dados.',
    'documento',d.id
  from public.amcf_documents d
  join public.amcf_cases c on c.id=d.case_id and c.archived_at is null
  join public.amcf_members mb on mb.id=c.responsible_id and mb.status='active'
  where d.text_status in ('falha','ocr_pendente','nao_suportado')
  on conflict do nothing;
  get diagnostics row_count = row_count;
  generated := generated + row_count;

  return jsonb_build_object('created',generated,'date',local_today);
end $$;
revoke all on function public.amcf_daily_operational_review() from public,anon,authenticated;
select cron.schedule('amcf_operational_review_daily','15 11 * * *','select public.amcf_daily_operational_review();');