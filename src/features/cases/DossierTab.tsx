import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, BookOpen, AlertTriangle, ClipboardList, Clock3, Printer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { dateLabel } from '@/lib/format';
import { caseReadiness } from '@/features/pericial/api';
import { Empty, Section } from '@/features/pericial/ui';

interface Header { id:string; reference:string; cnj_number:string|null; title:string; claimant:string|null; defendant:string|null; court_unit:string|null; service:string }
const excerpt = (input:string,query:string) => {
  const at = input.toLocaleLowerCase('pt-BR').indexOf(query.toLocaleLowerCase('pt-BR'));
  if(at<0)return input.slice(0,300);
  return (at>80?'…':'')+input.slice(Math.max(0,at-80),Math.min(input.length,at+query.length+180))+(at+query.length+180<input.length?'…':'');
};
export default function DossierTab({item}:{item:Header}) {
  const id=item.id;
  const [input,setInput]=useState('');
  const [term,setTerm]=useState('');
  const docs=useQuery({queryKey:['dossier-docs',id],queryFn:async()=>{
    const r=await supabase.from('amcf_documents').select('id,title,category,text_status,document_date,text_pages').eq('case_id',id).order('document_date',{ascending:false}).limit(300);
    if(r.error)throw r.error;return r.data;
  }});
  const movs=useQuery({queryKey:['dossier-moves',id],queryFn:async()=>{
    const r=await supabase.from('amcf_movements').select('id,occurred_on,title,classification,review_state,source').eq('case_id',id).order('occurred_on',{ascending:false}).limit(100);
    if(r.error)throw r.error;return r.data;
  }});
  const ques=useQuery({queryKey:['dossier-questions',id],queryFn:async()=>{
    const r=await supabase.from('amcf_case_questions').select('id,number,text,status').eq('case_id',id).order('number').limit(250);
    if(r.error)throw r.error;return r.data;
  }});
  const reports=useQuery({queryKey:['dossier-reports',id],queryFn:async()=>{
    const r=await supabase.from('amcf_reports').select('id,title,status,version,created_at').eq('case_id',id).order('created_at',{ascending:false}).limit(40);
    if(r.error)throw r.error;return r.data;
  }});
  const readiness=useQuery({queryKey:['dossier-readiness',id],queryFn:()=>caseReadiness(id)});
  const pages=useQuery({queryKey:['dossier-search',id,term,docs.data?.length],enabled:term.length>=3&&!!docs.data?.length,queryFn:async()=>{
    const ids=(docs.data||[]).map(d=>d.id);
    if(!ids.length)return [];
    const safe=term.replace(/[%_\\]/g,'').trim().slice(0,90);
    if(safe.length<3)return [];
    const r=await supabase.from('amcf_document_pages')
      .select('document_id,page_number,content').in('document_id',ids)
      .ilike('content','%'+safe+'%').order('page_number').limit(25);
    if(r.error)throw r.error;return r.data;
  }});
  const openQuestions=(ques.data||[]).filter(q=>q.status!=='respondida'&&q.status!=='concluida').length;
  const unreviewed=(movs.data||[]).filter(m=>m.review_state==='nova').length;
  const incompleteDocs=(docs.data||[]).filter(d=>d.text_status!=='extraido').length;
  const titleOf=(docId:string)=>docs.data?.find(d=>d.id===docId)?.title||'Documento';
  const warnings=[
    !item.cnj_number?'Número CNJ ainda não informado':null,
    !(docs.data?.length)?'Não há documento anexado':null,
    incompleteDocs>0?String(incompleteDocs)+' arquivo(s) sem extração integral confirmada':null,
    unreviewed>0?String(unreviewed)+' movimentação(ões) sem revisão':null,
    openQuestions>0?String(openQuestions)+' quesito(s) possivelmente pendentes de revisão':null
  ].filter(Boolean);
  return <div className="space-y-6">
    <div className="notice"><BookOpen size={18} className="shrink-0"/><p>Dossiê com dados existentes e referências documentais verificáveis. Não infere diagnóstico, nexo causal, incapacidade ou conclusões jurídicas. Resumos automáticos sem fonte não são apresentados como prova.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[['Documentos',docs.data?.length],['Movimentações',movs.data?.length],['Quesitos',ques.data?.length],['Minutas',reports.data?.length]].map(([label,count])=><div className="data-panel p-5" key={label}><p className="text-xs text-muted-foreground">{label}</p><strong className="mt-2 block text-2xl tabular-nums">{count??'—'}</strong></div>)}
    </div>
    <Section title="Identificação consolidada do processo" description="Informações registradas pela equipe, não dados gerados.">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        {[['Número processual',item.cnj_number||'Não informado'],['Assunto',item.title],['Autor',item.claimant||'Não informado'],['Réu',item.defendant||'Não informado'],['Vara',item.court_unit||'Não informada'],['Serviço',item.service]].map(([k,v])=><div key={k} className="rounded-md border px-4 py-3"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 font-medium">{v}</p></div>)}
      </div>
    </Section>
    <Section title="Pendências verificáveis" description="A lista indica registros incompletos; não calcula prazos judiciais.">
      {!warnings.length?<p className="text-sm text-muted-foreground">Nenhuma lacuna cadastral identificada nas verificações básicas.</p>:<div className="space-y-2">{warnings.map(w=><div key={w} className="flex gap-2 rounded-md border p-3 text-sm"><AlertTriangle size={16} className="shrink-0 text-warning"/>{w}</div>)}</div>}
      {readiness.data&&<p className="mt-3 text-xs text-muted-foreground">Prontidão técnica: {readiness.data.questions_pending} quesitos sem resposta revisada; {readiness.data.unsourced_items} itens analíticos sem fonte; {readiness.data.movements_unreviewed} movimentações por revisar.</p>}
    </Section>
    <Section title="Pesquisa em evidências por página" description="Encontra somente trechos realmente extraídos dos arquivos deste processo. Cada resultado informa documento e página de origem.">
      <form className="flex gap-2" onSubmit={e=>{e.preventDefault();setTerm(input.trim());}}><Input aria-label="Pesquisar no texto dos documentos" placeholder="Pesquise um termo nos autos…" value={input} onChange={e=>setInput(e.target.value)} minLength={3} maxLength={90}/><Button type="submit" disabled={input.trim().length<3}><Search/>Pesquisar</Button></form>
      {term.length>=3&&!docs.data?.length&&<p className="mt-3 text-xs text-muted-foreground">Ainda não há documentos para pesquisar.</p>}
      {pages.isPending&&term.length>=3&&<p className="mt-3 text-xs text-muted-foreground">Pesquisando páginas…</p>}
      {pages.isError&&<p role="alert" className="mt-3 text-xs text-destructive">Não foi possível pesquisar as páginas extraídas.</p>}
      {pages.data?.length===0&&term.length>=3&&<p className="mt-3 text-xs text-muted-foreground">Nenhuma ocorrência encontrada nas páginas extraídas. Isso não significa que o termo não apareça em arquivos não processados.</p>}
      <div className="mt-4 space-y-3">{pages.data?.map((p,i)=><article key={p.document_id+':'+p.page_number+':'+i} className="rounded-md border p-4"><div className="flex items-center gap-2 text-xs font-semibold"><FileText size={15}/>{titleOf(p.document_id)} · página {p.page_number}</div><p className="mt-3 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">{excerpt(p.content,term)}</p><Link className="mt-3 inline-block text-xs text-primary underline" to={'/documentos?caso='+id}>Abrir documentos do processo</Link></article>)}</div>
      <p className="mt-3 text-[11px] text-muted-foreground">A busca mostra até 25 trechos por consulta e exige revisão do arquivo original. Não compartilhe trechos sensíveis fora do ambiente autorizado.</p>
    </Section>
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title="Cronologia processual" description="Movimentações registradas e suas fontes.">
        {!movs.data?.length&&<Empty title="Sem movimentações" description="Registre ou sincronize o processo na aba Movimentações."/>}
        <ol className="space-y-2">{movs.data?.slice(0,30).map(m=><li key={m.id} className="rounded-md border p-3"><p className="text-xs text-muted-foreground">{dateLabel(m.occurred_on)} · Fonte: {m.source}</p><p className="mt-1 text-sm font-medium">{m.title}</p><p className="mt-1 text-xs text-muted-foreground">{m.review_state==='nova'?'Revisão pendente':'Revisão registrada'}</p></li>)}</ol>
      </Section>
      <Section title="Produção documental" description="Minutas e versões do processo. A aprovação técnica é exclusiva do responsável.">
        {!reports.data?.length&&<Empty title="Nenhum relatório preparado" description="Utilize a aba Laudos e petições para iniciar um documento."/>}
        <ol className="space-y-2">{reports.data?.map(r=><li key={r.id} className="rounded-md border p-3"><div className="flex items-center gap-2"><ClipboardList size={15}/><strong className="text-sm">{r.title}</strong></div><p className="mt-1 text-xs text-muted-foreground">Versão {r.version} · {r.status} · {dateLabel(r.created_at)}</p></li>)}</ol>
      </Section>
    </div>
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>window.print()}><Printer/>Imprimir resumo exibido</Button><Button asChild variant="outline"><Link to={'/documentos?caso='+id}><FileText/>Documentos</Link></Button><Button asChild variant="outline"><Link to={"/assistente-pericia?caso="+id}><Clock3/>Assistente pericial</Link></Button></div>
  </div>;
}
