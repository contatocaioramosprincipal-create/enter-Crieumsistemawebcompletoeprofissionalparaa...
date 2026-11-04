// Comparação de versões por linha (LCS). Sem dependências. Limita o tamanho para não travar o navegador.
export interface DiffLine { kind: 'same' | 'add' | 'del'; text: string }

export function diffLines(before: string, after: string, maxLines = 1500): DiffLine[] | null {
  const a = before.split('\n'), b = after.split('\n');
  if (a.length > maxLines || b.length > maxLines) return null;
  const n = a.length, m = b.length;
  const table: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: 'same', text: a[i] }); i++; j++; }
    else if (table[i + 1][j] >= table[i][j + 1]) { out.push({ kind: 'del', text: a[i] }); i++; }
    else { out.push({ kind: 'add', text: b[j] }); j++; }
  }
  while (i < n) out.push({ kind: 'del', text: a[i++] });
  while (j < m) out.push({ kind: 'add', text: b[j++] });
  return out;
}
