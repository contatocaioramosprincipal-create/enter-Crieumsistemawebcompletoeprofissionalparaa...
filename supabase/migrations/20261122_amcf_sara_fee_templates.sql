-- Evolução dos honorários AMCF: preços configurados pelo médico, sem valores inventados.
create table if not exists public.amcf_fee_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 160),
  service text not null check (char_length(service) between 2 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  amount_cents bigint not null check (amount_cents > 0),
  active boolean not null default true,
  created_by uuid not null default auth.uid() references public.amcf_members(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.amcf_fee_templates enable row level security;
grant select, insert, update, delete on public.amcf_fee_templates to authenticated;
drop policy if exists amcf_fee_templates_read on public.amcf_fee_templates;
create policy amcf_fee_templates_read on public.amcf_fee_templates for select to authenticated
  using (public.amcf_is_manager() or (public.amcf_role() = 'assistant' and active));
drop policy if exists amcf_fee_templates_insert on public.amcf_fee_templates;
create policy amcf_fee_templates_insert on public.amcf_fee_templates for insert to authenticated
  with check (public.amcf_is_manager() and created_by = auth.uid());
drop policy if exists amcf_fee_templates_update on public.amcf_fee_templates;
create policy amcf_fee_templates_update on public.amcf_fee_templates for update to authenticated
  using (public.amcf_is_manager()) with check (public.amcf_is_manager());
drop policy if exists amcf_fee_templates_delete on public.amcf_fee_templates;
create policy amcf_fee_templates_delete on public.amcf_fee_templates for delete to authenticated
  using (public.amcf_role() = 'admin');
create index if not exists idx_amcf_fee_templates_active on public.amcf_fee_templates(active,title);
alter table public.amcf_proposals
  add column if not exists fee_template_id uuid references public.amcf_fee_templates(id) on delete set null;
create index if not exists idx_amcf_proposals_fee_template on public.amcf_proposals(fee_template_id);
-- Assistentes consultam somente propostas de casos atribuídos, não o financeiro global.
drop policy if exists proposals_read on public.amcf_proposals;
create policy proposals_read on public.amcf_proposals for select to authenticated
 using (public.amcf_is_manager() or (public.amcf_role() = 'assistant'
   and case_id is not null and public.amcf_can_case(case_id)));
-- Assistentes podem criar apenas rascunhos de valor exato de um modelo ativo autorizado.
drop policy if exists proposals_insert on public.amcf_proposals;
create policy proposals_insert on public.amcf_proposals for insert to authenticated
 with check (
   created_by=auth.uid() and (
     public.amcf_is_manager()
     or (public.amcf_role() = 'assistant' and case_id is not null
       and public.amcf_can_case(case_id) and fee_template_id is not null
       and status='draft'
       and exists (
         select 1 from public.amcf_cases c
         where c.id=case_id and c.contact_id=contact_id
       )
       and exists (
         select 1 from public.amcf_fee_templates t
         where t.id=fee_template_id and t.active and t.amount_cents=amount_cents
           and t.service=service
       )
     )
   )
 );
-- Gestores preservam edição/exclusão; assistentes não alteram propostas emitidas.
-- O cadastro de casos já possui número CNJ, autor, réu, vara e resumo: sem alteração destrutiva.
