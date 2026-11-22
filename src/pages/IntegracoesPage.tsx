import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Mail, ShieldCheck, PlugZap, Unplug, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/data-table/PageHeader';
import { dateLabel } from '@/lib/format';
import { useAuth } from '@/features/auth/auth-context';

export default function IntegracoesPage(){
 const {access}=useAuth(),cache=useQueryClient();
 const [params]=useSearchParams();
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const google=useQuery({queryKey:['amcf-google-oauth-status'],queryFn:async()=>{
  const r=await supabase.functions.invoke('amcf-google-oauth',{body:{action:'status'}});
  if(r.error||!r.data?.ok)throw new Error(r.data?.error||'Integração Google indisponível');
  return r.data as {configured:boolean;connected:boolean;connection:null|{google_email:string;connected_at:string;last_calendar_sync_at:string|null;last_gmail_sync_at:string|null}};
 }});
 const operate=async(action:'start'|'disconnect')=>{
  setBusy(true);setMessage('');
  try{
    if(action==='disconnect'&&!window.confirm('Desconectar sua conta Google do CRM? A agenda e os e-mails históricos já registrados no CRM não serão apagados.'))return;
    const res=await supabase.functions.invoke('amcf-google-oauth',{body:{action}});
    if(res.error||!res.data?.ok)throw new Error(res.data?.error||'Operação não concluída');
    if(action==='start'){
      if(typeof res.data.authorize_url!=='string'||!res.data.authorize_url.startsWith('https://accounts.google.com/'))throw new Error('URL de autorização inválida');
      window.location.assign(res.data.authorize_url);
      return;
    }
    setMessage('Conta Google desconectada.');await cache.invalidateQueries({queryKey:['amcf-google-oauth-status']});
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível concluir a operação.');}
  finally{setBusy(false);}
 };
 const sync=async(target:'calendar'|'gmail')=>{
  setBusy(true);setMessage('');
  try{
   if(target==='gmail')throw new Error('A sincronização de e-mails ocorre dentro da ficha de cada processo, para não importar mensagens sem vínculo processual.');
   const result=await supabase.functions.invoke('amcf-google-calendar',{body:{}});
   if(result.error||!result.data?.ok)throw new Error(result.data?.error||'Falha na sincronização');
   const entry=result.data.results?.[0];
   if(entry?.error)throw new Error(entry.error);
   setMessage('Agenda sincronizada. Enviados: '+(entry?.pushed||0)+'; recebidos: '+(entry?.pulled||0)+'.');
   await cache.invalidateQueries({queryKey:['amcf-google-calendar-events']});
   await cache.invalidateQueries({queryKey:['amcf-google-oauth-status']});
  }catch(e){setMessage(e instanceof Error?e.message:'Sincronização indisponível.');}
  finally{setBusy(false);}
 };
 return <div className="space-y-6">
  <PageHeader eyebrow="AMCF / CONEXÕES SEGURAS" title="Integrações Google" description="Vincule somente a conta Google profissional autorizada. Cada usuário tem sua própria conexão e pode revogá-la. WhatsApp permanece fora deste módulo."/>
  {params.get('google')==='connected'&&<p role="status" className="notice">Autorização recebida. Confira o endereço da conta abaixo.</p>}
  {params.get('google')==='error'&&<p role="alert" className="notice">Não foi possível concluir a autorização. Confira as credenciais do Google Cloud e tente novamente.</p>}
  <section className="data-panel p-6">
   <div className="flex items-center gap-3"><PlugZap size={22}/><div><h2 className="text-sm font-semibold">Conta Google do usuário</h2><p className="mt-1 text-xs text-muted-foreground">Google Calendar e Gmail, mediante consentimento OAuth e MFA.</p></div></div>
   {google.isPending&&<p className="mt-4 text-xs text-muted-foreground">Conferindo conexão…</p>}
   {google.isError&&<p role="alert" className="mt-4 text-xs text-destructive">Não foi possível consultar a integração.</p>}
   {google.data?.connected&&<div className="mt-5 space-y-2 rounded-lg border p-4">
    <p className="text-sm font-medium"><ShieldCheck size={16} className="mr-2 inline text-success"/>{google.data.connection?.google_email}</p>
    <p className="text-xs text-muted-foreground">Conectada em {dateLabel(google.data.connection?.connected_at)}.</p>
    <p className="text-xs text-muted-foreground">Agenda: {google.data.connection?.last_calendar_sync_at?dateLabel(google.data.connection.last_calendar_sync_at):'ainda sem sincronização'} · Gmail: {google.data.connection?.last_gmail_sync_at?dateLabel(google.data.connection.last_gmail_sync_at):'ainda sem sincronização'}.</p>
   </div>}
   <div className="mt-5 flex flex-wrap gap-2">
    {!google.data?.connected&&<Button disabled={busy||!google.data?.configured} onClick={()=>void operate('start')}><PlugZap size={16}/>Conectar minha conta profissional</Button>}
    {google.data?.connected&&<><Button variant="outline" asChild><Link to="/agenda-google"><CalendarDays size={15}/>Gerenciar agenda Google</Link></Button><Button variant="outline" disabled={busy} onClick={()=>void sync('calendar')}><RefreshCw size={15}/>Sincronizar agenda</Button><Button variant="destructive" disabled={busy} onClick={()=>void operate('disconnect')}><Unplug size={15}/>Desconectar</Button></>}
   </div>
   {google.data&&!google.data.configured&&<p className="mt-4 text-xs text-warning">O projeto ainda precisa do cliente OAuth próprio do consultório. Nenhuma conta pessoal será conectada automaticamente.</p>}
   {message&&<p role="status" className="mt-4 rounded-md border p-3 text-xs">{message}</p>}
  </section>
  <div className="grid gap-4 md:grid-cols-2">
   <section className="data-panel p-5"><CalendarDays className="mb-3 text-primary"/><h2 className="text-sm font-semibold">Google Calendar</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Crie, edite e consulte compromissos do AMCF na agenda Google; alterações externas em eventos criados pelo sistema voltam ao CRM, sem mudar automaticamente prazos judiciais.</p><Button asChild variant="outline" className="mt-4"><Link to="/agenda-google">Abrir agenda conectada</Link></Button></section>
   <section className="data-panel p-5"><Mail className="mb-3 text-primary"/><h2 className="text-sm font-semibold">Gmail</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Mensagens com número CNJ visível são associadas ao processo. O envio de cada e-mail exige confirmação expressa do usuário; não existe disparo automático de conteúdo sensível.</p><Button asChild variant="outline" className="mt-4"><Link to="/casos">Abrir processos</Link></Button></section>
  </div>
  {access?.capabilities.manage&&<section className="data-panel p-5"><h2 className="text-sm font-semibold">Configuração técnica inicial — administrador</h2>
   <p className="mt-3 text-xs leading-6 text-muted-foreground">No Google Cloud, configure um cliente OAuth 2.0 Web autorizado para o CRM. Defina <code>GOOGLE_OAUTH_CLIENT_ID</code> e <code>GOOGLE_OAUTH_CLIENT_SECRET</code> como segredos das Edge Functions no Supabase do AMCF. Cadastre exatamente o URI de redirecionamento abaixo e conclua a configuração da tela de consentimento, incluindo permissões Calendar e Gmail para os usuários permitidos.</p>
   <p className="mt-3 break-all rounded-md border p-3 font-mono text-xs">https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-google-oauth</p>
   <p className="mt-3 text-xs text-muted-foreground">O acesso ao Gmail exige as aprovações e políticas de dados aplicáveis do Google. O sistema não pede nem guarda a senha Google.</p>
  </section>}
 </div>;
}