import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const BUCKET = 'amcf-documentos';
const MAX_BYTES = 20 * 1024 * 1024;
const SIGNATURES: Record<string, number[]> = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  const requestId = crypto.randomUUID();
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Autenticação necessária.' });
    const url = Deno.env.get('SUPABASE_URL')!;
    const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: identity, error: invalid } = await user.auth.getUser();
    if (invalid || !identity.user) return reply(401, { error: 'Sessão inválida.' });
    const { data: context, error: denied } = await user.rpc('amcf_access_context');
    if (denied || !context?.capabilities?.operate) return reply(403, { error: 'Acesso não autorizado para este ambiente.' });
    if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES + 65536) return reply(413, { error: 'Arquivo acima do limite de 20 MB.' });
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
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
      const { data: target, error: caseError } = await user.from('amcf_cases').select('id, contact_id').eq('id', caseId).maybeSingle();
      if (caseError || !target) return reply(403, { error: 'Caso indisponível para a sua conta.' });
      const { data: bucket } = await service.storage.getBucket(BUCKET);
      if (!bucket) {
        const { error: bucketError } = await service.storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
        if (bucketError && !String(bucketError.message).toLowerCase().includes('already')) {
          console.error(JSON.stringify({ requestId, step: 'bucket', code: bucketError.message }));
          return reply(503, { error: 'Armazenamento privado indisponível. Nenhum arquivo foi salvo.' });
        }
      }
      const safeName = String(file.name || 'documento').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120);
      const path = `${caseId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await service.storage.from(BUCKET).upload(path, file, { contentType: mime, upsert: false });
      if (uploadError) {
        console.error(JSON.stringify({ requestId, step: 'upload', code: uploadError.message }));
        return reply(502, { error: 'Falha ao gravar o arquivo no armazenamento privado.' });
      }
      const { data: inserted, error: insertError } = await user.from('amcf_documents').insert({ case_id: caseId, contact_id: target.contact_id, title, category, document_date: documentDate || null, storage_path: path, file_name: safeName, mime_type: mime, size_bytes: file.size }).select('id').maybeSingle();
      if (insertError || !inserted) {
        await service.storage.from(BUCKET).remove([path]);
        console.error(JSON.stringify({ requestId, step: 'metadata', code: insertError?.code || 'empty' }));
        return reply(403, { error: 'Sem permissão para registrar este documento. O arquivo foi descartado.' });
      }
      return reply(200, { id: inserted.id, message: 'Documento armazenado em contêiner privado.' });
    }

    if (action === 'download') {
      const documentId = String(form.get('document_id') || '');
      const { data: document, error: readError } = await user.from('amcf_documents').select('storage_path, file_name').eq('id', documentId).maybeSingle();
      if (readError || !document) return reply(403, { error: 'Documento indisponível para a sua conta.' });
      const { data: signed, error: signError } = await service.storage.from(BUCKET).createSignedUrl(document.storage_path, 60, { download: document.file_name });
      if (signError || !signed?.signedUrl) {
        console.error(JSON.stringify({ requestId, step: 'sign', code: signError?.message || 'empty' }));
        return reply(502, { error: 'Não foi possível liberar o download agora.' });
      }
      return reply(200, { url: signed.signedUrl, expires_in: 60 });
    }

    if (action === 'delete') {
      const documentId = String(form.get('document_id') || '');
      const { data: removed, error: deleteError } = await user.from('amcf_documents').select('storage_path').eq('id', documentId).maybeSingle();
      if (deleteError || !removed) return reply(403, { error: 'Documento indisponível para a sua conta.' });
      const { data: deleted, error: rowError } = await user.from('amcf_documents').delete().eq('id', documentId).select('id');
      if (rowError || !deleted?.length) {
        console.error(JSON.stringify({ requestId, step: 'delete-row', code: rowError?.code || 'empty' }));
        return reply(403, { error: 'Sem permissão para excluir este documento.' });
      }
      const { error: removeError } = await service.storage.from(BUCKET).remove([removed.storage_path]);
      if (removeError) {
        console.error(JSON.stringify({ requestId, step: 'delete-object', documentId }));
        return reply(200, { message: 'Registro excluído; a remoção do arquivo precisa de revisão administrativa.' });
      }
      return reply(200, { message: 'Documento excluído do registro e do armazenamento.' });
    }

    return reply(400, { error: 'Ação não suportada.' });
  } catch {
    console.error(JSON.stringify({ requestId, step: 'unhandled' }));
    return reply(500, { error: 'Não foi possível concluir a operação de arquivos.', requestId });
  }
});
