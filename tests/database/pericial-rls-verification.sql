-- TESTE EXECUTÁVEL DA EVOLUÇÃO MÉDICO-PERICIAL (transação revertida no final)
begin;
create or replace function public.amcf_test_assert(ok boolean, label text) returns void language plpgsql as $$ begin if ok is not true then raise exception 'TEST FAILED: %', label; end if; end $$;
create or replace function public.amcf_test_blocked(sql_text text, label text) returns void language plpgsql as $$
begin
  begin
    execute sql_text;
    raise exception 'TEST FAILED: %', label;
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;
end $$;
create or replace function public.amcf_test_count(sql_text text) returns integer language plpgsql as $$ declare n integer; begin execute sql_text into n; return n; end $$;

insert into public.amcf_members(id,name,email,role,status) values
 ('{DOCTOR}','Médico sintético','medico.pericial@amcf-test.invalid','doctor','active'),
 ('{ASSISTANT}','Assistente sintético','assistente.pericial@amcf-test.invalid','assistant','active');

select set_config('request.jwt.claims','{"sub":"{DOCTOR}","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;

insert into public.amcf_contacts(id,name,responsible_id,created_by) values
 ('{CONTACT1}','Contato sintético A','{DOCTOR}','{DOCTOR}'),
 ('{CONTACT2}','Contato sintético B','{DOCTOR}','{DOCTOR}');
insert into public.amcf_cases(id,reference,title,contact_id,service,stage_id,responsible_id,created_by,cnj_number,action_type,court)
select '{CASE1}','TESTE-PER-1','Processo pericial sintético 1','{CONTACT1}','Perícia judicial médica',id,'{DOCTOR}','{DOCTOR}','1234567-89.2026.8.05.0001','pericia_judicial','TJBA' from public.amcf_case_stages where position=1;
insert into public.amcf_cases(id,reference,title,contact_id,service,stage_id,responsible_id,created_by)
select '{CASE2}','TESTE-PER-2','Processo pericial sintético 2','{CONTACT2}','Assistência técnica',id,'{DOCTOR}','{DOCTOR}' from public.amcf_case_stages where position=1;
insert into public.amcf_case_assignments(case_id,member_id) values ('{CASE1}','{ASSISTANT}');
insert into public.amcf_documents(id,case_id,contact_id,title,category,storage_path,file_name,mime_type,size_bytes,content_hash,text_status,text_pages,text_chars,uploaded_by)
values ('{DOC1}','{CASE1}','{CONTACT1}','Prontuário sintético','exame','db/teste-per-1','prontuario.pdf','application/pdf',2048, repeat('a',64),'extraido',2,64,'{DOCTOR}');
insert into public.amcf_documents(id,case_id,contact_id,title,category,storage_path,file_name,mime_type,size_bytes,content_hash,text_status,uploaded_by)
values ('{DOC2}','{CASE2}','{CONTACT2}','Documento de outro processo','outro','db/teste-per-2','outro.pdf','application/pdf',1024, repeat('b',64),'pendente','{DOCTOR}');
insert into public.amcf_document_pages(document_id,page_number,content,char_count) values
 ('{DOC1}',1,'Paciente relata dor lombar há seis meses, sem melhora com analgesia.',62),
 ('{DOC1}',2,'Exame físico sem alterações neurológicas.',40);
insert into public.amcf_case_steps(case_id,label,next_action,next_action_on,status,created_by)
values ('{CASE1}','Análise documental','Conferir prontuário e exames.', '2026-03-15','pendente','{DOCTOR}');

-- 1) regra de classificação, aviso interno, dedupe e próxima ação
insert into public.amcf_movements(id,case_id,occurred_on,title,detail,source,created_by)
values ('{MOV1}','{CASE1}','2026-03-01','Intimação para manifestar sobre o laudo','Concedido prazo para manifestação.','manual','{DOCTOR}');
select public.amcf_test_assert((select classification='possivel_prazo' and needs_human_review from public.amcf_movements where id='{MOV1}'),'regra classifica intimacao com prazo como possivel prazo');
select public.amcf_test_assert((select source='manual' from public.amcf_movements where id='{MOV1}'),'origem manual registrada');
select public.amcf_test_assert((select count(*)=1 from public.amcf_notifications where resource_id='{MOV1}' and member_id='{DOCTOR}'),'aviso interno criado para o responsavel');
insert into public.amcf_movements(case_id,occurred_on,title,detail,source,created_by)
values ('{CASE1}','2026-03-01','Intimação para manifestar sobre o laudo','Concedido prazo para manifestação.','importacao','{DOCTOR}')
on conflict (case_id, dedupe_hash) do nothing;
select public.amcf_test_assert((select count(*)=1 from public.amcf_movements where case_id='{CASE1}'),'movimentacao repetida nao duplica no mesmo processo');
select public.amcf_test_assert((select count(*)=0 from public.amcf_movements where case_id='{CASE2}'),'movimentacao nao vaza para outro processo');
select public.amcf_test_assert((public.amcf_case_next_action('{CASE1}') ->> 'next_action') = 'Conferir prontuário e exames.','proxima acao do processo calculada');

