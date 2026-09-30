import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { uploadResumable, ResumableUnsupported, UploadRejected, CHUNK_BYTES } from '../../.test-build/resumable.js';

let server; let base; let mode = 'ok'; let received; let failedOnce; let seenHeaders;
const start = () => new Promise(resolve => { server = http.createServer((req, res) => {
  if (mode === 'missing') { res.writeHead(404).end(); return; }
  if (mode === 'toolarge') { res.writeHead(413).end(); return; }
  if (req.method === 'POST') { seenHeaders = req.headers; res.writeHead(201, { Location: '/upload/resumable/abc' }).end(); return; }
  if (req.method === 'HEAD') { res.writeHead(200, { 'Upload-Offset': String(received) }).end(); return; }
  if (req.method === 'PATCH') {
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
      if (mode === 'flaky' && !failedOnce && Number(req.headers['upload-offset']) >= CHUNK_BYTES) { failedOnce = true; res.writeHead(500).end(); return; }
      if (Number(req.headers['upload-offset']) !== received) { res.writeHead(409).end(); return; }
      received += Buffer.concat(chunks).length; res.writeHead(204, { 'Upload-Offset': String(received) }).end();
    });
  }
}).listen(0, () => { base = `http://127.0.0.1:${server.address().port}/upload/resumable`; resolve(); }); });
const run = (size, extra = {}) => { received = 0; failedOnce = false; const progress = []; return uploadResumable({ endpoint: base, apikey: 'k', getToken: async () => 't', bucket: 'b', objectName: 'caso/arquivo.pdf', contentType: 'application/pdf', file: new Blob([new Uint8Array(size)]), onProgress: (s, t) => progress.push([s, t]), retryDelayMs: 5, ...extra }).then(() => progress); };
before(start); after(() => server.close());

describe('Envio resumível TUS', () => {
  it('envia arquivo de 14 MB em 3 blocos e informa progresso', async () => { mode = 'ok'; const progress = await run(14 * 1024 * 1024); assert.equal(received, 14 * 1024 * 1024); assert.equal(progress.length, 3); assert.deepEqual(progress.at(-1), [14 * 1024 * 1024, 14 * 1024 * 1024]); });
  it('envia metadados e token do chamador', async () => { mode = 'ok'; await run(10); assert.equal(seenHeaders.authorization, 'Bearer t'); assert.equal(seenHeaders['tus-resumable'], '1.0.0'); assert.equal(seenHeaders['x-upsert'], 'false'); assert.match(seenHeaders['upload-metadata'], /bucketName .+,objectName .+,contentType/); });
  it('retoma do deslocamento confirmado após falha de rede', async () => { mode = 'flaky'; await run(14 * 1024 * 1024); assert.equal(received, 14 * 1024 * 1024); assert.ok(failedOnce); });
  it('sinaliza ambiente sem TUS para usar o envio simples', async () => { mode = 'missing'; await assert.rejects(run(10), ResumableUnsupported); });
  it('recusa arquivo acima do limite com mensagem clara', async () => { mode = 'toolarge'; await assert.rejects(run(10), e => e instanceof UploadRejected && e.status === 413); });
});
