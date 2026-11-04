# AMCF | Relatório de homologação de segurança do Assistente Virtual
**Avaliação técnica inicial: 14/10/2026 (Brasil).**  
**Escopo:** CRM em `sistema.dradilsoncouto.com.br`, projeto Supabase `phjhedoavxicpsvuxmls`, fluxos n8n do Dr. Adilson.  
**Decisão:** **APROVAÇÃO PARCIAL** apenas para a interface e controle de acesso administrativo. **NÃO HOMOLOGADO** para processamento automatizado de laudos, exames, prontuários e dados clínicos reais.

## Correções executadas no Supabase/GitHub
- `amcf-files` v3: proibida exclusão de objetos em falha de autorização; CORS da aplicação limitada aos domínios do AMCF.
- RPCs internos de integração (`amcf_api_*`, `amcf_integration_emit/dispatch`): `EXECUTE` revogado de `anon` e `authenticated`, permitido para `service_role`.
- `amcf_pericia_chat_allow`: limite pré-existente de mensagens/membro; possui RLS.
- `amcf_ai_audit_events`: trilha técnica sem texto de perguntas, respostas, prontuário, arquivos ou dados clínicos. Somente `service_role`; limpeza de metadados após 180 dias pelo cron `amcf_ai_metadata_180d` (03:15 diário, horário do agendador).
- `amcf-pericia-bridge` v3: registra sucesso/falha/negação no audit metadata-only; rejeita explicitamente quaisquer `attachments`, `files`, `documentIds` com HTTP 423; status devolve `security_review:pending`, `attachments_enabled:false`. A ponte continua reservada a usuário autenticado, MFA e processo permitido por RLS.
- Bucket `amcf-ai-staging`: privado, máximo 10MiB, MIME PDF/PNG/JPEG. Registros vinculados a conta e caso.
- `amcf-ai-uploads` v2: rota de reserva, upload assinado, quarentena e descarte, requer MFA, autorização por caso e quota diária. **Flag de upload DESLIGADA.** Ainda sem teste end-to-end de navegador autenticado e malware scan.
- `amcf-ai-cleanup` v1: endpoint com token aleatório guardado no Vault; remoção via API de Storage; agendamento `amcf_ai_staging_cleanup_hourly` aos minutos 25 de cada hora. Anexos temporários expiram após 24h.
- `amcf_ai_transfer_enabled=false`: nenhum anexo de staging pode ser encaminhado à IA. Documentos oficiais do consultório **não são apagados** por esses agendamentos.
- Aviso/indicador da tela atualizado: `Somente texto` e texto explícito sobre anexos pendentes.

## Evidências verificadas
1. Bucket oficial `amcf-documentos`: `public=false`, 50MiB, PDF/PNG/JPEG, políticas de Storage e metadados do caso com RLS.
2. Bucket `amcf-ai-staging`: `public=false`, 10MiB, PDF/PNG/JPEG.
3. Banco independente na auditoria: zero casos e documentos; um administrador. Nenhum paciente utilizado.
4. Funções `amcf-ai-cleanup` sem credencial: **401**; com credencial guardada no Vault: **200** e `removed=0`, `failed=0`.
5. `amcf-ai-uploads` sem JWT: **401**.
6. `amcf-pericia-bridge` sem JWT: **401**.
7. `amcf-files` sem JWT: **401**; não foi possível provar CORS com sessão autenticada.
8. RPCs internos de integração: 16 funções sem `EXECUTE` para `authenticated` (consulta SQL pós-migração).
9. Tabela de auditoria: usuários `anon` não podem selecionar; registros de staging: `authenticated` não pode selecionar; acesso às flags reservado a `service_role`.
10. pg_cron: jobs `amcf_ai_metadata_180d` e `amcf_ai_staging_cleanup_hourly` ativos. **Primeira execução agendada ainda não foi observada**.

## Pendências que impedem o tratamento de dados de saúde pela IA
1. **n8n sem acesso de administração neste ambiente:** conectores n8n e n8n duplicado retornaram erro interno. Não foi possível inspecionar o workflow atualmente ativo `mNJpzyXM5LsuoGfi`, provar que o Chat Trigger público foi removido, validar assinatura/segredo, salvar retentativas, testar perda de rede, nem verificar armazenamento de execuções. A exportação anterior continha `public:true`, `allowedOrigins:"*"` e transcrição de dados identificáveis. Esse desenho não é aceitável para laudos reais. **Não ativar anexos com essa configuração.**
2. **Provedor de modelos:** confirmar local de processamento, suboperadores, retenção, transferência internacional, finalidade, contrato de tratamento e não treinamento com dados de clientes quando aplicável. Reduzir dados pessoais encaminhados, inclusive em logs e prompts.
3. **Antivírus/sanitização e extração:** assinaturas mágicas só verificam tipo do arquivo. Implementar scanner de malware, defesa contra prompt injection em documentos, separação de originais/trechos processados, política de citações e revisão obrigatória do médico.
4. **RLS E2E:** usar contas reais de teste admin/médico/assistente com MFA e dois processos fictícios, confirmar bloqueio entre casos, revogação de sessão e logs sem conteúdo.
5. **Backup e recuperação:** Supabase Free sem política comprovada de backup automático restaurável; criar rotina criptografada de `pg_dump` e cópia protegida dos objetos de Storage; testar RESTAURAÇÃO em ambiente separado, definir RPO/RTO e responsáveis. As migrations versionadas no GitHub ajudam a reconstituir o esquema, **não substituem backup dos dados**.
6. **Supabase Security Advisor:** após mitigação das RPCs, restam 31 avisos de SECURITY DEFINER em funções do CRM que precisam de revisão por função, e a proteção de senhas vazadas do Supabase Auth precisa ser habilitada no painel.
7. **Conformidade LGPD:** formalizar controlador/operadores, finalidade e base legal específica, necessidade de RIPD, informação e transparência ao titular, resposta a incidentes e contratos. A avaliação jurídica/clínica deve ser aprovada pelo responsável.

## Critérios de liberação (go/no-go)
- [ ] Workflow n8n autenticado, sem chat público e com segredos validados, testado com dados fictícios.
- [ ] Provedor de IA e retenção do n8n revisados e contratos documentados.
- [ ] Scanner/sanitização de PDF/imagem, validação de limites, descarte e remoção dos temporários testados.
- [ ] Testes de permissões admin/médico/assistente/caso distinto documentados.
- [ ] Backups reais e restauração em ambiente isolado testados.
- [ ] Revisão das funções SECURITY DEFINER e configuração Auth.
- [ ] Aprovação formal do responsável (médico/controlador) e de privacidade.
- [ ] Só depois, habilitar uploads e transferência via flags do Vault; validar novamente e monitorar.

**Segurança atual:** interface do assistente e chat administrativo limitado; **nunca** enviar laudos/prontuários reais até esses requisitos serem atendidos.