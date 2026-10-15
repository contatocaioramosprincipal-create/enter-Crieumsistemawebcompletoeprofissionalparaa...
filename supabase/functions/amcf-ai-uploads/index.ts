import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const BUCKET="amcf-ai-staging";
const SIZE=10*1024*1024;
const TYPES=new Set(["application/pdf","image/png","image/jpeg"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const allowedOrigins=new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const reply=(data:unknown,status:number,origin:string)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",...(allowedOrigins.has(origin)?{"Access-Control-Allow-Origin":origin}:{})}});
function validMagic(type:string,bytes:Uint8Array){
 if(type==="application/pdf") return [37,80,68,70,45].every((v,i)=>bytes[i]===v);
 if(type==="image/png") return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
 if(type==="image/jpeg") return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 return false;
}
Deno.serve(async (req)=>{
 const origin=req.headers.get("Origin")||"";
 if(origin&&!allowedOrigins.has(origin))return reply({ok:false,error:"Origem não autorizada"},403,origin);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"null","Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return reply({ok:false,error:"Método não permitido"},405,origin);
 if(Number(req.headers.get("Content-Length")||0)>8192)return reply({ok:false,error:"JSON muito grande"},413,origin);
 const matched=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"");
 if(!matched)return reply({ok:false,error:"Sessão obrigatória"},401,origin);
 const url=Deno.env.get("SUPABASE_URL")||"",anon=Deno.env.get("SUPABASE_ANON_KEY")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(!url||!anon||!service)return reply({ok:false,error:"Infraestrutura indisponível"},503,origin);
 const caller=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+matched[1]}}});
 const {data:identity,error:userError}=await caller.auth.getUser(matched[1]);
 if(userError||!identity?.user)return reply({ok:false,error:"Sessão inválida"},401,origin);
 let aal="";
 try{const p=matched[1].split(".")[1];aal=JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/"))).aal||"";}catch{}
 if(aal!=="aal2")return reply({ok:false,error:"MFA exigido"},403,origin);
 const uid=identity.user.id;
 const {data:member,error:memberError}=await caller.from("amcf_members").select("id,role,status").eq("id",uid).maybeSingle();
 if(memberError||member?.status!=="active"||!["admin","doctor","assistant"].includes(member?.role||""))return reply({ok:false,error:"Acesso negado"},403,origin);
 const svc=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:flags,error:flagError}=await svc.rpc("amcf_ai_security_flags");
 if(flagError)return reply({ok:false,error:"Política de segurança indisponível"},503,origin);
 let input:Record<string,unknown>;
 try{input=await req.json();}catch{return reply({ok:false,error:"JSON inválido"},400,origin);}
 if(!input||typeof input!=="object"||Array.isArray(input))return reply({ok:false,error:"Dados inválidos"},400,origin);
 if(input.action==="status")return reply({ok:true,uploads_enabled:flags?.uploads_enabled===true,transfer_enabled:flags?.llm_attachment_transfer_enabled===true,max_bytes:SIZE},200,origin);
 if(flags?.uploads_enabled!==true)return reply({ok:false,error:"Upload de laudos bloqueado até homologação de segurança"},423,origin);
 const caseId=String(input.case_id||""),conversationId=String(input.conversation_id||"");
 if(!uuid.test(caseId)||!uuid.test(conversationId))return reply({ok:false,error:"Processo ou conversa inválidos"},400,origin);
 const {data:caseRow,error:caseError}=await caller.from("amcf_cases").select("id").eq("id",caseId).maybeSingle();
 if(caseError||!caseRow)return reply({ok:false,error:"Sem acesso ao processo"},403,origin);
 if(input.action==="reserve"){
  const mediaType=String(input.media_type||""),size=Number(input.size_bytes);
  if(!TYPES.has(mediaType)||!Number.isInteger(size)||size<1||size>SIZE)return reply({ok:false,error:"Tipo ou tamanho não permitido"},415,origin);
  const {count,error:quotaError}=await svc.from("amcf_ai_staged_files").select("id",{count:"exact",head:true}).eq("actor_id",uid).gt("created_at",new Date(Date.now()-86400000).toISOString());
  if(quotaError||count===null)return reply({ok:false,error:"Não foi possível validar a cota"},503,origin);
  if(count>=20)return reply({ok:false,error:"Limite diário de documentos atingido"},429,origin);
  const id=crypto.randomUUID(),path=uid+"/"+caseId+"/"+id;
  const {error:insertError}=await svc.from("amcf_ai_staged_files").insert({id,actor_id:uid,case_id:caseId,conversation_id:conversationId,storage_path:path,media_type:mediaType,byte_limit:size});
  if(insertError)return reply({ok:false,error:"Não foi possível preparar o arquivo"},503,origin);
  const {data:signature,error:signError}=await svc.storage.from(BUCKET).createSignedUploadUrl(path);
  if(signError||!signature){await svc.from("amcf_ai_staged_files").delete().eq("id",id);return reply({ok:false,error:"Falha ao preparar upload seguro"},503,origin);}
  return reply({ok:true,id,path,upload_token:signature.token,max_bytes:SIZE,expires_in_seconds:86400},200,origin);
 }
 if(!uuid.test(String(input.id||"")))return reply({ok:false,error:"Identificador inválido"},400,origin);
 const {data:file,error:selectError}=await svc.from("amcf_ai_staged_files").select("id,storage_path,media_type,byte_limit,status,expires_at").eq("id",String(input.id)).eq("actor_id",uid).eq("case_id",caseId).eq("conversation_id",conversationId).maybeSingle();
 if(selectError||!file)return reply({ok:false,error:"Anexo não encontrado"},404,origin);
 if(input.action==="discard"){
  const removed=await svc.storage.from(BUCKET).remove([file.storage_path]);
  if(removed.error)return reply({ok:false,error:"Erro ao descartar arquivo"},503,origin);
  await svc.from("amcf_ai_staged_files").delete().eq("id",file.id);
  return reply({ok:true,deleted:true},200,origin);
 }
 if(input.action!=="finalize")return reply({ok:false,error:"Ação desconhecida"},400,origin);
 if(new Date(file.expires_at).getTime()<=Date.now())return reply({ok:false,error:"Reserva expirada"},410,origin);
 const {data:blob,error:downloadError}=await svc.storage.from(BUCKET).download(file.storage_path);
 if(downloadError||!blob)return reply({ok:false,error:"Upload não encontrado"},404,origin);
 if(blob.size>file.byte_limit||blob.size>SIZE||blob.size===0){
  await svc.storage.from(BUCKET).remove([file.storage_path]);
  await svc.from("amcf_ai_staged_files").delete().eq("id",file.id);
  return reply({ok:false,error:"Arquivo excede o tamanho declarado"},413,origin);
 }
 const bytes=new Uint8Array(await blob.slice(0,12).arrayBuffer());
 if(!validMagic(file.media_type,bytes)){
  await svc.storage.from(BUCKET).remove([file.storage_path]);
  await svc.from("amcf_ai_staged_files").delete().eq("id",file.id);
  return reply({ok:false,error:"Conteúdo não corresponde ao formato permitido"},415,origin);
 }
 const {error:updateError}=await svc.from("amcf_ai_staged_files").update({status:"quarantined"}).eq("id",file.id).eq("actor_id",uid);
 if(updateError)return reply({ok:false,error:"Falha na quarentena"},503,origin);
 return reply({ok:true,id:file.id,status:"quarantined",expires_at:file.expires_at,transfer_enabled:false},200,origin);
});