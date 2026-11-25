# AMCF - backup e recuperação antes de dados clínicos
**Status: procedimento preparado, NÃO configurado nem validado em produção.**

## PostgreSQL
No ambiente seguro do operador, instale o cliente `pg_dump` e `gpg`, configure:
- `AMCF_DATABASE_URL`: conexão direta de banco obtida em Supabase > Connect, somente em gerenciador de segredos; nunca salvar no Git.
- `AMCF_BACKUP_GPG_RECIPIENT`: chave pública do responsável pelos backups. Chave privada guardada fora do servidor.
- `AMCF_BACKUP_DIR`: destino privado local temporário do job.

Execute `bash scripts/amcf_backup_encrypted.sh`. Armazene o `.gpg` em **um local independente do Supabase** e com acesso restrito. Verifique `sha256sum -c`, teste a descriptografia e RESTAURE em banco descartável, registrando o RPO e RTO. Agende com o serviço de tarefas do seu servidor/CI, não com credenciais incorporadas a scripts.

## Objetos do Storage
O `pg_dump` **não contém bytes dos PDFs ou fotos** do bucket `amcf-documentos`. Implementar cópia criptografada, versionada e restaurável pelo Storage S3 API/Supabase SDK. Verificar recuperação real de um arquivo fictício (e seus metadados do banco) no ambiente isolado. A limpeza automática da IA só se aplica ao bucket separado `amcf-ai-staging`.

## Procedimentos e responsabilidades
- Definir periodicidade, armazenamento fora do projeto, política de retenção, acesso e dupla autorização para exclusões.
- Restaurar num ambiente isolado e validar autenticação, RLS, arquivos, integrações e consistência de IDs.
- Nunca habilitar uso com prontuários reais sem prova da restauração e acordo de proteção de dados.
- O projeto Supabase Free não substitui um plano de backup com garantia de restauração.

## Checklist do teste de restauração (executar quando o backup for ativado)
1. Gerar dump cifrado (`scripts/amcf_backup_encrypted.sh`), registrar data/hora e tamanho.
2. Copiar para local independente do Supabase; conferir `sha256sum -c`.
3. Descriptografar com a chave privada do responsável (guardada fora do servidor).
4. Restaurar em projeto/banco descartável e comparar contagens de tabelas-chave (`amcf_cases`, `amcf_movements`, `amcf_documents`, `amcf_reports`) e a presença das políticas RLS.
5. Com um arquivo fictício no bucket `amcf-documentos`, recuperar o arquivo pelo backup do Storage e conferir o `content_hash` do registro.
6. Registrar RPO e RTO medidos e anexar o resultado a este documento. Sem esse registro, o backup NÃO conta como validado.
Status atual: adiado pelo responsável; nada configurado.
