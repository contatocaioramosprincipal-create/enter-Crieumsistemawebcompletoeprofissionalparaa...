// Autoriza, valida e registra documentos. Os bytes NÃO passam por esta função: o navegador envia direto ao Storage privado (TUS).
const ALLOWED_ORIGINS = new Set(['https://sistema.dradilsoncouto.com.br', 'https://amcf-dr-adilson-original.pages.dev']);
const corsFor = (origin: string) => ({
  ...(ALLOWED_ORIGINS.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
});
let cors = corsFor('');

const BUCKET = 'amcf-documentos';
const APP_MAX_BYTES = 200 * 1024 * 1024; // teto lógico do produto; o limite efetivo é o menor entre este e o do bucket/plano
const DEFAULT_BUCKET_LIMIT = 50 * 1024 * 1024;
const SIGNATURES: Record<string, number[]> = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIES = ['procuracao', 'processo', 'laudo', 'exame', 'quesitos', 'contrato', 'comprovante', 'outro'];

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const BASE = () => Deno.env.get('SUPABASE_URL')!;
const ANON = () => Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const withService = (path: string, init: RequestInit = {}) => fetch(BASE() + path, { ...init, headers: { apikey: SERVICE(), Authorization: `Bearer ${SERVICE()}`, ...(init.headers || {}) } });
const withCaller = (path: string, token: string, init: RequestInit = {}) => fetch(BASE() + path, { ...init, headers: { apikey: ANON(), Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

async function ensureBucket(requestId: string) {
  const found = await withService(`/storage/v1/bucket/${BUCKET}`);
  if (found.ok) { const info = await found.json(); return { ok: true, limit: Number(info?.file_size_limit) || DEFAULT_BUCKET_LIMIT }; }
  const created = await withService('/storage/v1/bucket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: DEFAULT_BUCKET_LIMIT, allowed_mime_types: Object.keys(SIGNATURES) }) });
  if (!created.ok) { console.error(JSON.stringify({ requestId, step: 'bucket', detail: (await created.text()).slice(0, 200) })); return { ok: false, limit: 0 }; }
  return { ok: true, limit: DEFAULT_BUCKET_LIMIT };
}
const removeObject = (path: string) => withService(`/storage/v1/object/${BUCKET}/${encodePath(path)}`, { method: 'DELETE' });

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('Origin') || '';
  cors = corsFor(origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(403, { error: 'Origem não autorizada.' });
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const requestId = crypto.randomUUID();
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return reply(401, { error: 'Autenticação necessária.' });
    if (Number(request.headers.get('Content-Length') || 0) > 8192) return reply(413, { error: 'Solicitação muito grande.' });
    const me = await withCaller('/auth/v1/user', token);
    if (!me.ok) return reply(401, { error: 'Sessão inválida.' });
    const contextResponse = await withCaller('/rest/v1/rpc/amcf_access_context', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const context = contextResponse.ok ? await contextResponse.json() : null;
    if (!context?.capabilities?.operate) return reply(403, { error: 'Acesso não autorizado para este ambiente.' });
    let input: Record<string, unknown>;
    try { input = await request.json(); } catch { return reply(400, { error: 'Solicitação inválida.' }); }
    const action = String(input.action || '');

    if (action === 'limits') {
      const bucket = await ensureBucket(requestId);
      if (!bucket.ok) return reply(503, { error: 'Armazenamento privado indisponível.' });
      return reply(200, { max_bytes: Math.min(APP_MAX_BYTES, bucket.limit), app_max_bytes: APP_MAX_BYTES });
    }

    if (action === 'finalize') {
      const caseId = String(input.case_id || ''); const path = String(input.path || '');
      const title = String(input.title || '').trim(); const category = CATEGORIES.includes(String(input.category)) ? String(input.category) : 'outro';
      const documentDate = String(input.document_date || ''); const rawName = String(input.file_name || 'documento');
      if (!UUID.test(caseId)) return reply(400, { error: 'Caso inválido.' });
      const parts = path.split('/');
      if (parts.length !== 2 || parts[0] !== caseId || !parts[1] || path.includes('..') || path.length > 220) return reply(400, { error: 'Caminho de arquivo inválido.' });
      if (title.length < 2 || title.length > 200) return reply(400, { error: 'Informe um nome de documento entre 2 e 200 caracteres.' });
      if (documentDate && !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) return reply(400, { error: 'Data inválida.' });
      const caseResponse = await withCaller(`/rest/v1/amcf_cases?select=id,contact_id&id=eq.${caseId}`, token);
      const cases = caseResponse.ok ? await caseResponse.json() : [];
      const target = Array.isArray(cases) ? cases[0] : null;
      if (!target) return reply(403, { error: 'Caso indisponível para a sua conta.' }); // NEVER delete a client-specified path after authorization failure
      const bucket = await ensureBucket(requestId); const limit = Math.min(APP_MAX_BYTES, bucket.limit || DEFAULT_BUCKET_LIMIT);
      const listed = await withService(`/storage/v1/object/list/${BUCKET}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: caseId, limit: 5, search: parts[1] }) });
      const items = listed.ok ? await listed.json() : [];
      const object = Array.isArray(items) ? items.find((item: { name?: string }) => item?.name === parts[1]) : null;
      if (!object) return reply(404, { error: 'O arquivo enviado não foi encontrado no armazenamento. Envie novamente.' });
      const bytes = Number(object.metadata?.size || 0);
      if (!bytes || bytes > limit) { await removeObject(path); return reply(413, { error: `Arquivo acima do limite efetivo de ${Math.floor(limit / 1048576)} MB. O envio foi descartado.` }); }
      const signed = await withService(`/storage/v1/object/sign/${BUCKET}/${encodePath(path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 30 }) });
      const signedPayload = signed.ok ? await signed.json() : null; const relative = signedPayload?.signedURL ?? signedPayload?.signedUrl;
      if (!relative) return reply(502, { error: 'Não foi possível verificar o arquivo agora. Tente finalizar novamente.' });
      const head = await fetch(relative.startsWith('http') ? relative : `${BASE()}/storage/v1${relative}`, { headers: { Range: 'bytes=0-7' } });
      const reader = head.body?.getReader(); const first = reader ? (await reader.read()).value ?? new Uint8Array() : new Uint8Array(); await reader?.cancel().catch(() => {});
      const mime = Object.keys(SIGNATURES).find(type => SIGNATURES[type].every((byte, index) => first[index] === byte));
      if (!mime) { await removeObject(path); return reply(415, { error: 'O conteúdo do arquivo não é PDF, PNG ou JPEG válido. O envio foi descartado.' }); }
      const fileName = rawName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'documento';
      const metadata = await withCaller('/rest/v1/amcf_documents', token, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ case_id: caseId, contact_id: target.contact_id ?? null, title, category, document_date: documentDate || null, storage_path: path, file_name: fileName, mime_type: mime, size_bytes: bytes }) });
      if (!metadata.ok) { await removeObject(path); console.error(JSON.stringify({ requestId, step: 'metadata', detail: (await metadata.text()).slice(0, 200) })); return reply(403, { error: 'Sem permissão para registrar este documento. O arquivo foi descartado.' }); }
      const inserted = await metadata.json();
      return reply(200, { id: Array.isArray(inserted) ? inserted[0]?.id : inserted?.id, size_bytes: bytes, message: 'Documento armazenado em contêiner privado.' });
    }

    if (action === 'download' || action === 'delete') {
      const documentId = String(input.document_id || '');
      if (!UUID.test(documentId)) return reply(400, { error: 'Documento inválido.' });
      const rowResponse = await withCaller(`/rest/v1/amcf_documents?select=file_name,storage_path&id=eq.${documentId}`, token);
      const rows = rowResponse.ok ? await rowResponse.json() : [];
      const document = Array.isArray(rows) ? rows[0] : null;
      if (!document) return reply(403, { error: 'Documento indisponível para a sua conta.' });
      const legacy = String(document.storage_path).startsWith('db/'); // registros antigos (Base64 no banco) não têm objeto no Storage

      if (action === 'download') {
        if (legacy) return reply(409, { error: 'Documento legado: baixe pela tela de documentos.', legacy: true });
        const signed = await withService(`/storage/v1/object/sign/${BUCKET}/${encodePath(document.storage_path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }) });
        if (!signed.ok) { console.error(JSON.stringify({ requestId, step: 'sign', detail: (await signed.text()).slice(0, 200) })); return reply(502, { error: 'Não foi possível liberar o download agora.' }); }
        const payload = await signed.json(); const relative = payload?.signedURL ?? payload?.signedUrl;
        if (!relative) return reply(502, { error: 'O armazenamento não retornou um link válido.' });
        return reply(200, { url: relative.startsWith('http') ? relative : `${BASE()}/storage/v1${relative}`, file_name: document.file_name, expires_in: 60 });
      }

      const deleted = await withCaller(`/rest/v1/amcf_documents?id=eq.${documentId}`, token, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      const removed = deleted.ok ? await deleted.json() : [];
      if (!Array.isArray(removed) || !removed.length) return reply(403, { error: 'Sem permissão para excluir este documento.' });
      if (legacy) return reply(200, { message: 'Documento excluído.' });
      const gone = await removeObject(document.storage_path);
      if (!gone.ok) { console.error(JSON.stringify({ requestId, step: 'delete-object' })); return reply(200, { message: 'Registro excluído; a remoção do arquivo precisa de revisão administrativa.' }); }
      return reply(200, { message: 'Documento excluído do registro e do armazenamento.' });
    }

    return reply(400, { error: 'Ação não suportada.' });
  } catch (error) {
    console.error(JSON.stringify({ requestId, step: 'unhandled', detail: String(error).slice(0, 200) }));
    return reply(500, { error: 'Não foi possível concluir a operação de arquivos.', requestId });
  }
});
