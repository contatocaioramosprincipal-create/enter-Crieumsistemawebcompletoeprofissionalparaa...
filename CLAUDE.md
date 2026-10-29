# CLAUDE.md — AMCF Dr. Adilson (integração sem Enter)

## Objetivo
Concluir com Claude Code/Cowork a integração do CRM AMCF do Dr. Adilson com os dois agentes de IA na instância n8n **https://caioramos.app.n8n.cloud**, de forma segura e sem interromper os atendimentos existentes. Não refazer a interface existente.

## Fontes confiáveis
- Repositório GitHub: `contatocaioramosprincipal-create/enter-Crieumsistemawebcompletoeprofissionalparaa...`
- **Branch de trabalho:** `amcf-react-supabase-independente`. Não mesclar automaticamente na `enter-main`.
- CRM publicado: `https://sistema.dradilsoncouto.com.br`.
- Supabase independente **Free**: `phjhedoavxicpsvuxmls` (projeto do AMCF).
- Cloudflare Pages: `amcf-dr-adilson-original`.
- API máquina-a-máquina: `https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-n8n`.
- Ponte autenticada de perícia: `https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-pericia-bridge`.
- Referências de arquitetura: `N8N_DR_ADILSON_INTEGRACAO.md`, `AMCF_MIGRACAO_INDEPENDENTE.md`, `src/features/integrations/contract.ts`, `src/features/assistant/PericiaAssistantPage.tsx`.
- Dois workflows n8n existentes: Secretária IA `p5YgaOh1RTWgptLG`; Assistente de Perícia `mNJpzyXM5LsuoGfi`.
- Antes de agir, inspecionar o estado atual de cada workflow, incluindo se está publicado/ativo, nós, conexões e credenciais sem revelar segredos.

## Conectividade Claude
O arquivo `.mcp.json` contém os endpoints sem credenciais, de **n8n Instance-level MCP** e **Supabase MCP restrito ao projeto em modo somente leitura**. A conexão só funciona depois de o proprietário habilitar MCP em Settings > Instance-level MCP no n8n e completar OAuth no Claude. No Claude Code, use `/mcp` para autorizar. Não copiar tokens/segredos para prompt, console, Git, logs ou respostas.

MCP Supabase começa em read-only para reconhecimento seguro. **Solicitar autorização explícita para habilitar escrita apenas quando o plano de alteração estiver definido e revisado.** Utilizar ferramentas de Supabase restritas a esse projeto. Proibir leitura ou envio de dados clínicos não necessários para testes.

## Entregas exigidas
1. Criar cópia/backup (export JSON, sem segredos, sem dados fixados de paciente) dos workflows antigos. Preservar IDs originais; criar **dois novos workflows separados**, desativados inicialmente.
2. Secretária IA: manter WhatsApp Cloud API oficial e a resposta atual; sincronizar contatos por referência externa estável, atualizar o mesmo cadastro e criar oportunidade apenas com intenção comercial real. Reutilizar a API `amcf-n8n` e token escopado `contacts:write` / `opportunities:write` em **credencial privada n8n**. Não inserir token em nó Code/Set nem em Git. Garantir idempotência e que falha na sincronização não bloqueia o envio da resposta.
3. Assistente Pericial: usar entrada protegida `amcf-pericia-bridge`, autenticada pelo usuário e MFA. Não tornar o Chat Trigger público, não usar `allowedOrigins: "*"`; conferir segredo compartilhado do webhook e configuração segura no Supabase Vault. Consultas por `caseId` exigem RLS; sem upload de prontuários/laudos sensíveis antes da homologação.
4. Usar tokens diferentes para cada agente, com menor privilégio possível. Não exportar `service_role`, segredos do Vault ou credenciais do WhatsApp. Revisar escopos.
5. Criar testes com dados sintéticos: ping 200, sem token 401, lead criado e atualizado sem duplicação, permissão negada em ação fora do escopo, caso autorizado versus não autorizado, webhook HMAC/segredo inválido negado, erro de sincronização não interrompe WhatsApp, chat responde com segurança.
6. Depois dos testes, ativar somente os novos fluxos pretendidos, evitando dois gatilhos da mesma Meta WhatsApp Business simultâneos; nunca desativar o atendimento atual até testar substituição/roteamento. Exigir aprovação humana para a troca que afetar a produção.
7. Atualizar instruções de operação e rollback. Registrar link, ID, status, testes reais, falhas e itens ainda pendentes. Não declarar produção concluída sem resultados observáveis.

## Restrições de operação
- **Não editar/cancelar** os workflows originais, não alterar a configuração Meta sem plano de corte e rollback.
- **Não tocar em dados reais de pacientes**, documentos médico-periciais, laudos, análises e movimentações clínicas antes de verificações de LGPD/segurança; não fazer logs de dados sensíveis.
- Jamais inserir ou imprimir tokens, senhas, chaves ou dumps em mensagens, logs, scripts de teste públicos ou GitHub. Credenciais antigas eventualmente copiadas em arquivos de migração deverão ser consideradas comprometidas se expostas e rotacionadas.
- Não usar APIs externas pagas nem contratar upgrades sem autorização.
- Supabase Free: respeitar limites e plano de backup/restauração.
- Em qualquer incerteza, interromper apenas a alteração em risco, descrever o bloqueio e entregar mudanças preparadas em PR/branch.

## Critérios finais
Código compilado e publicado, endpoints 401 para anônimo, testes autorizados com dados fictícios e persistência no CRM, webhook de perícia protegido e funcional, automações n8n estáveis e sem duplicidade, domínio atual mantido, evidências de execução registradas, rollback disponível.