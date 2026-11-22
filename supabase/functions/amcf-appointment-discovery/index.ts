import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Radar de Nomeações: somente busca em comunicações públicas do DJEN.
// Menção NÃO equivale a nomeação efetiva. Nunca cadastra casos ou prazos automaticamente.
const ALLOWED=new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const reply=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{
 status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store",
 "X-Content-Type-Options":"nosniff","Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})}
});
type Row={id:string;phrase:string;active:boolean};
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
const plain=(raw:unknown)=>{
 return String(raw??"").replace(/<[^>]*>/g," ").replace(/&nbsp;/gi," ")
  .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
  .replace(/[\u0000-\u001F]+/g," ").replace(/\s+/g," ").trim();
};
const date=(d:Date)=>d.toISOString().slice(0,10);
const sleep=(n:number)=>new Promise(resolve=>setTimeout(resolve,n));
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",allow=ALLOWED.has(origin)?origin:"";
 if(origin&&!allow)return reply({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "Access-Control-Allow-Origin":allow,"Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return reply({ok:false,error:"Use POST"},405,allow);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!service||!anon)return reply({ok:false,error:"Serviço indisponível"},503,allow);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!bearer)return reply({ok:false,error:"Autenticação necessária"},401,allow);
 const runner=/^[0-9a-f]{64}$/.test(bearer);
 if(runner){
  const verify=await admin.rpc("amcf_verify_monitor_token",{p_token:bearer});
  if(verify.error||verify.data!==true)return reply({ok:false,error:"Não autorizado"},403,allow);
 }else{
  const session=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
   global:{headers:{Authorization:"Bearer "+bearer}}});
  const who=await session.auth.getUser(bearer);
  if(who.error||!who.data.user)return reply({ok:false,error:"Sessão inválida"},401,allow);
  const claims=(()=>{try{return JSON.parse(atob(bearer.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))}catch{return {}}})();
  if(claims.aal!=="aal2")return reply({ok:false,error:"MFA necessário"},403,allow);
  const member=await session.from("amcf_members").select("status,role").eq("id",who.data.user.id).maybeSingle();
  if(member.error||member.data?.status!=="active"||
      !["admin","doctor","assistant"].includes(member.data.role))
   return reply({ok:false,error:"Sem permissão"},403,allow);
 }
 const terms=await admin.from("amcf_appointment_search_terms")
  .select("id,phrase,active").eq("active",true).order("created_at").limit(6);
 if(terms.error)return reply({ok:false,error:"Falha ao consultar termos"},500,allow);
 const now=new Date(),before=new Date(now.getTime()-(runner?8:30)*86400000);
 const start=date(before),end=date(now);
 let inspected=0,newLeads=0,mentions=0,possible=0,failed=0;
 for(const term of (terms.data||[]) as Row[]){
  const cleanTerm=plain(term.phrase).slice(0,120);
  if(cleanTerm.length<7||cleanTerm.split(" ").length<2)continue;
  const recent=await admin.from("amcf_appointment_search_runs").select("started_at")
   .eq("matched_term",cleanTerm).order("started_at",{ascending:false}).limit(1);
  if(recent.data?.[0]&&Date.now()-Date.parse(recent.data[0].started_at)<(runner?6*3600000:15*60000))continue;
  const run=await admin.from("amcf_appointment_search_runs").insert({
   matched_term:cleanTerm,date_from:start,date_to:end,status:"running"
  }).select("id").maybeSingle();
  if(run.error||!run.data){failed++;continue}
  let termMatches=0,inserted=0,failedReason="",resultStatus="ok";
  try{
   for(let page=1;page<=2;page++){
    const params=new URLSearchParams({texto:cleanTerm,
     dataDisponibilizacaoInicio:start,dataDisponibilizacaoFim:end,pagina:String(page),itensPorPagina:"50"});
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);
    let response:Response;
    try{
     response=await fetch("https://comunicaapi.pje.jus.br/api/v1/comunicacao?"+params.toString(),{
      method:"GET",headers:{Accept:"application/json"},signal:controller.signal});
    }finally{clearTimeout(timeout)}
    if(response.status===429){resultStatus="error";failedReason="Limite de consultas do DJEN atingido";break}
    if(!response.ok){resultStatus="error";failedReason="DJEN HTTP "+response.status;break}
    const payload=await response.json();
    const items=(Array.isArray(payload?.items)?payload.items:Array.isArray(payload)?payload:[]) as Record<string,unknown>[];
    inspected+=items.length;
    if(!items.length)break;
    const name=normalize(cleanTerm);
    for(const entry of items){
     const text=plain(entry.texto||entry.textoComunicacao||"");
     const normalized=normalize(text);
     const pos=normalized.indexOf(name);
     if(pos<0)continue;
     const hash=plain(entry.hash||entry.id||"").slice(0,150);
     if(hash.length<8||!/^[a-z0-9_-]+$/i.test(hash))continue;
     const digits=String(entry.numeroProcesso||entry.numeroprocessosemmascara||entry.numeroprocessocommascara||"").replace(/\D/g,"");
     if(digits.length!==20)continue;
     const around=normalized.slice(Math.max(0,pos-200),Math.min(normalized.length,pos+name.length+200));
     const possibleMatch=/(nomea(?:do|da|cao|ção|r|se)?|nomeio|designa(?:do|da|r|cao|ção)?|perito|pericia|perícia)/i.test(around);
     const excerptPos=Math.max(0,pos-125);
     // Texto simples sem anexos; contém apenas uma pequena janela da menção.
     const excerpt=text.slice(excerptPos,excerptPos+500);
     const record={
      external_hash:hash,matched_term:cleanTerm,cnj_number:digits,
      tribunal:plain(entry.siglaTribunal||entry.siglatribunal||"").slice(0,40),
      court_unit:plain(entry.nomeOrgao||entry.nomeorgao||"").slice(0,200),
      communication_type:plain(entry.tipoComunicacao||entry.tipocomunicacao||"").slice(0,150),
      available_on:/^\d{4}-\d{2}-\d{2}/.exec(String(entry.dataDisponibilizacao||entry.datadisponibilizacao||""))?.[0]||null,
      match_kind:possibleMatch?"possivel_nomeacao":"mencao",
      excerpt,
      source_url:"https://comunicaapi.pje.jus.br/api/v1/comunicacao/"+encodeURIComponent(hash)+"/certidao"
     };
     termMatches++;if(possibleMatch)possible++;else mentions++;
     const saved=await admin.from("amcf_appointment_leads").insert(record).select("id").maybeSingle();
     if(saved.data){inserted++;newLeads++}
     else if(saved.error?.code!=="23505"){console.error("AMCF lead insert",saved.error?.code||"unknown")}
    }
    if(items.length<50)break;
    await sleep(450);
   }
  }catch(e){
   resultStatus="error";failedReason="Consulta não concluída";console.error("AMCF discovery",String(e).slice(0,100));
  }
  if(resultStatus==="ok"&&termMatches===0)resultStatus="no_results";
  if(resultStatus==="error")failed++;
  await admin.from("amcf_appointment_search_runs").update({
   finished_at:new Date().toISOString(),status:resultStatus,
   found:termMatches,inserted,error_note:failedReason||null
  }).eq("id",run.data.id);
 }
 return reply({ok:true,source:"DJEN/CNJ",scanned:inspected,found:possible+mentions,newLeads,
  possibleMentions:possible,otherMentions:mentions,failed,
  caveat:"Resultados são apenas menções em publicações públicas; conferir possível nomeação no tribunal."},200,allow);
});