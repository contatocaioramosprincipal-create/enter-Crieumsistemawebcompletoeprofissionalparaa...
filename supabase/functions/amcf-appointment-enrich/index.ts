import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
// Enriquecimento pontual: nunca pesquisa DataJud por nome ou CPF.
// Somente metadados públicos dos CNJs encontrados no DJEN e ainda não descartados.
const origins = new Set(["https://sistema.dradilsoncouto.com.br","https://amcf-dr-adilson-original.pages.dev"]);
const json=(value:unknown,status=200,origin="")=>new Response(JSON.stringify(value),{status,headers:{
 "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Vary":"Origin",
 ...(origin?{"Access-Control-Allow-Origin":origin}:{})
}});
const states=["ac","al","ap","am","ba","ce","dft","es","go","ma","mt","ms","mg","pa","pb","pr","pe","pi","rj","rn","rs","ro","rr","sc","se","sp","to"];
const validUuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(v:unknown,max:number)=>String(v??"").replace(/[\u0000-\u001F<>]/g," ").trim().slice(0,max);
function tribunalAlias(cnj:string):string|null{
 const n=String(cnj||"").replace(/\D/g,"");
 if(n.length!==20)return null;
 const j=n[13],tr=Number(n.slice(14,16));
 if(j==="8"&&tr>=1&&tr<=27)return "tj"+states[tr-1];
 if(j==="5"&&tr>=1&&tr<=24)return "trt"+tr;
 if(j==="4"&&tr>=1&&tr<=6)return "trf"+tr;
 if(j==="6"&&tr>=1&&tr<=27)return "tre-"+states[tr-1];
 if(j==="7"&&[13,21,26].includes(tr))return "tjm"+({13:"mg",21:"rs",26:"sp"} as Record<number,string>)[tr];
 if(j==="3")return "stj";
 if(j==="5"&&tr===0)return "tst";
 if(j==="6"&&tr===0)return "tse";
 if(j==="7"&&tr===0)return "stm";
 return null;
}
type Lead={id:string;cnj_number:string;datajud_status:string;datajud_checked_at:string|null};
const dateOnly=(x:unknown)=> /^\d{4}-\d{2}-\d{2}/.exec(String(x||""))?.[0]||null;
const compact=(x:unknown,max:number)=>Array.isArray(x)?x.slice(0,max):[];
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin")||"",allowed=origins.has(origin)?origin:"";
 if(origin&&!allowed)return json({ok:false,error:"Origem não permitida"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"Access-Control-Allow-Origin":allowed,
 "Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Authorization, apikey, Content-Type, x-client-info","Vary":"Origin"}});
 if(req.method!=="POST")return json({ok:false,error:"Use POST"},405,allowed);
 const url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
   anon=Deno.env.get("SUPABASE_ANON_KEY");
 if(!url||!service||!anon)return json({ok:false,error:"Configuração do servidor indisponível"},503,allowed);
 const auth=/^Bearer (\S+)$/.exec(req.headers.get("Authorization")||"")?.[1]||"";
 if(!auth)return json({ok:false,error:"Autenticação obrigatória"},401,allowed);
 const db=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const runner=/^[0-9a-f]{64}$/.test(auth);
 let leadId="";
 if(runner){
   const verified=await db.rpc("amcf_verify_monitor_token",{p_token:auth});
   if(verified.error||verified.data!==true)return json({ok:false,error:"Não autorizado"},403,allowed);
 }else{
   const userDb=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false},
    global:{headers:{Authorization:"Bearer "+auth}}});
   const who=await userDb.auth.getUser(auth);
   if(who.error||!who.data.user)return json({ok:false,error:"Sessão inválida"},401,allowed);
   const claims=(()=>{try{return JSON.parse(atob(auth.split(".")[1].replace(/-/g,"+").replace(/_/g,"/")))}catch{return {}}})();
   if(claims.aal!=="aal2")return json({ok:false,error:"MFA obrigatório"},403,allowed);
   const member=await userDb.from("amcf_members").select("role,status").eq("id",who.data.user.id).maybeSingle();
   if(member.error||member.data?.status!=="active"||!["admin","doctor","assistant"].includes(member.data.role))
     return json({ok:false,error:"Usuário não autorizado"},403,allowed);
   let body:Record<string,unknown>={};try{body=await req.json() as Record<string,unknown>}catch{}
   leadId=typeof body.leadId==="string"?body.leadId:"";
   if(!validUuid.test(leadId))return json({ok:false,error:"Selecione uma ocorrência para consultar"},422,allowed);
   const visible=await userDb.from("amcf_appointment_leads").select("id").eq("id",leadId).maybeSingle();
   if(visible.error||!visible.data)return json({ok:false,error:"Ocorrência não autorizada"},403,allowed);
 }
 const apiKey=await db.rpc("amcf_datajud_key");
 if(apiKey.error||typeof apiKey.data!=="string"||apiKey.data.length<20)
   return json({ok:false,configured:false,error:"Chave pública do DataJud indisponível"},503,allowed);
 const leads=await db.from("amcf_appointment_leads")
  .select("id,cnj_number,datajud_status,datajud_checked_at").not("cnj_number","is",null)
  .neq("status","descartada")
  .in("datajud_status",["pendente","nao_localizado","indisponivel","localizado"])
  .order("datajud_checked_at",{ascending:true,nullsFirst:true}).limit(100);
 if(leads.error)return json({ok:false,error:"Falha ao consultar ocorrências"},500,allowed);
 const pool=((leads.data||[]) as Lead[])
  .filter(x=>!leadId||x.id===leadId)
  .filter(x=>!x.datajud_checked_at||(Date.now()-Date.parse(x.datajud_checked_at)) > (
    x.datajud_status==="localizado"?7*86400000:x.datajud_status==="nao_localizado"?2*86400000:24*3600000))
  .slice(0,runner?3:1);
 let checked=0,found=0,notFound=0,unavailable=0,unsupported=0;
 for(const row of pool){
   const alias=tribunalAlias(row.cnj_number),at=new Date().toISOString();
   if(!alias){
     await db.from("amcf_appointment_leads").update({datajud_status:"nao_suportado",datajud_checked_at:at}).eq("id",row.id);
     unsupported++;continue;
   }
   checked++;
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),8000);
   try{
     const n=row.cnj_number.replace(/\D/g,"");
     const response=await fetch("https://api-publica.datajud.cnj.jus.br/api_publica_"+alias+"/_search",{
       method:"POST",headers:{"Content-Type":"application/json","Authorization":"APIKey "+apiKey.data},
       body:JSON.stringify({size:2,query:{term:{numeroProcesso:n}},_source:[
        "numeroProcesso","tribunal","classe","assuntos","grau","orgaoJulgador",
        "dataAjuizamento","dataHoraUltimaAtualizacao","movimentos"
       ]}),signal:ctl.signal
     });
     if(!response.ok){unavailable++;await db.from("amcf_appointment_leads").update({
       datajud_status:"indisponivel",datajud_checked_at:at,datajud_tribunal_alias:alias
     }).eq("id",row.id);continue;}
     const payload=await response.json();
     const hit=(Array.isArray(payload?.hits?.hits)?payload.hits.hits:[]).find(
       (x:{_source?:{numeroProcesso?:string}})=>String(x._source?.numeroProcesso||"").replace(/\D/g,"")===n);
     if(!hit){
       notFound++;await db.from("amcf_appointment_leads").update({
         datajud_status:"nao_localizado",datajud_checked_at:at,datajud_tribunal_alias:alias,datajud_summary:{}
       }).eq("id",row.id);continue;
     }
     const s=hit._source||{};
     const subjects=compact(s.assuntos,8).map((v:any)=>({
       codigo:clean(v?.codigo,15),nome:clean(v?.nome,140)
     }));
     const movementList=compact(s.movimentos,70).filter((x:any)=>typeof x?.dataHora==="string")
       .sort((a:any,b:any)=>String(b.dataHora).localeCompare(String(a.dataHora))).slice(0,5)
       .map((m:any)=>({data:dateOnly(m.dataHora),nome:clean(m.nome,170)}));
     const summary={
       tribunal:clean(s.tribunal||alias,35),
       classe:typeof s.classe==="object"?{codigo:clean(s.classe?.codigo,16),nome:clean(s.classe?.nome,140)}:
           {codigo:clean(s.classe,16),nome:""},
       assuntos:subjects,grau:clean(s.grau,18),
       orgaoJulgador:clean(s.orgaoJulgador?.nome,180),
       dataAjuizamento:dateOnly(s.dataAjuizamento),
       dataAtualizacao:dateOnly(s.dataHoraUltimaAtualizacao),movimentos:movementList,
       source:"DataJud público do CNJ",sourceAlias:alias
     };
     const put=await db.from("amcf_appointment_leads").update({
       datajud_status:"localizado",datajud_checked_at:at,datajud_tribunal_alias:alias,
       datajud_summary:summary
     }).eq("id",row.id);
     if(put.error){unavailable++;console.error("AMCF DataJud write",put.error.code);continue}
     found++;
   }catch(err){
     unavailable++;console.error("AMCF DataJud unavailable",String(err).slice(0,110));
     await db.from("amcf_appointment_leads").update({
       datajud_status:"indisponivel",datajud_checked_at:at,datajud_tribunal_alias:alias
     }).eq("id",row.id);
   }finally{clearTimeout(timer)}
 }
 return json({ok:true,checked,found,notFound,unavailable,unsupported,
   note:"Somente metadados públicos consultados por número CNJ. Nome/CPF não são parâmetros da API DataJud."},200,allowed);
});