-- 2) isolamento do assistente
select set_config('request.jwt.claims','{"sub":"{ASSISTANT}","aal":"aal2","role":"authenticated"}',true);
select public.amcf_test_assert((select count(*)=1 from public.amcf_movements),'assistente ve apenas movimentacoes do caso atribuido');
select public.amcf_test_assert((select count(*)=0 from public.amcf_documents where case_id='{CASE2}'),'documento de outro processo invisivel para assistente');
select public.amcf_test_assert((select count(*)=0 from public.amcf_case_analyses),'analise de outro processo invisivel para assistente');
select public.amcf_test_assert((select count(*)=0 from public.amcf_case_steps where case_id='{CASE2}'),'etapas de outro processo invisiveis para assistente');
select public.amcf_test_blocked('insert into public.amcf_movements(case_id,occurred_on,title,created_by) values (''{CASE2}'',''2026-03-02'',''Tentativa externa'',''{ASSISTANT}'')','assistente criou movimentacao em processo alheio');
select public.amcf_test_blocked('insert into public.amcf_case_questions(case_id,number,text,created_by) values (''{CASE2}'',1,''Quesito em processo alheio'',''{ASSISTANT}'')','assistente criou quesito em processo alheio');
select public.amcf_test_blocked('select public.amcf_analysis_create(''{CASE2}'',''Análise indevida'')','assistente criou analise em processo alheio');
select public.amcf_test_blocked('select public.amcf_case_search(''{CASE2}'',''lombar'')','assistente consultou outro processo');
select public.amcf_test_assert((select count(*)=0 from public.amcf_case_financial_events),'assistente nao ve eventos financeiros do processo');
do $$ declare d jsonb; begin
  d := public.amcf_my_day();
  if (d->>'finance_visible')::boolean then raise exception 'TEST FAILED: assistente recebeu financeiro no meu dia'; end if;
  if jsonb_array_length(d->'receivables') <> 0 then raise exception 'TEST FAILED: assistente recebeu contas a receber'; end if;
end $$;

-- 3) análise: composição com fontes, aprovação, imutabilidade
select set_config('request.jwt.claims','{"sub":"{DOCTOR}","aal":"aal2","role":"authenticated"}',true);
do $$ declare aid uuid; items integer; begin
  aid := public.amcf_analysis_create('{CASE1}','Análise pericial sintética');
  if (select version from public.amcf_case_analyses where id = aid) <> 1 then raise exception 'TEST FAILED: versao inicial da analise incorreta'; end if;
  perform public.amcf_analysis_compose(aid);
  select count(*) into items from public.amcf_analysis_items where analysis_id = aid;
  if items < 3 then raise exception 'TEST FAILED: composicao gerou % itens', items; end if;
  if exists (select 1 from public.amcf_analysis_items i where i.analysis_id = aid and i.kind in ('registro','inferencia')
             and not exists (select 1 from public.amcf_source_refs r where r.owner_kind='item_analise' and r.owner_id=i.id)) then
    raise exception 'TEST FAILED: item de registro sem fonte citada'; end if;
  if not exists (select 1 from public.amcf_source_refs r join public.amcf_analysis_items i on i.id = r.owner_id
                 where i.analysis_id = aid and r.source_kind='pagina_documento' and r.document_id='{DOC1}') then
    raise exception 'TEST FAILED: composicao nao citou pagina de documento'; end if;
  if not exists (select 1 from public.amcf_source_refs r join public.amcf_analysis_items i on i.id = r.owner_id
                 where i.analysis_id = aid and r.source_kind='movimentacao' and r.movement_id='{MOV1}') then
    raise exception 'TEST FAILED: composicao nao citou movimentacao'; end if;
  if not exists (select 1 from public.amcf_analysis_items where analysis_id = aid and section='lacunas' and kind='ausencia') then
    raise exception 'TEST FAILED: composicao nao apontou lacuna do documento sem texto'; end if;
  perform public.amcf_analysis_compose(aid);
  if (select count(*) from public.amcf_analysis_items where analysis_id = aid) <> items then raise exception 'TEST FAILED: composicao duplicou itens'; end if;
  perform public.amcf_analysis_approve(aid,'Aprovação sintética da versão 1');
  if (select status from public.amcf_case_analyses where id = aid) <> 'aprovada' then raise exception 'TEST FAILED: analise nao aprovada'; end if;
