import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { currency, dateLabel } from '@/lib/format';
import { Empty, Section } from '@/features/pericial/ui';
export default function CaseProposalsTab({caseId}:{caseId:string}) {
 const query=useQuery({queryKey:['case-proposals',caseId],queryFn:async()=>{
  const r=await supabase.from('amcf_proposals').select('id,title,amount_cents,status,created_at,valid_until').eq('case_id',caseId).order('created_at',{ascending:false});
  if(r.error)throw r.error;
  return r.data;
 }});
 return <Section title="Propostas de honorários do processo" description="Os valores ficam vinculados a este caso e separados dos recebimentos efetivos.">
  <Button asChild><Link to={`/propostas?caso=${caseId}`}><Plus/>Nova proposta para este processo<ArrowUpRight size={14}/></Link></Button>
  {query.isPending&&<p className="mt-4 text-xs text-muted-foreground">Carregando propostas…</p>}
  {query.isError&&<p role="alert" className="mt-4 text-xs text-destructive">Acesso não autorizado ou erro na consulta.</p>}
  {!query.isPending&&!query.isError&&!query.data?.length&&<div className="mt-4"><Empty title="Nenhuma proposta registrada" description="Selecione um modelo de honorários para gerar a primeira proposta."/></div>}
  <div className="mt-4 space-y-3">{query.data?.map(item=><div className="flex flex-wrap justify-between gap-2 rounded-md border p-4" key={item.id}>
    <div><p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.status} · Criada em {dateLabel(item.created_at)}{item.valid_until?` · Válida até ${dateLabel(item.valid_until)}`:''}</p></div>
    <strong className="text-sm tabular-nums">{currency(item.amount_cents)}</strong>
  </div>)}</div>
 </Section>;
}
