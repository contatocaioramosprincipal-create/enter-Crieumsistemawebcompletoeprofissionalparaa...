-- Checklist operacional padrão sem presumir prazos, decisões ou atos periciais.
create or replace function public.amcf_new_case_checklist()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.amcf_case_checklist(case_id,created_by,title)
  values
    (new.id,new.created_by,'Conferir número CNJ, partes, vara e dados do processo'),
    (new.id,new.created_by,'Anexar autos, petição inicial e documentos pertinentes'),
    (new.id,new.created_by,'Verificar quesitos do juízo e das partes'),
    (new.id,new.created_by,'Conferir honorários e termo de aceite, se aplicável'),
    (new.id,new.created_by,'Validar agenda e datas processuais na fonte oficial'),
    (new.id,new.created_by,'Preparar documentação para revisão técnica do médico');
  return new;
end $$;
revoke all on function public.amcf_new_case_checklist() from public,anon,authenticated;
drop trigger if exists amcf_new_case_checklist_trigger on public.amcf_cases;
create trigger amcf_new_case_checklist_trigger after insert on public.amcf_cases
for each row execute function public.amcf_new_case_checklist();