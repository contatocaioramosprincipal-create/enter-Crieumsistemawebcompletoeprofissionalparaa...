# Contexto

Criar um sistema interno, separado do site público, para a atuação médico-pericial do **Dr. Adilson Machado Couto Filho**. O objetivo é uma aplicação operacional com persistência, autorização por registro e fluxos verificáveis — não uma demonstração visual apresentada como produto concluído.

O projeto atual é um template React + Vite + TypeScript + Tailwind/shadcn, com React Router, TanStack Query, React Hook Form e Zod disponíveis. Não existem módulos de negócio implementados. O Enter Cloud foi conectado; a consulta de estrutura não retornou tabelas, o que **não comprova banco vazio nem autoriza sobrescrever estruturas existentes**. Nesta etapa, nenhum módulo, política ou fluxo de segurança foi implementado ou testado.

## Registro da primeira execução

- [x] Criadas e inspecionadas 14 tabelas com RLS e bloqueio explícito de privilégios anônimos.
- [x] Executado teste transacional de isolamento por caso, MFA e revogação no banco, com rollback integral.
- [x] Aprovados 8 testes unitários e 11 testes HTTP anônimos usando Node em processo único; Vitest foi substituído porque seu executor não encerrava no sandbox.
- [x] Escritos relatório de entrega parcial e orientações administrativas em `docs/entrega-parcial.md`.
- [ ] Publicar a função de convites: duas tentativas falharam com HTTP 504 e a inspeção posterior confirmou função ausente. Botão desabilitado.
- [ ] Provisionar o primeiro administrador e homologar login/MFA, convites e fluxos autenticados completos.
- [ ] Concluir módulos restantes, auditoria de performance e critérios de liberação para dados reais.

## Decisões confirmadas

- Entrada por e-mail e senha, convite e ativação administrativa; sem acesso público aos dados.
- Administrador gerencia sistema, equipe e segurança. Documentos restritos exigem concessão explícita inclusive para administradores.
- Médico responsável acessa todos os casos e financeiro, mas não administra contas nem configurações de segurança.
- Assistente acessa somente casos atribuídos; não acessa financeiro. Relacionamentos e oportunidades também terão escopo explícito, sem abrir o CRM inteiro.
- Aplicação em português brasileiro; não acrescentar idiomas, pagamentos, IA ou mensagens automáticas.
- Ambiente inicial de demonstração, privado, com dados sintéticos persistidos no banco e identificação permanente. Produção será um ambiente separado, sem reaproveitar dados de demonstração.

## 1. Arquitetura de dados

### Organização técnica

Frontend CSR com shell autenticado, rotas por módulo, formulários validados e consultas paginadas. CRUD administrativo usa o cliente autenticado com RLS; operações privilegiadas, arquivos, convites, mesclagem, PDF e integrações usam funções de backend. Transações e invariantes relacionais ficam no banco, aplicadas por migrações oficiais; funções de backend não executam SQL bruto.

Usar prefixo estável `amcf_` nas novas tabelas. Inspecionar novamente antes das migrações e preservar tabelas de outros negócios, incluindo eventuais perfis existentes. Não modificar arquivos gerados de conexão/tipos nem os esquemas reservados da plataforma.

### Entidades e vínculos

