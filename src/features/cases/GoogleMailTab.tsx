import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mail, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dateLabel } from '@/lib/format';
import { Empty, Section } from '@/features/pericial/ui';
export default function GoogleMailTab({caseId}:{caseId:string}){
 const {access}=useAuth(),owner=access?.member?.id||'',cache=useQueryClient();
 const [busy,setBusy]=useState(false),[info,setInfo]=useState('');
 const [recipient,setRecipient]=useState(''),[subject,setSubject]=useState(''),[body,setBody]=useState(''),[confirmed,setConfirmed]=useState(false);
 const connection=useQuery({queryKey:['google-mail-connection',owner],enabled:!!owner,queryFn:async()=>{
  const r=await supabase.from('amcf_google_connections').select('google_email,last_gmail_sync_at').eq('owner_id',owner).maybeSingle();
  if(r.error)throw r.error;return r.data;
 }});
 const messages=useQuery({queryKey:['google-mails',caseId,owner],enabled:!!owner,queryFn:async()=>{
  const r=await supabase.from('amcf_google_email_messages').select('*').eq('case_id',caseId).eq('owner_id',owner).order('received_at',{ascending:false}).limit(100);
  if(r.error)throw r.error;return r.data;
 }});
 const sent=useQuery({queryKey:['google-mails-sent',caseId,owner],enabled:!!owner,queryFn:async()=>{
  const r=await supabase.from('amcf_google_sent_messages').select('*').eq('case_id',caseId).eq('owner_id',owner).order('sent_at',{ascending:false}).limit(50);
  if(r.error)throw r.error;return r.data;
 }});
 const sync=async()=>{
  setBusy(true);setInfo('');
  try{
   const r=await supabase.functions.invoke('amcf-google-mail',{body:{action:'sync',caseId}});
   if(r.error||!r.data?.ok)throw new Error(r.data?.error||'Falha na sincronização Gmail');
   setInfo('Consulta concluída. Novas mensagens relacionadas a este processo: '+(r.data.imported||0)+'.');
   await Promise.all([messages.refetch(),connection.refetch()]);
  }catch(e){setInfo(e instanceof Error?e.message:'Gmail indisponível');}
  finally{setBusy(false);}
 };
 const send=async(e:React.FormEvent)=>{
  e.preventDefault(); if(!confirmed)return;
  setBusy(true);setInfo('');
  try{
   const r=await supabase.functions.invoke('amcf-google-mail',{body:{
     action:'send',caseId,to:recipient.trim(),subject:subject.trim(),body:body.trim(),confirmSend:true
   }});
   if(r.error||!r.data?.sent)throw new Error(r.data?.error||'O Gmail não confirmou o envio');
   setInfo('E-mail enviado pelo Gmail e registrado no processo.');
   setRecipient('');setSubject('');setBody('');setConfirmed(false);
   await Promise.all([sent.refetch(),cache.invalidateQueries({queryKey:['case-communications',caseId]})]);
  }catch(error){setInfo(error instanceof Error?error.message:'Falha no envio');}
  finally{setBusy(false);}
 };
 return <div className="space-y-6">
  {!connection.data&&<div className="notice"><ShieldCheck size={18} className="shrink-0"/><p>Nenhum Gmail profissional vinculado ao seu usuário. <Link className="underline font-medium" to="/integracoes">Conecte sua conta em Integrações</Link>. Não serão acessadas mensagens de outras pessoas.</p></div>}
  {connection.data&&<p className="text-xs text-muted-foreground">Caixa conectada: {connection.data.google_email}. O sistema pesquisa somente mensagens com número CNJ visível e não importa automaticamente toda a caixa de entrada.</p>}
  <Section title="E-mails relacionados a este processo" description="Busca por número processual e armazena remetente, assunto, data e trecho breve, sem copiar anexos ou conteúdo integral do e-mail.">
   <Button variant="outline" type="button" disabled={busy||!connection.data} onClick={()=>void sync()}><RefreshCw size={16}/>{busy?'Sincronizando…':'Sincronizar e-mails deste processo'}</Button>
   {messages.isError&&<p className="mt-3 text-xs text-destructive" role="alert">Não foi possível carregar as mensagens.</p>}
   {!messages.isPending&&!messages.isError&&!messages.data?.length&&<div className="mt-4"><Empty title="Nenhum e-mail relacionado registrado" description="Confira o número CNJ do processo e sincronize com a conta autorizada."/></div>}
   <div className="mt-4 space-y-2">{messages.data?.map(m=><article key={m.id} className="rounded-md border p-4">
    <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{m.subject||'(Sem assunto)'}</strong><span className="text-xs text-muted-foreground">{dateLabel(m.received_at)}</span></div>
    <p className="mt-1 text-xs text-muted-foreground">De: {m.sender} · Para: {m.recipient}</p>
    <p className="mt-2 text-xs leading-6">{m.excerpt}</p>
   </article>)}</div>
  </Section>
  <Section title="Enviar e-mail pela conta profissional" description="Cada envio exige ação e confirmação explícita. Não há disparo automático de mensagens processuais a partes ou terceiros.">
   <form className="mt-4 grid gap-4" onSubmit={e=>void send(e)}>
    <div><label className="field-label" htmlFor="gm-recipient">Destinatário *</label><Input id="gm-recipient" type="email" required maxLength={254} value={recipient} onChange={e=>setRecipient(e.target.value)} disabled={busy||!connection.data}/></div>
    <div><label className="field-label" htmlFor="gm-subject">Assunto *</label><Input id="gm-subject" required minLength={3} maxLength={250} value={subject} onChange={e=>setSubject(e.target.value)} disabled={busy||!connection.data}/></div>
    <div><label className="field-label" htmlFor="gm-body">Mensagem *</label><Textarea id="gm-body" required minLength={3} maxLength={8000} rows={6} value={body} onChange={e=>setBody(e.target.value)} disabled={busy||!connection.data}/></div>
    <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} disabled={busy||!connection.data}/>Conferi destinatário, conteúdo, sigilo e vínculo com o processo. Autorizo enviar este e-mail agora.</label>
    <div><Button disabled={busy||!connection.data||!confirmed||!recipient.trim()||!subject.trim()||!body.trim()}><Send size={16}/>{busy?'Enviando…':'Enviar pelo Gmail'}</Button></div>
   </form>
   {sent.data?.length>0&&<div className="mt-6 space-y-2 border-t pt-4"><h3 className="text-xs font-semibold">Envios registrados</h3>{sent.data.map(m=><p key={m.id} className="text-xs text-muted-foreground">{dateLabel(m.sent_at)} · {m.recipient} · {m.subject}</p>)}</div>}
   {info&&<p role="status" className="mt-4 whitespace-pre-wrap rounded-md border p-3 text-xs">{info}</p>}
  </Section>
 </div>;
}