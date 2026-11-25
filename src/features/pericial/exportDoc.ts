// Exportação de laudos/petições sem dependências: Word (HTML aberto pelo Word) e PDF (impressão do navegador).
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function documentHtml(title: string, text: string, footer: string): string {
  const paragraphs = text.split(/\n{2,}/).map(block => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`).join('\n');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>@page{size:A4;margin:2.5cm}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.5;color:#000}h1{font-size:15pt;text-align:center;margin:0 0 18pt}p{margin:0 0 10pt;text-align:justify}.rodape{margin-top:28pt;font-size:9pt;color:#444;border-top:1px solid #999;padding-top:6pt}</style></head>
<body><h1>${escapeHtml(title)}</h1>\n${paragraphs}\n<div class="rodape">${escapeHtml(footer)}</div></body></html>`;
}

const safeName = (title: string) => (title.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'documento');

export function downloadWord(title: string, text: string, footer: string): void {
  const blob = new Blob(['﻿', documentHtml(title, text, footer)], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `${safeName(title)}.doc`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// Abre o diálogo de impressão do navegador (escolha "Salvar como PDF"). Usa iframe oculto: sem pop-up.
export function printAsPdf(title: string, text: string, footer: string): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) { frame.remove(); return; }
  doc.open(); doc.write(documentHtml(title, text, footer)); doc.close();
  setTimeout(() => { frame.contentWindow?.focus(); frame.contentWindow?.print(); setTimeout(() => frame.remove(), 2000); }, 300);
}