| Grupo | Tabelas propostas e finalidade |
|---|---|
| Identidade | `amcf_members`, `amcf_invitations`: identidade vinculada ao usuário autenticado, perfil, estado ativo/revogado, convite expirável e consumo único. Sem senhas nessas tabelas. |
| Governança | `amcf_settings`, `amcf_release_checks`, `amcf_retention_policies`: ambiente, WhatsApp, fuso, evidências de liberação e retenção por categoria. |
| CRM | `amcf_organizations`, `amcf_contacts`, `amcf_contact_assignments`, `amcf_interactions`: pessoas/organizações, contato normalizado, origem, responsáveis, atividade e próximo passo. |
| Oportunidades | `amcf_pipeline_stages`, `amcf_opportunities`, `amcf_opportunity_assignments`, `amcf_opportunity_values`: serviço, etapa, responsável, perda e valores separados para não vazar ao assistente. |
| Casos | `amcf_cases`, `amcf_case_assignments`, `amcf_case_stages`, `amcf_case_checklist`: contato obrigatório, oportunidade opcional, referência interna única, serviço, objeto administrativo, etapa e responsáveis. |
| Conteúdo sensível | `amcf_case_sensitive_records`, `amcf_sensitive_access_grants`: conteúdo técnico sensível separado dos metadados, sem incluí-lo em busca global, notificações ou logs. |
| Trabalho e agenda | `amcf_tasks`, `amcf_task_recurrences`, `amcf_deadlines`, `amcf_calendar_events`: vínculos com caso/contato, responsáveis, prioridade, vencimento, status e regras de recorrência. |
| Alertas | `amcf_notifications`, `amcf_notification_deliveries`: destinatário, ocorrência, agendamento, tentativas, erro, disponibilização e confirmação de leitura. |
| Documentos | `amcf_documents`, `amcf_document_versions`, `amcf_document_grants`, `amcf_document_access_events`: categoria, descrição, classificação, versão, hash, chave opaca privada, verificação, retenção e acesso. |
| Comercial | `amcf_proposals`, `amcf_proposal_versions`, `amcf_contracts`: escopo, entregáveis, condições, valores, revisão e documento aprovado vinculado ao caso. |
| Financeiro | `amcf_receivables`, `amcf_receipts`: cobrança administrativa, vencimento, recebimentos parciais, saldo e comprovante privado. Sem processamento de pagamentos. |
| Integrações | `amcf_integration_connections`, `amcf_integration_jobs`, `amcf_integration_attempts`: configuração não secreta, estado, idempotência, referência externa, tentativas e falhas sanitizadas. |
| Auditoria | `amcf_audit_events`: ator verificado, recurso, ação, data, identificador de requisição e alterações administrativas mínimas. Escrita por mecanismos de backend/banco, nunca histórico editável pelo usuário. |

### Invariantes obrigatórios

- RLS habilitada na mesma migração de cada tabela, negação por padrão e políticas específicas para SELECT/INSERT/UPDATE/DELETE; verificar `USING` e `WITH CHECK`.
- Funções de autorização no banco verificam integrante ativo, papel, atribuição e nível MFA; não confiar em papel enviado pelo navegador nem em metadados editáveis pelo usuário.
- Relações caso → tarefa/documento/proposta/financeiro não podem ser trocadas para contornar permissões. Validar também vínculos indiretos com contato e oportunidade, não somente o identificador principal.
- Registros vinculados a um caso herdam seu escopo. Um contato compartilhado não dá acesso aos demais casos, respectivas interações ou documentos; atividades específicas ficam vinculadas ao caso.
- Autorizações de documento restrito acumulam dois requisitos: acesso ao caso e concessão explícita ao documento. MFA é requisito adicional, não substituto da concessão.
- Valores em centavos inteiros, moeda BRL; datas de prazo sem horário como `date`, eventos como instante com fuso. Fuso inicial `America/Bahia`, editável. Sem cálculo automático de prazo judicial não solicitado.
- Exclusões não apagam auditoria nem eliminam documentos em retenção/bloqueio jurídico. Arquivamento é distinto de exclusão; nenhuma cascata indiscriminada.
- Índices nas chaves de atribuição, relacionamentos, estados, vencimentos e campos normalizados. Paginação/ordenação no servidor; agregados obedecem às mesmas permissões.

## 2. Matriz de permissões

Legenda: **CRUD** = criar, consultar e editar, com exclusão apenas quando autorizada pela retenção e integridade. Concessões e transições privilegiadas nunca são atualização livre de coluna.

