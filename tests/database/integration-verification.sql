-- TESTE EXECUTÁVEL DA INTEGRAÇÃO EXTERNA (transação revertida no final)
begin;
create or replace function public.amcf_test_assert(ok boolean, label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'TEST FAILED: %', label; end if; end $$;

insert into public.amcf_members(id,name,email,role,status) values
 ('10000000-0000-4000-8000-000000000001','Médico sintético','medico.integracao@amcf-test.invalid','doctor','active');
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;
insert into public.amcf_contacts(id,name,responsible_id,created_by) values
 ('20000000-0000-4000-8000-000000000001','Contato sintético A','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');
insert into public.amcf_cases(id,reference,title,contact_id,service,stage_id,responsible_id,created_by,cnj_number,action_type)
select '30000000-0000-4000-8000-000000000001','TESTE-INT-1','Processo de integração','20000000-0000-4000-8000-000000000001','Perícia judicial',id,'10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','1234567-89.2026.8.05.0001','pericia_judicial' from public.amcf_case_stages where position=1;
insert into public.amcf_case_steps(case_id,label,next_action,next_action_on,status,created_by)
values ('30000000-0000-4000-8000-000000000001','Análise documental','Conferir prontuário e exames.','2026-03-15','pendente','10000000-0000-4000-8000-000000000001');

reset role;
insert into public.amcf_integration_keys(id,label,token_hash,scopes,owner_id)
values ('80000000-0000-4000-8000-000000000001','teste pericial', encode(digest('token-pericial-123456789012345678901234'::text,'sha256'::text),'hex'),
        array['movements:write','cases:read'], '10000000-0000-4000-8000-000000000001');

select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-1','30000000-0000-4000-8000-000000000001','2026-03-05','Publicação de despacho','Determina manifestação da parte.') ->> 'ok')::boolean,'integracao criou movimentacao');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-1','30000000-0000-4000-8000-000000000001','2026-03-05','Publicação de despacho','Determina manifestação da parte.') ->> 'duplicated')::boolean,'integracao idempotente por external_ref');
select public.amcf_test_assert((select count(*)=1 from public.amcf_movements where external_ref='ext-per-1'),'integracao nao duplicou movimentacao');
select public.amcf_test_assert((select source='api' and classified_by='regra' from public.amcf_movements where external_ref='ext-per-1'),'origem e classificacao por regra registradas');
select public.amcf_test_assert((select classification='possivel_prazo' and needs_human_review from public.amcf_movements where external_ref='ext-per-1'),'termo de manifestacao classificado como possivel prazo');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-4','30000000-0000-4000-8000-000000000001','2026-03-08','Perícia médica designada','Nomeação de perito e designação de data.') ->> 'ok')::boolean,'integracao criou segunda movimentacao');
select public.amcf_test_assert((select classification='agenda' from public.amcf_movements where external_ref='ext-per-4'),'designacao de pericia classificada como compromisso');
do $$ declare m jsonb; begin
  m := public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-5','30000000-0000-4000-8000-000000000001','2026-03-09','Remessa dos autos ao perito','Conclusão para elaboração do laudo.');
  if (m->>'ok')::boolean is not true then raise exception 'TEST FAILED: integracao nao criou a movimentacao de remessa'; end if;
  if (select classification from public.amcf_movements where id = (m->>'movement_id')::uuid) <> 'requer_acao' then
    raise exception 'TEST FAILED: remessa classificada como requer acao'; end if;
  if (select needs_human_review from public.amcf_movements where id = (m->>'movement_id')::uuid) is not true then
    raise exception 'TEST FAILED: movimentacao de remessa sem revisao humana sugerida'; end if;
end $$;
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-6','30000000-0000-4000-8000-000000000001','2026-03-10','Registro interno sem termo','Sem palavras-chave conhecidas.') ->> 'ok')::boolean,'integracao criou movimentacao neutra');
select public.amcf_test_assert((select classification='informativo' from public.amcf_movements where external_ref='ext-per-6'),'movimentacao neutra classificada como informativa');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-7','30000000-0000-4000-8000-000000000001','2026-03-11','Juntada de exame complementar','Juntada de laudo e exame de imagem.','agenda') ->> 'ok')::boolean,'integracao aceitou classificacao informada');
select public.amcf_test_assert((select classification='agenda' and classified_by='api' from public.amcf_movements where external_ref='ext-per-7'),'classificacao informada pela integracao preservada');
select public.amcf_test_assert((select count(*)>0 from public.amcf_integration_logs where action='movement.upsert' and success),'log da integracao registrado');
select public.amcf_test_assert((select count(*)>0 from public.amcf_integration_refs where resource='movement' and external_ref='ext-per-1'),'referencia externa registrada para idempotencia');

select public.amcf_test_assert((public.amcf_api_movement_upsert('token-invalido-123456789012345678901234','ext-per-2','30000000-0000-4000-8000-000000000001','2026-03-06','Tentativa') ->> 'ok')::boolean is false,'token invalido rejeitado');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-3','30000000-0000-4000-8000-000000000001','2026-03-07','Titulo valido com classificacao invalida',null,'invalida') ->> 'ok')::boolean is false,'classificacao invalida rejeitada na integracao');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-8','30000000-0000-4000-8000-000000000002','2026-03-07','Processo inexistente') ->> 'ok')::boolean is false,'processo inexistente rejeitado na integracao');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ab','30000000-0000-4000-8000-000000000001','2026-03-07','Titulo valido') ->> 'ok')::boolean is false,'external_ref curto rejeitado');

select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','30000000-0000-4000-8000-000000000001') ->> 'ok')::boolean,'integracao le o processo');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','30000000-0000-4000-8000-000000000001') -> 'case' ->> 'cnj_number') = '1234567-89.2026.8.05.0001','integracao le o numero CNJ');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','30000000-0000-4000-8000-000000000001') -> 'case' ->> 'action_type') = 'pericia_judicial','integracao le o tipo de atuacao');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','30000000-0000-4000-8000-000000000001') -> 'case' -> 'next_action' ->> 'next_action') = 'Conferir prontuário e exames.','integracao le a proxima acao');
select public.amcf_test_assert(jsonb_array_length(public.amcf_api_case_read('token-pericial-123456789012345678901234','30000000-0000-4000-8000-000000000001') -> 'case' -> 'movements') >= 4,'integracao le as movimentacoes do processo');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','30000000-0000-4000-8000-000000000002') ->> 'ok')::boolean is false,'integracao nao le processo inexistente');
select public.amcf_test_assert((select count(*)>0 from public.amcf_integration_logs where action='case.read' and success),'log de leitura do processo registrado');

-- O token de movimentações não lê o processo (escopo próprio de cada operação).
reset role;
insert into public.amcf_integration_keys(id,label,token_hash,scopes,owner_id)
values ('80000000-0000-4000-8000-000000000002','teste escopo restrito', encode(digest('token-escopo-123456789012345678901234567'::text,'sha256'::text),'hex'),
        array['contacts:write'], '10000000-0000-4000-8000-000000000001');
select public.amcf_test_assert((public.amcf_api_case_read('token-escopo-123456789012345678901234567','30000000-0000-4000-8000-000000000001') ->> 'ok')::boolean is false,'escopo insuficiente rejeitado na leitura');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-escopo-123456789012345678901234567','ext-per-9','30000000-0000-4000-8000-000000000001','2026-03-12','Titulo valido') ->> 'ok')::boolean is false,'escopo insuficiente rejeitado na movimentacao');

rollback;
