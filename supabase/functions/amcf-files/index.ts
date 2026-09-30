const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const BUCKET = 'amcf-documentos';
const MAX_BYTES = 20 * 1024 * 1024;
const SIGNATURES: Record<string, number[]> = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const BASE = () => Deno.env.get('SUPABASE_URL')!;
const ANON = () => Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const withService = (path: string, init: RequestInit = {}) => fetch(BASE() + path, { ...init, headers: { apikey: SERVICE(), Authorization: `Bearer ${SERVICE()}`, ...(init.headers || {}) } });
const withCaller = (path: string, token: string, init: RequestInit = {}) => fetch(BASE() + path, { ...init, headers: { apikey: ANON(), Authorization: `Bearer ${token}`, ...(init.headers || {}) } });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const requestId = crypto.randomUUID();
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!token) return reply(401, { error: 'Autenticação necessária.' });
    const me = await withCaller('/auth/v1/user', token);
    if (!me.ok) return reply(401, { error: 'Sessão inválida.' });
    const contextResponse = await withCaller('/rest/v1/rpc/amcf_access_context', token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const context = contextResponse.ok ? await contextResponse.json() : null;
    if (!context?.capabilities?.operate) return reply(403, { error: 'Acesso não autorizado para este ambiente.' });
    const declared = Number(request.headers.get('Content-Length') || 0);
    if (declared > MAX_BYTES + 65536) return reply(413, { error: 'Arquivo acima do limite de 20 MB.' });
    const form = await request.formData();
    const action = String(form.get('action') || '');

    if (action === 'upload') {
      const caseId = String(form.get('case_id') || '');
      const file = form.get('file');
      const title = String(form.get('title') || '').trim();
      const category = String(form.get('category') || 'outro');
      const documentDate = String(form.get('document_date') || '');
      if (!caseId || !(file instanceof File)) return reply(400, { error: 'Informe o caso e o arquivo.' });
      if (title.length < 2 || title.length > 200) return reply(400, { error: 'Informe um nome de documento entre 2 e 200 caracteres.' });
      if (file.size <= 0 || file.size > MAX_BYTES) return reply(413, { error: 'O arquivo deve ter no máximo 20 MB.' });
      const mime = file.type === 'image/jpg' ? 'image/jpeg' : file.type;
      const signature = SIGNATURES[mime];
      if (!signature) return reply(415, { error: 'Formato não permitido. Envie PDF, PNG ou JPEG.' });
      const head = new Uint8Array(await file.slice(0, signature.length).arrayBuffer());
      if (signature.some((byte, index) => head[index] !== byte)) return reply(415, { error: 'O conteúdo do arquivo não corresponde ao formato informado.' });
      const caseResponse = await withCaller(`/rest/v1/amcf_cases?select=id,contact_id&id=eq.${encodeURIComponent(caseId)}`, token);
      const cases = caseResponse.ok ? await caseResponse.json() : [];
      const target = Array.isArray(cases) ? cases[0] : null;
      if (!target) return reply(403, { error: 'Caso indisponível para a sua conta.' });
      const bucketResponse = await withService(`/storage/v1/bucket/${BUCKET}`);
      if (!bucketResponse.ok) {
        const created = await withService('/storage/v1/bucket', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false, file_size_limit: MAX_BYTES }) });
        if (!created.ok) {
          const detail = await created.text();
          console.error(JSON.stringify({ requestId, step: 'bucket', detail: detail.slice(0, 200) }));
          return reply(503, { error: 'Armazenamento privado indisponível. Nenhum arquivo foi salvo.' });
        }
      }
      const safeName = String(file.name || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
      const path = `${caseId}/${crypto.randomUUID()}-${safeName}`;
      const upload = await withService(`/storage/v1/object/${BUCKET}/${encodeURI(path)}`, { method: 'POST', headers: { 'Content-Type': mime, 'x-upsert': 'false' }, body: await file.arrayBuffer() });
      if (!upload.ok) {
        const detail = await upload.text();
        console.error(JSON.stringify({ requestId, step: 'upload', detail: detail.slice(0, 200) }));
        return reply(502, { error: 'Falha ao gravar o arquivo no armazenamento privado.' });
      }
      const metadata = await withCaller('/rest/v1/amcf_documents', token, { method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ case_id: caseId, contact_id: target.contact_id ?? null, title, category, document_date: documentDate || null, storage_path: path, file_name: safeName, mime_type: mime, size_bytes: file.size }) });
      if (!metadata.ok) {
        await withService(`/storage/v1/object/${BUCKET}/${encodeURI(path)}`, { method: 'DELETE' });
        const detail = await metadata.text();
        console.error(JSON.stringify({ requestId, step: 'metadata', detail: detail.slice(0, 200) }));
        return reply(403, { error: 'Sem permissão para registrar este documento. O arquivo foi descartado.' });
      }
      const inserted = await metadata.json();
      return reply(200, { id: Array.isArray(inserted) ? inserted[0]?.id : inserted?.id, message: 'Documento armazenado em contêiner privado.' });
    }

    if (action === 'download') {
      const documentId = String(form.get('document_id') || '');
      const rowResponse = await withCaller(`/rest/v1/amcf_documents?select=file_name,storage_path&id=eq.${encodeURIComponent(documentId)}`, token);
      const rows = rowResponse.ok ? await rowResponse.json() : [];
      const document = Array.isArray(rows) ? rows[0] : null;
      if (!document) return reply(403, { error: 'Documento indisponível para a sua conta.' });
      const signed = await withService(`/storage/v1/object/sign/${BUCKET}/${encodeURI(document.storage_path)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 60 }) });
      if (!signed.ok) {
        const detail = await signed.text();
        console.error(JSON.stringify({ requestId, step: 'sign', detail: detail.slice(0, 200) }));
        return reply(502, { error: 'Não foi possível liberar o download agora.' });
      }
      const payload = await signed.json();
      const relative = payload?.signedURL ?? payload?.signedUrl;
      if (!relative) return reply(502, { error: 'O armazenamento não retornou um link válido.' });
      const url = relative.startsWith('http') ? relative : `${BASE()}/storage/v1${relative}`;
      return reply(200, { url, expires_in: 60 });
    }

    if (action === 'delete') {
      const documentId = String(form.get('document_id') || '');
      const rowResponse = await withCaller(`/rest/v1/amcf_documents?select=storage_path&id=eq.${encodeURIComponent(documentId)}`, token);
      const rows = rowResponse.ok ? await rowResponse.json() : [];
      const document = Array.isArray(rows) ? rows[0] : null;
      if (!document) return reply(403, { error: 'Documento indisponível para a sua conta.' });
      const deleted = await withCaller(`/rest/v1/amcf_documents?id=eq.${encodeURIComponent(documentId)}`, token, { method: 'DELETE', headers: { Prefer: 'return=representation' } });
      const removed = deleted.ok ? await deleted.json() : [];
      if (!Array.isArray(removed) || !removed.length) {
        console.error(JSON.stringify({ requestId, step: 'delete-row' }));
        return reply(403, { error: 'Sem permissão para excluir este documento.' });
      }
      const objectRemoval = await withService(`/storage/v1/object/${BUCKET}/${encodeURI(document.storage_path)}`, { method: 'DELETE' });
      if (!objectRemoval.ok) {
        console.error(JSON.stringify({ requestId, step: 'delete-object' }));
        return reply(200, { message: 'Registro excluído; a remoção do arquivo precisa de revisão administrativa.' });
      }
      return reply(200, { message: 'Documento excluído do registro e do armazenamento.' });
    }

    return reply(400, { error: 'Ação não suportada.' });
  } catch (error) {
    console.error(JSON.stringify({ requestId, step: 'unhandled', detail: String(error).slice(0, 200) }));
    return reply(500, { error: 'Não foi possível concluir a operação de arquivos.', requestId });
  }
});