| Módulo/operação | Administrador | Médico responsável | Assistente |
|---|---|---|---|
| Visão geral/relatórios | Escopo administrativo completo | Todos os casos e financeiro | Somente escopo atribuído, sem valores financeiros |
| Pessoas/organizações | CRUD; mesclar após revisão | CRUD; revisar duplicatas | Criar cadastro próprio e editar os atribuídos; consultar mínimo dos contatos de seus casos; não mesclar/excluir compartilhados |
| Oportunidades | CRUD, atribuições e valores | CRUD, atribuições e valores | Criar/editar oportunidades atribuídas, sem valores, exclusão ou redistribuição |
| Casos | CRUD administrativo, atribuir e arquivar | CRUD, atribuir e arquivar | Consultar/editar campos operacionais dos atribuídos; sem criar, excluir ou alterar responsáveis |
| Conteúdo sensível | Concessão explícita + MFA | Concessão explícita + MFA | Atribuição + concessão explícita + MFA |
| Checklist/tarefas/prazos/agenda | CRUD no escopo global | CRUD no escopo global | CRUD operacional nos casos atribuídos e atividades próprias autorizadas; sem ampliar destinatários/escopo |
| Documentos administrativos | Enviar/ler/versionar nos casos | Enviar/ler/versionar nos casos | Enviar/ler/versionar nos casos atribuídos |
| Documentos restritos | Sem acesso implícito; concessão + MFA | Concessão + MFA | Atribuição + concessão + MFA |
| Concessões sensíveis | Sem autoconcessão administrativa | Conceder/revogar explicitamente como responsável médico, com MFA e auditoria | Negado |
| Propostas/contratos | CRUD, revisão e PDF | CRUD, revisão e PDF | Negado inicialmente, inclusive anexos comerciais |
| Financeiro/comprovantes | CRUD e relatórios | CRUD e relatórios | Negado, inclusive via API, busca, exportação e totais |
| Equipe/perfis/convites | Gerenciar com MFA e auditoria | Consultar diretório mínimo para atribuições | Consultar próprio perfil e diretório mínimo necessário |
| Configurações/integrações/retenção | Gerenciar; ativação sujeita aos bloqueios | Consultar configurações operacionais pertinentes | Apenas preferências pessoais |
| Auditoria | Consultar trilha administrativa global, sem conteúdo restrito | Consultar trilha dos casos, sem conteúdo restrito não autorizado | Consultar histórico operacional dos casos atribuídos |

Mudanças de perfil não criam concessões a documentos. Toda elevação de privilégio fica auditada e exige MFA. A segregação não protege contra operadores de infraestrutura com privilégios elevados: esse risco exige controles operacionais e contratuais específicos.

## 3. Autenticação, arquivos e implantação segura

**Contas:** cadastro exclusivamente pelo fluxo de convite; aceite com definição de senha e ativação administrativa. O primeiro administrador será provisionado por procedimento privilegiado controlado, nunca pela regra “primeiro cadastrado vira administrador”. Recuperação com token único/expirável e redirecionamentos permitidos. Verificar suporte real a política de senha, bloqueio de abuso, revogação e MFA TOTP antes de declarar a segurança entregue. Definir senha mínima de 12 caracteres e rejeitar senhas comprometidas se o provedor suportar; registrar limitações, sem simular controles apenas no formulário.

**Sessões:** listener de autenticação como fonte de verdade, verificação de membro ativo em toda operação, limpeza de cache ao sair/trocar usuário, expiração por inatividade e absoluta validadas no servidor conforme capacidades disponíveis. Revogação de integrante/atribuição deve negar novas chamadas mesmo com JWT ainda válido. Não declarar cookies HttpOnly se o cliente usa tokens; documentar o modelo real e mitigar XSS, CSP e persistência de dados sensíveis.

**Arquivos:** contêiner privado dedicado, criado por API suportada, sem alterações nos esquemas reservados. Nenhuma leitura anônima ou acesso direto permitido ao usuário final; upload/visualização/download passam por função de backend que verifica usuário, caso, classificação, concessão e MFA. Preferir entrega autenticada de bytes para revogação imediata; se necessário usar URL temporária, adotar validade curta e registrar a janela residual de acesso. Registrar autorização/transferência, sem afirmar que um download comprova leitura humana.

