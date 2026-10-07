// Extração de texto de documentos no navegador (a biblioteca é carregada só quando usada).
// O arquivo não é enviado a nenhum serviço externo: a leitura acontece localmente e apenas o
// texto resultante por página é gravado no banco. OCR de páginas digitalizadas NÃO está disponível
// neste ambiente e é reportado explicitamente como dependência externa.

export interface ExtractedPage { page_number: number; content: string; char_count: number; extraction_status: 'extraida' | 'sem_texto' }
export interface ExtractionResult { pages: ExtractedPage[]; total_pages: number; needs_ocr: boolean; engine: string; empty_pages: number }

const MIN_PAGE_CHARS = 20;

export async function hashContent(file: Blob): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function normalize(text: string): string {
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export async function extractText(file: File, onProgress?: (done: number, total: number) => void): Promise<ExtractionResult> {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) {
    // Imagens só podem ser lidas por OCR, que depende de serviço externo neste ambiente.
    return { pages: [], total_pages: 0, needs_ocr: true, engine: 'nenhum (formato sem camada de texto)', empty_pages: 0 };
  }
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = await file.arrayBuffer();
  const document = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: ExtractedPage[] = [];
  let emptyPages = 0;
  for (let index = 1; index <= document.numPages; index += 1) {
    const page = await document.getPage(index);
    const content = await page.getTextContent();
    const text = normalize(content.items.map(item => {
      const piece = item as { str?: string; hasEOL?: boolean };
      return `${piece.str || ''}${piece.hasEOL ? '\n' : ' '}`;
    }).join(''));
    const chars = text.length;
    if (chars < MIN_PAGE_CHARS) emptyPages += 1;
    pages.push({ page_number: index, content: text.slice(0, 400000), char_count: chars, extraction_status: chars < MIN_PAGE_CHARS ? 'sem_texto' : 'extraida' });
    onProgress?.(index, document.numPages);
  }
  await document.destroy();
  const texted = pages.filter(page => page.extraction_status === 'extraida').length;
  return { pages, total_pages: pages.length, needs_ocr: texted === 0 && pages.length > 0, engine: 'extração local no navegador (pdf.js)', empty_pages: emptyPages };
}

export type { ExtractedPage as Page };
