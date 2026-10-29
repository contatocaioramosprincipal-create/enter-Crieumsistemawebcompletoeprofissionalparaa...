// Leitura de planilha CSV (colar texto ou arquivo) para cadastro em lote de casos. Sem dependências.
export interface ImportRow { line: number; reference: string; title: string; contact: string; service: string; cnj: string; claimant: string; defendant: string; court: string }
export interface ParsedImport { rows: ImportRow[]; errors: string[] }

const norm = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
export const normName = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const aliases: Record<string, keyof Omit<ImportRow, 'line'>> = {
  referencia: 'reference', ref: 'reference', titulo: 'title', caso: 'title', contato: 'contact', cliente: 'contact', servico: 'service', tipo: 'service',
  cnj: 'cnj', numerocnj: 'cnj', processo: 'cnj', numerodoprocesso: 'cnj', autor: 'claimant', requerente: 'claimant', reu: 'defendant', requerido: 'defendant', vara: 'court', juizo: 'court', tribunal: 'court',
};

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) { if (ch === '"') { if (line[i + 1] === '"') { cell += '"'; i++; } else quoted = false; } else cell += ch; }
    else if (ch === '"') quoted = true;
    else if (ch === delimiter) { cells.push(cell.trim()); cell = ''; }
    else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
}

// Aceita 0000000-00.0000.0.00.0000 ou só os 20 dígitos; devolve o formato do banco ou ''.
export function formatCnj(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 20) return '';
  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16)}`;
}

export function parseCaseImport(text: string, max = 200): ParsedImport {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return { rows: [], errors: ['Cole o cabeçalho e ao menos uma linha. Colunas: referencia; titulo; contato; servico; cnj (opcional); autor; reu; vara.'] };
  const delimiter = [';', '\t', ','].reduce((best, candidate) => lines[0].split(candidate).length > lines[0].split(best).length ? candidate : best, ';');
  const header = splitLine(lines[0], delimiter).map(name => aliases[norm(name)]);
  const need: (keyof Omit<ImportRow, 'line'>)[] = ['reference', 'title', 'contact', 'service'];
  const missing = need.filter(key => !header.includes(key));
  if (missing.length) return { rows: [], errors: [`Colunas obrigatórias ausentes: ${missing.join(', ')}.`] };
  const rows: ImportRow[] = []; const errors: string[] = []; const seen = new Set<string>();
  lines.slice(1).forEach((raw, index) => {
    const line = index + 2;
    if (index >= max) { if (index === max) errors.push(`Limite de ${max} linhas por importação; o restante foi ignorado.`); return; }
    const cells = splitLine(raw, delimiter);
    const row: ImportRow = { line, reference: '', title: '', contact: '', service: '', cnj: '', claimant: '', defendant: '', court: '' };
    header.forEach((key, position) => { if (key) row[key] = (cells[position] || '').trim(); });
    const problems: string[] = [];
    if (row.reference.length < 3 || row.reference.length > 40) problems.push('referência deve ter de 3 a 40 caracteres');
    if (row.title.length < 3 || row.title.length > 200) problems.push('título deve ter de 3 a 200 caracteres');
    if (!row.contact) problems.push('contato ausente');
    if (row.service.length < 2 || row.service.length > 160) problems.push('serviço deve ter de 2 a 160 caracteres');
    if (row.cnj) { const formatted = formatCnj(row.cnj); if (!formatted) problems.push('número CNJ inválido (precisa de 20 dígitos)'); else row.cnj = formatted; }
    if (row.claimant.length > 200 || row.defendant.length > 200 || row.court.length > 160) problems.push('autor/réu/vara longos demais');
    const key = row.reference.toLowerCase();
    if (seen.has(key)) problems.push('referência repetida na planilha');
    seen.add(key);
    if (problems.length) errors.push(`Linha ${line}: ${problems.join('; ')}.`); else rows.push(row);
  });
  return { rows, errors };
}
