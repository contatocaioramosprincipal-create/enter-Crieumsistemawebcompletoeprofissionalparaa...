import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
const ORIGINS=new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i; // overridden below
const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const dateOnly=(value:unknown):string|null=>{
 const match=/^\d{4}-\d{2}-\d{2}/.exec(String(value??""));
 return match?.[0]??null;
};
const fmtText=(value:unknown,len:number)=>String(value??"").replace(/[\u0000-\u001F]/g," ").slice(0,len).trim();
const response=(data:unknown,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"private, no-store",
 "X-Content-Type-Options":"nosniff",...(origin?{"Access-Control-Allow-Origin":origin}:{}),"Vary":"Origin"
}});
interface CaseRef{id:string;cnj_number:string;responsible_id:string;archived_at:string|null;case_secret:boolean}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",allowed=ORIGINS.has(origin)?origin:"";
 if(origin&&!allowed)return response({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return response({ok:false,error:"Use POST"},405,allowed);
 const u=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!u||!service||!anon)return response({ok:false,error:"Servidor não configurado"},503,allowed);
 const svc=createClient(u,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const bearer=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!bearer)return response({ok:false,error:"Acesso negado"},401,allowed);
 let data:Record<string,unknown>={};
 try{data=await req.json() as Record<string,unknown>}catch{return response({ok:false,error:"JSON inválido"},400,allowed)}
 const id=typeof data.caseId==="string"?data.caseId:"";
 let isRunner=false,ownerId="";
 if(/^[0-9a-f]{64}$/.test(bearer)){
   const result=await svc.rpc("amcf_verify_monitor_token",{p_token:bearer});
   if(result.error||result.data!==true)return response({ok:false,error:"Não autorizado"},403,allowed);
   isRunner=true;
 }else {
   const userSb=createClient(u,anon,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+bearer}}});
   const who=await userSb.auth.getUser(bearer);
   if(who.error||!who.data.user)return response({ok:false,error:"Sessão inválida"},401,allowed);
   ownerId=who.data.user.id;
   const payload=(()=>{try{return JSON.parse(atob(bearer.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))}catch{return {}}})();
   if(payload.aal!=="aal2")return response({ok:false,error:"Autenticação MFA necessária"},403,allowed);
   if(!validId.test(id))return response({ok:false,error:"Selecione um processo"},400,allowed);
   const caseR=await userSb.from("amcf_cases").select("id").eq("id",id).maybeSingle();
   if(caseR.error||!caseR.data)return response({ok:false,error:"Processo não autorizado"},403,allowed);
 }
 const yesterday=new Date();
 const dateEnd=yesterday.toISOString().slice(0,10);
 const dateStart=new Date(yesterday.getTime()-35*24*3600000).toISOString().slice(0,10);
 const rows:CaseRef[]=[];
 if(isRunner){
  const read=await svc.from("amcf_cases").select("id,cnj_number,responsible_id,archived_at,case_secret")
    .is("archived_at",null).eq("case_secret",false).not("cnj_number","is",null).limit(200);
  if(read.error)return response({ok:false,error:"Falha na seleção de processos"},500,allowed);
  const cases=read.data||[];
  const prior=await svc.from("amcf_djen_syncs").select("case_id,checked_at").order("checked_at",{ascending:false}).limit(1000);
  const last=new Map<string,string>();
  for(const item of prior.data||[])if(!last.has(item.case_id))last.set(item.case_id,item.checked_at);
  rows.push(...cases.filter((c)=>/^\d{20}$/.test(String(c.cnj_number||"").replace(/\D/g,"")))
    .sort((a,b)=>(last.get(a.id)||"").localeCompare(last.get(b.id)||"")).slice(0,4));
 }else {
  const chosen=await svc.from("amcf_cases").select("id,cnj_number,responsible_id,archived_at,case_secret").eq("id",id).maybeSingle();
  if(chosen.error||!chosen.data||chosen.data.archived_at||chosen.data.case_secret)return response({ok:false,error:"Processo não disponível para consulta pública"},403,allowed);
  if(!/^\d{20}$/.test(String(chosen.data.cnj_number||"").replace(/\D/g,"")))return response({ok:false,error:"Número CNJ necessário"},422,allowed);
  const last=await svc.from("amcf_djen_syncs").select("checked_at").eq("case_id",id).order("checked_at",{ascending:false}).limit(1);
  if(last.data?.[0]&&Date.now()-Date.parse(last.data[0].checked_at)<15*60_000)return response({ok:false,error:"Consulta recente: aguarde 15 minutos para atualizar"},429,allowed);
  rows.push(chosen.data);
 }
 let added=0,failed=0,found=0,scanned=0;
 for(const c of rows){
  const digits=c.cnj_number.replace(/\D/g,"");
  const params=new URLSearchParams({numeroProcesso:digits,
    dataDisponibilizacaoInicio:dateStart,dataDisponibilizacaoFim:dateEnd,
    pagina:"1",itensPorPagina:"50"});
  let note="",status:"ok"|"failure"|"no_results"="ok", inserted=0,itemsFound=0;
  try{
   scanned++;
   const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),8500);
   let res:Response;
   try{res=await fetch("https://comunicaapi.pje.jus.br/api/v1/comunicacao?"+params.toString(),
     {headers:{Accept:"application/json"},signal:ctl.signal});}
   finally{clearTimeout(timeout)}
   if(!res.ok){status="failure";note="DJEN indisponível HTTP "+res.status;failed++;continue}
   const raw=await res.json();
   const entries=(Array.isArray(raw)?raw:Array.isArray(raw?.items)?raw.items:[]) as Record<string,unknown>[];
   itemsFound=entries.length;found+=itemsFound;
   for(const e of entries){
     if(String(e.numeroProcesso||e.numeroprocessosemmascara||e.numeroprocessocommascara||"").replace(/\D/g,"")!==digits)continue;
     const digest=fmtText(e.hash||e.id||"",128);
     if(digest.length<8)continue;
     const exists=await svc.from("amcf_djen_publications").select("id").eq("case_id",c.id).eq("external_hash",digest).maybeSingle();
     if(exists.data||exists.error)continue;
     const official="https://comunica.pje.jus.br/";
     const ins=await svc.from("amcf_djen_publications").insert({
       case_id:c.id,external_hash:digest,
       available_on:dateOnly(e.dataDisponibilizacao||e.datadisponibilizacao),
       published_on:dateOnly(e.dataPublicacao||e.datapublicacao),
       tribunal:fmtText(e.siglaTribunal||e.siglatribunal,30),
       communication_type:fmtText(e.tipoComunicacao||e.tipocomunicacao,140),
       summary:fmtText(e.texto||e.textoComunicacao||e.nomeOrgao||"Publicação encontrada no DJEN",1800),
       official_url:official
     }).select("id").maybeSingle();
     if(ins.error||!ins.data)continue;
     inserted++;added++;
     const members=await svc.from("amcf_case_assignments").select("member_id").eq("case_id",c.id);
     const recipients=[...new Set([c.responsible_id,...(members.data||[]).map(m=>m.member_id)].filter(Boolean))];
     if(recipients.length){
       const active=await svc.from("amcf_members").select("id").in("id",recipients).eq("status","active");
       for(const m of active.data||[])await svc.from("amcf_notifications").insert({
        member_id:m.id,case_id:c.id,kind:"movimentacao",resource:"publicacao_djen",resource_id:ins.data.id,
        title:"Nova publicação no DJEN — confira o processo",
        body:"Publicação no DJEN identificada. Disponibilização: "+fmtText(e.dataDisponibilizacao||"não informada",30)+". Leia no portal oficial antes de contar qualquer prazo."
       });
     }
   }
   if(!entries.length)status="no_results";
  }catch(err){status="failure";failed++;note="Falha ao consultar fonte oficial";console.error("DJEN",String(err).slice(0,110))}
  finally{
   await svc.from("amcf_djen_syncs").insert({case_id:c.id,status,found:itemsFound,inserted,note:note.slice(0,300)});
  }
 }
 return response({ok:true,scanned,found,added,failed,dateRange:{start:dateStart,end:dateEnd},
   warning:"DJEN contém publicações públicas; nenhuma data de prazo é calculada, e deve haver conferência judicial."},200,allowed);
});