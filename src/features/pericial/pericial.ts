// Regras puras da evolução médico-pericial: rótulos, validações e composição de texto.
// Nada aqui inventa conteúdo: os textos são montados a partir de registros existentes.

export const actionTypes = { pericia_judicial: 'Perícia judicial', assistencia_tecnica: 'Assistência técnica', parecer_tecnico: 'Parecer técnico' } as const;
export const stepStatuses = { pendente: 'Pendente', em_andamento: 'Em andamento', concluida: 'Concluída', cancelada: 'Cancelada' } as const;
export const movementClass = { informativo: 'Informativo', requer_acao: 'Requer ação', possivel_prazo: 'Possível prazo (confirmar)', agenda: 'Possível compromisso' } as const;
export const movementReview = { nova: 'Não revisada', revisada: 'Revisada', ignorada: 'Ignorada' } as const;
export const movementSources = { manual: 'Manual', importacao: 'Importação manual', api: 'Integração (API)', adaptador: 'Adaptador judicial' } as const;
export const textStatuses = { pendente: 'Sem texto extraído', processando: 'Processando', extraido: 'Texto extraído', parcial: 'Texto parcial', falha: 'Falha na extração', ocr_pendente: 'Aguardando OCR (não configurado)', nao_suportado: 'Formato não suportado' } as const;
export const analysisStatuses = { rascunho: 'Rascunho', revisao: 'Em revisão', aprovada: 'Aprovada', substituida: 'Substituída por versão posterior' } as const;
export const analysisSections = { resumo: 'Resumo executivo', cronologia: 'Cronologia clínica', controversoes: 'Pontos controvertidos', divergencias: 'Divergências', evidencias: 'Evidências', lacunas: 'Lacunas e ausências' } as const;
export const itemKinds = { registro: 'Registro (documento/movimentação)', alegacao: 'Alegação de parte', inferencia: 'Inferência técnica', ausencia: 'Ausência de informação' } as const;
export const questionAuthors = { juizo: 'Juízo', parte_autora: 'Parte autora', parte_re: 'Parte ré', assistente_tecnico: 'Assistente técnico', outro: 'Outro' } as const;
export const questionStatuses = { aberta: 'Sem resposta', em_analise: 'Em análise', respondida: 'Respondida (não revisada)', revisada: 'Revisada', impugnada: 'Impugnada' } as const;
export const answerStatuses = { rascunho: 'Rascunho', revisao: 'Em revisão médica', revisada: 'Revisada', aprovada: 'Aprovada' } as const;
export const findingKinds = { achado: 'Achado', medicao: 'Medição', documental: 'Documental', entrevista: 'Entrevista', exame_fisico: 'Exame físico' } as const;
export const examModalities = { presencial: 'Presencial', telepericia: 'Teleperícia', documental: 'Análise documental' } as const;
export const examStatuses = { planejado: 'Planejado', realizado: 'Realizado', cancelado: 'Cancelado' } as const;
export const reportKinds = { laudo: 'Laudo pericial', peticao: 'Petição', esclarecimento: 'Esclarecimento' } as const;
export const reportStatuses = { rascunho: 'Rascunho', revisao: 'Em revisão médica', aprovado: 'Aprovado', substituido: 'Substituído por versão posterior' } as const;
export const referenceKinds = { norma: 'Norma', doutrina: 'Doutrina', artigo: 'Artigo', jurisprudencia: 'Jurisprudência', protocolo: 'Protocolo/consenso' } as const;
export const financialKinds = { deposito: 'Depósito judicial', liberacao: 'Liberação', alvara: 'Alvará', honorario: 'Honorário pericial', despesa: 'Despesa do processo' } as const;
export const financialStatuses = { previsto: 'Previsto', confirmado: 'Confirmado', cancelado: 'Cancelado' } as const;
export const courtKinds = { datajud: 'DataJud (CNJ)', pje: 'PJe', esaj: 'e-SAJ', outro: 'Outro' } as const;
export const sourceKinds = { documento: 'Documento', pagina_documento: 'Página de documento', movimentacao: 'Movimentação', achado_exame: 'Achado do exame', quesito: 'Quesito', registro_manual: 'Registro manual', referencia: 'Referência verificada' } as const;

const labelsOf = (map: Record<string, string>, value: string | null | undefined) => (value && map[value]) || value || '—';
export const label = labelsOf;