Limite inicial proposto: 20 MiB por arquivo, PDF/JPEG/PNG; validar tamanho, assinatura binária e MIME no servidor, normalizar nome e gerar chave aleatória. Recusar executáveis, HTML, SVG, arquivos compactados e conteúdo divergente. Versões são imutáveis; mudanças de classificação não podem rebaixar acesso silenciosamente. Comprovantes e PDFs comerciais herdam autorização financeira, mesmo quando anexados ao caso.

**Bloqueios para dados reais:** varredura de malware com quarentena, criptografia gerenciada comprovada do banco/objetos/backups, restauração de banco e arquivos testada, MFA e recuperação testados, segurança por caso verificada, proteção de implantação/preview, domínio, HTTPS e revisão de segurança. A existência de armazenamento privado não comprova criptografia, antivirus ou backup. Sem evidências, manter somente demonstração. Não é tecnicamente possível reconhecer todo dado real digitado: o modo demo depende também de disciplina operacional e aviso explícito, além de barreiras para liberação de produção.

**LGPD:** registrar decisões pendentes do controlador: bases legais e finalidades, operadores/suboperadores e contratos, localização/transferências, retenção por categoria, direitos de titulares, incidentes, responsável e política de acesso. Nenhuma declaração automática de conformidade.

## 4. Interface e fluxos

Shell profissional com lateral azul-marinho, conteúdo claro, cinzas neutros e dourado apenas institucional. Tokens HSL em `src/index.css`/`tailwind.config.ts`; primário aproximadamente `212 53% 20%`, texto `214 18% 17%`, texto secundário `213 11% 39%`. Validar contraste dos pares efetivamente usados. Tipografia legível, poucos pesos, números tabulares, linhas compactas, foco evidente e animações discretas com redução de movimento.

Navegação: Visão geral; Relacionamento; Oportunidades; Casos; Tarefas e prazos; Agenda; Documentos; Propostas; Financeiro; Relatórios; Equipe e configurações. A interface reflete permissões do servidor, sem substituir RLS. Módulos ainda não executados são identificados como indisponíveis, nunca apresentados com botões fictícios.

Reutilizar componentes de tabela, formulário, diálogo, confirmação, sidebar/sheet, calendário e toast já disponíveis. Busca, filtros, ordenação e paginação com estado estável; carregamento, vazio, erro e salvamento distintos. Kanban deve permitir movimentação também por menu/teclado. Detalhe do caso com resumo e abas operacionais; nenhum conteúdo clínico em listagens gerais.

Em 390 px, menu recolhido, ações de toque acessíveis e tabelas com colunas prioritárias/rolagem contida; em 1280 px, lateral persistente e área de trabalho ampla. Agenda mensal, semanal e diária, com lista complementar móvel. Esses tamanhos serão a hipótese de verificação, pois não foi indicado um dispositivo específico.

## 5. Execução por etapas

Cada etapa fecha um fluxo persistente e seus testes antes de ampliar o escopo. A primeira entrega funcional prioriza segurança, equipe, CRM, casos e atribuições; não será anunciada como sistema completo enquanto as demais etapas estiverem pendentes.

## Implementation checklist

### Etapa 1 — Dados, autorização e entrada
- [x] Inspecionar estrutura existente; criar identidade `amcf_`, migrações iniciais e políticas por operação sem alterar dados de outros negócios.
- [ ] Implementar funções de permissão e invariantes contra alteração de perfil, atribuição, vínculo de caso e concessão pelo cliente.
- [ ] Implementar convite, aceite/cadastro controlado, login, ativação, logout e recuperação; provisionar administrador inicial por canal privilegiado.
- [ ] Implementar MFA, sessão e revogação; bloquear operações sensíveis no servidor quando MFA estiver ausente.
- [ ] Implementar Equipe e configurações com atribuições, revogação e auditoria de mudanças; impedir revogação acidental do último administrador ativo.
- [x] Implementar shell, rotas autenticadas e aviso de demonstração; preservar contratos do editor e instâncias estáveis de router/QueryClient.

