import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const allowOrigins = new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const json=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "X-Content-Type-Options":"nosniff","Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})
}});
// Contexto do processo: só registros que o PRÓPRIO usuário já enxerga (consultas com o JWT dele, sujeitas ao RLS).
// Enviado ao n8n como DADO. Só é montado quando a transferência de conteúdo clínico à IA está liberada.
// deno-lint-ignore no-explicit-any
async function buildCaseContext(sb:any,caseId:string):Promise<string>{
 const cut=(v:unknown,n:number)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
 const rows=(r:{data?:unknown;error?:unknown})=>(r.error||!Array.isArray(r.data))?[]:(r.data as Record<string,unknown>[]);
 const [c,mv,qs,an,ex,fd,dc]=await Promise.all([
  sb.from("amcf_cases").select("reference,title,cnj_number,court,court_unit,claimant,defendant,claim_summary,action_type").eq("id",caseId).maybeSingle(),
  sb.from("amcf_movements").select("occurred_on,title,detail,classification,review_state").eq("case_id",caseId).neq("review_state","ignorada").order("occurred_on",{ascending:false}).limit(40),
  sb.from("amcf_case_questions").select("id,number,author_kind,text,status").eq("case_id",caseId).order("number").limit(40),
  sb.from("amcf_question_answers").select("question_id,answer,status").eq("case_id",caseId).limit(80),
  sb.from("amcf_exams").select("id,exam_on,modality,status,place").eq("case_id",caseId).order("exam_on").limit(10),
  sb.from("amcf_exam_findings").select("exam_id,kind,title,detail").eq("case_id",caseId).limit(60),
  sb.from("amcf_documents").select("id,title,category,document_date,text_status").eq("case_id",caseId).order("created_at").limit(30),
 ]);
 const docs=rows(dc);
 const withText=docs.filter((d)=>d.text_status==="extraido"||d.text_status==="parcial").slice(0,8).map((d)=>String(d.id));
 const pages=withText.length?rows(await sb.from("amcf_document_pages").select("document_id,page_number,content").in("document_id",withText).lte("page_number",3).order("page_number").limit(24)):[];
 const out:string[]=[];
 const h=(c.data||{}) as Record<string,unknown>;
 out.push("PROCESSO: "+cut(h.reference,60)+" · "+cut(h.title,160)+(h.cnj_number?" · CNJ "+cut(h.cnj_number,40):""));
 if(h.court||h.court_unit)out.push("Juízo: "+cut(h.court,80)+" "+cut(h.court_unit,80));
 if(h.claimant||h.defendant)out.push("Partes: autor(es) "+cut(h.claimant,120)+" × réu(s) "+cut(h.defendant,120));
 if(h.claim_summary)out.push("Objeto: "+cut(h.claim_summary,600));
 const m=rows(mv);
 if(m.length){out.push("\nMOVIMENTAÇÕES (mais recentes primeiro; classificação automática por regra, não confirmada):");for(const x of m)out.push("- [Movimentação "+x.occurred_on+"] "+cut(x.title,160)+(x.detail?" — "+cut(x.detail,300):"")+" ("+x.classification+", "+x.review_state+")");}
 const q=rows(qs),a=rows(an);
 if(q.length){out.push("\nQUESITOS:");for(const x of q){const r=a.find((y)=>y.question_id===x.id);out.push("- [Quesito "+x.number+"] ("+x.author_kind+", "+x.status+") "+cut(x.text,400)+(r&&r.answer?" | Resposta em "+r.status+": "+cut(r.answer,400):" | sem resposta"));}}
 const e=rows(ex),f=rows(fd);
 if(e.length){out.push("\nEXAME E ACHADOS (registrados pelo médico):");for(const x of e){out.push("- Exame "+x.exam_on+" ("+x.modality+", "+x.status+")"+(x.place?" em "+cut(x.place,80):""));for(const y of f.filter((z)=>z.exam_id===x.id))out.push("  - [Achado: "+cut(y.title,120)+"] "+cut(y.detail,300));}}
 if(docs.length){out.push("\nDOCUMENTOS DO PROCESSO:");for(const d of docs){out.push("- [Documento "+cut(d.title,120)+"] categoria "+d.category+", texto: "+d.text_status);for(const p of pages.filter((z)=>z.document_id===d.id))out.push("  [Documento "+cut(d.title,80)+", p. "+p.page_number+"] "+cut(p.content,1200));}}
 return out.join("\n").slice(0,24000);
}
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
 const audit=async (outcome:"success"|"failure"|"denied",statusCode:number,caseId?:string,attachmentCount=0)=>{
   if(!svc) return;
   const payload={actor_id:userData.user.id,case_id:caseId&&/^[0-9a-f-]{36}$/i.test(caseId)?caseId:null,action:"chat",outcome,status_code:statusCode,duration_ms:Math.min(300000,Date.now()-started),details:{channel:"amcf_bridge",attachment_count:attachmentCount}};
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
 let attachmentsEnabled=false;
 if(svc){
   const f=await svc.rpc("amcf_ai_security_flags");
   attachmentsEnabled=!f.error&&f.data?.uploads_enabled===true&&f.data?.llm_attachment_transfer_enabled===true;
 }
 let input:Record<string,unknown>;
 try{input=await request.json();}catch{return json({ok:false,error:"JSON inválido"},400,allowed);}
 if(!input||typeof input!=="object"||Array.isArray(input))return json({ok:false,error:"Corpo inválido"},400,allowed);
 if(input.action==="status")return json({ok:true,ready,attachments_enabled:attachmentsEnabled&&ready},200,allowed);
 if(!ready)return json({ok:false,error:"Integração do assistente ainda não configurada no servidor"},503,allowed);
 const chatInput=typeof input.chatInput==="string"?input.chatInput.trim():"";
 const caseId=typeof input.caseId==="string"?input.caseId.trim():"";
 const conversationId=typeof input.conversationId==="string"?input.conversationId.trim():"";
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if(!chatInput||chatInput.length>5000||!uuid.test(conversationId)||(caseId&&!uuid.test(caseId)))return json({ok:false,error:"Mensagem, conversa ou processo inválidos"},400,allowed);
 // Até homologação, o chat recebe apenas texto: anexos e URLs de documentos não são transferidos.
 if(Object.hasOwn(input,"attachments")||Object.hasOwn(input,"files")||Object.hasOwn(input,"documentIds")){
   await audit("denied",423,caseId);
   return json({ok:false,error:"Envie anexos pelo botão de anexo do assistente"},423,allowed);
 }
 let attachmentIds:string[]=[];
 if(Object.hasOwn(input,"attachmentIds")){
   const raw=input.attachmentIds;
   if(!Array.isArray(raw))return json({ok:false,error:"Anexos inválidos"},400,allowed);
   attachmentIds=[...new Set(raw.map(String))];
   if(attachmentIds.length<1||attachmentIds.length>3||!attachmentIds.every((x)=>uuid.test(x))||!caseId)return json({ok:false,error:"Anexos inválidos ou processo ausente"},400,allowed);
   if(!attachmentsEnabled){await audit("denied",423,caseId,attachmentIds.length);return json({ok:false,error:"Análise de anexos ainda não está liberada"},423,allowed);}
 }
 if(caseId){
  const {data:authorized,error:caseErr}=await supabase.from("amcf_cases").select("id").eq("id",caseId).maybeSingle();
  if(caseErr||!authorized){await audit("denied",403,caseId,attachmentIds.length);return json({ok:false,error:"Processo não autorizado"},403,allowed);}
 }
 const {data:permitted,error:limitErr}=await supabase.rpc("amcf_pericia_chat_allow");
 if(limitErr||permitted!==true){await audit("denied",429,caseId,attachmentIds.length);return json({ok:false,error:"Limite de mensagens atingido; aguarde antes de tentar novamente"},429,allowed);}
 const sessionId=userData.user.id+":"+(caseId||"general")+":"+conversationId;
 const caseContext=(caseId&&attachmentsEnabled)?await buildCaseContext(supabase,caseId).catch(()=>""):"";
 if(attachmentIds.length){
   // A função interna reserva, entrega, apaga os arquivos e registra a auditoria.
   const {data:token,error:tokenErr}=await svc!.rpc("amcf_ai_deliver_token");
   if(tokenErr||typeof token!=="string"){await audit("failure",503,caseId,attachmentIds.length);return json({ok:false,error:"Entrega de anexos indisponível"},503,allowed);}
   const controller=new AbortController();
   const timer=setTimeout(()=>controller.abort(),140000);
   try{
     const res=await fetch(url+"/functions/v1/amcf-ai-deliver",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({actor_id:userData.user.id,case_id:caseId,conversation_id:conversationId,session_id:sessionId,chat_input:chatInput,attachment_ids:attachmentIds,case_context:caseContext,save_to_case:input.saveToCase===true,file_names:Array.isArray(input.fileNames)?input.fileNames.slice(0,3).map((x)=>String(x??"").slice(0,180)):[]}),signal:controller.signal});
     const out=await res.json().catch(()=>null);
     if(res.ok&&out?.ok===true&&typeof out.answer==="string")return json({ok:true,answer:out.answer,...(typeof out.saved==="number"?{saved:out.saved,total:out.total}:{})},200,allowed);
     const code=res.status===404||res.status===423||res.status===503?res.status:502;
     return json({ok:false,error:typeof out?.error==="string"?out.error:"Assistente não respondeu"},code,allowed);
   }catch{await audit("failure",503,caseId,attachmentIds.length);return json({ok:false,error:"Assistente indisponível. Tente novamente."},503,allowed);}
   finally{clearTimeout(timer);}
 }
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),65000);
 try{
  const res=await fetch(webhook,{method:"POST",headers:{"Content-Type":"application/json","X-AMCF-Bridge-Key":secret},body:JSON.stringify({chatInput,caseId,actorId:userData.user.id,sessionId,caseContext}),signal:controller.signal});
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