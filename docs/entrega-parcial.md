# AMCF — entrega parcial e administração

**Dr. Adilson Machado Couto Filho · 29/09/2026**

## Situação atual

Esta é a primeira implementação, ainda **não liberada para dados reais**. O projeto não está concluído nem pronto para operação médico-pericial. O ambiente está limitado a demonstração no banco e a interface exibe esse aviso. Nenhum paciente, processo real, conta compartilhada ou senha de demonstração foi criado.

A prévia integrada apresenta a tela de acesso. Um link externo de implantação não foi disponibilizado nesta execução; não há domínio próprio publicado ou HTTPS de produção verificado. `robots.txt`/`noindex` foram definidos, mas não substituem controle de acesso da hospedagem.

## O que existe

### Banco aplicado e inspecionado

Foram criadas 14 tabelas próprias com prefixo `amcf_`, todas com RLS habilitada e políticas inspecionadas: membros, configurações, organizações, contatos, etapas comerciais, oportunidades, valores de oportunidades, etapas de casos, casos, atribuições, interações, checklist, tarefas e auditoria.

Há regras de integrante ativo + MFA, acesso de assistente por atribuição, valores comerciais separados, vínculos imutáveis, motivo de perda obrigatório, responsável ativo, prazo não anterior à abertura e bloqueio de alterações de origem. Acesso anônimo às tabelas e funções foi explicitamente revogado, inclusive privilégios diretos herdados da configuração inicial.

O histórico de escrita é gerado pelo banco. Ele armazena ator, instante, recurso e nomes dos campos alterados; não inclui o conteúdo sensível dos campos. Usuários comuns não podem reescrever a auditoria. Operadores privilegiados de infraestrutura exigem controles adicionais fora da aplicação.

### Interface conectada ao banco, ainda sem homologação autenticada

- Acesso por e-mail/senha; cadastro público e usuários anônimos desabilitados.
- Telas de recuperação, definição de senha de convite e MFA TOTP conectadas ao serviço de autenticação.
- Visão geral com consultas e contagens reais; erros não são apresentados como zeros.
- Cadastro/edição e arquivamento de contatos, seleção de organização existente e aviso de duplicatas visíveis por e-mail/telefone. A mesclagem ainda não existe.
- Cadastro/edição de oportunidades, etapas e motivo de perda. Valores ainda não são editados na interface; conversão automática em caso ainda não existe.
- Cadastro/edição e arquivamento de casos; lista, kanban da página atual, detalhe, atribuições, checklist, atividades e histórico.
- Cadastro/edição de tarefas com caso/contato, responsável, prioridade, vencimento e status. Sem recorrência ou alertas automáticos.
- Busca, filtros de etapa/situação quando aplicáveis, ordenação por criação e paginação de 20 registros. Seletores de contatos/casos/organizações buscam até 30 opções por consulta.
- Tela administrativa de integrantes com ativação/revogação, proteção do último administrador e edição de WhatsApp/origem HTTPS.
- Navegação dos demais módulos com indicação explícita de indisponibilidade, sem dados fictícios fingindo operação.

Esses caminhos existem no código e apontam para o banco real, mas o fluxo completo com usuários convidados ainda não foi homologado. Não interpretar essa lista como comprovação de funcionamento integral de cada módulo.

## Bloqueio imediato: convites e primeiro administrador

A função de backend de convites foi escrita, mas **não foi publicada**. Duas tentativas retornaram timeout HTTP 504; a consulta posterior confirmou função não encontrada. O botão de convites está desabilitado. Nenhum e-mail foi enviado por esse fluxo.

Não existe administrador inicial provisionado. O banco foi conferido após os testes e contém zero integrantes, contatos e casos. Não foi adotada a regra insegura de promover automaticamente o primeiro cadastro.

Próximas ações necessárias:

1. Resolver a publicação da função de convites na plataforma e verificar sua existência antes de tentar qualquer envio.
2. Definir o e-mail do administrador autorizado e provisionar sua identidade por procedimento administrativo privilegiado, sem publicar senha/chave de serviço e sem abrir cadastro público.
3. Vincular essa identidade em `amcf_members`, com papel administrador e ativação controlada; a primeira entrada ainda deve exigir MFA.
4. Configurar a origem HTTPS aprovada, autorizar o redirecionamento no serviço de autenticação e testar o transporte de e-mail.
5. Testar convite, aceite, definição de senha, MFA, ativação, recuperação e revogação com identidades individuais.

