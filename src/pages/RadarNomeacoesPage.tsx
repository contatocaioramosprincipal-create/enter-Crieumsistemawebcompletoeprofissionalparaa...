import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Radar, RefreshCw, Plus, Eye, CheckCircle2, XCircle, FilePlus2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel, errorMessage } from '@/lib/format';

const statuses:Record<string,string>={
 pendente:'Pendente de conferência',em_analise:'Em análise',
 confirmada:'Confirmada pela equipe',descartada:'Menção descartada',vinculada:'Vinculada ao CRM'
};
const digits=(s:string)=>String(s||'').replace(/\D/g,'');
const fmt=(s:string)=>{
 const d=digits(s);
 return d.length===20?d.replace(/^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/,'$1-$2.$3.$4.$5.$6'):s;
};
const trusted=(url:string)=>url.startsWith('https://comunicaapi.pje.jus.br/api/v1/comunicacao/');
export default function RadarNomeacoesPage(){
 const {access}=useAuth(),manager=!!access?.capabilities.manage,memberId=access?.member?.id||'';
 const [newTerm,setNewTerm]=useState(''),[filter,setFilter]=useState('pendente');
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 const terms=useQuery({queryKey:['appointment-search-terms'],queryFn:async()=>{
  const r=await supabase.from('amcf_appointment_search_terms').select('*').order('created_at');
  if(r.error)throw r.error;return r.data;
 }});
 const leads=useQuery({queryKey:['appointment-leads'],queryFn:async()=>{
  const r=await supabase.from('amcf_appointment_leads').select('*').order('created_at',{ascending:false}).limit(250);
  if(r.error)throw r.error;return r.data;
 },refetchInterval:90000});
 const runs=useQuery({queryKey:['appointment-search-runs'],queryFn:async()=>{
  const r=await supabase.from('amcf_appointment_search_runs').select('*').order('started_at',{ascending:false}).limit(12);
  if(r.error)throw r.error;return r.data;
 }});
 const cases=useQuery({queryKey:['appointment-existing-cases'],queryFn:async()=>{
  const r=await supabase.from('amcf_cases').select('id,cnj_number,title').not('cnj_number','is',null).is('archived_at',null).limit(500);
  if(r.error)throw r.error;return r.data;
 }});
 const existing=(cnj:string|null)=>cases.data?.find(c=>c.cnj_number&&digits(c.cnj_number)===digits(cnj||''));
 const refresh=async()=>{await Promise.all([terms.refetch(),leads.refetch(),runs.refetch(),cases.refetch()]);};
 const scan=async()=>{
  setBusy(true);setFeedback('');
  try{
   const r=await supabase.functions.invoke('amcf-appointment-discovery',{body:{}});
   if(r.error||r.data?.ok!==true)throw new Error(r.data?.error||'Falha na consulta ao DJEN.');
   setFeedback('Consulta concluída. Menções: '+r.data.found+'. Novas: '+r.data.newLeads+'. Nenhuma menção comprova nomeação.');
   await refresh();
  }catch(e){setFeedback(e instanceof Error?e.message:'Consulta indisponível.');}
  finally{setBusy(false);}
 };
 const add=async(e:React.FormEvent)=>{
  e.preventDefault();if(!manager||!memberId)return;
  const phrase=newTerm.trim().replace(/\s+/g,' ');
  if(phrase.length<7||phrase.length>120||phrase.split(' ').length<2){setFeedback('Informe nome e sobrenome (7 a 120 caracteres).');return;}
  setBusy(true);setFeedback('');
  try{
   const r=await supabase.from('amcf_appointment_search_terms').insert({phrase,created_by:memberId}).select('id');
   if(r.error||!r.data?.length)throw r.error||new Error('Não foi possível cadastrar a grafia.');
   setNewTerm('');setFeedback('Grafia cadastrada para buscas futuras.');
   await terms.refetch();
  }catch(e){setFeedback(errorMessage(e));}finally{setBusy(false);}
 };
 const toggle=async(id:string,active:boolean)=>{
  if(!manager)return;setBusy(true);
  try{
   const r=await supabase.from('amcf_appointment_search_terms').update({active:!active}).eq('id',id).select('id');
   if(r.error||!r.data?.length)throw r.error||new Error('Não autorizado.');
   await terms.refetch();
  }catch(e){setFeedback(errorMessage(e));}finally{setBusy(false);}
 };
 const review=async(id:string,next:string,linkCase?:string)=>{
  if(!memberId)return;setBusy(true);setFeedback('');
  try{
   const updates={status:next,reviewed_by:memberId,reviewed_at:new Date().toISOString(),
    ...(linkCase?{linked_case_id:linkCase}:{})};
   const r=await supabase.from('amcf_appointment_leads').update(updates).eq('id',id).select('id');
   if(r.error||!r.data?.length)throw r.error||new Error('Não foi possível registrar a conferência.');
   setFeedback(next==='vinculada'?'Processo existente vinculado.':'Conferência registrada.');
   await leads.refetch();
  }catch(e){setFeedback(errorMessage(e));}finally{setBusy(false);}
 };
 const visible=(leads.data||[]).filter(c=>!filter||c.status===filter);
 const pending=(leads.data||[]).filter(c=>c.status==='pendente').length;
 const likely=(leads.data||[]).filter(c=>c.match_kind==='possivel_nomeacao'&&c.status!=='descartada').length;
 return <div className="space-y-6">
  <PageHeader eyebrow="AMCF / INTELIGÊNCIA PROCESSUAL" title="Radar de Nomeações"
    description="Busque possíveis nomeações ainda não cadastradas por meio de menções ao nome do perito no DJEN.">
    <Button variant="outline" disabled={busy||terms.isPending||!terms.data?.some(t=>t.active)} onClick={()=>void scan()}><RefreshCw size={16}/>{busy?'Consultando…':'Pesquisar DJEN agora'}</Button>
  </PageHeader>
  <div className="notice"><Radar size={18} className="shrink-0"/><p>É uma busca de <strong>menções públicas</strong>, não uma certidão de nomeação. Confira o despacho no tribunal antes de confirmar. Processos sigilosos e nomeações que não aparecem no DJEN podem ficar de fora. O sistema não cria casos ou calcula prazos automaticamente.</p></div>
  <div className="grid gap-3 sm:grid-cols-3">
   {[['Pendentes',pending],['Possíveis nomeações',likely],['Total encontrado',leads.data?.length??'—']].map(([name,value])=><div key={name} className="data-panel p-5"><p className="text-xs text-muted-foreground">{name}</p><strong className="mt-2 block text-2xl">{value}</strong></div>)}
  </div>
  <section className="data-panel p-6">
   <h2 className="text-sm font-semibold">Nomes monitorados</h2>
   <p className="mt-1 text-xs text-muted-foreground">Verificação automática a cada 12 horas. O médico pode acrescentar grafias alternativas do próprio nome.</p>
   {terms.isError&&<p role="alert" className="text-xs text-destructive">Erro ao carregar os nomes.</p>}
   <div className="mt-4 flex flex-wrap gap-2">{terms.data?.map(t=><div key={t.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><span>{t.phrase}</span><span className="text-xs text-muted-foreground">{t.active?'Ativo':'Pausado'}</span>{manager&&<Button variant="outline" size="sm" disabled={busy} onClick={()=>void toggle(t.id,t.active)}>{t.active?'Pausar':'Ativar'}</Button>}</div>)}</div>
   {manager&&<form onSubmit={e=>void add(e)} className="mt-4 flex flex-wrap items-end gap-2">
    <div className="min-w-52 flex-1"><label className="field-label" htmlFor="new-term">Outra grafia do nome profissional</label><Input id="new-term" value={newTerm} onChange={e=>setNewTerm(e.target.value)} maxLength={120} disabled={busy} placeholder="Nome completo ou variação"/></div>
    <Button disabled={busy||newTerm.trim().length<7}><Plus size={16}/>Adicionar grafia</Button>
   </form>}
  </section>
  <section className="data-panel p-6">
   <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Menções localizadas</h2>
    <select className="native-select w-auto" aria-label="Filtrar menções" value={filter} onChange={e=>setFilter(e.target.value)}><option value="">Todas</option>{Object.entries(statuses).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></div>
   <QueryState loading={leads.isPending} error={leads.isError} empty={!leads.isPending&&!leads.isError&&!visible.length} title="Nenhuma menção nesta visualização" description="Ausência de resultados não significa ausência de nomeações. Confira nomes e fontes oficiais." onRetry={()=>void leads.refetch()}/>
   <div className="mt-4 space-y-3">{visible.map(c=>{
     const found=existing(c.cnj_number),link=trusted(c.source_url)?c.source_url:'https://comunica.pje.jus.br/';
     return <article key={c.id} className="rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">{c.cnj_number?fmt(c.cnj_number):'Sem CNJ'} · {c.tribunal||'Tribunal não informado'}</p><p className="mt-1 text-xs text-muted-foreground">{c.court_unit||'Órgão não informado'} · {dateLabel(c.available_on)} · {c.communication_type}</p></div><span className="status-pill status-neutral">{statuses[c.status]||c.status}</span></div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded bg-muted px-2 py-1">{c.match_kind==='possivel_nomeacao'?'Possível nomeação — conferir':'Outra menção'}</span><span className="rounded bg-muted px-2 py-1">Termo: {c.matched_term}</span>{found&&<span className="rounded bg-muted px-2 py-1">Já existe no CRM</span>}</div>
      <p className="mt-3 rounded-md bg-muted/40 p-3 text-sm leading-6">{c.excerpt?'“'+c.excerpt+'”':'Sem trecho disponível'}</p>
      <div className="mt-3 flex flex-wrap gap-3 items-center"><a className="inline-flex items-center gap-1 text-xs text-primary underline" href={link} target="_blank" rel="noopener noreferrer"><ExternalLink size={14}/>Conferir certidão oficial</a>{c.linked_case_id&&<Link className="text-xs text-primary underline" to={'/casos/'+c.linked_case_id}>Processo vinculado</Link>}{found&&!c.linked_case_id&&<Link className="text-xs text-primary underline" to={'/casos/'+found.id}>Caso já cadastrado</Link>}</div>
      {c.status!=='vinculada'&&<div className="mt-4 flex flex-wrap gap-2 border-t pt-3">
       {c.status!=='em_analise'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void review(c.id,'em_analise')}><Eye size={14}/>Em análise</Button>}
       {c.status!=='confirmada'&&<Button size="sm" variant="outline" disabled={busy} onClick={()=>void review(c.id,'confirmada')}><CheckCircle2 size={14}/>Confirmar após verificar</Button>}
       {found?<Button size="sm" disabled={busy} onClick={()=>void review(c.id,'vinculada',found.id)}><FilePlus2 size={14}/>Vincular ao caso</Button>
       :manager&&c.cnj_number&&c.status==='confirmada'&&<Button asChild size="sm"><Link to={'/casos?cnj='+encodeURIComponent(c.cnj_number)+'&nomeacao='+encodeURIComponent(c.id)}><FilePlus2 size={14}/>Cadastrar no CRM</Link></Button>}
       {c.status!=='descartada'&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>void review(c.id,'descartada')}><XCircle size={14}/>Descartar</Button>}
      </div>}
     </article>;
   })}</div>
  </section>
  <section className="data-panel p-6"><h2 className="text-sm font-semibold">Histórico de busca</h2>
   <div className="mt-3 space-y-2">{runs.data?.map(r=><div key={r.id} className="flex flex-wrap justify-between gap-3 rounded-md border p-3 text-xs"><span>{r.matched_term} · {dateLabel(r.started_at)}</span><span>{r.status} · {r.inserted} nova(s) / {r.found} menção(ões){r.error_note?' · '+r.error_note:''}</span></div>)}</div>
   {!runs.isPending&&!runs.data?.length&&<p className="mt-3 text-xs text-muted-foreground">Nenhuma consulta registrada ainda.</p>}
   {feedback&&<p role="status" className="mt-4 rounded-md border p-3 text-xs">{feedback}</p>}
   <p className="mt-3 text-xs text-muted-foreground">Fonte: DJEN/CNJ. Apenas processos públicos com menções identificáveis, respeitando limites da API. WhatsApp não é utilizado.</p>
  </section>
 </div>;
}
