-- Migração original: migration_20261007_202641000
create or replace function public.amcf_classify_movement(p_title text, p_detail text default '')
returns table (classification text, needs_human_review boolean, matched text)
language plpgsql immutable as $$
declare hay text; hit text;
begin
  hay := lower(coalesce(p_title,'') || ' ' || coalesce(p_detail,''));
  hit := substring(hay from 'prazo|intima[cç][aã]o|intimac|manifesta|impugna|recurso|embargos|contesta[cç]|r[eé]plica');
  if hit is not null then return query select 'possivel_prazo'::text, true, hit; return; end if;
  hit := substring(hay from 'per[íi]cia|audi[eê]ncia|designa|agenda|nomea|teleper');
  if hit is not null then return query select 'agenda'::text, false, hit; return; end if;
  hit := substring(hay from 'despacho|dec[ie]s|determina|juntada|junta|of[ií]cio|peti|conclus|remessa|distribu|cita[cç]|laudo|cumprimento');
  if hit is not null then return query select 'requer_acao'::text, true, hit; return; end if;
  return query select 'informativo'::text, false, ''::text;
end $$;
revoke all on function public.amcf_classify_movement(text,text) from public, anon;
grant execute on function public.amcf_classify_movement(text,text) to authenticated;