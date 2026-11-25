import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

/**
 * API machine-to-machine AMCF <> n8n.
 * No user JWT: the only admission is a high-entropy, SHA-256 checked integration
 * token scoped by amcf_integration_keys, never a Supabase service key from n8n.
 * This Edge Function alone holds the Supabase service role secret.
 */
const COMMANDS: Record<string, { rpc: string; fields: string[] }> = {
  ping: { rpc: "amcf_api_ping", fields: [] },
  "contacts.upsert": { rpc: "amcf_api_contact_upsert", fields: ["p_external_ref","p_name","p_kind","p_email","p_phone","p_source","p_notes"] },
  "opportunities.upsert": { rpc: "amcf_api_opportunity_upsert", fields: ["p_external_ref","p_title","p_service","p_contact_id","p_stage_name","p_amount_cents","p_next_step"] },
  "opportunities.stage": { rpc: "amcf_api_opportunity_stage", fields: ["p_opportunity_id","p_stage_name"] },
  "cases.create": { rpc: "amcf_api_case_create", fields: ["p_external_ref","p_contact_id","p_title","p_service","p_opportunity_id","p_reference","p_due_on"] },
  "cases.read": { rpc: "amcf_api_case_read", fields: ["p_case_id"] },
  "tasks.upsert": { rpc: "amcf_api_task_upsert", fields: ["p_external_ref","p_title","p_due_on","p_case_id","p_contact_id","p_priority","p_status","p_description","p_responsible_id"] },
  "activities.create": { rpc: "amcf_api_activity_create", fields: ["p_external_ref","p_contact_id","p_summary","p_case_id","p_kind","p_next_step","p_next_on"] },
  "agenda.read": { rpc: "amcf_api_agenda", fields: ["p_from","p_to"] },
  "events.read": { rpc: "amcf_api_events", fields: ["p_limit"] },
  "movements.upsert": { rpc: "amcf_api_movement_upsert", fields: ["p_external_ref","p_case_id","p_occurred_on","p_title","p_detail","p_classification"] },
};
const respond = (data: unknown, status=200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, private",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Access-Control-Allow-Origin": "null",
  },
});
function validateParams(action:string, raw:unknown): Record<string, unknown> {
  if (raw===null || raw===undefined) return {};
  if (!raw || typeof raw!=="object" || Array.isArray(raw)) throw new Error("params deve ser um objeto");
  const params = raw as Record<string, unknown>;
  const allowed = COMMANDS[action].fields;
  const safe: Record<string,unknown> = {};
  for (const [key,value] of Object.entries(params)) {
    if (!allowed.includes(key)) throw new Error("Parâmetro não permitido: "+key);
    if (value === null) { safe[key]=null; continue; }
    if (typeof value==="string") {
      if (value.length>12000) throw new Error("Texto excede limite permitido");
      safe[key]=value.trim(); continue;
    }
    if (typeof value==="number" && Number.isFinite(value)) {safe[key]=value;continue;}
    throw new Error("Tipo de parâmetro inválido: "+key);
  }
  return safe;
}
Deno.serve(async (req) => {
  if (req.method !== "POST") return respond({ok:false,error:"Use POST"},405);
  const auth = /^Bearer ([a-zA-Z0-9_-]{32,160})$/.exec(req.headers.get("Authorization") || "");
  if (!auth) return respond({ok:false,error:"Token de integração obrigatório"},401);
  const len = Number(req.headers.get("Content-Length") || 0);
  if (len>24576) return respond({ok:false,error:"Payload muito grande"},413);
  let raw:string;
  try {raw=await req.text();}catch{return respond({ok:false,error:"Corpo inválido"},400);}
  if(raw.length>24576) return respond({ok:false,error:"Payload muito grande"},413);
  let input: {action?:unknown; params?:unknown};
  try { input=JSON.parse(raw); } catch {return respond({ok:false,error:"JSON inválido"},400);}
  if(!input || typeof input!=="object" || Array.isArray(input)) return respond({ok:false,error:"JSON deve ser objeto"},400);
  const action=input.action;
  if(typeof action!=="string" || !Object.hasOwn(COMMANDS,action)) return respond({ok:false,error:"Ação não permitida"},400);
  let params:Record<string,unknown>;
  try{params=validateParams(action,input.params);}catch(e){return respond({ok:false,error:e instanceof Error?e.message:"Dados inválidos"},400);}
  const url=Deno.env.get("SUPABASE_URL");
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!serviceKey) return respond({ok:false,error:"API não configurada"},503);
  const supabase=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
  try {
    const {data,error}=await supabase.rpc(COMMANDS[action].rpc,{...params,p_token:auth[1]});
    if(error){console.error("amcf-n8n RPC failure",action,error.code);return respond({ok:false,error:"Erro interno de integração"},502);}
    if(data && typeof data==="object" && data.ok===false) {
      const detail=String(data.error||"Ação não autorizada");
      const status=/token|escopo/i.test(detail)?403:422;
      return respond({ok:false,error:detail},status);
    }
    return respond(data??{ok:true});
  } catch(e) {
    console.error("amcf-n8n handler error",action,e instanceof Error?e.name:"unknown");
    return respond({ok:false,error:"Integração temporariamente indisponível"},503);
  }
});
