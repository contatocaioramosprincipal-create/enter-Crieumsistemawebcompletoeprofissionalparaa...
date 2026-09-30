import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { addMonths, addWeeks, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarDays, ChevronLeft, ChevronRight, CalendarRange, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel, todayISO } from '@/lib/format';
import { taskStatuses } from '@/features/registry/resources';

const iso = (value: Date) => format(value, 'yyyy-MM-dd');
interface Entry { kind: 'Tarefa' | 'Prazo do caso'; id: string; label: string; to: string; detail: string }

export default function Agenda() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const start = period === 'week' ? startOfWeek(anchor, { weekStartsOn: 1 }) : startOfMonth(anchor);
  const end = period === 'week' ? endOfWeek(anchor, { weekStartsOn: 1 }) : endOfMonth(anchor);
  const from = iso(start); const to = iso(end); const today = todayISO();
  const tasks = useQuery({ queryKey: ['agenda-tasks', from, to], queryFn: async () => { const r = await supabase.from('amcf_tasks').select('id,title,due_on,status,linked_case:amcf_cases(reference,id)').gte('due_on', from).lte('due_on', to).order('due_on').limit(200); if (r.error) throw r.error; return r.data; } });
  const cases = useQuery({ queryKey: ['agenda-cases', from, to], queryFn: async () => { const r = await supabase.from('amcf_cases').select('id,reference,title,due_on').not('due_on', 'is', null).gte('due_on', from).lte('due_on', to).order('due_on').limit(200); if (r.error) throw r.error; return r.data; } });
  const overdue = useQuery({ queryKey: ['agenda-overdue'], queryFn: async () => { const r = await supabase.from('amcf_tasks').select('id,title,due_on,status').in('status', ['pending', 'in_progress']).lt('due_on', today).order('due_on').limit(20); if (r.error) throw r.error; return r.data; } });
  const grouped = new Map<string, Entry[]>();
  const push = (day: string, entry: Entry) => { const list = grouped.get(day) || []; list.push(entry); grouped.set(day, list); };
  for (const task of tasks.data ?? []) {
    if (!task.due_on) continue;
    const linked = (Array.isArray(task.linked_case) ? task.linked_case[0] : task.linked_case) as { id?: string; reference?: string } | null;
    push(task.due_on, { kind: 'Tarefa', id: task.id, label: task.title, to: linked?.id ? `/casos/${linked.id}` : '/tarefas', detail: `${taskStatuses[task.status] || task.status}${linked?.reference ? ` · ${linked.reference}` : ''}` });
  }
  for (const item of cases.data ?? []) {
    if (!item.due_on) continue;
    push(item.due_on, { kind: 'Prazo do caso', id: item.id, label: item.title, to: `/casos/${item.id}`, detail: `${item.reference} · acompanhamento` });
  }
  const days = [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const failed = tasks.isError || cases.isError || overdue.isError;
  const loading = tasks.isPending || cases.isPending || overdue.isPending;
  const move = (direction: -1 | 1) => setAnchor(period === 'week' ? addWeeks(anchor, direction) : addMonths(anchor, direction));
  return <><PageHeader eyebrow="TAREFAS E PRAZOS" title="Agenda" description="Visão somente leitura dos vencimentos registrados no sistema." ><Button variant="outline" onClick={() => setAnchor(new Date())} disabled={period === 'week' && iso(start) <= today && today <= iso(end)}><CalendarDays />Hoje</Button></PageHeader>
    <div className="notice mb-5"><ShieldAlert className="h-4 w-4 shrink-0" /><p>A conferência humana de prazos judiciais é indispensável. Esta agenda não notifica, não calcula prazos e não está conectada ao Google Calendar. Mostra apenas o que foi registrado, no seu escopo de acesso.</p></div>
    <section className="data-panel"><div className="table-toolbar"><div className="flex items-center gap-2"><Button variant="outline" size="icon" aria-label={period === 'week' ? 'Semana anterior' : 'Mês anterior'} onClick={() => move(-1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label={period === 'week' ? 'Próxima semana' : 'Próximo mês'} onClick={() => move(1)}><ChevronRight /></Button><span className="ml-1 text-xs font-medium">{period === 'week' ? `Semana de ${format(start, "dd 'de' MMM", { locale: ptBR })} a ${format(end, "dd 'de' MMM", { locale: ptBR })}` : format(start, "MMMM 'de' yyyy", { locale: ptBR })}</span></div><div className="flex items-center gap-2"><div className="flex rounded-md border p-1"><Button variant={period === 'week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriod('week')}><CalendarRange />Semana</Button><Button variant={period === 'month' ? 'secondary' : 'ghost'} size="sm" onClick={() => setPeriod('month')}><CalendarDays />Mês</Button></div><span className="text-[11px] text-muted-foreground">{loading || failed ? '' : `${days.reduce((total, [, list]) => total + list.length, 0)} vencimento(s)`}</span></div></div>
      <QueryState loading={loading} error={failed} empty={!loading && !failed && !days.length} onRetry={() => { void tasks.refetch(); void cases.refetch(); void overdue.refetch(); }} title="Nada registrado neste período" description="Cadastre tarefas com vencimento ou informe o prazo de acompanhamento de um caso." />
      {!loading && !failed && days.map(([day, list]) => <div key={day} className="border-b last:border-b-0"><div className="flex items-center justify-between bg-muted/40 px-5 py-3"><span className={`text-xs font-semibold ${day === today ? 'text-primary' : ''}`}>{format(new Date(`${day}T12:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}{day === today ? ' · hoje' : ''}</span>{day < today && <span className="status-pill status-warning">Já vencido</span>}</div>{list.map(entry => <Link key={`${entry.kind}-${entry.id}`} to={entry.to} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40"><div className="min-w-0"><p className="truncate text-sm font-medium">{entry.label}</p><p className="mt-1 text-xs text-muted-foreground">{entry.kind} · {entry.detail}</p></div><ChevronRight size={16} className="shrink-0 text-muted-foreground" /></Link>)}</div>)}
      <QueryState loading={overdue.isPending} error={overdue.isError} onRetry={() => void overdue.refetch()} />
      {!overdue.isPending && !overdue.isError && !!overdue.data?.length && <div className="border-t bg-warning-soft/40 px-5 py-4"><p className="text-xs font-semibold text-warning">Anteriores a hoje · {overdue.data.length}</p><p className="mt-2 text-[11px] leading-6 text-muted-foreground">Tarefas pendentes com vencimento já ultrapassado, independentemente do período exibido.</p>{overdue.data.map(item => <Link key={item.id} to="/tarefas" className="mt-3 flex items-center justify-between gap-4 text-xs hover:underline"><span className="truncate">{item.title}</span><span className="shrink-0 text-muted-foreground">{dateLabel(item.due_on)}</span></Link>)}</div>}
      <p className="border-t px-5 py-4 text-[11px] leading-5 text-muted-foreground">Exibe até 200 registros por período. O assistente vê apenas tarefas dos casos atribuídos e os prazos desses casos.</p>
    </section>
  </>;
}
