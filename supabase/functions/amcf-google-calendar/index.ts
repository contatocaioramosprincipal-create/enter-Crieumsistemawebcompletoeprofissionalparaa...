import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const allow=new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const respond=(value:unknown,status=200,origin="")=>new Response(JSON.stringify(value),{status,headers:{"Content-Type":"application/json","Cache-Control":"private, no-store","Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GOOGLE="https://www.googleapis.com/calendar/v3";
const base=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
interface LocalEvent{id:string;owner_id:string;case_id:string|null;summary:string;starts_at:string;ends_at:string;google_event_id:string|null;google_updated_at:string|null;last_synced_at:string|null;updated_at:string;deleted_at:string|null}
async function syncOwner(db:ReturnType<typeof createClient>,owner:string){
 const connection=await db.from("amcf_google_connections").select("owner_id,calendar_id,granted_scopes").eq("owner_id",owner).maybeSingle();
 if(connection.error||!connection.data)throw new Error("Conta Google não conectada");
 if(!connection.data.granted_scopes.includes("https://www.googleapis.com/auth/calendar.events"))throw new Error("Permissão Calendar insuficiente");
 const rt=await db.rpc("amcf_google_get_refresh",{p_owner:owner});
 const cid=Deno.env.get("GOOGLE_OAUTH_CLIENT_ID"),cs=Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
 if(!cid||!cs||rt.error||!rt.data)throw new Error("Credenciais Google não configuradas");
 const tokenRes=await fetch("https://oauth2.googleapis.com/token",{method:"POST",
  headers:{"Content-Type":"application/x-www-form-urlencoded"},
  body:new URLSearchParams({client_id:cid,client_secret:cs,refresh_token:rt.data,grant_type:"refresh_token"})});
 if(!tokenRes.ok)throw new Error("Falha na renovação do OAuth Google; reconecte a conta");
 const token=await tokenRes.json();
 const auth="Bearer "+token.access_token;
 const calendar=encodeURIComponent(connection.data.calendar_id||"primary");
 const make=async(method:string,path:string,body?:unknown)=>{
  const res=await fetch(GOOGLE+path,{method,headers:{"Authorization":auth,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  if(!res.ok&&!(method==="DELETE"&&res.status===404))throw new Error("Google Calendar HTTP "+res.status);
  if(method==="DELETE")return {};
  return await res.json();
 };
 const since=new Date(Date.now()-90*24*3600000).toISOString();
 const until=new Date(Date.now()+370*24*3600000).toISOString();
 const list=await db.from("amcf_google_calendar_events").select("*").eq("owner_id",owner)
   .gte("starts_at",since).lte("starts_at",until).order("starts_at").limit(250);
 if(list.error)throw new Error("Falha ao listar compromissos do CRM");
 let pushed=0,pulled=0;
 for(const e of (list.data||[]) as LocalEvent[]){
  const dirty=!e.last_synced_at || Date.parse(e.updated_at)-Date.parse(e.last_synced_at)>2000;
  if(!dirty)continue;
  if(e.deleted_at){
    if(e.google_event_id)await make("DELETE","/calendars/"+calendar+"/events/"+encodeURIComponent(e.google_event_id));
    await db.from("amcf_google_calendar_events").update({last_synced_at:new Date().toISOString()}).eq("id",e.id).eq("owner_id",owner);
    pushed++;continue;
  }
  const resource={summary:e.summary,start:{dateTime:e.starts_at,timeZone:"America/Sao_Paulo"},
    end:{dateTime:e.ends_at,timeZone:"America/Sao_Paulo"},
    description:"Agendamento do CRM AMCF. Verifique o processo correspondente no próprio sistema.",
    extendedProperties:{private:{amcf_event_id:e.id}}};
  const remote=e.google_event_id
     ? await make("PATCH","/calendars/"+calendar+"/events/"+encodeURIComponent(e.google_event_id),resource)
     : await make("POST","/calendars/"+calendar+"/events",resource);
  await db.from("amcf_google_calendar_events").update({
    google_event_id:remote.id,google_updated_at:remote.updated||new Date().toISOString(),
    last_synced_at:new Date().toISOString()
  }).eq("owner_id",owner).eq("id",e.id);
  pushed++;
 }
 let pageToken="",page=0;
 do{
  const params=new URLSearchParams({timeMin:since,timeMax:until,singleEvents:"true",
    showDeleted:"true",maxResults:"250"});
  if(pageToken)params.set("pageToken",pageToken);
  const remote=await make("GET","/calendars/"+calendar+"/events?"+params.toString());
  for(const g of remote.items||[]){
    const id=String(g.extendedProperties?.private?.amcf_event_id||"");
    if(!uuid.test(id))continue;  // Ignora compromissos pessoais que não foram criados pelo AMCF.
    const local=await db.from("amcf_google_calendar_events").select("*").eq("id",id).eq("owner_id",owner).maybeSingle();
    if(!local.data||local.error)continue;
    const row=local.data as LocalEvent;
    const pending=row.last_synced_at?Date.parse(row.updated_at)-Date.parse(row.last_synced_at)>2000:false;
    if(pending)continue; // Mudança local ainda não sincronizada prevalece até ser enviada.
    if(!g.updated || (row.google_updated_at&&Date.parse(g.updated)<=Date.parse(row.google_updated_at)))continue;
    if(g.status==="cancelled"){
      await db.from("amcf_google_calendar_events").update({deleted_at:new Date().toISOString(),google_updated_at:g.updated,last_synced_at:new Date().toISOString()})
       .eq("id",id).eq("owner_id",owner);
      pulled++;continue;
    }
    const start=g.start?.dateTime,end=g.end?.dateTime;
    if(!start||!end||Date.parse(start)>=Date.parse(end))continue;
    await db.from("amcf_google_calendar_events").update({
      summary:String(g.summary||row.summary).slice(0,180),starts_at:start,ends_at:end,
      google_updated_at:g.updated,last_synced_at:new Date().toISOString()
    }).eq("id",id).eq("owner_id",owner);
    pulled++;
  }
  pageToken=String(remote.nextPageToken||"");
  page++;
 }while(pageToken&&page<3);
 await db.from("amcf_google_connections").update({last_calendar_sync_at:new Date().toISOString()}).eq("owner_id",owner);
 return {owner,pushed,pulled};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",allowed=allow.has(origin)?origin:"";
 if(origin&&!allowed)return respond({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return respond({ok:false,error:"Use POST"},405,allowed);
 if(!base||!service)return respond({ok:false,error:"Servidor indisponível"},503,allowed);
 const db=createClient(base,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!bearer)return respond({ok:false,error:"Sessão obrigatória"},401,allowed);
 let owners:string[]=[];
 if(/^[0-9a-f]{64}$/.test(bearer)){
   const valid=await db.rpc("amcf_verify_monitor_token",{p_token:bearer});
   if(valid.error||valid.data!==true)return respond({ok:false,error:"Não autorizado"},403,allowed);
   const connections=await db.from("amcf_google_connections").select("owner_id").order("last_calendar_sync_at",{ascending:true,nullsFirst:true}).limit(8);
   if(connections.error)return respond({ok:false,error:"Não foi possível listar conexões"},500,allowed);
   owners=(connections.data||[]).map(x=>x.owner_id);
 }else{
   const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
   const userSb=createClient(base,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+bearer}}});
   const who=await userSb.auth.getUser(bearer);
   if(who.error||!who.data.user)return respond({ok:false,error:"Sessão inválida"},401,allowed);
   const aal=(()=>{try{return JSON.parse(atob(bearer.split(".")[1].replace(/-/g,"+").replace(/_/g,"/"))).aal}catch{return ""}})();
   if(aal!=="aal2")return respond({ok:false,error:"MFA obrigatório"},403,allowed);
   const member=await userSb.from("amcf_members").select("status").eq("id",who.data.user.id).maybeSingle();
   if(member.error||member.data?.status!=="active")return respond({ok:false,error:"Usuário sem acesso"},403,allowed);
   owners=[who.data.user.id];
 }
 const results=[];
 for(const owner of owners){try{results.push(await syncOwner(db,owner))}
 catch(e){console.error("AMCF Calendar",String(e).slice(0,170));results.push({owner,error:e instanceof Error?e.message:"Falha ao sincronizar"})}}
 return respond({ok:true,accounts:results.length,results},200,allowed);
});