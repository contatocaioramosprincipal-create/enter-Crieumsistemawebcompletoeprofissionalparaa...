import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Gavel } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel, todayISO } from '@/lib/format';

interface CaseRef { id: string; title: string; reference: string }
interface MovementRow { id: string; occurred_on: string; title: string; classification: string; caso: CaseRef | null }
interface CaseRow { id: string; title: string; reference: string; due_on: string | null; updated_at: string }

const plusDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };

// Painel de atenção pericial: só mostra o que existe nos registros; nada de prazo calculado por IA.
export default function PericialAttention() {
  const moves = useQuery({
    queryKey: ['overview-pericial-moves'],
    queryFn: async () => {
      const result = await supabase.from('amcf_movements').select('id,occurred_on,title,classification,caso:amcf_cases(id,title,reference)')
        .eq('review_state', 'nova').in('classification', ['requer_acao', 'possivel_prazo', 'agenda']).order('occurred_on', { ascending: false }).limit(6);
      if (result.error) throw result.error;
      return result.data as unknown as MovementRow[];
    },
  });
  const due = useQuery({
    queryKey: ['overview-pericial-due'],
    queryFn: async () => {
      const result = await supabase.from('amcf_cases').select('id,title,reference,due_on,updated_at').is('archived_at', null).not('due_on', 'is', null).lte('due_on', plusDays(14)).order('due_on').limit(6);
      if (result.error) throw result.error;
      return result.data as unknown as CaseRow[];
    },
  });
  const stalled = useQuery({
    queryKey: ['overview-pericial-stalled'],
    queryFn: async () => {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
      const result = await supabase.from('amcf_cases').select('id,title,reference,due_on,updated_at').is('archived_at', null).lt('updated_at', cutoff.toISOString()).order('updated_at').limit(6);
      if (result.error) throw result.error;
      return result.data as unknown as CaseRow[];
    },
  });
  const today = todayISO();
  return <section className="data-panel mt-6">
    <div className="panel-title"><div><h2>Processos que pedem atenção</h2><p>Movimentações a revisar, datas internas próximas e casos sem atualização</p></div><Gavel size={18} className="text-muted-foreground" /></div>
    <div className="grid gap-6 lg:grid-cols-3">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Movimentações a revisar</h3>
        <QueryState loading={moves.isPending} error={moves.isError} empty={!moves.isPending && !moves.isError && !moves.data?.length} onRetry={() => void moves.refetch()} title="Nada pendente" description="Movimentações sinalizadas e ainda não revisadas aparecem aqui." />
        {moves.data?.map(item => <Link key={item.id} to={item.caso ? `/casos/${item.caso.id}` : '/casos'} className="priority-row"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.caso?.reference || 'Processo'} · {dateLabel(item.occurred_on)} · {item.classification === 'possivel_prazo' ? 'possível prazo — confirmar' : item.classification === 'agenda' ? 'agenda' : 'requer ação'}</p></div><ArrowUpRight size={15} className="text-muted-foreground/60" /></Link>)}
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data interna em até 14 dias</h3>
        <QueryState loading={due.isPending} error={due.isError} empty={!due.isPending && !due.isError && !due.data?.length} onRetry={() => void due.refetch()} title="Nenhuma data próxima" description="Considera apenas a data cadastrada no caso, não prazo judicial calculado." />
        {due.data?.map(item => <Link key={item.id} to={`/casos/${item.id}`} className="priority-row"><span className={`priority-marker ${item.due_on && item.due_on < today ? 'is-overdue' : ''}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.reference} · {item.due_on ? dateLabel(item.due_on) : ''}{item.due_on && item.due_on < today ? ' · vencida' : ''}</p></div></Link>)}
      </div>
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sem atualização há 30+ dias</h3>
        <QueryState loading={stalled.isPending} error={stalled.isError} empty={!stalled.isPending && !stalled.isError && !stalled.data?.length} onRetry={() => void stalled.refetch()} title="Nenhum caso parado" description="Casos ativos sem alteração no cadastro nos últimos 30 dias." />
        {stalled.data?.map(item => <Link key={item.id} to={`/casos/${item.id}`} className="priority-row"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.reference} · última alteração {dateLabel(item.updated_at.slice(0, 10))}</p></div></Link>)}
      </div>
    </div>
  </section>;
}