### Etapa 2 — CRM, oportunidades e casos
- [ ] Implementar CRUD de pessoas/organizações, normalização de e-mail/telefone, interações e próximos passos com escopo por registro.
- [ ] Implementar revisão de duplicatas com seleção de campos e mesclagem transacional auditada, preservando vínculos e sem revelar registros fora do escopo.
- [ ] Implementar pipeline configurável, oportunidades, responsáveis, serviço, valores protegidos e motivo obrigatório ao perder.
- [ ] Implementar criação de caso e conversão idempotente de oportunidade, referência única, contato, responsáveis, checklist e histórico.
- [ ] Implementar lista, kanban e detalhe, com etapas configuráveis: triagem, proposta, contratação, documentação, análise técnica, quesitos, acompanhamento pericial, parecer, análise do laudo, concluído e arquivado.

### Etapa 3 — Tarefas, prazos e agenda
- [ ] Implementar tarefas, prazos e recorrência diária/semanal/mensal com término e chave única por ocorrência, evitando duplicações após reexecução.
- [ ] Implementar agenda mês/semana/dia e filtros hoje, semana e próximos 30 dias, com fuso explícito e sem cálculo jurídico implícito.
- [ ] Implementar processamento agendado de alertas internos com tentativas limitadas, backoff, falha final e confirmação separada de disponibilização/leitura; verificar disponibilidade real do agendador.
- [ ] Exibir aviso de que alertas não substituem conferência humana dos prazos judiciais; não anunciar processamento automático ativo sem teste com navegador fechado.

### Etapa 4 — Documentos privados
- [ ] Criar armazenamento privado e fluxo autenticado de upload, validação, metadados, versões, visualização/download e registro de acesso.
- [ ] Implementar concessões para documentos restritos e conteúdo sensível, inclusive para administrador, e impedir rebaixamento não autorizado de classificação.
- [ ] Implementar retenção, bloqueio jurídico e exclusão controlada; manter bloqueio de prontuários reais enquanto antivirus/criptografia não estiverem comprovados.

### Etapa 5 — Propostas e financeiro
- [ ] Implementar propostas com serviço, escopo, entregáveis, prazo, valor, condições e transições de status.
- [ ] Gerar PDF identificado como rascunho, revisar e registrar versão aprovada antes de disponibilizar o PDF final; não enviar externamente de forma automática.
- [ ] Implementar contratos, cobranças administrativas, recebimentos parciais e comprovantes privados vinculados ao caso, sem provedor de pagamento.
- [ ] Calcular propostas abertas, receita contratada, recebido e saldo pendente a partir de registros válidos, sem duplicar receita por revisões de proposta ou cobranças canceladas.

### Etapa 6 — Relatórios e pontos de integração
- [ ] Implementar painel e relatórios por período, origem, serviço e responsável, com agregações no banco obedecendo RLS e estados vazios reais.
- [ ] Implementar configuração por ambiente de WhatsApp, Google Calendar e n8n; estados “não configurada”, “conectada” e “erro” sustentados por verificação real.
- [ ] Persistir WhatsApp inicial `(71) 99735-7789`, editável; exigir confirmação específica do número e autorização antes de automatizar mensagens.
- [ ] Preparar contratos de integração, fila, logs sanitizados, deduplicação e tratamento de resultado incerto; não executar envio/criação externa até conexão e teste autorizados.
- [ ] Ao conectar provedores, verificar catálogo/permissões do workspace primeiro; armazenar segredos somente no backend, validar assinaturas de webhooks e evitar repetição de efeitos externos.

### Etapa 7 — Demonstração, administração e implantação
- [ ] Disponibilizar carga sintética identificada por lote e remoção administrativa restrita a esse lote, incluindo objetos associados; nunca resetar o banco inteiro.
- [ ] Implementar checklist de liberação com evidências e bloqueio de modo produção; validações operacionais não serão substituídas por um simples botão “seguro”.
- [ ] Entregar manual de administração, matriz final, instruções de convite/MFA/retencão, inventário de dependências e resultados de testes.
- [ ] Entregar link real de visualização quando disponível, restrito a usuários autorizados; não inventar domínio/link ou publicar dados reais.

