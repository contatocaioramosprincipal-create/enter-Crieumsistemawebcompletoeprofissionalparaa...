# AMCF — LGPD: rascunho para aprovação (RIPD, base legal, retenção, operadores)

**Status: RASCUNHO. Não foi revisado nem aprovado por advogado ou encarregado. Não é parecer jurídico.** Pontos entre [colchetes] precisam ser preenchidos ou decididos pelo responsável.

## 1. Agentes
- Controlador: [Dr. Adilson Machado Couto Filho / razão social do consultório].
- Encarregado (DPO): [a designar].
- Operadores e suboperadores que tocam dados: Supabase (banco, storage, funções), Cloudflare (hospedagem do front), n8n Cloud (orquestração do assistente), provedor de modelo de linguagem usado pelo n8n (OpenAI, via créditos do n8n). [Confirmar localização dos servidores e cláusulas contratuais/transferência internacional de cada um.]

## 2. Dados tratados
- Cadastrais e processuais: número CNJ, partes, juízo, movimentações, quesitos, prazos.
- Dados pessoais sensíveis (saúde): laudos, exames, prontuários e achados periciais, quando o médico os anexa ou registra.
- Dados de uso: trilha de auditoria (quem, quando, ação; sem conteúdo clínico) e eventos de IA (contagem de anexos, resultado, tempo).

## 3. Finalidade e base legal (a validar)
- Finalidade: apoiar a atividade pericial do médico (organizar processo, preparar minutas para revisão e assinatura dele).
- Base legal sugerida para validação jurídica: exercício regular de direitos em processo judicial (art. 7º, VI, e art. 11, II, "d", LGPD) e tutela da saúde / obrigação legal ou regulatória quando aplicável. [Advogado deve confirmar, inclusive se o consentimento do periciando é necessário em cada caso.]

## 4. Fluxo dos dados na IA (como implementado)
1. Somente usuário autenticado com MFA e membro ativo; o processo precisa estar autorizado por RLS.
2. Texto do chat e contexto do processo (movimentações, quesitos, achados, lista de documentos e trechos das primeiras páginas de até 8 documentos já extraídos, limitado a 24 mil caracteres) vão ao n8n por webhook com segredo; **só quando a chave de transferência está ligada**.
3. Anexos: vão para um bucket privado de quarentena (até 10 MB, PDF/PNG/JPEG, 3 por mensagem, tipo conferido por assinatura), seguem ao n8n por URL assinada de 180 s e **são apagados ao fim, com sucesso ou falha**; a limpeza horária remove sobras. Opcionalmente o usuário marca "Salvar no processo" e uma cópia vai ao bucket privado de documentos do processo.
4. Os workflows do n8n não guardam dados de execução (configurado para não salvar). A memória do chat do n8n é por sessão e limitada a 8 mensagens. [Confirmar com o provedor do modelo a política de retenção e de treinamento com dados enviados via API.]
5. A IA não conclui, não assina e não decide; saídas são rascunhos com fonte, e aprovações são exclusivas do médico (versões aprovadas ficam imutáveis).

## 5. Riscos identificados e controles
| Risco | Controle existente | Lacuna / ação |
|---|---|---|
| Acesso indevido a processo | RLS por processo (`amcf_can_case`), MFA, auditoria | Revisão periódica de papéis |
| Vazamento em trânsito ao modelo | Webhook com segredo, HTTPS, flags liga/desliga, URLs curtas | Contrato/DPA com n8n e provedor do modelo [pendente] |
| Retenção indevida de anexos | Apagamento obrigatório + limpeza horária + auditoria | Conferir limpeza semanalmente |
| Prompt injection em documentos | Conteúdo tratado como dado; instrução no prompt; teste de injeção aprovado | Reteste a cada mudança de prompt |
| Arquivos maliciosos | Lista de tipos, tamanho, assinatura; processamento isolado do front | Antivírus dedicado não existe [avaliar] |
| Perda de dados | — | **Backup e teste de restauração não configurados** (ver `AMCF_BACKUP_RECUPERACAO.md`) |
| Senhas vazadas | — | Proteção do Auth exige plano Pro |
| Credenciais expostas no passado | Rotação planejada | **Pendente: rotacionar bridge key e token da secretária** |

## 6. Retenção (proposta, a decidir)
- Anexos na quarentena da IA: apagados imediatamente após a resposta; no pior caso expiram e são removidos pela limpeza.
- Documentos do processo e registros periciais: [prazo a definir, ex.: enquanto durar o processo + prazo de guarda do prontuário/perícia].
- Auditoria de IA: [prazo a definir].

## 7. Direitos dos titulares e incidentes
- Canal para solicitações dos titulares: [definir].
- Plano de resposta a incidente: desligar flags (ver rollback), rotacionar segredos, avaliar comunicação à ANPD e aos titulares em prazo razoável [detalhar com o encarregado].

## 8. Decisões que o responsável precisa tomar
1. Aprovar ou ajustar este rascunho com assessoria jurídica.
2. Definir encarregado e retenção.
3. Formalizar contratos/DPAs com os operadores.
4. Só então autorizar o uso com prontuários e laudos reais de pacientes em rotina (o responsável já autorizou o uso inicial e informou que o Dr. Adilson está ciente).
