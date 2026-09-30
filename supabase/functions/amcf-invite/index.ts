const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const BASE = () => Deno.env.get('SUPABASE_URL')!;
const ANON = () => Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = () => Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const withService = (path: string, init: RequestInit = {}) => fetch(BASE() + path, { ...init, headers: { 'Content-Type': 'application/json', apikey: SERVICE(), Authorization: `Bearer ${SERVICE()}`, ...(init.headers || {}) } });
const withCaller = (path: string, token: string, init: RequestInit = {}) => fetch(BASE() + path, { ...init, headers: { 'Content-Type': 'application/json', apikey: ANON(), Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
const isEmail = (value: string) => /^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$/.test(value);

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return reply(405, { error: 'Método não permitido.' });
  const requestId = crypto.randomUUID();
  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const callerToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!callerToken) return reply(401, { error: 'Autenticação necessária.' });
    const me = await withCaller('/auth/v1/user', callerToken);
    const identity = me.ok ? await me.json() : null;
    if (!identity?.id) return reply(401, { error: 'Sessão inválida.' });
    const contextResponse = await withCaller('/rest/v1/rpc/amcf_access_context', callerToken, { method: 'POST', body: '{}' });
    const context = contextResponse.ok ? await contextResponse.json() : null;
    if (!context?.capabilities?.team) return reply(403, { error: 'Esta ação exige administrador ativo com MFA.' });
    const body = await request.json().catch(() => null) as { name?: string; email?: string; role?: string } | null;
    const name = String(body?.name ?? '').trim();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const role = String(body?.role ?? '');
    if (name.length < 2 || name.length > 120 || !isEmail(email) || email.length > 254 || !['admin', 'doctor', 'assistant'].includes(role)) return reply(400, { error: 'Confira nome, e-mail e perfil.' });
    let origin = '';
    const settingsResponse = await withCaller('/rest/v1/amcf_settings?select=app_origin&id=eq.true', callerToken);
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      const configured = Array.isArray(settings) ? settings[0]?.app_origin : null;
      const candidate = typeof configured === 'string' && configured ? configured : (request.headers.get('Origin') ?? '');
      if (candidate.startsWith('https://')) origin = candidate.replace(/\/+$/, '');
    }
    if (!origin) return reply(409, { error: 'Configure e valide a origem HTTPS da aplicação antes de enviar convites.' });
    const existingResponse = await withService(`/rest/v1/amcf_members?select=id&email=eq.${encodeURIComponent(email)}&limit=1`);
    const existing = existingResponse.ok ? await existingResponse.json() : [];
    if (Array.isArray(existing) && existing.length) return reply(409, { error: 'Já existe um integrante com este e-mail. Consulte a equipe.' });
    const inviteResponse = await withService('/auth/v1/invite', { method: 'POST', body: JSON.stringify({ email, data: { name, amcf_needs_password: true }, redirect_to: `${origin}/` }) });
    if (!inviteResponse.ok) {
      const detail = await inviteResponse.text();
      console.error(JSON.stringify({ requestId, step: 'invite', status: inviteResponse.status, detail: detail.slice(0, 300) }));
      return reply(502, { error: 'O provedor não confirmou o convite. Confira a configuração de e-mail antes de tentar novamente.', requestId });
    }
    const invited = await inviteResponse.json();
    const userId = invited?.id ?? invited?.user?.id;
    if (!userId) {
      console.error(JSON.stringify({ requestId, step: 'invite-response' }));
      return reply(502, { error: 'O provedor respondeu sem identificador de usuário. Não reenvie automaticamente.', requestId });
    }
    const memberResponse = await withService('/rest/v1/amcf_members', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ id: userId, name, email, role, status: 'pending' }) });
    if (!memberResponse.ok) {
      const detail = await memberResponse.text();
      console.error(JSON.stringify({ requestId, step: 'membership', detail: detail.slice(0, 300) }));
      return reply(500, { error: 'O convite foi solicitado, mas a autorização não foi criada. Solicite revisão administrativa; não reenvie automaticamente.', requestId });
    }
    const auditResponse = await withService('/rest/v1/amcf_audit_events', { method: 'POST', body: JSON.stringify({ actor_id: identity.id, action: 'INVITE_REQUESTED', resource: 'amcf_members', resource_id: userId, changed_fields: ['invitation'] }) });
    if (!auditResponse.ok) console.error(JSON.stringify({ requestId, step: 'audit' }));
    return reply(200, { status: 'pending', message: 'Convite solicitado ao provedor. A entrega na caixa postal não foi verificada. O acesso permanece pendente de ativação.' });
  } catch (error) {
    console.error(JSON.stringify({ requestId, step: 'unhandled', detail: String(error).slice(0, 200) }));
    return reply(500, { error: 'Não foi possível concluir a solicitação.', requestId });
  }
});