end $$;
select public.amcf_test_blocked('update public.amcf_case_analyses set summary = ''reescrito'' where status = ''aprovada'' and case_id = ''{CASE1}''','versao aprovada da analise foi reescrita');
select public.amcf_test_blocked('delete from public.amcf_analysis_items where analysis_id in (select id from public.amcf_case_analyses where case_id = ''{CASE1}'' and status = ''aprovada'')','item de analise aprovada foi excluido');
select public.amcf_test_blocked('delete from public.amcf_source_refs where case_id = ''{CASE1}'' and created_at > ''2000-01-01'' and owner_id in (select id from public.amcf_analysis_items where analysis_id in (select id from public.amcf_case_analyses where case_id = ''{CASE1}'' and status = ''aprovada''))','fonte de analise aprovada foi excluida');

-- 4) nova versão substitui a anterior sem reescrevê-la
do $$ declare a1 uuid; a2 uuid; begin
  select id into a1 from public.amcf_case_analyses where case_id='{CASE1}' and version=1;
  a2 := public.amcf_analysis_create('{CASE1}','Análise pericial sintética v2', a1);
  perform public.amcf_analysis_compose(a2);
  perform public.amcf_analysis_approve(a2,'Aprovação sintética da versão 2');
  if (select status from public.amcf_case_analyses where id = a1) <> 'substituida' then raise exception 'TEST FAILED: versao anterior nao foi substituida'; end if;
  if (select status from public.amcf_case_analyses where id = a2) <> 'aprovada' then raise exception 'TEST FAILED: nova versao nao aprovada'; end if;
  if (select count(*) from public.amcf_analysis_items where analysis_id = a2) = 0 then raise exception 'TEST FAILED: nova versao sem itens copiados'; end if;
end $$;
select public.amcf_test_blocked('update public.amcf_case_analyses set summary = ''reescrito'' where status = ''substituida'' and case_id = ''{CASE1}''','versao substituida foi reescrita');

-- 5) validação cruzada das fontes
do $$ declare aid uuid; item uuid; begin
  aid := public.amcf_analysis_create('{CASE1}','Análise em rascunho para fontes');
  insert into public.amcf_analysis_items(case_id,analysis_id,section,kind,position,title,content,created_by)
  values ('{CASE1}',aid,'resumo','registro',1,'Item sintético de rascunho','Conteúdo do item.','{DOCTOR}') returning id into item;
  insert into public.amcf_source_refs(case_id,owner_kind,owner_id,source_kind,document_id,page_number,quote,created_by)
  values ('{CASE1}','item_analise',item,'pagina_documento','{DOC1}',1,'Paciente relata dor lombar há seis meses.','{DOCTOR}');
  if not exists (select 1 from public.amcf_source_refs where owner_id = item and page_number = 1) then raise exception 'TEST FAILED: fonte de pagina nao registrada'; end if;
  if (select case_id from public.amcf_source_refs where owner_id = item) <> '{CASE1}' then raise exception 'TEST FAILED: processo da fonte nao herdado do item'; end if;
