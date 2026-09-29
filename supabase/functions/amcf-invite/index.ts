import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { z } from 'https://esm.sh/zod@3.25.76';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const payload = z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().max(254), role: z.enum(['admin', 'doctor', 'assistant']) }).strict();
Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  const reply = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  const requestId = crypto.randomUUID();
  try {
    const authorization = request.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Autenticação necessária.' });
    const url = Deno.env.get('SUPABASE_URL')!;
    const client = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: identity, error: invalid } = await client.auth.getUser();
    if (invalid || !identity.user) return reply(401, { error: 'Sessão inválida.' });
    const { data: context, error: denied } = await client.rpc('amcf_access_context');
    if (denied || !context?.capabilities?.team) return reply(403, { error: 'Esta ação exige administrador ativo e MFA.' });
    if (Number(request.headers.get('Content-Length') || 0) > 4096) return reply(413, { error: 'Solicitação muito grande.' });
    const parsed = payload.safeParse(await request.json());
    if (!parsed.success) return reply(400, { error: 'Confira nome, e-mail e perfil.' });
    const { data: settings, error: settingsError } = await client.from('amcf_settings').select('app_origin').eq('id', true).maybeSingle();
    if (settingsError || !settings?.app_origin) return reply(409, { error: 'Configure e valide a origem HTTPS da aplicação antes de enviar convites.' });
    const origin = new URL(settings.app_origin);
    if (origin.protocol !== 'https:' || origin.origin !== settings.app_origin) return reply(409, { error: 'Origem da aplicação inválida.' });
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const input = { ...parsed.data, email: parsed.data.email.toLowerCase().trim() };
    const { data: existing, error: lookupError } = await service.from('amcf_members').select('id').eq('email', input.email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing) return reply(409, { error: 'Já existe um integrante com este e-mail. Consulte a equipe.' });
    const { data: invited, error: invitationError } = await service.auth.admin.inviteUserByEmail(input.email, { redirectTo: `${origin.origin}/`, data: { name: input.name, amcf_needs_password: true } });
    if (invitationError || !invited.user) {
      console.error(JSON.stringify({ requestId, step: 'invite', code: invitationError?.code || 'missing_user' }));
      return reply(502, { error: 'O provedor não confirmou o convite. Confira a configuração de e-mail antes de tentar novamente.', requestId });
    }
    const { error: memberError } = await service.from('amcf_members').insert({ id: invited.user.id, name: input.name, email: input.email, role: input.role, status: 'pending' });
    if (memberError) {
      console.error(JSON.stringify({ requestId, step: 'membership', code: memberError.code }));
      return reply(500, { error: 'O convite foi solicitado, mas a autorização não foi criada. Não reenvie automaticamente; solicite revisão administrativa.', requestId });
    }
    const { error: auditError } = await service.from('amcf_audit_events').insert({ actor_id: identity.user.id, action: 'INVITE_REQUESTED', resource: 'amcf_members', resource_id: invited.user.id, changed_fields: ['invitation'] });
    if (auditError) console.error(JSON.stringify({ requestId, step: 'audit', code: auditError.code }));
    return reply(200, { status: 'pending', message: 'Convite solicitado ao provedor. A entrega na caixa postal não foi verificada. O acesso permanece pendente de ativação.' });
  } catch {
    console.error(JSON.stringify({ requestId, step: 'unhandled' }));
    return reply(500, { error: 'Não foi possível concluir a solicitação.', requestId });
  }
});
