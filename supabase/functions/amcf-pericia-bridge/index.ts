import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const allowOrigins = new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const json=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "X-Content-Type-Options":"nosniff","Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})
}});
Deno.serve(async (request)=>{
 const started=Date.now();
 const origin=request.headers.get("Origin")||"";
 const allowed=allowOrigins.has(origin)?origin:"";
 if(origin&&!allowed)return json({ok:false,error:"Origem não permitida"},403);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info","Access-Control-Max-Age":"3600","Vary":"Origin"}});
 if(request.method!=="POST")return json({ok:false,error:"Use POST"},405,allowed);
 if(Number(request.headers.get("Content-Length")||0)>16000)return json({ok:false,error:"Mensagem muito grande"},413,allowed);
 const match=/^Bearer (\S+)$/.exec(request.headers.get("Authorization")||"");
 if(!match)return json({ok:false,error:"Sessão obrigatória"},401,allowed);
 const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!anon)return json({ok:false,error:"Configuração indisponível"},503,allowed);
 const supabase=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+match[1]}}});
 const {data:userData,error:userErr}=await supabase.auth.getUser(match[1]);
 if(userErr||!userData?.user)return json({ok:false,error:"Sessão inválida"},401,allowed);
 let assurance="";
 try{const seg=match[1].split(".")[1];assurance=String(JSON.parse(atob(seg.replace(/-/g,"+").replace(/_/g,"/"))).aal||"");}
 catch{return json({ok:false,error:"Token inválido"},401,allowed);}
 if(assurance!=="aal2")return json({ok:false,error:"Ative MFA antes de utilizar a IA de perícia"},403,allowed);
 const {data:member,error:memberErr}=await supabase.from("amcf_members").select("id,role,status").eq("id",userData.user.id).maybeSingle();
 if(memberErr||!member||member.status!=="active"||!["admin","doctor","assistant"].includes(member.role))return json({ok:false,error:"Usuário sem acesso ativo"},403,allowed);
 // Prefer encrypted Supabase Vault configuration, readable only by service_role.
 // Remains disabled until n8n credential and production workflow are verified.
 const serviceRole=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 const svc=serviceRole?createClient(url,serviceRole,{auth:{persistSession:false,autoRefreshToken:false}}):null;
 const audit=async (outcome:"success"|"failure"|"denied",statusCode:number,caseId?:string)=>{
   if(!svc) return;
   const payload={actor_id:userData.user.id,case_id:caseId&&/^[0-9a-f-]{36}$/i.test(caseId)?caseId:null,action:"chat",outcome,status_code:statusCode,duration_ms:Math.min(300000,Date.now()-started),details:{channel:"amcf_bridge",attachment_count:0}};
   const result=await svc.from("amcf_ai_audit_events").insert(payload);
   if(result.error)console.error("AMCF audit write failed",result.error.code);
 };
 let config: {url?:string; header_key?:string;enabled?:boolean}|null=null;
 if(svc){
   const result=await svc.rpc("amcf_pericia_bridge_config");
   if(!result.error && result.data && typeof result.data==="object")config=result.data;
 }
 const webhook=String(config?.url || Deno.env.get("AMCF_N8N_PERICIA_WEBHOOK_URL") || "");
 const secret=String(config?.header_key || Deno.env.get("AMCF_N8N_PERICIA_WEBHOOK_HEADER_KEY") || "");
 const enabled=config===null ? Boolean(Deno.env.get("AMCF_N8N_PERICIA_WEBHOOK_URL")) : config.enabled===true;
 let ready=false;
 try{
   const dest=new URL(webhook);
   ready=enabled&&dest.protocol==="https:"&&dest.hostname==="caioramos.app.n8n.cloud"&&dest.pathname.startsWith("/webhook/")&&secret.length>=32;
 }catch{}
 let input:Record<string,unknown>;
 try{input=await request.json();}catch{return json({ok:false,error:"JSON inválido"},400,allowed);}
 if(!input||typeof input!=="object"||Array.isArray(input))return json({ok:false,error:"Corpo inválido"},400,allowed);
 if(input.action==="status")return json({ok:true,ready,security_review:"pending",attachments_enabled:false},200,allowed);
 if(!ready)return json({ok:false,error:"Integração do assistente ainda não configurada no servidor"},503,allowed);
 const chatInput=typeof input.chatInput==="string"?input.chatInput.trim():"";
 const caseId=typeof input.caseId==="string"?input.caseId.trim():"";
 const conversationId=typeof input.conversationId==="string"?input.conversationId.trim():"";
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!chatInput||chatInput.length>5000||!uuid.test(conversationId)||(caseId&&!uuid.test(caseId)))return json({ok:false,error:"Mensagem, conversa ou processo inválidos"},400,allowed);
 // Até homologação, o chat recebe apenas texto: anexos e URLs de documentos não são transferidos.
 if(Object.hasOwn(input,"attachments")||Object.hasOwn(input,"files")||Object.hasOwn(input,"documentIds")){
   await audit("denied",423,caseId);
   return json({ok:false,error:"Anexos clínicos ainda aguardam homologação"},423,allowed);
 }
 if(caseId){
  const {data:authorized,error:caseErr}=await supabase.from("amcf_cases").select("id").eq("id",caseId).maybeSingle();
  if(caseErr||!authorized){await audit("denied",403,caseId);return json({ok:false,error:"Processo não autorizado"},403,allowed);}
 }
 const {data:permitted,error:limitErr}=await supabase.rpc("amcf_pericia_chat_allow");
 if(limitErr||permitted!==true){await audit("denied",429,caseId);return json({ok:false,error:"Limite de mensagens atingido; aguarde antes de tentar novamente"},429,allowed);}
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),65000);
 try{
  const res=await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json","X-AMCF-Bridge-Key":secret},body:JSON.stringify({chatInput,caseId,actorId:userData.user.id,sessionId:userData.user.id+":"+(caseId||"general")+":"+conversationId}),signal:controller.signal});
  if(!res.ok){console.error("n8n bridge response",res.status);await audit("failure",502,caseId);return json({ok:false,error:"Assistente não respondeu. Confira o fluxo n8n."},502,allowed);}
  const output=await res.json().catch(()=>null);
  let answer="";
  if(typeof output==="string")answer=output;
  if(output&&typeof output==="object")answer=String(output.output||output.answer||output.text||"");
  if(!answer.trim()){await audit("failure",502,caseId);return json({ok:false,error:"O assistente retornou uma resposta vazia"},502,allowed);}
  await audit("success",200,caseId);
  return json({ok:true,answer:answer.slice(0,30000)},200,allowed);
 }catch(e){console.error("AMCF pericia bridge failure",e instanceof Error?e.name:"unknown");await audit("failure",503,caseId);return json({ok:false,error:"Assistente indisponível. Tente novamente."},503,allowed);}finally{clearTimeout(timer);}
});