A configuração atual de confirmação automática de e-mail é exclusiva de desenvolvimento; o cadastro público permanece desabilitado. A política de senha mínima de 12 caracteres está no formulário de definição; a política equivalente do provedor ainda precisa ser comprovada. Não tratar validação do formulário como proteção suficiente contra chamadas diretas.

## Matriz de acesso desta etapa

| Perfil | Alcance |
|---|---|
| Administrador | Metadados de todos os casos, CRM, valores comerciais e gestão de integrantes/configurações. |
| Médico responsável | Metadados de todos os casos, CRM e valores comerciais; não administra contas nem segurança. |
| Assistente | Apenas casos atribuídos e contatos/oportunidades dentro do escopo; sem valores comerciais ou financeiros. |

A autorização está no banco e nas funções, não nos botões. As capacidades retornadas pelo backend apenas orientam a interface.

Documentos restritos ainda não existem. Quando implementados, exigirão acesso ao caso, concessão explícita e MFA, inclusive para o administrador. A tabela de valores de oportunidade já está protegida, mas os módulos financeiro/propostas não foram implementados.

## Como administrar, após o provisionamento

1. Entrar com a conta individual e completar a verificação MFA.
2. Em **Equipe e configurações**, conferir perfil, pendências de implantação e integrantes.
3. Somente após corrigir/publicar o fluxo, configurar origem HTTPS e solicitar convites a destinatários conferidos. Convite solicitado não significa entrega confirmada na caixa postal.
4. Revisar o integrante antes de ativá-lo; revogar quando não houver mais necessidade de acesso.
5. Cadastrar um contato antes de criar oportunidade ou caso.
6. Criar caso e abrir **Responsáveis** para atribuir assistentes. O campo de responsável principal e a lista de concessões de acesso são conceitos distintos nesta etapa.
7. Usar checklist/atividades para acompanhamento administrativo. Arquivar preserva registros e vínculos; exclusão definitiva e restauração de arquivados ainda não estão disponíveis na interface.
8. Registrar tarefas e conferir prazos manualmente. Não há trabalhador de notificações ou confirmação de entrega implementado.
9. Nunca inserir informação clínica nos campos administrativos. Não há área segura homologada para prontuários.

O cliente gerado mantém tokens de sessão no armazenamento local do navegador. Dados de negócio são persistidos no banco, mas isso não significa sessão com cookie HttpOnly. CSP, proteção contra XSS, expiração absoluta/inatividade e revogação global do provedor precisam de revisão antes de produção. A revogação de membro/atribuição no banco bloqueia novas consultas; não apaga dados que um usuário já recebeu anteriormente.

## Evidências de verificação

### Verificado

- RLS habilitada nas 14 tabelas, com políticas listadas após as migrações.
- Teste SQL transacional com dados sintéticos e `SET LOCAL ROLE authenticated`: administrador lê ambos os casos; assistente lê somente o atribuído; identificador de outro caso não retorna linha; contatos são isolados; atualização de caso alheio afeta zero linhas; autopromoção afeta zero linhas; tarefa no caso atribuído é aceita; MFA ausente nega casos; membro revogado não lê com as mesmas claims. **São testes de políticas no banco, não login/API com JWT emitido para usuários reais.**
- O teste SQL foi revertido integralmente; consulta posterior confirmou zero integrantes/contatos/casos e ausência da função temporária de teste.
- `pnpm run test:unit`: **8 testes aprovados**, com término normal.
- `pnpm run test:security`: **11 testes HTTP anônimos aprovados**, com término normal, exigindo resposta 401/403 para tabelas selecionadas, função de contexto e escrita em contatos.
- `pnpm exec tsc -b` e `pnpm run lint`: aprovados após as correções.
- Builds de desenvolvimento e produção executados com sucesso; o build final do snapshot da plataforma continua sendo a verificação autoritativa da entrega.
- Inspeção visual em `/casos`, sem autenticação, com `mobile_390` e `desktop_1280`: a barreira de acesso renderizou adequadamente. **Somente a tela de acesso foi inspecionada; a responsividade das telas internas permanece não verificada.**

