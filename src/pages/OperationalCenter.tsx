import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, Clock3, ArrowUpRight, FileWarning, RefreshCw, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel, errorMessage, todayISO } from '@/lib/format';

const reviewKinds: Record<string,string> = {
  movimentacao: 'Movimentação', prazo: 'Tarefa ou data', documento: 'Documento',
  laudo: 'Laudo', financeiro: 'Financeiro', sistema: 'Sistema'
};
const dayPlus = (date: string, days: number) => {
  const value = new Date(date + 'T12:00:00Z');
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

export default function OperationalCenter() {
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [onlyUnread, setOnlyUnread] = useState(true);
  const today = todayISO();
  const notifications = useQuery({
    queryKey: ['amcf-operational-notifications'],
    queryFn: async () => {
      const r = await supabase.from('amcf_notifications')
        .select('id,case_id,kind,title,body,resource,resource_id,read_at,created_at')
        .order('created_at', { ascending: false }).limit(150);
      if (r.error) throw r.error;
      return r.data;
    }, refetchInterval: 90000,
  });
  const tasks = useQuery({
    queryKey: ['amcf-operational-tasks'],
    queryFn: async () => {
      const r = await supabase.from('amcf_tasks')
        .select('id,title,due_on,status,case_id,linked_case:amcf_cases(reference,cnj_number)')
        .in('status',['pending','in_progress']).lte('due_on', dayPlus(today,7))
        .order('due_on').limit(80);
      if (r.error) throw r.error;
      return r.data;
    }, refetchInterval: 90000,
  });
  const movements = useQuery({
    queryKey: ['amcf-operational-movements'],
    queryFn: async () => {
      const r = await supabase.from('amcf_movements')
        .select('id,title,case_id,occurred_on,classification,review_state')
        .eq('review_state','nova').in('classification',['requer_acao','possivel_prazo','agenda'])
        .order('occurred_on',{ ascending:false }).limit(80);
      if (r.error) throw r.error;
      return r.data;
    }, refetchInterval: 90000,
  });
  const documents = useQuery({
    queryKey: ['amcf-operational-documents'],
    queryFn: async () => {
      const r = await supabase.from('amcf_documents')
        .select('id,case_id,title,text_status,created_at')
        .in('text_status',['falha','ocr_pendente','nao_suportado'])
        .order('created_at',{ ascending:false }).limit(40);
      if (r.error) throw r.error;
      return r.data;
    }, refetchInterval: 90000,
  });

  const unread = notifications.data?.filter(n => !n.read_at) || [];
  const visible = (notifications.data || []).filter(n => !onlyUnread || !n.read_at);
  const failed = notifications.isError || tasks.isError || movements.isError || documents.isError;

  const read = async (ids: string[]) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const r = await supabase.from('amcf_notifications')
        .update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at',null).select('id');
      if (r.error) throw r.error;
      await cache.invalidateQueries({ queryKey: ['amcf-operational-notifications'] });
      toast.success('Avisos marcados como lidos.');
    } catch (err) { toast.error(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <PageHeader eyebrow="AMCF / CENTRO DE CONTROLE" title="Central operacional"
      description="Acompanhe as ocorrências reais, documentos que exigem conferência e tarefas próximas do vencimento. Datas processuais precisam de validação humana.">
      <Button variant="outline" onClick={() => void Promise.all([notifications.refetch(),tasks.refetch(),movements.refetch(),documents.refetch()])}><RefreshCw size={16}/>Atualizar</Button>
    </PageHeader>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {name:'Avisos não lidos',value:unread.length,icon:Bell},
        {name:'Tarefas até 7 dias',value:tasks.data?.length ?? '—',icon:Clock3},
        {name:'Movimentações a revisar',value:movements.data?.length ?? '—',icon:Scale},
        {name:'Documentos com falha de leitura',value:documents.data?.length ?? '—',icon:FileWarning}
      ].map(stat => <div key={stat.name} className="data-panel flex items-center gap-4 p-5"><stat.icon size={23} className="text-primary"/><div><strong className="text-2xl tabular-nums">{stat.value}</strong><p className="mt-1 text-xs text-muted-foreground">{stat.name}</p></div></div>)}
    </div>
    {failed && <div role="alert" className="notice">Algumas consultas não foram carregadas. Use Atualizar ou confira suas permissões de acesso.</div>}
    <section className="data-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold">Caixa de avisos</h2><p className="mt-1 text-xs text-muted-foreground">Alertas internos por ocorrências e datas já registradas no sistema.</p></div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setOnlyUnread(v=>!v)}>{onlyUnread?'Mostrar todos':'Somente não lidos'}</Button>
          <Button size="sm" variant="outline" disabled={busy || !unread.length} onClick={()=>void read(unread.map(n=>n.id))}><CheckCheck size={15}/>Marcar todos como lidos</Button>
        </div>
      </div>
      <QueryState loading={notifications.isPending} error={notifications.isError} empty={!notifications.isPending&&!notifications.isError&&!visible.length} title="Nenhum aviso nesta visualização" description="Novas ocorrências e lembretes aparecem aqui." onRetry={()=>void notifications.refetch()}/>
      <div className="mt-4 space-y-2">{visible.map(n=><div key={n.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
        <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="status-pill status-neutral">{reviewKinds[n.kind]||n.kind}</span><span className="text-[11px] text-muted-foreground">{dateLabel(n.created_at)}</span></div>
          <strong className="mt-2 block text-sm">{n.title}</strong><p className="mt-1 text-xs leading-5 text-muted-foreground">{n.body}</p>
        </div>
        <div className="flex gap-2">{n.case_id && <Button asChild size="sm" variant="outline"><Link to={'/casos/'+n.case_id}><ArrowUpRight size={14}/>Processo</Link></Button>}{n.resource==='nomeacao' && <Button asChild size="sm" variant="outline"><Link to="/nomeacoes"><ArrowUpRight size={14}/>Radar de Nomeações</Link></Button>}
          {!n.read_at && <Button size="sm" variant="outline" disabled={busy} onClick={()=>void read([n.id])}>Lido</Button>}
        </div>
      </div>)}</div>
    </section>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="data-panel p-6"><h2 className="text-sm font-semibold">Tarefas pendentes e próximas</h2><p className="mt-1 text-xs text-muted-foreground">Vencimento administrativo cadastrado, não prazo calculado por IA.</p>
        <QueryState loading={tasks.isPending} error={tasks.isError} empty={!tasks.isPending&&!tasks.isError&&!tasks.data?.length} title="Nenhuma tarefa pendente" onRetry={()=>void tasks.refetch()}/>
        <div className="mt-3 space-y-2">{tasks.data?.map(t=><Link key={t.id} to={t.case_id?'/casos/'+t.case_id:'/tarefas'} className="block rounded-md border p-3 hover:bg-muted/30"><div className="flex justify-between gap-2"><span className="text-sm font-medium">{t.title}</span><span className={t.due_on<today?'text-xs text-destructive':'text-xs text-muted-foreground'}>{dateLabel(t.due_on)}</span></div><p className="mt-1 text-xs text-muted-foreground">{t.linked_case?.cnj_number||t.linked_case?.reference||'Tarefa administrativa'}</p></Link>)}</div>
      </section>
      <section className="data-panel p-6"><h2 className="text-sm font-semibold">Movimentações para conferência</h2><p className="mt-1 text-xs text-muted-foreground">Alertas de classificação não substituem leitura da publicação oficial.</p>
        <QueryState loading={movements.isPending} error={movements.isError} empty={!movements.isPending&&!movements.isError&&!movements.data?.length} title="Nenhuma movimentação nova" onRetry={()=>void movements.refetch()}/>
        <div className="mt-3 space-y-2">{movements.data?.map(m=><Link key={m.id} to={'/casos/'+m.case_id} className="block rounded-md border p-3 hover:bg-muted/30"><div className="flex justify-between gap-2"><strong className="text-sm">{m.title}</strong><span className="text-xs text-muted-foreground">{dateLabel(m.occurred_on)}</span></div><span className="mt-1 block text-xs text-muted-foreground">{m.classification==='possivel_prazo'?'Possível prazo — validar':m.classification==='agenda'?'Evento de agenda':'Providência a revisar'}</span></Link>)}</div>
      </section>
    </div>
    <section className="data-panel p-6"><h2 className="text-sm font-semibold">Documentos que exigem revisão</h2>
      <QueryState loading={documents.isPending} error={documents.isError} empty={!documents.isPending&&!documents.isError&&!documents.data?.length} title="Nenhuma falha de leitura pendente" onRetry={()=>void documents.refetch()}/>
      <div className="mt-3 grid gap-2 md:grid-cols-2">{documents.data?.map(d=><Link key={d.id} to={'/documentos?caso='+d.case_id} className="flex justify-between gap-3 rounded-md border p-3 text-sm hover:bg-muted/30"><span>{d.title}</span><span className="text-xs text-muted-foreground">{d.text_status}</span></Link>)}</div>
    </section>
  </div>;
}
