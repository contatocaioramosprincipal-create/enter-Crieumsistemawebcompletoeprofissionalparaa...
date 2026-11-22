-- Impede vincular publicações a processos de CNJ diferente.
create or replace function public.amcf_validate_appointment_case()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare case_cnj text;
begin
  new.updated_at=now();
  if new.linked_case_id is not null then
    select cnj_number into case_cnj from public.amcf_cases where id=new.linked_case_id;
    if case_cnj is null or new.cnj_number is null
       or regexp_replace(case_cnj,'\D','','g') <> regexp_replace(new.cnj_number,'\D','','g')
    then
      raise exception 'O número CNJ da publicação não corresponde ao do caso vinculado';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.amcf_validate_appointment_case() from public,anon,authenticated;
drop trigger if exists amcf_validate_appointment_case_trigger on public.amcf_appointment_leads;
create trigger amcf_validate_appointment_case_trigger before update on public.amcf_appointment_leads
for each row execute function public.amcf_validate_appointment_case();