# Integração AMCF ↔ n8n Cloud (Dr. Adilson)

**Instância alvo (única):** https://caioramos.app.n8n.cloud

## Fluxos reais que serão conectados

| Agente | ID existente | URL |
|---|---|---|
| Secretária IA, WhatsApp API oficial | `p5YgaOh1RTWgptLG` | https://caioramos.app.n8n.cloud/workflow/p5YgaOh1RTWgptLG |
| Assistente de Perícia, dentro do CRM | `mNJpzyXM5LsuoGfi` | https://caioramos.app.n8n.cloud/workflow/mNJpzyXM5LsuoGfi |

**Importante:** integração NÃO está concluída no n8n. As ferramentas atuais de leitura do n8n não conseguiram retornar os nós dos dois fluxos. Não alterar/publicar esses fluxos sem revisar nós, gatilhos, credenciais e versão ativa. Foi solicitada conexão autenticada por sessão segura ao usuário. Não registrar segredos neste repositório.

## API do CRM já implantada

`POST https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-n8n`

Headers:
```http
Authorization: Bearer [TOKEN_GERADO_NA_ABA_INTEGRAÇÕES_AMCF]
Content-Type: application/json
```

Body:
```json
{"action":"ping","params":{}}
```

Resposta esperada: `{"ok":true,...}`. A API foi validada por chamada HTTP real: 401 sem token, 200 com token de QA (posteriormente revogado), 200 em `contacts.upsert` com resposta contendo `contact_id`. Chamada duplicada com mesma `p_external_ref` não gerou segundo contato. Registro e chave QA foram excluídos.

A função do Supabase tem `verify_jwt=false` porque a autenticação máquina-a-máquina é feita **no próprio código**, com token Bearer próprio verificado como SHA-256 no banco e escopos distintos. Não passar `service_role` nem credenciais do Supabase ao n8n. A função não habilita CORS aberto; é para n8n server-to-server.

## 1. Secretária IA (WhatsApp)

Criar token **Secretária IA n8n - Dr. Adilson** em CRM → Equipe e Configurações → Integrações. Escopos sugeridos e somente se necessários:

- `contacts:write`
- `opportunities:write`
- `tasks:write`
- `activities:write`
- `agenda:read`

Não conceder `cases:read` nem `movements:write` a este agente.

Armazenar token numa credencial **HTTP Header Auth** exclusiva do n8n Cloud. Nunca no texto de prompts, Set nodes de debug, repositório ou execução visível.

Exemplo de requisição feita no fluxo após extração e qualificação:

```json
{
  "action": "contacts.upsert",
  "params": {
    "p_external_ref": "whatsapp:WABA_NUMBER_ID:CHAT_USER_WA_ID",
    "p_name": "Nome do contato",
    "p_kind": "other",
    "p_phone": "telefone normalizado do lead",
    "p_source": "whatsapp-oficial",
    "p_notes": "Resumo administrativo curto, sem informação clínica"
  }
}
```

Salvar `contact_id` da resposta. Para oportunidades: `opportunities.upsert` com `p_external_ref`, `p_contact_id`, `p_title`, `p_service`, `p_stage_name`, `p_next_step`; para tarefas: `tasks.upsert` e para atividades: `activities.create`. Preservar o fluxo atual de mensagens e seus gatilhos, sem alterar a API oficial do WhatsApp. Evitar compartilhar dados de saúde na IA de pré-vendas.

## 2. Assistente de Perícia

Criar token **Assistente Perícia n8n - Dr. Adilson** com escopos mínimos:

- `cases:read`, para `cases.read` usando `p_case_id`
- `movements:write`, para `movements.upsert` com revisão humana
- `tasks:write` ou `activities:write`, apenas se os nós atuais precisarem disso

Exemplo de consulta contextual:

```json
{"action":"cases.read","params":{"p_case_id":"UUID_REAL_DO_CASO"}}
```

Exemplo de movimentação *administrativa* (com revisão do médico):

```json
{
  "action":"movements.upsert",
  "params":{
    "p_external_ref":"processo:cnj:movimento_id",
    "p_case_id":"UUID_REAL_DO_CASO",
    "p_occurred_on":"2026-10-14",
    "p_title":"Título da movimentação",
    "p_detail":"Descrição administrativa",
    "p_classification":"requer_acao"
  }
}
```

O agente nunca deve publicar laudos, diagnósticos, conclusões médicas, pareceres jurídicos ou decisões de aprovação automaticamente. O eventual chat dentro do CRM precisará encaminhar requisição para webhook real do fluxo **`mNJpzyXM5LsuoGfi`** via Edge Function autenticada; a URL real do webhook deve ser lida dos nós do n8n e guardada como **secret** no Supabase, jamais escrita no frontend. Confirmar autorização por caso, auditoria e tratamento de dados médico-periciais antes de passar dados sensíveis.

## 3. CRM → n8n

O CRM possui tabela `amcf_integration_events` e tela de webhooks em Configurações; a extensão Postgres `pg_net` foi habilitada para suportar `net.http_post`. Só cadastrar webhook depois de identificar a URL HTTPS de produção e o gatilho correspondente no n8n. O CRM assina eventos com HMAC SHA-256 e usa `X-AMCF-Signature`. O fluxo receptor deve validar a assinatura no corpo exato da requisição. Eventos disponíveis: `contact.created`, `opportunity.created`, `opportunity.stage_changed`, `opportunity.won`, `case.created`, `task.created`, `task.completed`.

## Check-list antes da ativação

1. Conferir os dois fluxos no n8n de `caioramos.app.n8n.cloud`, salvar versão anterior.
2. Criar credenciais individualizadas dentro do n8n, com tokens gerados no CRM pelo administrador autenticado.
3. Inserir nós HTTP Request nos pontos apropriados, manter `p_external_ref` persistente para idempotência, respeitar confirmação de origem WhatsApp.
4. Adicionar checagens de erro e retentativa sem duplicação; evitar tokens e prontuário nos logs.
5. Executar teste de ponta a ponta com contato e processo **sintéticos**, validar registros criados/atualizados, remover dados sintéticos.
6. Revisar permissões e proteção de dados. Publicar as novas versões somente após testes; não interromper fluxos atuais da API oficial.
7. Para o assistente dentro do CRM: disponibilizar interface apenas após webhook seguro, autenticado e testado.

**Status atual:** lado Supabase/AMCF preparado e testado em ping/contato. Lado n8n aguardando conexão autenticada para leitura e alteração dos IDs indicados. Não declarar como integrado em produção.
