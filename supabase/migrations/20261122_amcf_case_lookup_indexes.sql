-- Mantém um processo único por número CNJ sem alterar os casos existentes.
create unique index if not exists amcf_cases_cnj_number_unique
 on public.amcf_cases(cnj_number)
 where cnj_number is not null;
create index if not exists amcf_documents_case_created_idx
 on public.amcf_documents(case_id,created_at desc);
create index if not exists amcf_proposals_case_created_idx
 on public.amcf_proposals(case_id,created_at desc);
create index if not exists amcf_interactions_case_created_idx
 on public.amcf_interactions(case_id,created_at desc);