end $$;
select public.amcf_test_blocked('insert into public.amcf_source_refs(case_id,owner_kind,owner_id,source_kind,document_id,quote,created_by) select ''{CASE1}'',''item_analise'',i.id,''documento'',''{DOC2}'',''documento de outro processo'',''{DOCTOR}'' from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where a.case_id = ''{CASE1}'' and a.status = ''rascunho'' limit 1','fonte de outro processo foi aceita');
select public.amcf_test_blocked('insert into public.amcf_source_refs(case_id,owner_kind,owner_id,source_kind,document_id,page_number,quote,created_by) select ''{CASE1}'',''item_analise'',i.id,''pagina_documento'',''{DOC1}'',99,''pagina inexistente'',''{DOCTOR}'' from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where a.case_id = ''{CASE1}'' and a.status = ''rascunho'' limit 1','pagina inexistente foi aceita como fonte');
select public.amcf_test_blocked('insert into public.amcf_source_refs(case_id,owner_kind,owner_id,source_kind,quote,created_by) select ''{CASE2}'',''item_analise'',i.id,''registro_manual'',''texto'',''{DOCTOR}'' from public.amcf_analysis_items i join public.amcf_case_analyses a on a.id = i.analysis_id where a.case_id = ''{CASE1}'' and a.status = ''rascunho'' limit 1','processo informado foi aceito sem correspondencia');
select public.amcf_test_assert((select count(*)=0 from public.amcf_source_refs where case_id='{CASE2}'),'fonte invalida nao ficou registrada');

-- 6) referências: só verificadas podem ser citadas
do $$ declare ref_id uuid; aid uuid; item uuid; begin
  insert into public.amcf_references(case_id,kind,citation,identifier,created_by)
  values ('{CASE1}','artigo','Art. 473 do Código de Processo Civil','https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm','{DOCTOR}') returning id into ref_id;
  select id into aid from public.amcf_case_analyses where case_id='{CASE1}' and status='rascunho' order by version desc limit 1;
  select id into item from public.amcf_analysis_items where analysis_id = aid order by position limit 1;
  begin
    insert into public.amcf_source_refs(case_id,owner_kind,owner_id,source_kind,reference_id,created_by)
    values ('{CASE1}','item_analise',item,'referencia',ref_id,'{DOCTOR}');
    raise exception 'TEST FAILED: referencia nao verificada foi citada';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;
  update public.amcf_references set verified = true where id = ref_id;
  if (select verified_by from public.amcf_references where id = ref_id) is null then raise exception 'TEST FAILED: verificacao sem registro do responsavel'; end if;
  insert into public.amcf_source_refs(case_id,owner_kind,owner_id,source_kind,reference_id,quote,created_by)
  values ('{CASE1}','item_analise',item,'referencia',ref_id,'Art. 473 do CPC','{DOCTOR}');
  if not exists (select 1 from public.amcf_source_refs where owner_id = item and reference_id = ref_id) then raise exception 'TEST FAILED: referencia verificada nao pode ser citada'; end if;
