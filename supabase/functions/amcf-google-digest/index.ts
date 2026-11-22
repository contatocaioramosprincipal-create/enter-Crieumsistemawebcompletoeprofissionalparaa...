import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Somente pg_cron: e-mail administrativo sem nomes, diagnósticos ou conteúdo processual.
const out=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
const b64=(s:string)=>{let binary="";for(const b of new TextEncoder().encode(s))binary+=String.fromCharCode(b);return btoa(binary)};
const toUrl=(s:string)=>b64(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
Deno.serve(async(req:Request)=>{
 if(req.method!=="POST")return out({ok:false,error:"Use POST"},405);
 const bearer=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("Authorization")||"")?.[1];
 if(!bearer)return out({ok:false,error:"Não autorizado"},401);
 const base=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!base||!secret)return out({ok:false,error:"Configuração indisponível"},503);
 const db=createClient(base,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const allowed=await db.rpc("amcf_verify_monitor_token",{p_token:bearer});
 if(allowed.error||allowed.data!==true)return out({ok:false,error:"Não autorizado"},403);
 const today=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo"}).format(new Date());
 const settings=await db.from("amcf_google_digest_settings").select("owner_id,last_sent_on").eq("enabled",true).limit(30);
 if(settings.error)return out({ok:false,error:"Falha na configuração de resumos"},500);
 let sent=0,failed=0,skipped=0;
 for(const setting of settings.data||[]){
  if(setting.last_sent_on===today){skipped++;continue}
  const connection=await db.from("amcf_google_connections").select("google_email,granted_scopes").eq("owner_id",setting.owner_id).maybeSingle();
  if(connection.error||!connection.data||!connection.data.granted_scopes.includes("https://www.googleapis.com/auth/gmail.send")){skipped++;continue}
  try{
   const refresh=await db.rpc("amcf_google_get_refresh",{p_owner:setting.owner_id});
   const id=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),clientSecret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
   if(!id||!clientSecret||!refresh.data||refresh.error)throw new Error("Credenciais Google indisponíveis");
   const access=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:id,client_secret:clientSecret,refresh_token:refresh.data,grant_type:"refresh_token"})});
   if(!access.ok)throw new Error("OAuth Google indisponível");
   const token=await access.json();
   const tasks=await db.from("amcf_tasks").select("id",{count:"exact",head:true})
     .eq("responsible_id",setting.owner_id).in("status",["pending","in_progress"])
     .lte("due_on",today);
   const upcoming=await db.from("amcf_tasks").select("id",{count:"exact",head:true})
     .eq("responsible_id",setting.owner_id).in("status",["pending","in_progress"])
     .gt("due_on",today).lte("due_on",new Date(Date.now()+3*86400000).toISOString().slice(0,10));
   const notifications=await db.from("amcf_notifications").select("id",{count:"exact",head:true})
     .eq("member_id",setting.owner_id).is("read_at",null);
   if(tasks.error||upcoming.error||notifications.error)throw new Error("Não foi possível consultar tarefas");
   const subject="AMCF — resumo operacional — "+today;
   const body=[
    "Resumo administrativo do CRM AMCF — "+today,
    "",
    "Tarefas com vencimento registrado até hoje: "+(tasks.count||0),
    "Tarefas com vencimento cadastrado nos próximos 3 dias: "+(upcoming.count||0),
    "Alertas internos não lidos: "+(notifications.count||0),
    "",
    "Abra https://sistema.dradilsoncouto.com.br/central para conferir.",
    "Os vencimentos cadastrados não substituem confirmação de prazos judiciais no tribunal.",
    "Este e-mail não inclui dados pessoais, clínicos, números processuais nem documentos.",
    "Você pode desativar os resumos em Integrações no CRM."
   ].join("\r\n");
   const raw="To: "+connection.data.google_email+"\r\nSubject: =?UTF-8?B?"+b64(subject)+"?=\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"+b64(body);
   const delivered=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",
    headers:{"Authorization":"Bearer "+token.access_token,"Content-Type":"application/json"},
    body:JSON.stringify({raw:toUrl(raw)})});
   if(!delivered.ok)throw new Error("Gmail HTTP "+delivered.status);
   const receipt=await delivered.json();
   if(!receipt.id)throw new Error("Gmail não confirmou envio");
   const update=await db.from("amcf_google_digest_settings").update({last_sent_on:today,updated_at:new Date().toISOString()})
     .eq("owner_id",setting.owner_id).eq("enabled",true);
   if(update.error)console.error("AMCF digest status",update.error.code);
   sent++;
  }catch(e){failed++;console.error("AMCF digest",String(e).slice(0,130))}
 }
 return out({ok:true,checked:settings.data?.length||0,sent,failed,skipped,date:today},200);
});