## 6. Arquivos críticos

**Existentes a modificar:** `src/App.tsx`, `src/router.tsx`, `src/pages/Index.tsx`, `src/index.css`, `tailwind.config.ts`, `index.html`, `public/robots.txt`, `vite.config.ts`, `package.json` e os componentes shadcn que precisarem de variantes. Em `src/main.tsx`, preservar contratos da plataforma; revisar o bootstrap de telemetria para garantir ausência de conteúdo sensível. Não ampliar rastreamento de usuários. Manter estruturas de idiomas existentes sem introduzir suporte multilíngue não solicitado.

**Novos caminhos organizados por responsabilidade:** `src/features/{auth,team,crm,opportunities,cases,tasks,calendar,documents,proposals,finance,reports,settings}/`, `src/components/layout/`, `src/components/data-table/`, `src/lib/permissions.ts` apenas para apresentação de capacidades recebidas, `src/lib/validation/`, `supabase/functions/amcf-*/index.ts`, `tests/unit/`, `tests/security/`, `tests/e2e/`, `performance-audit.config.json` e documentação solicitada em `docs/`.

Reutilizar `QueryClientProvider`, `createBrowserRouter`, registro `window.__routers__`, formulários React Hook Form/Zod e componentes UI existentes. Consumir a conexão gerada em `src/integrations/supabase/client.ts` sem editá-la. Migrações são aplicadas pela ferramenta oficial e registradas para rastreabilidade, não por SQL embutido nas funções.

## Verification checklist

### Fluxos positivos
- [ ] Com contas individuais sintéticas de administrador, médico e dois assistentes, executar convite → ativação → login → MFA → recuperação/logout e registrar evidências sem credenciais.
- [ ] Executar contato → oportunidade → caso → atribuição → tarefa/prazo → documento privado → proposta revisada/PDF → contrato/cobrança → recebimento; recarregar e consultar em outra sessão para provar persistência.
- [ ] Confirmar que atribuição permite acesso ao assistente correto e que médico acessa todos os casos/financeiro; concessão documental habilita somente o recurso concedido com MFA.
- [ ] Conferir indicadores contra consultas e valores conhecidos de dados sintéticos, incluindo recebimentos parciais e múltiplas versões.

### Negativos e estado padrão
- [ ] Confirmar RLS e políticas em todas as tabelas criadas; usuário anônimo e conta sem convite/ativação não leem nem escrevem dados de negócio.
- [ ] Usar chamadas HTTP diretas com JWT de assistente para tentar SELECT/INSERT/UPDATE/DELETE em caso não atribuído, filhos, relações, RPCs, buscas e relatórios; todas devem negar ou não retornar registros.
- [ ] Repetir ataques com IDs conhecidos em upload, download, listagem de objetos, troca de vínculo e versões; documento restrito deve negar mesmo ao administrador sem concessão.
- [ ] Tentar obter financeiro por tabelas, valores de oportunidade, propostas, comprovantes, anexos de caso, agregados e exportações com usuário assistente; nenhuma via deve expor valor ou arquivo.
- [ ] Tentar autopromoção, autoconcessão administrativa, atribuição indevida e edição/exclusão de auditoria; confirmar negação no backend/banco.
- [ ] Revogar usuário/atribuição/concessão durante sessão ativa e repetir chamadas com JWT existente; conferir limpeza do cache e negação de novos acessos.
- [ ] Sem integrações/credenciais, nenhuma mensagem/evento externo deve ser enviado e o estado deve continuar “não configurada”; falhas reais não podem aparecer como sucesso.
- [ ] Confirmar banco sem dados apresenta zeros/estados vazios, sem métricas inventadas, e erro de consulta não é apresentado como zero.