end $$;
select public.amcf_test_blocked('insert into public.amcf_references(case_id,kind,citation,identifier,verified,created_by) values (''{CASE1}'',''doutrina'',''Referência sem identificador verificável'','''',true,''{DOCTOR}'')','referencia verificada sem identificador foi aceita');

-- 7) exame e achados
do $$ declare eid uuid; begin
  insert into public.amcf_exams(case_id,exam_on,status,place,created_by)
  values ('{CASE1}','2026-03-10','realizado','Clínica sintética','{DOCTOR}') returning id into eid;
  insert into public.amcf_exam_findings(exam_id,kind,title,detail,source_document_id,source_page,recorded_by)
  values (eid,'achado','Mobilidade lombar reduzida','Registro do exame pericial.','{DOC1}',1,'{DOCTOR}');
  if (select case_id from public.amcf_exam_findings where exam_id = eid) <> '{CASE1}' then raise exception 'TEST FAILED: processo do achado incorreto'; end if;
end $$;
select public.amcf_test_blocked('insert into public.amcf_exam_findings(exam_id,kind,title,recorded_by,source_document_id,source_page) values ((select id from public.amcf_exams where case_id = ''{CASE1}'' limit 1),''achado'',''Achado com página inexistente'',''{DOCTOR}'',''{DOC1}'',99)','achado aceitou pagina inexistente');
select public.amcf_test_blocked('insert into public.amcf_exam_findings(exam_id,kind,title,recorded_by,source_document_id,source_page) values ((select id from public.amcf_exams where case_id = ''{CASE1}'' limit 1),''achado'',''Achado com documento de outro processo'',''{DOCTOR}'',''{DOC2}'',1)','achado aceitou documento de outro processo');

-- 8) quesitos, prontidão e aprovação do laudo
do $$ declare qid uuid; rid uuid; ready jsonb; begin
  insert into public.amcf_case_questions(case_id,number,text,topic,created_by)
  values ('{CASE1}',1,'O periciado apresenta incapacidade laborativa?','Incapacidade','{DOCTOR}') returning id into qid;
  insert into public.amcf_reports(case_id,kind,title,version,status,body,created_by)
  values ('{CASE1}','laudo','Laudo pericial sintético',1,'revisao', repeat('Conteúdo sintético do laudo pericial. ', 12),'{DOCTOR}') returning id into rid;
  ready := public.amcf_case_readiness('{CASE1}');
  if (ready->>'questions_pending') = '0' then raise exception 'TEST FAILED: quesito pendente nao detectado'; end if;
  if (ready->>'can_approve_now')::boolean then raise exception 'TEST FAILED: prontidao liberada com quesito pendente'; end if;
  insert into public.amcf_question_answers(question_id,answer,status,reviewed_at,created_by)
  values (qid,'Resposta sintética baseada no prontuário citado.','revisada', now(),'{DOCTOR}');
  if (select status from public.amcf_case_questions where id = qid) <> 'revisada' then raise exception 'TEST FAILED: acompanhamento do quesito nao atualizou'; end if;
  if (public.amcf_case_readiness('{CASE1}')->>'questions_pending') <> '0' then raise exception 'TEST FAILED: quesito continua pendente apos resposta revisada'; end if;
  if not (public.amcf_case_readiness('{CASE1}')->>'can_approve_now')::boolean then raise exception 'TEST FAILED: prontidao ainda bloqueada apos resposta'; end if;
  perform public.amcf_report_approve(rid,'Aprovação sintética do laudo');
  if (select status from public.amcf_reports where id = rid) <> 'aprovado' then raise exception 'TEST FAILED: laudo nao aprovado'; end if;
  if (select approved_by from public.amcf_reports where id = rid) <> '{DOCTOR}' then raise exception 'TEST FAILED: aprovacao sem responsavel medico'; end if;
end $$;
select public.amcf_test_blocked('update public.amcf_reports set body = ''conteúdo reescrito'' where status = ''aprovado'' and case_id = ''{CASE1}''','laudo aprovado foi reescrito');
do $$ begin
  insert into public.amcf_case_questions(case_id,number,text,created_by) values ('{CASE1}',2,'Segundo quesito do juízo.','{DOCTOR}');
  insert into public.amcf_reports(case_id,kind,title,version,status,body,created_by)
  values ('{CASE1}','laudo','Laudo pericial sintético v2',2,'revisao', repeat('Conteúdo sintético do laudo pericial v2. ', 12),'{DOCTOR}');
end $$;
select public.amcf_test_blocked('select public.amcf_report_approve(r.id,''tentativa'') from public.amcf_reports r where r.case_id = ''{CASE1}'' and r.version = 2','laudo aprovado com quesito pendente');

-- 9) deduplicação de documento por processo
select public.amcf_test_blocked('insert into public.amcf_documents(case_id,contact_id,title,storage_path,file_name,mime_type,size_bytes,content_hash,uploaded_by) values (''{CASE1}'',''{CONTACT1}'',''Cópia do mesmo arquivo'',''db/teste-per-dup'',''copia.pdf'',''application/pdf'',2048, repeat(''a'',64),''{DOCTOR}'')','arquivo duplicado aceito no mesmo processo');
insert into public.amcf_documents(case_id,contact_id,title,storage_path,file_name,mime_type,size_bytes,content_hash,uploaded_by)
values ('{CASE2}','{CONTACT2}','Mesmo arquivo em outro processo','db/teste-per-dup-2','copia.pdf','application/pdf',2048, repeat('a',64),'{DOCTOR}');
select public.amcf_test_assert((select count(*)=2 from public.amcf_documents where content_hash = repeat('a',64)),'mesmo arquivo permitido em processos diferentes');

