import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

// Acionado exclusivamente pelo pg_cron: bearer de 256 bits guardado no Supabase Vault.
// Usa apenas números CNJ públicos, ignora processos sigilosos e NÃO calcula prazos.
const states = ["ac","al","ap","am","ba","ce","dft","es","go","ma","mt","ms","mg","pa","pb","pr","pe","pi","rj","rn","rs","ro","rr","sc","se","sp","to"];
const json = (body: unknown, status=200) => new Response(JSON.stringify(body), {
  status, headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}
});
function aliasOf(cnj: string): string|null {
  const v=cnj.replace(/\D/g,"");
  if(!/^\d{20}$/.test(v))return null;
  const j=v[13],tr=Number(v.slice(14,16));
  if(j==="8" && tr>=1 && tr<=27) return "tj"+states[tr-1];
  if(j==="4" && tr>=1 && tr<=6) return "trf"+tr;
  if(j==="5" && tr>=1 && tr<=24) return "trt"+tr;
  if(j==="3" && tr===0)return "stj";
  return null;
}
interface CaseRow {id:string; cnj_number:string; responsible_id:string; updated_at:string}
interface Move {codigo?:number;nome?:string;dataHora?:string;complementosTabelados?:{nome?:string}[]}
Deno.serve(async(req:Request)=>{
  if(req.method!=="POST")return json({ok:false,error:"Método não permitido."},405);
  if((Number(req.headers.get("Content-Length")||0))>1024)return json({ok:false},413);
  const token=/^Bearer ([0-9a-f]{64})$/.exec(req.headers.get("Authorization")||"")?.[1];
  if(!token)return json({ok:false,error:"Não autorizado."},401);
  const url=Deno.env.get("SUPABASE_URL"),secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!secret)return json({ok:false,error:"Configuração do servidor indisponível."},503);
  const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=await db.rpc("amcf_verify_monitor_token",{p_token:token});
  if(auth.error||auth.data!==true)return json({ok:false,error:"Não autorizado."},403);
  const keyResult=await db.rpc("amcf_datajud_key");
  const apiKey=typeof keyResult.data==="string"?keyResult.data.trim():"";
  if(apiKey.length<20)return json({ok:true,configured:false,scanned:0,note:"API DataJud não configurada; nenhuma consulta externa executada."});
  const {data:rawCases,error:casesError}=await db.from("amcf_cases")
    .select("id,cnj_number,responsible_id,updated_at")
    .is("archived_at",null).eq("case_secret",false).not("cnj_number","is",null)
    .order("updated_at",{ascending:false}).limit(500);
  if(casesError)return json({ok:false,error:"Não foi possível consultar os processos do AMCF."},500);
  const eligible=((rawCases||[]) as CaseRow[]).filter(c=>aliasOf(c.cnj_number));
  const {data:lastSyncs}=await db.from("amcf_movement_syncs")
    .select("case_id,started_at").eq("source_kind","datajud")
    .order("started_at",{ascending:false}).limit(1200);
  const last=new Map<string,string>();
  for(const x of lastSyncs||[])if(!last.has(x.case_id))last.set(x.case_id,x.started_at);
  const selected=eligible.sort((a,b)=>(last.get(a.id)||"").localeCompare(last.get(b.id)||"")).slice(0,4);
  let scanned=0,added=0,duplicates=0,failed=0;
  for(const c of selected) {
    const alias=aliasOf(c.cnj_number);
    if(!alias)continue;
    scanned++;
    const started=new Date().toISOString();
    const coverage=["DataJud: base pública, sujeita a atrasos e indisponibilidade; não substitui consulta ao tribunal."];
    const log=async(fields:Record<string,unknown>)=>{
      const result=await db.from("amcf_movement_syncs").insert({
        case_id:c.id,source_kind:"datajud",created_by:c.responsible_id,
        started_at:started,finished_at:new Date().toISOString(),coverage,...fields
      });
      if(result.error)console.error("Falha no log do monitor",result.error.code);
    };
    try {
      const controller=new AbortController();
      const t=setTimeout(()=>controller.abort(),8000);
      let response:Response;
      try {
        response=await fetch("https://api-publica.datajud.cnj.jus.br/api_publica_"+alias+"/_search",{
          method:"POST",
          headers:{"Content-Type":"application/json","Authorization":"APIKey "+apiKey},
          body:JSON.stringify({size:5,query:{match:{numeroProcesso:c.cnj_number.replace(/\D/g,"")}}}),
          signal:controller.signal
        });
      } finally { clearTimeout(t); }
      if(!response.ok) {
        failed++;await log({status:"falha",error:"HTTP "+response.status,items_found:0,items_new:0,items_duplicated:0,detail:{tribunal:alias}});
        continue;
      }
      const body=await response.json();
      const src=((body?.hits?.hits||[])[0]?._source||{}) as {movimentos?:Move[];dataUltimaAtualizacao?:string};
      const moves=(src.movimentos||[]).filter(m=>typeof m.nome==="string" && m.nome.length>=2 && typeof m.dataHora==="string" && /^\d{4}-\d{2}-\d{2}/.test(m.dataHora)).slice(0,500);
      const refOf=(m:Move)=>"datajud:"+(m.codigo??"")+":"+(m.dataHora||"");
      const old=await db.from("amcf_movements").select("external_ref").eq("case_id",c.id).like("external_ref","datajud:%").limit(2000);
      if(old.error)throw new Error("Falha na consulta de duplicidades");
      const known=new Set((old.data||[]).map(x=>x.external_ref));
      const fresh=moves.filter(m=>!known.has(refOf(m)));
      let inserted=0;
      for(let idx=0;idx<fresh.length;idx+=50){
        const rows=fresh.slice(idx,idx+50).map(m=>({
          case_id:c.id,created_by:c.responsible_id,
          occurred_on:String(m.dataHora).slice(0,10),occurred_at:m.dataHora,
          title:String(m.nome).slice(0,300),detail:(m.complementosTabelados||[]).map(x=>x.nome).filter(Boolean).join("; ").slice(0,2000),
          external_ref:refOf(m),source:"api"
        }));
        const ins=await db.from("amcf_movements").insert(rows).select("id");
        if(!ins.error){inserted+=rows.length;continue;}
        for(const one of rows){const r=await db.from("amcf_movements").insert(one).select("id");if(!r.error)inserted++;}
      }
      added+=inserted;
      duplicates+=moves.length-inserted;
      await log({status:"concluida",items_found:moves.length,items_new:inserted,items_duplicated:moves.length-inserted,detail:{tribunal:alias,ultima_atualizacao_fonte:src.dataUltimaAtualizacao||null}});
    } catch(e) {
      failed++;console.error("Falha ao consultar uma origem do DataJud",String(e).slice(0,120));
      await log({status:"falha",error:"Consulta não concluída",items_found:0,items_new:0,items_duplicated:0,detail:{tribunal:alias}});
    }
  }
  return json({ok:true,configured:true,scanned,added,duplicates,failed,
    note:"Movimentações recebidas como informação pública; datas e providências dependem de conferência humana."});
});