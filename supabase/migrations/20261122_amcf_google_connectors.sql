-- Conexões Google são POR PESSOA. Nenhum Google pessoal é vinculado sem consentimento OAuth.
create table if not exists public.amcf_google_connections(
 owner_id uuid primary key references public.amcf_members(id) on delete cascade,
 google_email text not null check(length(google_email)<=254),
 refresh_secret_id uuid not null,
 granted_scopes text not null default '',
 calendar_id text not null default 'primary',
 connected_at timestamptz not null default now(),
 last_calendar_sync_at timestamptz,
 last_gmail_sync_at timestamptz
);
alter table public.amcf_google_connections enable row level security;
grant select on public.amcf_google_connections to authenticated;
drop policy if exists google_connections_own_read on public.amcf_google_connections;
create policy google_connections_own_read on public.amcf_google_connections for select to authenticated
using(owner_id=auth.uid());

create table if not exists public.amcf_google_oauth_states(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.amcf_members(id) on delete cascade,
 expires_at timestamptz not null default now()+interval '10 minutes',
 used_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.amcf_google_oauth_states enable row level security;
-- Sem GRANT para anon/authenticated: uso exclusivo de Edge Functions service_role.

create table if not exists public.amcf_google_calendar_events(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.amcf_members(id),
 case_id uuid references public.amcf_cases(id) on delete set null,
 summary text not null check(length(summary) between 3 and 180),
 starts_at timestamptz not null,
 ends_at timestamptz not null check(ends_at>starts_at),
 google_event_id text,
 google_updated_at timestamptz,
 last_synced_at timestamptz,
 deleted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists google_calendar_event_external_unique on public.amcf_google_calendar_events(owner_id,google_event_id) where google_event_id is not null;
create index if not exists google_calendar_events_owner_dates_idx on public.amcf_google_calendar_events(owner_id,starts_at);
alter table public.amcf_google_calendar_events enable row level security;
grant select,insert,update on public.amcf_google_calendar_events to authenticated;
drop policy if exists google_calendar_events_own_read on public.amcf_google_calendar_events;
create policy google_calendar_events_own_read on public.amcf_google_calendar_events for select to authenticated using(owner_id=auth.uid() and (case_id is null or public.amcf_can_case(case_id)));
drop policy if exists google_calendar_events_own_insert on public.amcf_google_calendar_events;
create policy google_calendar_events_own_insert on public.amcf_google_calendar_events for insert to authenticated
with check(owner_id=auth.uid() and (case_id is null or public.amcf_can_case(case_id)));
drop policy if exists google_calendar_events_own_update on public.amcf_google_calendar_events;
create policy google_calendar_events_own_update on public.amcf_google_calendar_events for update to authenticated
using(owner_id=auth.uid() and (case_id is null or public.amcf_can_case(case_id)))
with check(owner_id=auth.uid() and (case_id is null or public.amcf_can_case(case_id)));

create or replace function public.amcf_google_event_touch() returns trigger
language plpgsql set search_path=public,pg_temp as $$
begin
 new.updated_at=now();
 return new;
end $$;
drop trigger if exists google_calendar_event_touch on public.amcf_google_calendar_events;
create trigger google_calendar_event_touch before update on public.amcf_google_calendar_events
for each row execute function public.amcf_google_event_touch();

create table if not exists public.amcf_google_email_messages(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.amcf_members(id),
 case_id uuid not null references public.amcf_cases(id) on delete cascade,
 gmail_message_id text not null,
 gmail_thread_id text,
 sender text not null default '' check(length(sender)<=300),
 recipient text not null default '' check(length(recipient)<=300),
 subject text not null default '' check(length(subject)<=400),
 excerpt text not null default '' check(length(excerpt)<=400),
 received_at timestamptz,
 recorded_at timestamptz not null default now(),
 unique(owner_id,case_id,gmail_message_id)
);
create index if not exists google_email_messages_case_idx on public.amcf_google_email_messages(case_id,recorded_at desc);
alter table public.amcf_google_email_messages enable row level security;
grant select on public.amcf_google_email_messages to authenticated;
drop policy if exists google_email_owner_read on public.amcf_google_email_messages;
create policy google_email_owner_read on public.amcf_google_email_messages for select to authenticated
using(owner_id=auth.uid() and public.amcf_can_case(case_id));

create table if not exists public.amcf_google_sent_messages(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.amcf_members(id),
 case_id uuid not null references public.amcf_cases(id) on delete cascade,
 recipient text not null check(length(recipient)<=254),
 subject text not null check(length(subject)<=400),
 gmail_message_id text,
 sent_at timestamptz not null default now()
);
alter table public.amcf_google_sent_messages enable row level security;
grant select on public.amcf_google_sent_messages to authenticated;
drop policy if exists google_sent_owner_read on public.amcf_google_sent_messages;
create policy google_sent_owner_read on public.amcf_google_sent_messages for select to authenticated
using(owner_id=auth.uid() and public.amcf_can_case(case_id));

-- Apenas service_role acessa os tokens no Vault. Nunca na Data API.
create or replace function public.amcf_google_save_connection(p_owner uuid,p_email text,p_refresh text,p_scopes text)
returns void language plpgsql security definer set search_path='' as $$
declare v_secret uuid;
begin
 if not exists(select 1 from public.amcf_members where id=p_owner and status='active') then raise exception 'Membro não ativo'; end if;
 if length(p_refresh)<10 or length(p_refresh)>10000 or length(p_email)>254 then raise exception 'Dados inválidos'; end if;
 select refresh_secret_id into v_secret from public.amcf_google_connections where owner_id=p_owner for update;
 if v_secret is null then
  select vault.create_secret(p_refresh,'amcf_google_refresh_'||p_owner::text,'OAuth refresh token do usuário autorizado') into v_secret;
 else
  perform vault.update_secret(v_secret,p_refresh);
 end if;
 insert into public.amcf_google_connections(owner_id,google_email,refresh_secret_id,granted_scopes,connected_at)
 values(p_owner,p_email,v_secret,p_scopes,now())
 on conflict(owner_id) do update set google_email=excluded.google_email,refresh_secret_id=excluded.refresh_secret_id,granted_scopes=excluded.granted_scopes,connected_at=now();
end $$;
revoke all on function public.amcf_google_save_connection(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.amcf_google_save_connection(uuid,text,text,text) to service_role;

create or replace function public.amcf_google_get_refresh(p_owner uuid)
returns text language sql security definer set search_path='' as $$
 select v.decrypted_secret from public.amcf_google_connections c
 join vault.decrypted_secrets v on v.id=c.refresh_secret_id
 where c.owner_id=p_owner limit 1;
$$;
revoke all on function public.amcf_google_get_refresh(uuid) from public,anon,authenticated;
grant execute on function public.amcf_google_get_refresh(uuid) to service_role;

create or replace function public.amcf_google_disconnect(p_owner uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v_secret uuid;
begin
 select refresh_secret_id into v_secret from public.amcf_google_connections where owner_id=p_owner;
 delete from public.amcf_google_connections where owner_id=p_owner;
 if v_secret is not null then delete from vault.secrets where id=v_secret; end if;
end $$;
revoke all on function public.amcf_google_disconnect(uuid) from public,anon,authenticated;
grant execute on function public.amcf_google_disconnect(uuid) to service_role;