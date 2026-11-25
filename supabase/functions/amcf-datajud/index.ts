import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Importa movimentações da API pública do DataJud (CNJ) para UM processo, com as permissões do próprio usuário (RLS).
// A chave fica no Supabase Vault (amcf_datajud_api_key) e nunca vai ao navegador. Sem chave, a função responde "não configurado".
const allowOrigins = new Set(["https://sistema.dradilsoncouto.com.br", "https://amcf-dr-adilson-original.pages.dev"]);
const json = (data: unknown, status = 200, origin = "") => new Response(JSON.stringify(data), { status, headers: {
  "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Vary": "Origin",
  ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
} });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UF = ["ac", "al", "ap", "am", "ba", "ce", "dft", "es", "go", "ma", "mt", "ms", "mg", "pa", "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to"];
// NNNNNNN-DD.AAAA.J.TR.OOOO -> alias do índice público do tribunal (apenas Justiça Estadual, Federal e do Trabalho).
function courtAlias(digits: string): string | null {
  if (!/^\d{20}$/.test(digits)) return null;
  const j = digits[13], tr = Number(digits.slice(14, 16));
  if (j === "8" && tr >= 1 && tr <= 27) return "tj" + UF[tr - 1];
  if (j === "4" && tr >= 1 && tr <= 6) return "trf" + tr;
  if (j === "5" && tr >= 1 && tr <= 24) return "trt" + tr;
  if (j === "3" && tr === 0) return "stj";
  return null;
}
Deno.serve(async (request) => {
  const started = new Date().toISOString();
  const origin = request.headers.get("Origin") || "";
  const allowed = allowOrigins.has(origin) ? origin : "";
  if (origin && !allowed) return json({ ok: false, error: "Origem não permitida" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": allowed, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Max-Age": "3600", "Vary": "Origin" } });
  if (request.method !== "POST") return json({ ok: false, error: "Use POST" }, 405, allowed);
  if (Number(request.headers.get("Content-Length") || 0) > 2000) return json({ ok: false, error: "Corpo grande demais" }, 413, allowed);
  const match = /^Bearer (\S+)$/.exec(request.headers.get("Authorization") || "");
  if (!match) return json({ ok: false, error: "Sessão obrigatória" }, 401, allowed);
  const url = Deno.env.get("SUPABASE_URL"), anon = Deno.env.get("SUPABASE_ANON_KEY"), serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anon || !serviceRole) return json({ ok: false, error: "Configuração indisponível" }, 503, allowed);
  const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + match[1] } } });
  const { data: userData, error: userErr } = await sb.auth.getUser(match[1]);
  if (userErr || !userData?.user) return json({ ok: false, error: "Sessão inválida" }, 401, allowed);
  let assurance = "";
  try { const seg = match[1].split(".")[1]; assurance = String(JSON.parse(atob(seg.replace(/-/g, "+").replace(/_/g, "/"))).aal || ""); } catch { return json({ ok: false, error: "Token inválido" }, 401, allowed); }
  if (assurance !== "aal2") return json({ ok: false, error: "Ative MFA antes de consultar o DataJud" }, 403, allowed);
  const { data: member } = await sb.from("amcf_members").select("id,role,status").eq("id", userData.user.id).maybeSingle();
  if (!member || member.status !== "active" || !["admin", "doctor", "assistant"].includes(member.role)) return json({ ok: false, error: "Usuário sem acesso ativo" }, 403, allowed);

  const svc = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const keyRes = await svc.rpc("amcf_datajud_key");
  const apiKey = typeof keyRes.data === "string" ? keyRes.data.trim() : "";
  let input: Record<string, unknown>;
  try { input = await request.json(); } catch { return json({ ok: false, error: "JSON inválido" }, 400, allowed); }
  if (input?.action === "status") return json({ ok: true, configured: apiKey.length >= 20 }, 200, allowed);
  const caseId = typeof input?.caseId === "string" ? input.caseId.trim() : "";
  if (!uuid.test(caseId)) return json({ ok: false, error: "Processo inválido" }, 400, allowed);
  if (apiKey.length < 20) return json({ ok: false, error: "Consulta ao DataJud ainda não configurada" }, 503, allowed);

  const { data: row, error: caseErr } = await sb.from("amcf_cases").select("id,cnj_number").eq("id", caseId).maybeSingle();
  if (caseErr || !row) return json({ ok: false, error: "Processo não autorizado" }, 403, allowed);
  const digits = String(row.cnj_number || "").replace(/\D/g, "");
  const alias = courtAlias(digits);
  if (!alias) return json({ ok: false, error: "Número CNJ ausente ou de tribunal sem cobertura automática. Use a importação manual." }, 422, allowed);

  const syncBase = { case_id: caseId, source_kind: "datajud", created_by: userData.user.id, started_at: started };
  const finish = async (fields: Record<string, unknown>) => { await sb.from("amcf_movement_syncs").insert({ ...syncBase, finished_at: new Date().toISOString(), ...fields }); };
  const coverage = ["DataJud (CNJ) — base pública, pode atrasar dias; não inclui processos em segredo de justiça nem todo o conteúdo dos autos"];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  let hits: Record<string, unknown>[] = [];
  try {
    const res = await fetch("https://api-publica.datajud.cnj.jus.br/api_publica_" + alias + "/_search", {
      method: "POST", headers: { "Content-Type": "application/json", "Authorization": "APIKey " + apiKey },
      body: JSON.stringify({ size: 5, query: { match: { numeroProcesso: digits } } }), signal: controller.signal,
    });
    if (!res.ok) { await finish({ status: "falha", error: "DataJud respondeu " + res.status, coverage }); return json({ ok: false, error: res.status === 401 || res.status === 403 ? "Chave do DataJud recusada" : "DataJud indisponível (" + res.status + ")" }, 502, allowed); }
    const body = await res.json().catch(() => null);
    hits = (body?.hits?.hits || []).map((h: { _source?: Record<string, unknown> }) => h._source || {});
  } catch { await finish({ status: "falha", error: "Sem resposta do DataJud", coverage }); return json({ ok: false, error: "DataJud não respondeu a tempo" }, 504, allowed); }
  finally { clearTimeout(timer); }

  if (!hits.length) { await finish({ status: "concluida", detail: { resultado: "nao_localizado" }, items_found: 0, items_new: 0, items_duplicated: 0, coverage }); return json({ ok: true, found: 0, added: 0, duplicated: 0, message: "Processo não localizado no DataJud (pode estar em segredo de justiça ou ainda não indexado)." }, 200, allowed); }
  const source = hits[0] as { movimentos?: { codigo?: number; nome?: string; dataHora?: string; complementosTabelados?: { nome?: string }[] }[]; dataUltimaAtualizacao?: string };
  const moves = (source.movimentos || []).filter((m) => m && m.nome && typeof m.dataHora === "string" && /^\d{4}-\d{2}-\d{2}/.test(m.dataHora)).slice(0, 500);
  const refOf = (m: { codigo?: number; dataHora?: string }) => "datajud:" + (m.codigo ?? "") + ":" + m.dataHora;
  const { data: existing } = await sb.from("amcf_movements").select("external_ref").eq("case_id", caseId).like("external_ref", "datajud:%").limit(2000);
  const have = new Set((existing || []).map((x: { external_ref: string | null }) => x.external_ref));
  const fresh = moves.filter((m) => !have.has(refOf(m)));
  let added = 0, dup = moves.length - fresh.length;
  const toRow = (m: typeof moves[number]) => ({
    case_id: caseId, occurred_on: String(m.dataHora).slice(0, 10), occurred_at: m.dataHora, title: String(m.nome).slice(0, 300),
    detail: (m.complementosTabelados || []).map((c) => c.nome).filter(Boolean).join("; ").slice(0, 2000) || null,
    source: "api", external_ref: refOf(m), created_by: userData.user.id,
  });
  for (let i = 0; i < fresh.length; i += 100) {
    const batch = fresh.slice(i, i + 100).map(toRow);
    const ins = await sb.from("amcf_movements").insert(batch).select("id");
    if (!ins.error) { added += batch.length; continue; }
    for (const one of batch) { const r = await sb.from("amcf_movements").insert(one).select("id"); if (r.error) dup++; else added++; }
  }
  await finish({ status: "concluida", items_found: moves.length, items_new: added, items_duplicated: dup, coverage, detail: { tribunal: alias, ultima_atualizacao_fonte: source.dataUltimaAtualizacao || null } });
  return json({ ok: true, found: moves.length, added, duplicated: dup, tribunal: alias, source_updated_at: source.dataUltimaAtualizacao || null, coverage }, 200, allowed);
});
