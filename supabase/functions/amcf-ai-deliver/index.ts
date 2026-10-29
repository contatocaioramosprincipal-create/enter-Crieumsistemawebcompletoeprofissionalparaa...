import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Função INTERNA (verify_jwt=false; autenticada por token do Vault): só a ponte (amcf-pericia-bridge) a chama.
// Entrega anexos em quarentena ao n8n por URL assinada curta e SEMPRE apaga os arquivos depois, com sucesso ou falha.
const BUCKET = "amcf-ai-staging";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOCS_BUCKET = "amcf-documentos";
const out = (obj: unknown, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
async function secureEquals(a: string, b: string) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const xv = new Uint8Array(x), yv = new Uint8Array(y);
  let bad = 0;
  for (let i = 0; i < xv.length; i++) bad |= xv[i] ^ yv[i];
  return bad === 0 && a.length === b.length;
}
Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method !== "POST") return out({ ok: false }, 405);
  const match = /^Bearer ([a-f0-9]{96})$/.exec(req.headers.get("Authorization") || "");
  if (!match) return out({ ok: false, error: "Unauthorized" }, 401);
  if (Number(req.headers.get("Content-Length") || 0) > 60000) return out({ ok: false, error: "Payload" }, 413);
  const url = Deno.env.get("SUPABASE_URL") || "", key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return out({ ok: false, error: "Unavailable" }, 503);
  const svc = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: secret, error: secretError } = await svc.rpc("amcf_ai_deliver_token");
  if (secretError || typeof secret !== "string" || secret.length !== 96 || !(await secureEquals(match[1], secret))) return out({ ok: false, error: "Unauthorized" }, 401);

  let input: Record<string, unknown>;
  try { input = await req.json(); } catch { return out({ ok: false, error: "JSON inválido" }, 400); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return out({ ok: false, error: "Dados inválidos" }, 400);
  const actor = String(input.actor_id || ""), caseId = String(input.case_id || ""), conversation = String(input.conversation_id || "");
  const sessionId = String(input.session_id || "").slice(0, 200);
  const chatInput = typeof input.chat_input === "string" ? input.chat_input.trim() : "";
  const ids = Array.isArray(input.attachment_ids) ? [...new Set(input.attachment_ids.map(String))] : [];
  const saveToCase = input.save_to_case === true;
  const caseContext = typeof input.case_context === "string" ? input.case_context.slice(0, 30000) : "";
  const rawNames = Array.isArray(input.file_names) ? input.file_names.map((x) => String(x ?? "")) : [];
  if (!uuid.test(actor) || !uuid.test(caseId) || !uuid.test(conversation) || !chatInput || chatInput.length > 5000 || ids.length < 1 || ids.length > 3 || !ids.every((id) => uuid.test(id))) return out({ ok: false, error: "Dados inválidos" }, 400);

  let saved: number | null = null;
  const audit = async (outcome: "success" | "failure" | "denied", statusCode: number, deleted: boolean | null) => {
    const result = await svc.from("amcf_ai_audit_events").insert({ actor_id: actor, case_id: caseId, action: "chat", outcome, status_code: statusCode, duration_ms: Math.min(300000, Date.now() - started), details: { channel: "amcf_bridge", attachment_count: ids.length, ...(deleted === null ? {} : { deleted }), ...(saved === null ? {} : { saved }) } });
    if (result.error) console.error("AMCF audit write failed", result.error.code);
  };

  const { data: flags, error: flagError } = await svc.rpc("amcf_ai_security_flags");
  if (flagError || flags?.uploads_enabled !== true || flags?.llm_attachment_transfer_enabled !== true) { await audit("denied", 423, null); return out({ ok: false, error: "Envio de anexos à IA não está liberado" }, 423); }

  const { data: config, error: configError } = await svc.rpc("amcf_pericia_bridge_config");
  let webhook = ""; let secretKey = "";
  try {
    const dest = new URL(String(config?.files_url || ""));
    if (!configError && config?.enabled === true && dest.protocol === "https:" && dest.hostname === "caioramos.app.n8n.cloud" && dest.pathname.startsWith("/webhook/") && String(config?.header_key || "").length >= 32) { webhook = dest.toString(); secretKey = String(config.header_key); }
  } catch { /* configuração inválida */ }
  if (!webhook) { await audit("failure", 503, null); return out({ ok: false, error: "Fluxo de arquivos não configurado" }, 503); }

  // Reserva atômica: só arquivos do próprio usuário, deste processo e desta conversa, em quarentena e não expirados.
  const { data: claimed, error: claimError } = await svc.from("amcf_ai_staged_files").update({ status: "processing" })
    .in("id", ids).eq("actor_id", actor).eq("case_id", caseId).eq("conversation_id", conversation).eq("status", "quarantined").gt("expires_at", new Date().toISOString())
    .select("id,storage_path,media_type");
  if (claimError || !claimed || claimed.length !== ids.length) {
    if (claimed?.length) await svc.from("amcf_ai_staged_files").update({ status: "quarantined" }).in("id", claimed.map((x: { id: string }) => x.id));
    await audit("denied", 404, null);
    return out({ ok: false, error: "Anexo indisponível, expirado ou já usado" }, 404);
  }

  let status = 502; let payload: Record<string, unknown> = { ok: false, error: "Assistente indisponível. Tente novamente." };
  let outcome: "success" | "failure" = "failure";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 125000);
  try {
    const attachments: { url: string; mediaType: string }[] = [];
    for (const file of claimed as { storage_path: string; media_type: string }[]) {
      const signed = await svc.storage.from(BUCKET).createSignedUrl(file.storage_path, 180);
      if (signed.error || !signed.data?.signedUrl) throw new Error("sign");
      attachments.push({ url: signed.data.signedUrl, mediaType: file.media_type });
    }
    const res = await fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json", "X-AMCF-Bridge-Key": secretKey }, body: JSON.stringify({ chatInput, caseId, actorId: actor, sessionId, attachments, caseContext }), signal: controller.signal });
    if (!res.ok) { console.error("n8n files response", res.status); }
    else {
      const data = await res.json().catch(() => null);
      let answer = "";
      if (typeof data === "string") answer = data;
      if (data && typeof data === "object") answer = String((data as Record<string, unknown>).output || (data as Record<string, unknown>).answer || (data as Record<string, unknown>).text || "");
      if (answer.trim()) { status = 200; outcome = "success"; payload = { ok: true, answer: answer.slice(0, 30000) }; }
      else payload = { ok: false, error: "O assistente retornou uma resposta vazia" };
    }
  } catch (e) { console.error("AMCF files delivery failure", e instanceof Error ? e.name : "unknown"); status = 503; }
  finally { clearTimeout(timer); }

  // Opcional: guarda cópia no processo (mesmo bucket privado e mesmas regras de acesso da aba Documentos) só quando a leitura deu certo.
  if (saveToCase && outcome === "success") {
    saved = 0;
    const nameById = new Map(ids.map((id, i) => [id, rawNames[i] || ""]));
    for (const file of claimed as { id: string; storage_path: string; media_type: string }[]) {
      try {
        const dl = await svc.storage.from(BUCKET).download(file.storage_path);
        if (dl.error || !dl.data || dl.data.size < 1) continue;
        const bytes = new Uint8Array(await dl.data.arrayBuffer());
        const ext = file.media_type === "application/pdf" ? ".pdf" : file.media_type === "image/png" ? ".png" : ".jpg";
        let original = (nameById.get(file.id) || "").replace(/[\u0000-\u001f\\/]/g, "_").trim().slice(0, 170);
        if (!original) original = "laudo-anexado" + ext;
        const safe = original.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "laudo" + ext;
        const path = caseId + "/" + crypto.randomUUID() + "-" + safe;
        const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
        const up = await svc.storage.from(DOCS_BUCKET).upload(path, bytes, { contentType: file.media_type, upsert: false });
        if (up.error) continue;
        const ins = await svc.from("amcf_documents").insert({ case_id: caseId, category: "laudo", title: original.replace(/\.[A-Za-z0-9]{2,4}$/, "").slice(0, 200).padEnd(2, " "), file_name: original, mime_type: file.media_type, size_bytes: bytes.length, storage_path: path, content_hash: hash, uploaded_by: actor });
        if (ins.error) { await svc.storage.from(DOCS_BUCKET).remove([path]); continue; }
        saved++;
      } catch { /* segue: a leitura já foi feita */ }
    }
  }

  // Apaga SEMPRE: objeto primeiro, depois o registro. Se falhar, expira já para a limpeza horária tentar de novo.
  let deleted = false;
  const removed = await svc.storage.from(BUCKET).remove((claimed as { storage_path: string }[]).map((x) => x.storage_path));
  if (!removed.error) { const gone = await svc.from("amcf_ai_staged_files").delete().in("id", ids); deleted = !gone.error; }
  if (!deleted) await svc.from("amcf_ai_staged_files").update({ expires_at: new Date().toISOString() }).in("id", ids);
  await audit(outcome, status, deleted);
  return out({ ...payload, deleted, ...(saveToCase && outcome === "success" ? { saved, total: ids.length } : {}) }, status);
});
