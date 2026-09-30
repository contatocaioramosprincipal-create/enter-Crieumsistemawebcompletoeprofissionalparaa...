import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Wallet, CircleDollarSign, Clock3, TriangleAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import QueryState from '@/components/data-table/QueryState';
import RegistryPage from '@/features/registry/RegistryPage';
import { currency, dateLabel, todayISO } from '@/lib/format';

export default function FinancePage() {
  const receivables = useQuery({ queryKey: ['finance-overview'], queryFn: async () => { const result = await supabase.from('amcf_receivables').select('id,description,amount_cents,status,due_on').order('due_on').limit(500); if (result.error) throw result.error; return result.data; } });
  const today = todayISO();
  const rows = receivables.data || [];
  const active = rows.filter(row => row.status === 'pending');
  const received = rows.filter(row => row.status === 'paid').reduce((total, row) => total + Number(row.amount_cents), 0);
  const overdue = active.filter(row => row.due_on < today).reduce((total, row) => total + Number(row.amount_cents), 0);
  const pending = active.filter(row => row.due_on >= today).reduce((total, row) => total + Number(row.amount_cents), 0);
  const next = active.slice(0, 5);
  const cards = [{ label: 'A receber (pendente)', value: pending, icon: CircleDollarSign }, { label: 'Recebido', value: received, icon: Wallet }, { label: 'Vencido', value: overdue, icon: TriangleAlert }, { label: 'Contas ativas', value: active.length, count: true, icon: Clock3 }];
  return <RegistryPage resource="receivables" headerSlot={<div className="mb-6">{receivables.isError ? <div className="data-panel"><QueryState error onRetry={() => void receivables.refetch()} /></div> : <div className="metric-grid">{cards.map(({ label, value, count, icon: Icon }) => <div key={label} className="metric-cell"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon size={18} strokeWidth={1.6} className={label === 'Vencido' ? 'text-warning' : 'text-muted-foreground'} /></div><strong className="mt-5 block text-2xl font-semibold tabular-nums tracking-tight">{receivables.isPending ? '—' : count ? String(value) : currency(value)}</strong>{!count && <p className="mt-2 text-[11px] text-muted-foreground">{receivables.isPending ? 'Consultando o banco' : 'Somente contas não canceladas'}</p>}</div>)}</div>}{!receivables.isPending && !!next.length && <section className="data-panel mt-6"><div className="panel-title"><div><h2>Próximos vencimentos</h2><p>Contas pendentes em ordem de vencimento</p></div><Clock3 size={18} className="text-muted-foreground" /></div>{next.map(row => <Link key={row.id} to="/financeiro" className="priority-row"><span className={`priority-marker ${row.due_on < today ? 'is-overdue' : ''}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{row.description}</p><p className="mt-1 text-xs text-muted-foreground">{dateLabel(row.due_on)}</p></div><span className="text-xs font-medium tabular-nums">{currency(Number(row.amount_cents))}</span></Link>)}</section>}</div>} />;
}