O executor Vitest executou as asserções, mas não encerrava neste sandbox. Foi substituído pelo testador nativo do Node em processo único. Os scripts mantêm validação de comportamento e usam somente credenciais públicas para os testes anônimos.

### Não verificado / não aprovado

- Login positivo, convite, recuperação, MFA completo, contas individuais reais de teste e jornada integral pelo navegador.
- Chamadas diretas com JWT de assistente para consultar/alterar caso alheio; testes documentais e financeiros autenticados.
- Suíte E2E Playwright ainda não foi implementada.
- Auditoria de performance: o auditor da plataforma falhou por ausência de `parse5` no ambiente do próprio auditor. O manifest Vite foi gerado; há um script para gerar o mapa de rotas a partir do manifest real.
- O bundle inicial observado ficou em aproximadamente 779 kB sem compressão / 237 kB gzip, acima do orçamento padrão. Não houve aprovação de performance.
- FCP/LCP/CLS, interações sob rede/CPU controladas e HTTP de implantação não foram medidos.
- A ausência de logs do console na ferramenta não foi considerada evidência de ausência de erros.

### Comandos disponíveis

```sh
pnpm exec tsc -b
pnpm run lint
pnpm run test:unit
pnpm run test:security
pnpm run build
pnpm run build:prod
node scripts/prepare-performance-audit.mjs
```

O auditor estrito só poderá ser executado após resolver a dependência do ambiente do auditor. A configuração gerada representa conservadoramente os módulos dinâmicos iniciais das rotas autenticadas; o carregamento efetivo ainda requer evidência de navegador.

## Funcionalidades restantes

- CRUD completo de organizações, histórico de contatos com próximos passos, mesclagem auditada e atribuições comerciais mais granulares.
- Configuração de etapas pela interface, valores de oportunidade, conversão transacional em caso e recuperação de arquivados.
- Recorrência, prazos específicos, alertas agendados com leitura/tentativas e agenda mensal/semanal/diária.
- Documentos privados, concessões sensíveis, validação binária, versões, antivirus/quarentena, criptografia comprovada, retenção e logs de acesso.
- Propostas, revisão/PDF, contratos, cobranças administrativas, recebimentos/comprovantes e indicadores financeiros.
- Relatórios filtráveis e exportações protegidas.
- Adaptadores reais de WhatsApp, Google Calendar e n8n, configuração por ambiente, idempotência e logs. Todos permanecem **não configurados**.
- O número inicial `(71) 99735-7789` está armazenado nas configurações e é editável por administrador. Nenhuma mensagem foi autorizada ou enviada.
- Carga de demonstração removível por lote; no momento não há dados de negócio demonstrativos permanentes.

## Plano objetivo de implantação em domínio próprio

1. Concluir os módulos e as suítes pendentes, começando pela identidade administrativa e convites.
2. Provisionar produção separada, sem copiar dados sintéticos nem compartilhar contas. Preservar o site público.
3. Definir domínio interno, DNS, HTTPS e proteção de preview/hospedagem. Restringir redirecionamentos e configurar e-mail transacional verificável.
4. Revisar política de senhas no servidor, MFA/recuperação, bloqueio de abuso, sessões, CSP, headers e cache de respostas privadas.
5. Comprovar criptografia de banco/objetos/backups e implementar varredura de malware. Sem isso, proibir prontuários reais.
6. Configurar backups de banco e arquivos, escolher RPO/RTO com o controlador e testar restauração em ambiente isolado.
7. Homologar matriz por chamadas diretas à API, sobretudo casos não atribuídos, anexos restritos e financeiro.
8. Definir bases legais/finalidades, retenção por categoria, contratos de operadores, transferências, atendimento a titulares e resposta a incidentes. Não declarar conformidade LGPD apenas por existir uma política.
9. Liberar dados reais somente após revisão e autorização do responsável. Conectar integrações separadamente, com testes e confirmação específica antes de mensagens automáticas.

**Conclusão:** fundação implementada e parcialmente verificada; operação real e conclusão do sistema permanecem bloqueadas.
