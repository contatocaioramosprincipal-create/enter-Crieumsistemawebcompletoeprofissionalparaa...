-- Corrige resolução de nomes em subconsultas RLS: comparar EXPLICITAMENTE com a proposta externa.
drop policy if exists proposals_insert on public.amcf_proposals;
create policy proposals_insert on public.amcf_proposals
  for insert to authenticated
  with check (
    amcf_proposals.created_by = auth.uid()
    and (
      public.amcf_is_manager()
      or (
        public.amcf_role() = 'assistant'
        and amcf_proposals.case_id is not null
        and public.amcf_can_case(amcf_proposals.case_id)
        and amcf_proposals.fee_template_id is not null
        and amcf_proposals.status = 'draft'
        and exists (
          select 1 from public.amcf_cases c
          where c.id = amcf_proposals.case_id
            and c.contact_id = amcf_proposals.contact_id
        )
        and exists (
          select 1 from public.amcf_fee_templates t
          where t.id = amcf_proposals.fee_template_id
            and t.active
            and t.amount_cents = amcf_proposals.amount_cents
            and t.service = amcf_proposals.service
        )
      )
    )
  );