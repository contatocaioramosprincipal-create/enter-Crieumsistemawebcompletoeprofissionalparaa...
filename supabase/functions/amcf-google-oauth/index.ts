import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const ROOT="https://sistema.dradilsoncouto.com.br";
const ALLOWED=new Set([ROOT,"https://amcf-dr-adilson-original.pages.dev"]);
const REDIRECT="https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-google-oauth";
const JSON_HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const msg=(d:unknown,status=200,origin="")=>new Response(JSON.stringify(d),{status,headers:{...JSON_HEADERS,"Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})}});
const finish=(success:boolean)=>Response.redirect(ROOT+"/integracoes?google="+(success?"connected":"error"),303);
const scopes=["openid","email","https://www.googleapis.com/auth/calendar.events",
 "https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.send"].join(" ");
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",allowed=ALLOWED.has(origin)?origin:"";
 if(origin&&!allowed)return msg({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 const client=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")||"",
   secret=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")||"",
   base=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!base||!service||!anon)return msg({ok:false,error:"Configuração do servidor indisponível"},503,allowed);
 const admin=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
 if(req.method==="GET"){
   const url=new URL(req.url),code=url.searchParams.get("code")||"",state=url.searchParams.get("state")||"";
   if(!client||!secret||!code||!/^[0-9a-f-]{36}$/i.test(state))return finish(false);
   const used=await admin.from("amcf_google_oauth_states").update({used_at:new Date().toISOString()})
     .eq("id",state).is("used_at",null).gt("expires_at",new Date().toISOString()).select("owner_id").maybeSingle();
   if(used.error||!used.data)return finish(false);
   try{
     const exchange=await fetch("https://oauth2.googleapis.com/token",{
       method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
       body:new URLSearchParams({code,client_id:client,client_secret:secret,redirect_uri:REDIRECT,grant_type:"authorization_code"})
     });
     if(!exchange.ok)return finish(false);
     const token=await exchange.json();
     if(typeof token.refresh_token!=="string"||!token.refresh_token)return finish(false);
     const who=await fetch("https://openidconnect.googleapis.com/v1/userinfo",
       {headers:{"Authorization":"Bearer "+token.access_token}});
     if(!who.ok)return finish(false);
     const identity=await who.json();
     if(identity.email_verified!==true||typeof identity.email!=="string")return finish(false);
     const stored=await admin.rpc("amcf_google_save_connection",{p_owner:used.data.owner_id,p_email:identity.email,
       p_refresh:token.refresh_token,p_scopes:String(token.scope||"")});
     if(stored.error){console.error("amcf_google_save_connection",stored.error.code);return finish(false)}
     return finish(true);
   }catch{return finish(false)}
 }
 if(req.method!=="POST")return msg({ok:false,error:"Use POST"},405,allowed);
 const bearer=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!bearer)return msg({ok:false,error:"Sessão obrigatória"},401,allowed);
 const sb=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{"Authorization":"Bearer "+bearer}}});
 const user=await sb.auth.getUser(bearer);
 if(user.error||!user.data.user)return msg({ok:false,error:"Sessão inválida"},401,allowed);
 const aal=(()=>{try{return JSON.parse(atob(bearer.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).aal}catch{return ""}})();
 if(aal!=="aal2")return msg({ok:false,error:"MFA obrigatório"},403,allowed);
 const member=await sb.from("amcf_members").select("id,status").eq("id",user.data.user.id).maybeSingle();
 if(member.error||member.data?.status!=="active")return msg({ok:false,error:"Usuário sem acesso"},403,allowed);
 let input:Record<string,unknown>;
 try{input=await req.json() as Record<string,unknown>}catch{return msg({ok:false,error:"JSON inválido"},400,allowed)}
 if(input.action==="status"){
   const existing=await sb.from("amcf_google_connections").select("google_email,connected_at,last_calendar_sync_at,last_gmail_sync_at").eq("owner_id",user.data.user.id).maybeSingle();
   return msg({ok:true,configured:!!(client&&secret),connected:!!existing.data,connection:existing.data||null},200,allowed);
 }
 if(input.action==="disconnect"){
   const result=await admin.rpc("amcf_google_disconnect",{p_owner:user.data.user.id});
   return result.error?msg({ok:false,error:"Não foi possível desconectar"},500,allowed):msg({ok:true,disconnected:true},200,allowed);
 }
 if(input.action==="start"){
   if(!client||!secret)return msg({ok:false,error:"Google Cloud OAuth ainda não configurado no servidor do AMCF"},503,allowed);
   const row=await admin.from("amcf_google_oauth_states").insert({owner_id:user.data.user.id}).select("id").single();
   if(row.error||!row.data)return msg({ok:false,error:"Não foi possível iniciar autorização"},500,allowed);
   const q=new URLSearchParams({client_id:client,redirect_uri:REDIRECT,response_type:"code",scope:scopes,
      access_type:"offline",prompt:"consent",include_granted_scopes:"true",state:row.data.id});
   return msg({ok:true,authorize_url:"https://accounts.google.com/o/oauth2/v2/auth?"+q.toString()},200,allowed);
 }
 return msg({ok:false,error:"Ação não suportada"},400,allowed);
});