import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/data-table/PageHeader';
import LookupInput from '@/features/registry/LookupInput';
import { errorMessage } from '@/lib/format';

const localTime=(iso:string)=>{
 const d=new Date(iso),pad=(n:number)=>String(n).padStart(2,'0');
 return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
};
type FormData={id:string;summary:string;starts:string;ends:string;caseId:string};
const blank:FormData={id:'',summary:'Compromisso pericial',starts:'',ends:'',caseId:''};
export default function AgendaGoogle(){
 const {access}=useAuth(),owner=access?.member?.id||'',cache=useQueryClient();
 const [form,setForm]=useState<FormData>(blank);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const conn=useQuery({queryKey:['amcf-google-calendar-connection',owner],enabled:!!owner,queryFn:async()=>{
  const r=await supabase.from('amcf_google_connections').select('google_email,last_calendar_sync_at').eq('owner_id',owner).maybeSingle();
  if(r.error)throw r.error;return r.data;
 }});
 const events=useQuery({queryKey:['amcf-google-calendar-events',owner],enabled:!!owner,queryFn:async()=>{
  const since=new Date(Date.now()-90*86400000).toISOString(),until=new Date(Date.now()+370*86400000).toISOString();
  const r=await supabase.from('amcf_google_calendar_events').select('*').eq('owner_id',owner)
   .is('deleted_at',null).gte('starts_at',since).lte('starts_at',until).order('starts_at').limit(150);
  if(r.error)throw r.error;return r.data;
 }});
 const save=async(e:React.FormEvent)=>{
  e.preventDefault();setMessage('');
  if(!owner||form.summary.trim().length<3||!form.starts||!form.ends||new Date(form.starts)>=new Date(form.ends)){
    setMessage('Informe título, início e término em ordem válida.');return;
  }
  setBusy(true);
  try{
   const record={summary:form.summary.trim().slice(0,180),starts_at:new Date(form.starts).toISOString(),
    ends_at:new Date(form.ends).toISOString(),case_id:form.caseId||null};
   const r=form.id
     ?await supabase.from('amcf_google_calendar_events').update(record).eq('owner_id',owner).eq('id',form.id).select('id')
     :await supabase.from('amcf_google_calendar_events').insert({...record,owner_id:owner}).select('id');
   if(r.error||!r.data?.length)throw r.error||new Error('Registro não autorizado');
   setForm(blank);setMessage('Compromisso salvo no AMCF. Use Sincronizar para atualizar o Google Calendar.');
   await cache.invalidateQueries({queryKey:['amcf-google-calendar-events',owner]});
  }catch(error){setMessage(errorMessage(error));}
  finally{setBusy(false);}
 };
 const remove=async(id:string)=>{
  if(!window.confirm('Remover este compromisso do AMCF e, após sincronizar, do Google Calendar?'))return;
  setBusy(true);
  try{
   const r=await supabase.from('amcf_google_calendar_events').update({deleted_at:new Date().toISOString()}).eq('owner_id',owner).eq('id',id).select('id');
   if(r.error||!r.data?.length)throw r.error||new Error('Operação não autorizada');
   await cache.invalidateQueries({queryKey:['amcf-google-calendar-events',owner]});
   setMessage('Remoção registrada. Sincronize para refletir no Google Calendar.');
  }catch(error){setMessage(errorMessage(error));}
  finally{setBusy(false);}
 };
 const sync=async()=>{
  setBusy(true);setMessage('');
  try{
   const r=await supabase.functions.invoke('amcf-google-calendar',{body:{}});
   if(r.error||!r.data?.ok)throw new Error(r.data?.error||'Falha na sincronização');
   const result=r.data.results?.[0];
   if(result?.error)throw new Error(result.error);
   setMessage('Sincronização concluída: '+(result?.pushed||0)+' enviados, '+(result?.pulled||0)+' atualizados pelo Google.');
   await Promise.all([events.refetch(),conn.refetch()]);
  }catch(error){setMessage(error instanceof Error?error.message:'Falha no Google Calendar');}
  finally{setBusy(false);}
 };
 return <div className="space-y-6">
  <PageHeader eyebrow="AMCF / GOOGLE CALENDAR" title="Agenda conectada" description="Compromissos do AMCF podem ser criados ou alterados no CRM e sincronizados nos dois sentidos com o Google. Prazos judiciais não são calculados automaticamente.">
   <Button asChild variant="outline"><Link to="/integracoes">Conexão Google</Link></Button>
  </PageHeader>
  {!conn.data&&<p className="notice">Nenhuma conta Google conectada. Cadastre e autorize a conta profissional em Integrações antes de sincronizar.</p>}
  {conn.data&&<p className="text-xs text-muted-foreground">Conta: {conn.data.google_email}. Apenas os eventos criados e vinculados ao AMCF são sincronizados; seus compromissos pessoais permanecem fora do CRM.</p>}
  <section className="data-panel p-6">
   <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Compromissos</h2><Button type="button" variant="outline" disabled={busy||!conn.data} onClick={()=>void sync()}><RefreshCw size={16}/>{busy?'Sincronizando…':'Sincronizar com Google'}</Button></div>
   {events.isPending&&<p className="mt-4 text-xs text-muted-foreground">Carregando…</p>}
   {events.isError&&<p role="alert" className="mt-4 text-xs text-destructive">Não foi possível consultar os compromissos.</p>}
   {!events.isPending&&!events.data?.length&&<p className="mt-4 text-xs text-muted-foreground">Nenhum compromisso neste período.</p>}
   <div className="mt-4 space-y-2">{events.data?.map(ev=><div key={ev.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
    <div><p className="flex items-center gap-2 text-sm font-medium"><CalendarDays size={15}/>{ev.summary}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(ev.starts_at).toLocaleString('pt-BR')} até {new Date(ev.ends_at).toLocaleString('pt-BR')} · {ev.google_event_id?'Vinculado ao Google':'Aguardando sincronização'}</p>{ev.case_id&&<Link className="mt-1 inline-block text-xs text-primary underline" to={'/casos/'+ev.case_id}>Abrir processo</Link>}</div>
    <div className="flex gap-1"><Button variant="outline" size="sm" disabled={busy} onClick={()=>setForm({id:ev.id,summary:ev.summary,starts:localTime(ev.starts_at),ends:localTime(ev.ends_at),caseId:ev.case_id||''})}>Editar</Button><Button variant="ghost" size="icon" aria-label="Remover compromisso" disabled={busy} onClick={()=>void remove(ev.id)}><Trash2 size={15}/></Button></div>
   </div>)}</div>
  </section>
  <section className="data-panel p-6"><h2 className="text-sm font-semibold">{form.id?'Editar compromisso':'Novo compromisso'}</h2>
   <p className="mt-2 text-xs text-muted-foreground">Use título administrativo genérico. Não envie diagnósticos, CPF ou relatórios médicos à agenda Google.</p>
   <form onSubmit={e=>void save(e)} className="mt-4 grid gap-4 sm:grid-cols-2">
    <div className="sm:col-span-2"><label className="field-label" htmlFor="google-event-summary">Título *</label><Input id="google-event-summary" required minLength={3} maxLength={180} value={form.summary} onChange={e=>setForm(v=>({...v,summary:e.target.value}))} disabled={busy}/></div>
    <div><label className="field-label" htmlFor="google-start">Início *</label><Input id="google-start" required type="datetime-local" value={form.starts} onChange={e=>setForm(v=>({...v,starts:e.target.value}))} disabled={busy}/></div>
    <div><label className="field-label" htmlFor="google-end">Término *</label><Input id="google-end" required type="datetime-local" value={form.ends} onChange={e=>setForm(v=>({...v,ends:e.target.value}))} disabled={busy}/></div>
    <div className="sm:col-span-2"><label className="field-label">Processo (opcional)</label><LookupInput table="amcf_cases" value={form.caseId} onChange={next=>setForm(v=>({...v,caseId:next}))} disabled={busy}/></div>
    <div className="sm:col-span-2 flex flex-wrap gap-2"><Button disabled={busy}><Save size={16}/>{form.id?'Salvar alterações':'Criar compromisso'}</Button>{form.id&&<Button type="button" variant="outline" onClick={()=>setForm(blank)}>Cancelar edição</Button>}</div>
   </form>
   {message&&<p role="status" className="mt-4 rounded-md border p-3 text-xs">{message}</p>}
  </section>
 </div>;
}