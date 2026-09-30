import { useQuery } from '@tanstack/react-query';
import { BriefcaseBusiness, GitBranch, ListTodo, FileText, Wallet, TriangleAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import { proposalStatuses } from '@/features/registry/resources';
import { currency } from '@/lib/format';

interface Report {
  opportunities: number; opportunities_won: number; opportunities_value: number;
  opportunities_by_stage: { name: string; count: number }[];
  cases_open: number; cases_by_stage: { name: string; count: number }[];
  tasks_pending: number; tasks_overdue: number;
  proposals_by_status: { status: string; count: number; total: number }[];
  finance: { received: number; pending: number; overdue: number; next_due: { id: string; description: string; due_on: string; amount_cents: number }[] };
}
export default function ReportsPage() {
  const { access } = useAuth();
  const finance = !!access?.capabilities.finance;
  const report = useQuery({ queryKey: ['report'], queryFn: async () => { const result = await supabase.rpc('amcf_report'); if (result.error) throw result.error; return result.data as unknown as Report; } });
  const bars = (items: { label: string; value: number }[]) => <>{items.map(item => <div key={item.label} className="pipeline-row"><div className="flex items-center justify-between text-xs"><span>{item.label}</span><strong className="tabular-nums">{item.value}</strong></div><progress className="pipeline-progress" value={item.value} max={Math.max(1, ...items.map(i => i.value))} /></div>)}</>;
  const data = report.data;
  const cards = [{ label: 'Oportunidades', value: data?.opportunities, icon: GitBranch }, { label: 'Oportunidades ganhas', value: data?.opportunities_won, icon: GitBranch }, { label: 'Casos abertos', value: data?.cases_open, icon: BriefcaseBusiness }, { label: 'Tarefas pendentes', value: data?.tasks_pending, icon: ListTodo }, { label: 'Tarefas vencidas', value: data?.tasks_overdue, icon: TriangleAlert }];
  return <><PageHeader eyebrow="RELATÓRIOS" title="Relatórios" description="Números calculados exclusivamente a partir dos registros que você pode acessar." />
    {report.isError ? <div className="data-panel"><QueryState error onRetry={() => void report.refetch()} /></div> : <>
      <div className="metric-grid">{cards.map(({ label, value, icon: Icon }) => <div key={label} className="metric-cell"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon size={18} strokeWidth={1.6} className={label === 'Tarefas vencidas' ? 'text-warning' : 'text-muted-foreground'} /></div><strong className="mt-5 block text-3xl font-semibold tabular-nums tracking-tight">{report.isPending ? '—' : String(value ?? 0)}</strong></div>)}{finance && <div className="metric-cell"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">Valor das oportunidades</p><GitBranch size={18} strokeWidth={1.6} className="text-muted-foreground" /></div><strong className="mt-5 block text-3xl font-semibold tabular-nums tracking-tight">{report.isPending ? '—' : currency(Number(data?.opportunities_value || 0))}</strong></div>}</div>
      <div className="mt-7 grid gap-6 xl:grid-cols-2"><section className="data-panel"><div className="panel-title"><div><h2>Oportunidades por etapa</h2><p>Distribuição no pipeline comercial</p></div><GitBranch size={18} className="text-muted-foreground" /></div><QueryState loading={report.isPending} error={report.isError} onRetry={() => void report.refetch()} />{bars((data?.opportunities_by_stage || []).map(item => ({ label: item.name, value: item.count })))}</section>
      <section className="data-panel"><div className="panel-title"><div><h2>Casos por etapa</h2><p>Casos ativos por fase de trabalho</p></div><BriefcaseBusiness size={18} className="text-muted-foreground" /></div><QueryState loading={report.isPending} error={report.isError} onRetry={() => void report.refetch()} />{bars((data?.cases_by_stage || []).map(item => ({ label: item.name, value: item.count })))}</section></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2"><section className="data-panel"><div className="panel-title"><div><h2>Propostas por status</h2><p>Volume e valor por situação</p></div><FileText size={18} className="text-muted-foreground" /></div>{!finance ? <p className="px-5 py-6 text-sm leading-7 text-muted-foreground">As propostas são restritas a administrador e médico responsável.</p> : <><QueryState loading={report.isPending} error={report.isError} onRetry={() => void report.refetch()} />{(data?.proposals_by_status || []).map(item => <div key={item.status} className="flex items-center justify-between border-b px-5 py-3 text-xs last:border-b-0"><span>{proposalStatuses[item.status as keyof typeof proposalStatuses] || item.status}</span><span className="flex gap-4 tabular-nums"><strong>{item.count}</strong><span className="text-muted-foreground">{currency(Number(item.total))}</span></span></div>)}</>}</section>
      <section className="data-panel"><div className="panel-title"><div><h2>Financeiro</h2><p>Recebido, pendente e vencido</p></div><Wallet size={18} className="text-muted-foreground" /></div>{!finance ? <p className="px-5 py-6 text-sm leading-7 text-muted-foreground">O financeiro é restrito a administrador e médico responsável.</p> : <><QueryState loading={report.isPending} error={report.isError} onRetry={() => void report.refetch()} />{[{ label: 'Recebido', value: data?.finance?.received }, { label: 'Pendente', value: data?.finance?.pending }, { label: 'Vencido', value: data?.finance?.overdue }].map(item => <div key={item.label} className="flex items-center justify-between border-b px-5 py-3 text-xs last:border-b-0"><span>{item.label}</span><strong className="tabular-nums">{currency(Number(item.value || 0))}</strong></div>)}{(data?.finance?.next_due || []).map(item => <div key={item.id} className="flex items-center justify-between border-b px-5 py-3 text-xs last:border-b-0"><span className="truncate">{item.description}</span><span className="flex shrink-0 gap-4 tabular-nums text-muted-foreground"><span>{item.due_on}</span><span>{currency(Number(item.amount_cents))}</span></span></div>)}</>}</section></div>
      <p className="mt-5 text-[11px] leading-5 text-muted-foreground">Relatórios respeitam o seu escopo: o assistente vê apenas casos atribuídos e nunca valores comerciais ou financeiros. Números refletem apenas registros existentes; nenhum valor é estimado.</p></>}
  </>;
}
