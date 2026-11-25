import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, RefreshCw, BookOpen, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { dateLabel } from '@/lib/format';
import { Empty, Section } from '@/features/pericial/ui';
export default function DjenTab({caseId}:{caseId:string}){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const publications=useQuery({queryKey:['amcf-djen',caseId],queryFn:async()=>{
  const r=await supabase.from('amcf_djen_publications')
    .select('id,available_on,published_on,tribunal,communication_type,summary,official_url,imported_at')
    .eq('case_id',caseId).order('imported_at',{ascending:false}).limit(100);
  if(r.error)throw r.error;return r.data;
 }});
 const syncs=useQuery({queryKey:['amcf-djen-syncs',caseId],queryFn:async()=>{
  const r=await supabase.from('amcf_djen_syncs')
    .select('checked_at,status,found,inserted,note').eq('case_id',caseId).order('checked_at',{ascending:false}).limit(1);
  if(r.error)throw r.error;return r.data;
 }});
 const sync=async()=>{
  setBusy(true);setMessage('');
  try{
   const r=await supabase.functions.invoke('amcf-djen-monitor',{body:{caseId}});
   if(r.error||r.data?.ok!==true)throw new Error(r.data?.error||'Não foi possível consultar o Diário da Justiça Eletrônico Nacional.');
   setMessage('Consulta concluída. Publicações encontradas: '+r.data.found+'. Novas: '+r.data.added+'. A fonte pode sofrer atrasos.');
   await Promise.all([publications.refetch(),syncs.refetch()]);
  }catch(e){setMessage(e instanceof Error?e.message:'Falha na consulta.');}
  finally{setBusy(false);}
 };
 return <div className="space-y-5">
  <Section title="Diário da Justiça Eletrônico Nacional — DJEN" description="Consulta oficial por número CNJ, com verificação de duplicidades e registro das publicações que forem encontradas.">
   <div className="notice mb-4"><ShieldAlert size={18} className="shrink-0"/><p>O DJEN não substitui a consulta ao tribunal. A data de disponibilização NÃO deve ser interpretada automaticamente como início ou fim de prazo. Nenhuma ciência ou manifestação judicial é realizada aqui.</p></div>
   <div className="flex flex-wrap gap-3 items-center">
    <Button type="button" variant="outline" disabled={busy} onClick={()=>void sync()}><RefreshCw size={16}/>{busy?'Consultando…':'Consultar DJEN agora'}</Button>
    <a className="inline-flex items-center gap-1 text-sm text-primary underline" href="https://comunica.pje.jus.br/" target="_blank" rel="noreferrer noopener">Portal oficial do CNJ <ExternalLink size={14}/></a>
   </div>
   {message&&<p className="mt-3 whitespace-pre-wrap rounded border p-3 text-xs" role="status">{message}</p>}
   {syncs.data?.[0]&&<p className="mt-3 text-xs text-muted-foreground">Última tentativa: {dateLabel(syncs.data[0].checked_at)} · {syncs.data[0].status} · {syncs.data[0].inserted} nova(s) · {syncs.data[0].note}</p>}
  </Section>
  <Section title="Publicações vinculadas a este processo">
   {publications.isPending&&<p className="text-xs text-muted-foreground">Carregando…</p>}
   {publications.isError&&<p role="alert" className="text-xs text-destructive">Não foi possível consultar as publicações registradas.</p>}
   {!publications.isPending&&!publications.isError&&!publications.data?.length&&<Empty title="Nenhuma publicação capturada" description="Caso não haja registros, consulte o portal do CNJ e confira as informações processuais."/>}
   <div className="space-y-3">{publications.data?.map(p=><article key={p.id} className="rounded-md border p-4">
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><BookOpen size={15}/><span>{p.tribunal||'Tribunal não informado'}</span><span>{p.communication_type||'Comunicação'}</span></div>
    <p className="mt-2 text-xs">Disponibilização: {dateLabel(p.available_on)} · Publicação: {dateLabel(p.published_on)}</p>
    <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{p.summary||'Sem resumo recebido da fonte'}</p>
    <a href={p.official_url||'https://comunica.pje.jus.br/'} target="_blank" rel="noreferrer noopener" className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline">Conferir fonte oficial <ExternalLink size={13}/></a>
   </article>)}</div>
  </Section>
 </div>;
}