-- 10) consulta ao processo com fonte
do $$ declare r jsonb; begin
  r := public.amcf_case_search('{CASE1}','lombar');
  if jsonb_array_length(r->'pages') < 1 then raise exception 'TEST FAILED: busca nao encontrou trecho do documento'; end if;
  if (r->'pages'->0->>'page_number')::integer <> 1 then raise exception 'TEST FAILED: pagina da busca incorreta'; end if;
  r := public.amcf_case_search('{CASE1}','manifestar');
  if jsonb_array_length(r->'movements') < 1 then raise exception 'TEST FAILED: busca nao encontrou movimentacao'; end if;
  if jsonb_array_length(public.amcf_case_search('{CASE1}','inexistente-xyz')->'pages') <> 0 then raise exception 'TEST FAILED: busca retornou resultado inexistente'; end if;
end $$;
select public.amcf_test_blocked('select public.amcf_case_search(''{CASE1}'',''ab'')','busca aceitou termo com menos de 3 caracteres');

-- 11) Meu dia
do $$ declare d jsonb; begin
  d := public.amcf_my_day();
  if (d->>'finance_visible')::boolean is not true then raise exception 'TEST FAILED: financeiro nao visivel para medico'; end if;
  if jsonb_array_length(d->'movements') < 1 then raise exception 'TEST FAILED: meu dia sem movimentacoes'; end if;
  if jsonb_array_length(d->'notifications') < 1 then raise exception 'TEST FAILED: meu dia sem avisos internos'; end if;
  if jsonb_array_length(d->'steps') < 1 then raise exception 'TEST FAILED: meu dia sem proxima acao'; end if;
end $$;
update public.amcf_notifications set read_at = now() where member_id = '{DOCTOR}';
select public.amcf_test_assert((select count(*)=0 from public.amcf_my_day() d, jsonb_array_elements(d->'notifications') n),'aviso lido sai do meu dia');

-- 12) impressão digital das entradas
do $$ declare before_fp text; after_fp text; begin
  select input_fingerprint into before_fp from public.amcf_case_analyses where case_id='{CASE1}' and status='aprovada' order by version desc limit 1;
  insert into public.amcf_movements(case_id,occurred_on,title,detail,source,created_by)
  values ('{CASE1}','2026-03-20','Publicação de sentença','Sentença publicada.','manual','{DOCTOR}');
  after_fp := public.amcf_case_input_fingerprint('{CASE1}');
  if before_fp = after_fp then raise exception 'TEST FAILED: conteudo novo nao alterou a impressao digital'; end if;
end $$;

-- 13) integração externa (n8n): token, idempotência, escopo e leitura do processo
reset role;
insert into public.amcf_integration_keys(id,label,token_hash,scopes,owner_id)
values ('{KEY1}','teste pericial', encode(digest('token-pericial-123456789012345678901234'::text,'sha256'::text),'hex'),
        array['movements:write','cases:read'], '{DOCTOR}');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-1','{CASE1}','2026-03-05','Publicação de despacho','Determina manifestação da parte.') ->> 'ok')::boolean,'integracao criou movimentacao');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-1','{CASE1}','2026-03-05','Publicação de despacho','Determina manifestação da parte.') ->> 'duplicated')::boolean,'integracao idempotente por external_ref');
select public.amcf_test_assert((select count(*)=1 from public.amcf_movements where external_ref='ext-per-1'),'integracao nao duplicou movimentacao');
select public.amcf_test_assert((select classification='possivel_prazo' from public.amcf_movements where external_ref='ext-per-1'),'regra classificou despacho com manifestacao como possivel prazo');
select public.amcf_test_assert((select count(*)>0 from public.amcf_integration_logs where action='movement.upsert' and success),'log da integracao registrado');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-invalido-123456789012345678901234','ext-per-2','{CASE1}','2026-03-06','Tentativa') ->> 'ok')::boolean is false,'token invalido rejeitado');
select public.amcf_test_assert((public.amcf_api_movement_upsert('token-pericial-123456789012345678901234','ext-per-3','{CASE1}','2026-03-07','Titulo valido com classificacao invalida',null,'invalida') ->> 'ok')::boolean is false,'classificacao invalida rejeitada na integracao');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','{CASE1}') ->> 'ok')::boolean,'integracao le o processo');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','{CASE1}') -> 'case' ->> 'cnj_number') = '1234567-89.2026.8.05.0001','integracao le o numero CNJ');
select public.amcf_test_assert((public.amcf_api_case_read('token-pericial-123456789012345678901234','{CASE1}') -> 'case' -> 'next_action' ->> 'next_action') = 'Conferir prontuário e exames.','integracao le a proxima acao');

rollback;
