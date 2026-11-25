import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const allowed=new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const resp=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store","Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})}});
const mail="https://gmail.googleapis.com/gmail/v1/users/me";
const clean=(v:unknown,n:number)=>String(v??"").replace(/[\u0000-\u001F]/g," ").trim().slice(0,n);
const b64=(input:string)=>{
 const bytes=new TextEncoder().encode(input);
 let binary="";for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary);
};
const b64url=(input:string)=>b64(input).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
type Client=ReturnType<typeof createClient>;
async function authGoogle(db:Client,owner:string,scope:string){
 const conn=await db.from("amcf_google_connections").select("google_email,granted_scopes").eq("owner_id",owner).maybeSingle();
 if(conn.error||!conn.data)throw new Error("Conta Google não conectada");
 if(!conn.data.granted_scopes.includes(scope))throw new Error("Permissão Gmail não concedida");
 const rt=await db.rpc("amcf_google_get_refresh",{p_owner:owner});
 const client=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!client||!secret||rt.error||!rt.data)throw new Error("Google OAuth ainda não configurado");
 const res=await fetch("https://oauth2.googleapis.com/token",{method:"POST",
   headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({client_id:client,client_secret:secret,refresh_token:rt.data,grant_type:"refresh_token"})});
 if(!res.ok)throw new Error("Falha na autenticação Gmail. Reconecte a conta Google.");
 const token=await res.json();
 return {bearer:"Bearer "+token.access_token,email:conn.data.google_email};
}
async function api(access:string,method:string,path:string,body?:unknown){
 const r=await fetch(mail+path,{method,headers:{"Authorization":access,"Content-Type":"application/json"},
  body:body?JSON.stringify(body):undefined});
 if(!r.ok)throw new Error("Gmail HTTP "+r.status);
 return r.json();
}
async function syncCase(db:Client,owner:string,caseId:string,access:string){
 const c=await db.from("amcf_cases").select("id,cnj_number,archived_at").eq("id",caseId).maybeSingle();
 if(c.error||!c.data||c.data.archived_at)return {caseId,added:0,reason:"Processo indisponível"};
 const cnj=String(c.data.cnj_number||""),digits=cnj.replace(/\D/g,"");
 if(!/^\d{20}$/.test(digits))return {caseId,added:0,reason:"Número CNJ não cadastrado"};
 const query=new URLSearchParams({q:'{"'+cnj+'" "'+digits+'"} newer_than:90d',maxResults:"25"});
 const list=await api(access,"GET","/messages?"+query.toString());
 let imported=0;
 for(const item of (list.messages||[]).slice(0,25)){
  if(!/^[a-zA-Z0-9]+$/.test(String(item.id||"")))continue;
  const detail=await api(access,"GET","/messages/"+encodeURIComponent(item.id)+"?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To");
  const header=(name:string)=>String((detail.payload?.headers||[]).find((h:{name:string})=>h.name.toLowerCase()===name.toLowerCase())?.value||"");
  const subject=clean(header("Subject"),400),snippet=clean(detail.snippet,400);
  const identified=(subject+" "+snippet).replace(/\D/g,"");
  if(!identified.includes(digits))continue; // Nunca associar e-mail sem correspondência visível com o processo.
  const record=await db.from("amcf_google_email_messages").upsert({
    owner_id:owner,case_id:caseId,gmail_message_id:String(item.id),
    gmail_thread_id:String(detail.threadId||""),
    sender:clean(header("From"),300),recipient:clean(header("To"),300),
    subject,excerpt:snippet,received_at:new Date(Number(detail.internalDate||Date.now())).toISOString()
  },{onConflict:"owner_id,case_id,gmail_message_id",ignoreDuplicates:true}).select("id");
  if(!record.error&&record.data?.length)imported++;
 }
 return {caseId,imported};
}
async function sendEmail(db:Client,owner:string,caseId:string,input:Record<string,unknown>,access:string){
 const to=String(input.to||"").trim(),subject=String(input.subject||"").trim(),body=String(input.body||"").trim();
 if(!/^[^\s@<>,;]+@[^\s@<>,;]+\.[A-Za-z]{2,}$/.test(to)||subject.length<3||subject.length>250||
   body.length<3||body.length>8000||/[\r\n]/.test(to+subject))
   throw new Error("Destinatário, assunto ou mensagem inválidos");
 const target=await db.from("amcf_cases").select("id,contact_id").eq("id",caseId).maybeSingle();
 if(target.error||!target.data)throw new Error("Processo não localizado");
 const raw="To: "+to+"\r\nSubject: =?UTF-8?B?"+b64(subject)+"?=\r\n"+
   "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"+b64(body)+"\r\n";
 const sent=await api(access,"POST","/messages/send",{raw:b64url(raw)});
 if(!sent.id)throw new Error("Gmail não confirmou o envio");
 const audit=await db.from("amcf_google_sent_messages").insert({owner_id:owner,case_id:caseId,recipient:to,subject:subject.slice(0,400),gmail_message_id:sent.id});
 if(audit.error)console.error("AMCF gmail audit",audit.error.code);
 await db.from("amcf_interactions").insert({case_id:caseId,contact_id:target.data.contact_id,
   created_by:owner,kind:"email",summary:"E-mail enviado pelo Gmail a "+to+" — assunto: "+subject});
 return {sent:true,gmail_message_id:sent.id};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",o=allowed.has(origin)?origin:"";
 if(origin&&!o)return resp({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":o,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return resp({ok:false,error:"Use POST"},405,o);
 const url=Deno.env.get("SUPABASE_URL"),svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!svc||!anon)return resp({ok:false,error:"Servidor indisponível"},503,o);
 const db=createClient(url,svc,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!bearer)return resp({ok:false,error:"Sessão obrigatória"},401,o);
 let input:Record<string,unknown>={};
 try{input=await req.json() as Record<string,unknown>}catch{return resp({ok:false,error:"JSON inválido"},400,o)}
 const isRunner=/^[0-9a-f]{64}$/.test(bearer);
 let owner="",userDb:Client|null=null;
 if(isRunner){
  const verified=await db.rpc("amcf_verify_monitor_token",{p_token:bearer});
  if(verified.error||verified.data!==true)return resp({ok:false,error:"Não autorizado"},403,o);
  if(input.action==="send")return resp({ok:false,error:"Cron não pode enviar e-mails"},403,o);
 }else{
  userDb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+bearer}}});
  const who=await userDb.auth.getUser(bearer);
  if(who.error||!who.data.user)return resp({ok:false,error:"Sessão inválida"},401,o);
  const aal=(()=>{try{return JSON.parse(atob(bearer.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).aal}catch{return ""}})();
  if(aal!=="aal2")return resp({ok:false,error:"MFA obrigatório"},403,o);
  const member=await userDb.from("amcf_members").select("status").eq("id",who.data.user.id).maybeSingle();
  if(member.error||member.data?.status!=="active")return resp({ok:false,error:"Usuário sem acesso"},403,o);
  owner=who.data.user.id;
 }
 const action=String(input.action||"sync");
 if(isRunner){
  const accounts=await db.from("amcf_google_connections").select("owner_id")
    .order("last_gmail_sync_at",{ascending:true,nullsFirst:true}).limit(6);
  if(accounts.error)return resp({ok:false,error:"Não foi possível carregar conexões"},500,o);
  const summary=[];
  for(const item of accounts.data||[]){
   try{
    const granted=await authGoogle(db,item.owner_id,"https://www.googleapis.com/auth/gmail.readonly");
    const cases=await db.from("amcf_cases").select("id").eq("responsible_id",item.owner_id).is("archived_at",null).eq("case_secret",false).not("cnj_number","is",null).limit(3);
    const results=[];
    for(const c of cases.data||[])results.push(await syncCase(db,item.owner_id,c.id,granted.bearer));
    await db.from("amcf_google_connections").update({last_gmail_sync_at:new Date().toISOString()}).eq("owner_id",item.owner_id);
    summary.push({owner:item.owner_id,results});
   }catch(e){summary.push({owner:item.owner_id,error:e instanceof Error?e.message:"Falha Gmail"})}
  }
  return resp({ok:true,accounts:summary.length,results:summary},200,o);
 }
 const caseId=String(input.caseId||"");
 if(!uuid.test(caseId))return resp({ok:false,error:"Selecione o processo"},422,o);
 const allowedCase=await userDb!.from("amcf_cases").select("id").eq("id",caseId).maybeSingle();
 if(allowedCase.error||!allowedCase.data)return resp({ok:false,error:"Processo não autorizado"},403,o);
 try{
  const access=await authGoogle(db,owner,action==="send"?"https://www.googleapis.com/auth/gmail.send":"https://www.googleapis.com/auth/gmail.readonly");
  if(action==="send"){
   if(input.confirmSend!==true)return resp({ok:false,error:"Confirmação explícita de envio necessária"},422,o);
   return resp({ok:true,...await sendEmail(db,owner,caseId,input,access.bearer)},200,o);
  }
  if(action==="sync"){
   const result=await syncCase(db,owner,caseId,access.bearer);
   await db.from("amcf_google_connections").update({last_gmail_sync_at:new Date().toISOString()}).eq("owner_id",owner);
   return resp({ok:true,...result},200,o);
  }
  return resp({ok:false,error:"Ação não suportada"},400,o);
 }catch(e){return resp({ok:false,error:e instanceof Error?e.message:"Falha na integração Gmail"},502,o)}
});