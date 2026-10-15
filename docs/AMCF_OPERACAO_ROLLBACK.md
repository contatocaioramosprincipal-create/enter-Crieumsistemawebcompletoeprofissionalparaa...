# AMCF — operação, evidências e rollback (Assistente de perícia + área do processo)

Atualizado em 2026-10-15. Nada aqui contém segredos. Valores reais ficam no Supabase Vault e nas credenciais privadas do n8n.

## 1. Componentes e estado

| Componente | Identificação | Estado |
|---|---|---|
| Ponte do chat | edge function `amcf-pericia-bridge` v6 (verify_jwt) | ativa; MFA aal2 + membro ativo + RLS do processo + limite de mensagens |
| Entrega de anexos | `amcf-ai-deliver` v3 (interna, token do Vault) | ativa; quarentena → n8n por URL assinada de 180 s → apaga sempre |
| Limpeza | `amcf-ai-cleanup` | agendada, apaga quarentena expirada |
| DataJud | `amcf-datajud` v1 (verify_jwt) | publicada; **desligada** até existir `amcf_datajud_api_key` no Vault |
| n8n texto | `jVXqKcjztnqHLBOV` | ativo; webhook com Header Auth `X-AMCF-Bridge-Key` |
| n8n arquivos | `lYvOManhhGXP05wF` | ativo; mesmo mecanismo |
| n8n antigo de perícia | `mNJpzyXM5LsuoGfi` | **deve permanecer inativo** |
| Secretária IA nova | `HyvRRLPiBnyyug5R` | inativa (corte WhatsApp planejado, exige aprovação humana) |
| Front (produção) | branch `amcf-react-supabase-independente` | sem as abas novas do processo |
| Front (prévia) | branch `amcf-fase1-processo` | abas Movimentações, Documentos, Quesitos, Exame, Análise, Laudos, Honorários; **build ainda não confirmado** |

Flags do Vault: `amcf_ai_uploads_enabled` e `amcf_ai_transfer_enabled` estão `true` (autorizado pelo responsável; o Dr. Adilson está ciente).

## 2. Evidências observadas (dados sintéticos)

- Funções internas sem login: `amcf-ai-deliver` → 401; `amcf-pericia-bridge` → 401 (testado via `net.http_post` do banco).
- Anexos: fluxo reservar → enviar → finalizar → entregar → apagar validado de ponta a ponta, incluindo tentativa de prompt-injection ignorada, isolamento por usuário/processo e opção "Salvar no processo".
- Contexto do processo (2026-10-15): payload sintético enviado ao webhook de texto; resposta 200 com citações `[Movimentação AAAA-MM-DD]`, `[Quesito 1]`, `[Documento …, p. 1]`, separando fatos, alegações, inferências e dúvidas, sem concluir o quesito. A IA escreveu um título com erro de grafia; o prompt agora fixa os títulos.
- Pendente de observação real: build da prévia no Cloudflare; teste no navegador por usuário com MFA; DataJud com chave real.

## 3. Operação diária

- Falha do Assistente: o chat mostra mensagem genérica. Ver execuções no n8n (workflows acima) e os eventos `amcf_ai_audit_events` (sem conteúdo clínico).
- Créditos de IA: o n8n Cloud usa créditos próprios (saldo baixo na última checagem, cerca de US$ 1,97). Sem crédito o chat falha. Decisão atual: manter créditos do n8n; migrar para chave OpenAI própria é a alternativa.
- Limite do plano Free do Supabase: sem backup gerenciado nem alerta de uso; ver `AMCF_BACKUP_RECUPERACAO.md`.

## 4. Rollback (do menor para o maior impacto)

1. **Desligar anexos para a IA** (imediato, sem deploy): no Vault, `amcf_ai_uploads_enabled` e `amcf_ai_transfer_enabled` → `false`. A ponte passa a recusar anexos (423) e deixa de enviar contexto do processo.
2. **Desligar a IA inteira**: `amcf_pericia_webhook_enabled` → `false`. A ponte responde 503 "integração não configurada".
3. **Desligar DataJud**: remover `amcf_datajud_api_key` do Vault (o botão fica desativado).
4. **Reverter funções**: no painel do Supabase > Edge Functions, selecionar a versão anterior (bridge v5, deliver v2) ou reimplantar a partir do commit `f830c27`.
5. **Reverter n8n**: em cada workflow, Histórico de versões → restaurar a versão anterior e republicar; ou desativar o workflow.
6. **Reverter o front**: a produção não recebeu as abas novas; basta não mesclar `amcf-fase1-processo`. Se já mesclada, `git revert` do merge e novo deploy no Cloudflare Pages.
7. **Banco**: as migrações do pacote são aditivas; não há rollback destrutivo previsto. Qualquer reversão de tabela deve ser feita com cópia prévia.

## 5. Itens que dependem do responsável (não feitos)

- Convidar o Dr. Adilson e ativar MFA (a IA exige MFA).
- Rotacionar segredos já expostos em conversas ou arquivos anteriores (chave da ponte, token da secretária; revogar a chave antiga da secretária).
- Obter a chave do DataJud e gravá-la no Vault como `amcf_datajud_api_key`.
- Confirmar a prévia do Cloudflare e autorizar o merge em produção.
- Aprovar os documentos de LGPD (rascunho em `AMCF_LGPD_RASCUNHO.md`).
- Backup criptografado e teste de restauração (adiado pelo responsável; ver runbook).
- Proteção contra senhas vazadas do Supabase Auth exige plano Pro.
- Corte da secretária no WhatsApp (planejado para 15/10/2026): só com plano de corte e aprovação humana.
