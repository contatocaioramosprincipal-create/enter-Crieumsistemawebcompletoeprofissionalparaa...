// Cliente TUS mínimo (sem dependência nova) para o Supabase Storage. Envia em blocos de 6 MB, retoma após falha de rede.
export const CHUNK_BYTES = 6 * 1024 * 1024;
const b64 = (value: string) => { const bytes = new TextEncoder().encode(value); let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };

export interface ResumableOptions {
  endpoint: string; // https://<projeto>/storage/v1/upload/resumable
  apikey: string;
  getToken: () => Promise<string>;
  bucket: string; objectName: string; contentType: string; file: Blob;
  onProgress?: (sent: number, total: number) => void;
  retries?: number; retryDelayMs?: number;
  fetchImpl?: typeof fetch;
}
export class ResumableUnsupported extends Error {}
export class UploadRejected extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

export async function uploadResumable(o: ResumableOptions): Promise<void> {
  const doFetch = o.fetchImpl ?? fetch; const retries = o.retries ?? 4; const delay = o.retryDelayMs ?? 1500;
  const headers = async (extra: Record<string, string> = {}) => ({ apikey: o.apikey, authorization: `Bearer ${await o.getToken()}`, 'tus-resumable': '1.0.0', ...extra });
  const meta = [`bucketName ${b64(o.bucket)}`, `objectName ${b64(o.objectName)}`, `contentType ${b64(o.contentType)}`, `cacheControl ${b64('3600')}`].join(',');
  const created = await doFetch(o.endpoint, { method: 'POST', headers: await headers({ 'upload-length': String(o.file.size), 'upload-metadata': meta, 'x-upsert': 'false' }) });
  if ([404, 405, 501].includes(created.status)) throw new ResumableUnsupported('Envio resumível indisponível neste ambiente.');
  if (created.status === 413) throw new UploadRejected(413, 'O arquivo excede o limite de tamanho do armazenamento.');
  if (created.status === 401 || created.status === 403) throw new UploadRejected(created.status, 'Sem permissão para enviar arquivo a este caso.');
  if (created.status !== 201) throw new UploadRejected(created.status, `Falha ao iniciar o envio (HTTP ${created.status}).`);
  const location = created.headers.get('location'); if (!location) throw new UploadRejected(502, 'O armazenamento não retornou o endereço do envio.');
  const target = new URL(location, o.endpoint).toString();
  let offset = 0; let failures = 0;
  while (offset < o.file.size) {
    const end = Math.min(offset + CHUNK_BYTES, o.file.size);
    try {
      const response = await doFetch(target, { method: 'PATCH', headers: await headers({ 'content-type': 'application/offset+octet-stream', 'upload-offset': String(offset) }), body: o.file.slice(offset, end) });
      if (response.status === 413) throw new UploadRejected(413, 'O arquivo excede o limite de tamanho do armazenamento.');
      if (response.status === 401 || response.status === 403) throw new UploadRejected(response.status, 'Sem permissão para enviar arquivo a este caso.');
      if (response.status !== 204) throw new Error(`HTTP ${response.status}`);
      const next = Number(response.headers.get('upload-offset')); offset = Number.isFinite(next) && next > offset ? next : end; failures = 0;
      o.onProgress?.(offset, o.file.size);
    } catch (error) {
      if (error instanceof UploadRejected) throw error;
      failures += 1; if (failures > retries) throw new UploadRejected(0, 'A conexão falhou durante o envio. Tente novamente; o arquivo não foi registrado.');
      await new Promise(r => setTimeout(r, delay * failures));
      const head = await doFetch(target, { method: 'HEAD', headers: await headers() }).catch(() => null);
      const known = head && head.ok ? Number(head.headers.get('upload-offset')) : NaN; if (Number.isFinite(known)) offset = known;
    }
  }
}
