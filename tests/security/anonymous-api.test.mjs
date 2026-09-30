import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const client = readFileSync(new URL('../../src/integrations/supabase/client.ts', import.meta.url), 'utf8');
const url = client.match(/SUPABASE_URL\s*=\s*"([^"]+)"/)?.[1];
const key = client.match(/SUPABASE_PUBLISHABLE_KEY\s*=\s*"([^"]+)"/)?.[1];
if (!url || !key) throw new Error('Conexão pública de teste não encontrada.');
const headers = { apikey: key, Authorization: `Bearer ${key}`, Connection: 'close' };
const tables = ['amcf_members', 'amcf_contacts', 'amcf_cases', 'amcf_case_assignments', 'amcf_tasks', 'amcf_interactions', 'amcf_opportunity_values', 'amcf_audit_events', 'amcf_settings', 'amcf_documents', 'amcf_document_files', 'amcf_proposals', 'amcf_receivables'];
describe('API real sem conta autenticada', () => {
 for (const table of tables) it(`nega acesso anônimo a ${table}`, async () => {
  const r = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers, signal: AbortSignal.timeout(10000) });
  await r.text(); assert.ok([401, 403].includes(r.status), `HTTP ${r.status} inesperado`);
 });
 it('nega execução do contexto de acesso', async () => {
  const r = await fetch(`${url}/rest/v1/rpc/amcf_access_context`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(10000) });
  await r.text(); assert.ok([401, 403].includes(r.status), `HTTP ${r.status} inesperado`);
 });
 it('nega escrita anônima em contatos', async () => {
  const r = await fetch(`${url}/rest/v1/amcf_contacts`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'TESTE NEGATIVO SEM DADOS REAIS' }), signal: AbortSignal.timeout(10000) });
  await r.text(); assert.ok([401, 403].includes(r.status), `HTTP ${r.status} inesperado`);
 });
});
