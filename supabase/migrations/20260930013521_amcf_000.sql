-- Migração original: migration_20260930_013521000
begin;
select set_config('request.jwt.claims','{"sub":"8fe33846-dff9-4023-89df-180acfdb8977","aal":"aal2","role":"authenticated"}',true);
set local role authenticated;
insert into public.amcf_contacts(id,name,responsible_id,created_by) values ('40000000-0000-4000-8000-000000000001','Contato teste documento','8fe33846-dff9-4023-89df-180acfdb8977','8fe33846-dff9-4023-89df-180acfdb8977');
insert into public.amcf_cases(id,reference,title,contact_id,service,stage_id,responsible_id,created_by) select '50000000-0000-4000-8000-000000000001','TESTE-DOC-1','Caso teste documento','40000000-0000-4000-8000-000000000001','Teste',id,'8fe33846-dff9-4023-89df-180acfdb8977','8fe33846-dff9-4023-89df-180acfdb8977' from public.amcf_case_stages where position=1;
insert into public.amcf_documents(id,case_id,contact_id,title,category,storage_path,file_name,mime_type,size_bytes) values ('60000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Documento teste','outro','db/teste-1','teste.pdf','application/pdf',8);
insert into public.amcf_document_files(document_id,content) values ('60000000-0000-4000-8000-000000000001','JVBERi0=');
do $$ begin if (select count(*) from public.amcf_document_files) <> 1 then raise exception 'TEST FAILED: upload nao visivel para administrador'; end if; end $$;
do $$ begin if (select content from public.amcf_document_files where document_id='60000000-0000-4000-8000-000000000001') <> 'JVBERi0=' then raise exception 'TEST FAILED: conteudo do download divergente'; end if; end $$;
delete from public.amcf_documents where id='60000000-0000-4000-8000-000000000001';
do $$ begin if (select count(*) from public.amcf_document_files) <> 0 then raise exception 'TEST FAILED: exclusao nao removeu o arquivo'; end if; end $$;
reset role;
rollback;