### Limites, concorrência e recuperação
- [ ] Testar vencimento na virada do dia, fim de mês, ano bissexto, fuso, recorrência, tarefa concluída/cancelada e janela de 30 dias.
- [ ] Testar alerta com navegador fechado, falha/repetição do trabalhador, confirmação de leitura e reexecução concorrente sem duplicação.
- [ ] Testar arquivo vazio, limite de 20 MiB, excesso de tamanho, MIME falso, nome malicioso, versão simultânea e URL expirada; usar somente arquivos sintéticos inofensivos.
- [ ] Testar duplo clique/reenvio em conversão, proposta, recebimento, mesclagem e remoção de lote demo; preservar integridade e impedir duplicidade.
- [ ] Testar conta desativada, convite expirado/reutilizado, senha inválida, recuperação expirada, tentativas abusivas e perda do segundo fator conforme recursos realmente disponíveis.
- [ ] Testar busca rápida, filtros, paginação, requisições fora de ordem e conjunto sintético de 1.000 casos/10.000 tarefas no ambiente de testes; não carregar tudo no navegador.

### Escopo exato de validação técnica
- [ ] Adicionar testes unitários e scripts `test:unit`, `test:security` e `test:e2e`; usar Vitest para regras de domínio e Playwright para fluxos, com credenciais de teste injetadas com segurança e nunca versionadas.
- [ ] Executar `pnpm run lint`, `pnpm exec tsc -b`, `pnpm run test:unit`, `pnpm run test:security`, `pnpm run test:e2e`, `pnpm run build` e `pnpm run build:prod` sobre o código final da etapa; registrar exatamente o que não puder rodar.
- [ ] Gerar manifest Vite e executar `node /workspace/.agents/skills/enter_frontend_performance@1/scripts/audit-vite-build.mjs --profile app --dist dist --config performance-audit.config.json --strict`; declarar módulos iniciais/adiados reais sem mascarar alertas.
- [ ] Verificar visualmente `/casos` em `mobile_390` e `desktop_1280`; testar teclado, foco, contraste, formulários e tabelas, sem afirmar responsividade verificada antes dessas evidências.
- [ ] Registrar desempenho de carregamento/interações em condições controladas e console/rede; separar auditoria de build, desempenho de navegador, regressão funcional e HTTP em passou/falhou/com ressalvas/não verificado.
- [ ] Testar restauração de backup criptografado de banco e arquivos em ambiente isolado e registrar RPO/RTO aprovados; sem teste, manter uso real bloqueado.

## 7. Implantação e entrega honesta

1. Manter desenvolvimento/demonstração sem informações de pacientes ou processos reais; confirmar controle de acesso do preview/hosting. `noindex` e `robots.txt` não tornam o site privado.
2. Provisionar produção separada, aplicar migrações verificadas, criar somente contas autorizadas e não copiar lotes sintéticos nem segredos de desenvolvimento.
3. Configurar domínio interno escolhido pelo responsável, DNS, HTTPS, redirecionamentos de autenticação, transporte de e-mail verificado, CSP/headers adequados e ausência de cache público de respostas privadas. Não alterar o site público.
4. Configurar backups de banco e objetos, criptografia e acesso operacional; testar restauração. Definir RPO/RTO e retenção com o controlador.
5. Executar testes de segurança e revisão de permissões; validar antivirus, MFA, recuperação, monitoramento de falhas e ausência de conteúdo sensível em telemetria/notificações.
6. Somente após evidências e autorização do responsável liberar produção. Integrações externas recebem conexão e testes específicos separados; WhatsApp automático exige confirmação adicional.

**Não comprovado neste momento:** MFA e limites do provedor, entrega de e-mail, agendador, antivirus, criptografia gerenciada, backups/restauração, proteção do hosting, domínio/HTTPS, integrações externas e todos os fluxos funcionais. Cada entrega listará o que foi implementado/testado, dependências de credenciais ou suporte da plataforma e bloqueios restantes. Aprovar este plano não aprova envio externo, publicação de dados reais ou alegação de conformidade LGPD.
