import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Paperclip, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { dateLabel, errorMessage } from '@/lib/format';
import { Empty, Section } from '@/features/pericial/ui';
const labels: Record<string,string> = { email: 'E-mail / resposta', note: 'Observação', call: 'Ligação', meeting: 'Reunião' };
export default function CaseCommunicationsTab({ caseId, contactId }: { caseId: string; contactId: string }) {
  const cache = useQueryClient();
  const [kind,setKind] = useState('email');
  const [summary,setSummary] = useState('');
  const [nextStep,setNextStep] = useState('');
  const [nextOn,setNextOn] = useState('');
  const [busy,setBusy] = useState(false);
  const items=useQuery({queryKey:['case-communications',caseId],queryFn:async()=>{
    const r=await supabase.from('amcf_interactions').select('*').eq('case_id',caseId).order('created_at',{ascending:false}).limit(200);
    if(r.error)throw r.error;
    return r.data;
  }});
  const save=async(e:React.FormEvent)=>{
    e.preventDefault(); if(!summary.trim())return;
    setBusy(true);
    try {
      const r=await supabase.from('amcf_interactions').insert({
        case_id:caseId,contact_id:contactId,kind,summary:summary.trim(),
        next_step:nextStep.trim(),next_on:nextOn||null
      }).select('id');
      if(r.error||!r.data?.length)throw r.error||new Error('Registro não salvo.');
      setSummary('');setNextStep('');setNextOn('');
      await cache.invalidateQueries({queryKey:['case-communications',caseId]});
      await cache.invalidateQueries({queryKey:['case-notes',caseId]});
      toast.success('Comunicação registrada neste processo.');
    }catch(error){toast.error(errorMessage(error));}
    finally{setBusy(false);}
  };
  return <div className="space-y-6">
    <Section title="Comunicações e respostas a e-mails" description="Registre o histórico administrativo, com referência ao mesmo número do processo. Anexe e-mails ou documentos pelo armazenamento privado.">
      <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2">
        <div><label className="field-label" htmlFor="comm-kind">Tipo de contato *</label><select id="comm-kind" className="native-select" value={kind} onChange={e=>setKind(e.target.value)} disabled={busy}>{Object.entries(labels).map(([key,value])=><option key={key} value={key}>{value}</option>)}</select></div>
        <div><label className="field-label" htmlFor="comm-next">Data da próxima ação (opcional)</label><Input id="comm-next" type="date" value={nextOn} onChange={e=>setNextOn(e.target.value)} disabled={busy}/></div>
        <div className="sm:col-span-2"><label className="field-label" htmlFor="comm-summary">Resumo da mensagem ou resposta *</label><Textarea id="comm-summary" rows={4} value={summary} onChange={e=>setSummary(e.target.value)} required maxLength={4000} disabled={busy} placeholder="Data, destinatário, assunto, resumo e providências administrativas. Evite dados clínicos sensíveis neste campo." /></div>
        <div className="sm:col-span-2"><label className="field-label" htmlFor="comm-action">Próximo passo (opcional)</label><Input id="comm-action" value={nextStep} onChange={e=>setNextStep(e.target.value)} maxLength={500} disabled={busy}/></div>
        <div className="sm:col-span-2 flex flex-wrap gap-2"><Button disabled={busy}><Plus/>Registrar comunicação</Button><Button asChild variant="outline"><Link to={`/documentos?caso=${caseId}`}><Paperclip/>Anexar e-mail / documento ao processo</Link></Button></div>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">O anexo será armazenado em Documentos, vinculado ao mesmo processo. Não existe sincronização automática da caixa de e-mail.</p>
    </Section>
    <Section title="Histórico de comunicações">
      {items.isPending && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {items.isError && <p role="alert" className="text-xs text-destructive">Não foi possível consultar as comunicações.</p>}
      {!items.isPending&&!items.isError&&!items.data?.length&&<Empty title="Nenhuma comunicação registrada" description="Cadastre a primeira troca de e-mails ou atividade."/>}
      <div className="space-y-3">{items.data?.map(row=><article key={row.id} className="rounded-md border p-4">
        <div className="flex flex-wrap gap-3 items-center text-xs text-muted-foreground"><Mail size={14}/><strong className="text-foreground">{labels[row.kind]||row.kind}</strong><span>{dateLabel(row.created_at)}</span></div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{row.summary}</p>
        {row.next_step&&<p className="mt-2 text-xs text-muted-foreground">Próxima ação: {row.next_step}{row.next_on?` · ${dateLabel(row.next_on)}`:''}</p>}
      </article>)}</div>
    </Section>
  </div>;
}
