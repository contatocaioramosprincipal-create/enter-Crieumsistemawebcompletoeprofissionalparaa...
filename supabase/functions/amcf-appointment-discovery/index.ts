import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Pesquisa NACIONAL no DJEN/CNJ por grafias profissionais autorizadas.
// O DJEN não é um cadastro de peritos: cada resultado continua pendente de conferência.
// Rotina recente e retrospectiva de 90 dias em janelas de 7 dias, sem varredura abusiva.
const ALLOWED=new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const response=(body:unknown,status=200,origin="")=>new Response(JSON.stringify(body),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
 "Vary":"Origin",...(origin?{"Access-Control-Allow-Origin":origin}:{})
}});
const date=(d:Date)=>d.toISOString().slice(0,10);
const addDays=(iso:string,delta:number)=>date(new Date(Date.parse(iso+"T12:00:00Z")+delta*86400000));
const normalize=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"")
 .toLocaleLowerCase("pt-BR").replace(/\s+/g," ").trim();
const plain=(v:unknown)=>String(v??"").replace(/<script[\s\S]*?<\/script>/gi," ")
 .replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ")
 .replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"')
 .replace(/&#39;|&apos;/gi,"'").replace(/[\u0000-\u001F]/g," ").replace(/\s+/g," ").trim();
const trustedSource=(hash:string)=>"https://comunicaapi.pje.jus.br/api/v1/comunicacao/"+
 encodeURIComponent(hash)+"/certidao";
type Term={id:string;phrase:string;active:boolean};
type Communication={hash?:string;id?:string|number;numero_processo?:string;
 numeroprocessocommascara?:string;numeroProcesso?:string;texto?:string;
 textoComunicacao?:string;datadisponibilizacao?:string;dataDisponibilizacao?:string;
 siglaTribunal?:string;nomeOrgao?:string;tipoComunicacao?:string};
const extract=(entry:Communication,phrase:string)=>{
 const content=plain(entry.texto||entry.textoComunicacao||"");
 const normalized=normalize(content),name=normalize(phrase);
 const position=normalized.indexOf(name);
 if(position<0)return null;
 const hash=plain(entry.hash||"").slice(0,150);
 if(hash.length<8||!/^[a-z0-9_-]+$/i.test(hash))return null;
 const cnj=String(entry.numero_processo||entry.numeroProcesso||entry.numeroprocessocommascara||"").replace(/\D/g,"");
 if(cnj.length!==20)return null;
 const vicinity=normalized.slice(Math.max(0,position-140),Math.min(normalized.length,position+name.length+140));
 const potential=/(nomea(?:d[oa]|cao|ção|r|se)?|nomeio|designa(?:d[oa]|cao|ção|r)?|perit[oa]|pericia|perícia)/i.test(vicinity);
 const foundDate=/^\d{4}-\d{2}-\d{2}/.exec(String(entry.datadisponibilizacao||entry.dataDisponibilizacao||""))?.[0]||null;
 return {
  external_hash:hash,matched_term:phrase,cnj_number:cnj,
  tribunal:plain(entry.siglaTribunal).slice(0,40),
  court_unit:plain(entry.nomeOrgao).slice(0,200),
  communication_type:plain(entry.tipoComunicacao).slice(0,150),
  available_on:foundDate,
  match_kind:potential?"possivel_nomeacao" as const:"mencao" as const,
  excerpt:content.slice(Math.max(0,position-130),Math.min(content.length,position+460)),
  source_url:trustedSource(hash)
 };
};
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",allowed=ALLOWED.has(origin)?origin:"";
 if(origin&&!allowed)return response({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{
  "Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return response({ok:false,error:"Use POST"},405,allowed);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!service||!anon)return response({ok:false,error:"Servidor indisponível"},503,allowed);
 const token=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!token)return response({ok:false,error:"Autenticação necessária"},401,allowed);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const runner=/^[0-9a-f]{64}$/.test(token);
 if(runner){
  const ok=await admin.rpc("amcf_verify_monitor_token",{p_token:token});
  if(ok.error||ok.data!==true)return response({ok:false,error:"Não autorizado"},403,allowed);
 }else{
  const session=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
   global:{headers:{Authorization:"Bearer "+token}}});
  const user=await session.auth.getUser(token);
  if(user.error||!user.data.user)return response({ok:false,error:"Sessão inválida"},401,allowed);
  const jwt=(()=>{try{return JSON.parse(atob(token.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))}catch{return {}}})();
  if(jwt.aal!=="aal2")return response({ok:false,error:"MFA obrigatório"},403,allowed);
  const member=await session.from("amcf_members").select("role,status")
    .eq("id",user.data.user.id).maybeSingle();
  if(member.error||member.data?.status!=="active"||
     !["admin","doctor","assistant"].includes(member.data.role))
    return response({ok:false,error:"Sem acesso autorizado"},403,allowed);
 }
 let requestBody:Record<string,unknown>={};
 try{requestBody=await req.json() as Record<string,unknown>}catch{}
 const mode=requestBody.mode==="history"?"history":"daily";
 const terms=await admin.from("amcf_appointment_search_terms").select("id,phrase,active")
   .eq("active",true).order("created_at").limit(6);
 if(terms.error)return response({ok:false,error:"Não foi possível consultar os nomes monitorados"},500,allowed);
 const now=date(new Date()),historyFloor=addDays(now,-90);
 let scanned=0,mentions=0,possible=0,newLeads=0,failed=0,truncated=0,termRuns=0;
 let checkedWindows=0,ignored=0;
 for(const term of (terms.data||[]) as Term[]){
  const phrase=plain(term.phrase).slice(0,120);
  if(phrase.length<7||phrase.split(" ").length<2)continue;
  let start:string,end:string,alreadyFinished=false;
  if(mode==="history"){
   const progress=await admin.from("amcf_appointment_history_progress")
      .select("next_end_on,finished_on,windows_checked").eq("term_id",term.id).maybeSingle();
   if(progress.error){failed++;continue}
   if(progress.data?.finished_on){alreadyFinished=true;ignored++;continue}
   end=progress.data?.next_end_on||addDays(now,-9);
   if(end<historyFloor){ignored++;continue}
   start=addDays(end,-6);
   if(start<historyFloor)start=historyFloor;
  }else{
   end=now;start=addDays(now,runner?-8:-30);
  }
  const latest=await admin.from("amcf_appointment_search_runs").select("started_at,status")
   .eq("matched_term",phrase).eq("scan_mode",mode)
   .order("started_at",{ascending:false}).limit(1);
  // Retentativas explícitas respeitam limites; backfill avança uma semana por execução.
  if(latest.data?.[0]&&Date.now()-Date.parse(latest.data[0].started_at)<
     (mode==="history"?(runner?20*3600000:30*60000):(runner?6*3600000:15*60000))){
    ignored++;continue;
  }
  const run=await admin.from("amcf_appointment_search_runs").insert({
    matched_term:phrase,date_from:start,date_to:end,status:"running",scan_mode:mode
  }).select("id").maybeSingle();
  if(run.error||!run.data){failed++;continue}
  termRuns++;checkedWindows++;
  let hits=0,inserted=0,inspected=0,isTruncated=false,status:"ok"|"no_results"|"error"="ok";
  let note="";
  try{
    for(let page=1;page<=2;page++){
      const params=new URLSearchParams({texto:phrase,
       dataDisponibilizacaoInicio:start,dataDisponibilizacaoFim:end,
       pagina:String(page),itensPorPagina:"50"});
      const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8500);
      let res:Response;
      try{
        res=await fetch("https://comunicaapi.pje.jus.br/api/v1/comunicacao?"+params.toString(),{
          headers:{"Accept":"application/json"},signal:ctl.signal});
      }finally{clearTimeout(timer)}
      if(!res.ok){status="error";note="Fonte DJEN HTTP "+res.status;break}
      const body=await res.json();
      const items=(Array.isArray(body?.items)?body.items:Array.isArray(body)?body:[]) as Communication[];
      if(!items.length)break;
      inspected+=items.length;
      if(Number(body?.count||0)>100)isTruncated=true;
      for(const item of items){
        const match=extract(item,phrase);
        if(!match)continue;
        hits++;
        if(match.match_kind==="possivel_nomeacao")possible++;else mentions++;
        const saved=await admin.from("amcf_appointment_leads").insert(match).select("id").maybeSingle();
        if(saved.data){inserted++;newLeads++}
        else if(saved.error&&saved.error.code!=="23505")console.error("AMCF discovery write",saved.error.code);
      }
      if(items.length<50)break;
    }
  }catch(e){
    status="error";note="Consulta ao DJEN não concluída";
    console.error("AMCF DJEN",String(e).slice(0,90));
  }
  if(status==="ok"&&hits===0)status="no_results";
  if(status==="error")failed++;
  if(isTruncated){truncated++;note=note||"Fonte limitada a 100 registros por nome e intervalo; utilize datas menores para aprofundar."}
  scanned+=inspected;
  await admin.from("amcf_appointment_search_runs").update({
    finished_at:new Date().toISOString(),status,found:hits,inserted,
    inspected,truncated:isTruncated,error_note:note.slice(0,300)||null
  }).eq("id",run.data.id);
  if(mode==="history"&&status!=="error"){
    const next=addDays(start,-1);
    const complete=next<historyFloor;
    const progress=await admin.from("amcf_appointment_history_progress")
      .select("windows_checked").eq("term_id",term.id).maybeSingle();
    await admin.from("amcf_appointment_history_progress").upsert({
      term_id:term.id,next_end_on:next,
      finished_on:complete?now:null,windows_checked:(progress.data?.windows_checked||0)+1,
      last_run_at:new Date().toISOString(),updated_at:new Date().toISOString()
    },{onConflict:"term_id"});
  }
 }
 return response({ok:true,source:"Diário da Justiça Eletrônico Nacional (DJEN)",
  mode,windows:checkedWindows,scanned,found:mentions+possible,newLeads,possibleMentions:possible,
  otherMentions:mentions,failed,truncated,skipped:ignored,
  caveat:"Busca nominal em comunicações públicas, não prova nomeação. Paginação, atrasos e sigilo limitam a cobertura; DataJud não pesquisa nome ou CPF."},200,allowed);
});