// Número único CNJ: 7 dígitos, 2 de verificação, ano, segmento, tribunal e origem (Resolução CNJ 65/2008).
export function formatCnj(value: string): string {
  const digits = (value || '').replace(/[^0-9]/g, '').slice(0, 20);
  if (digits.length <= 7) return digits;
  if (digits.length <= 9) return `${digits.slice(0, 7)}-${digits.slice(7)}`;
  if (digits.length <= 13) return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9)}`;
  if (digits.length <= 14) return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13)}`;
  if (digits.length <= 16) return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14)}`;
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}
export function isValidCnj(value: string): boolean {
  return /^[0-9]{7}-[0-9]{2}\.[0-9]{4}\.[0-9]\.[0-9]{2}\.[0-9]{4}$/.test((value || '').trim());
}
export function cnjError(value: string): string {
  const clean = (value || '').trim();
  if (!clean) return '';
  return isValidCnj(formatCnj(clean)) ? '' : 'O número deve seguir o padrão CNJ: 0000000-00.0000.0.00.0000.';
}

export interface MovementDraft { occurred_on: string; title: string; detail: string }
// Importação manual: uma movimentação por linha, campos separados por ponto e vírgula.
// O que não segue o formato volta em `errors` — nada é importado parcialmente sem aviso.
export function parseManualImport(text: string): { items: MovementDraft[]; errors: string[] } {
  const items: MovementDraft[] = []; const errors: string[] = [];
  (text || '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const parts = line.split(';').map(part => part.trim());
    if (parts.length < 2) { errors.push(`Linha ${index + 1}: informe data e título separados por ponto e vírgula.`); return; }
    const [date, title, ...rest] = parts;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(date)) { errors.push(`Linha ${index + 1}: data inválida (use AAAA-MM-DD).`); return; }
    if (title.length < 2) { errors.push(`Linha ${index + 1}: título muito curto.`); return; }
    items.push({ occurred_on: date, title: title.slice(0, 300), detail: rest.join('; ').slice(0, 20000) });
  });
  return { items, errors };
}

// Modelo de laudo: substitui apenas os marcadores previstos, sempre com conteúdo real do processo.
export function fillTemplate(body: string, values: Record<string, string>): string {
  return (body || '').replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key: string) => {
    const value = values[key.toLowerCase()];
    return value === undefined ? match : value;
  });
}
export function templatePlaceholders(body: string): string[] {
  const found = (body || '').match(/\{\{\s*([a-z_]+)\s*\}\}/gi) || [];
  return Array.from(new Set(found.map(item => item.replace(/[{}]/g, '').trim())));
}
export function missingPlaceholders(body: string, values: Record<string, string>): string[] {
  return templatePlaceholders(body).filter(key => !(values[key.toLowerCase()] || '').trim());
}

export interface SourceLike { source_kind: string; quote?: string | null; page_number?: number | null; document_title?: string | null; movement_title?: string | null; movement_on?: string | null; finding_title?: string | null; question_number?: number | null; reference_citation?: string | null }
// Descrição legível e verificável de uma fonte citada.
export function describeSource(source: SourceLike): string {
  const quote = (source.quote || '').trim();
  const suffix = quote ? ` — “${quote.length > 160 ? `${quote.slice(0, 160)}…` : quote}”` : '';
  switch (source.source_kind) {
    case 'pagina_documento': return `Documento${source.document_title ? ` ${source.document_title}` : ''}, página ${source.page_number ?? '?'}${suffix}`;
    case 'documento': return `Documento${source.document_title ? ` ${source.document_title}` : ''}${suffix}`;
    case 'movimentacao': return `Movimentação${source.movement_on ? ` de ${source.movement_on}` : ''}: ${source.movement_title || 'registro do processo'}${suffix}`;
    case 'achado_exame': return `Achado do exame: ${source.finding_title || 'registro'}${suffix}`;
    case 'quesito': return `Quesito ${source.question_number ?? ''}${suffix}`;
    case 'referencia': return `Referência verificada: ${source.reference_citation || 'registro'}${suffix}`;
    default: return `Registro manual${suffix}`;
  }
}

// Motivo da prioridade de cada item do Meu dia: sempre explícito, nunca deduzido em silêncio.
export function priorityReason(kind: 'task' | 'movement' | 'step' | 'question' | 'document' | 'report' | 'deposit', today: string, values: { due_on?: string | null; classification?: string | null; next_action_on?: string | null; text_status?: string | null; status?: string | null }): string {
  const due = values.due_on || values.next_action_on || '';
  const late = !!due && due < today;
  switch (kind) {
    case 'task': return late ? `Tarefa em atraso desde ${due}` : `Vencimento em ${due || 'data não informada'}`;
    case 'movement': return values.classification === 'possivel_prazo'
      ? 'Termo que pode indicar prazo — confirmar com o responsável (nenhum prazo foi calculado)'
      : values.classification === 'agenda' ? 'Possível compromisso designado — verificar agenda' : 'Movimentação ainda não revisada';
    case 'step': return late ? `Próxima ação vencida em ${due}` : `Próxima ação prevista para ${due || 'sem data'}`;
    case 'question': return `Quesito ${values.status === 'em_analise' ? 'em análise' : 'sem resposta revisada'}`;
    case 'document': return `Documento sem texto utilizável (${label(textStatuses, values.text_status)})`;
    case 'report': return values.status === 'revisao' ? 'Aguardando aprovação médica' : 'Rascunho de laudo/petição em andamento';
    case 'deposit': return 'Valor previsto no processo — conferir com o financeiro';
    default: return 'Pendência operacional';
  }
}

export function readinessLines(readiness: { blocking?: string[]; warnings?: string[] } | null | undefined): { blocking: string[]; warnings: string[] } {
  return { blocking: readiness?.blocking || [], warnings: readiness?.warnings || [] };
}

// Situação do processamento de texto: orienta a próxima ação sem prometer OCR automático.
export function extractionHint(status: string | null | undefined, engine: string | null | undefined): string {
  switch (status) {
    case 'extraido': return `Texto extraído por ${engine || 'extrator local'} (no navegador, sem envio do arquivo).`;
    case 'parcial': return 'Parte das páginas tem texto; as páginas digitalizadas precisam de OCR.';
    case 'ocr_pendente': return 'Páginas sem camada de texto. O OCR não está configurado no ambiente e depende de serviço externo.';
    case 'falha': return 'A extração falhou. Reexecute o processamento ou confira o arquivo.';
    case 'nao_suportado': return 'Formato sem extração de texto disponível.';
    case 'processando': return 'Processamento em andamento.';
    default: return 'Extração de texto ainda não executada.';
  }
}
