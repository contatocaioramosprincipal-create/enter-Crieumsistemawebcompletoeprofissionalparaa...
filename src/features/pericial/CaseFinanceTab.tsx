import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { currency, dateLabel } from '@/lib/format';
import { financialKinds, financialStatuses, label } from './pericial';
import { fail, type FinancialEvent } from './api';
import { useCaseMutate } from './useCaseMutate';
import { Empty, Pill, Score, Section, SubSection } from './ui';

// Depósitos, honorários e despesas do processo. Valores só entram por registro do responsável.
export default function CaseFinanceTab({ caseId }: { caseId: string }) {
  const { busy, mutate } = useCaseMutate();
  const [form, setForm] = useState({ kind: 'honorario', description: '', amount: '', expected_on: '' });
  const events = useQuery({ queryKey: ['case-finance', caseId], queryFn: async () => fail<FinancialEvent[]>(supabase.from('amcf_case_financial_events').select('*').eq('case_id', caseId).order('created_at', { ascending: false })) });
  const rows = events.data || [];
  const sum = (kinds: string[], status: string) => rows.filter(item => kinds.includes(item.kind) && item.status === status).reduce((total, item) => total + Number(item.amount_cents), 0);
  const cents = Math.round(Number(form.amount.replace(/\./g, '').replace(',', '.')) * 100);
  const valid = Number.isFinite(cents) && cents > 0;
  const add = () => mutate(() => supabase.from('amcf_case_financial_events').insert({ case_id: caseId, kind: form.kind, description: form.description.trim(), amount_cents: cents, expected_on: form.expected_on || null, status: 'previsto' }).select('id'), 'Lançamento registrado.').then(ok => { if (ok) setForm({ kind: 'honorario', description: '', amount: '', expected_on: '' }); });
  const confirm = (item: FinancialEvent) => mutate(() => supabase.from('amcf_case_financial_events').update({ status: 'confirmado', settled_on: new Date().toISOString().slice(0, 10) }).eq('id', item.id).select('id'), 'Lançamento confirmado.');
  const cancel = (item: FinancialEvent) => mutate(() => supabase.from('amcf_case_financial_events').update({ status: 'cancelado' }).eq('id', item.id).select('id'), 'Lançamento cancelado.');
  return <div className="space-y-6">
    <Section title="Honorários e financeiro do processo" description="Somente lançamentos feitos pela equipe. Visível apenas a quem tem permissão financeira.">
      {events.isError && <p role="alert" className="text-xs text-destructive">Sem permissão ou falha ao carregar o financeiro deste processo.</p>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Score value={currency(sum(['honorario'], 'previsto'))} caption="Honorários previstos" />
        <Score value={currency(sum(['honorario', 'liberacao', 'alvara'], 'confirmado'))} caption="Recebido (confirmado)" />
        <Score value={currency(sum(['despesa'], 'previsto') + sum(['despesa'], 'confirmado'))} caption="Despesas do processo" />
      </div>
      {!events.isPending && !events.isError && !rows.length && <div className="mt-4"><Empty title="Nenhum lançamento" description="Registre honorários, depósitos, alvarás e despesas deste processo." /></div>}
      <ul className="mt-4 space-y-3">{rows.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 rounded-md border px-4 py-3 text-sm">
        <strong>{item.description}</strong>
        <Pill tone="neutral">{label(financialKinds, item.kind)}</Pill>
        <Pill tone={item.status === 'confirmado' ? 'success' : item.status === 'cancelado' ? 'neutral' : 'warning'}>{label(financialStatuses, item.status)}</Pill>
        <span className="tabular-nums">{currency(Number(item.amount_cents))}</span>
        <span className="text-[11px] text-muted-foreground">{item.settled_on ? `Liquidado em ${dateLabel(item.settled_on)}` : item.expected_on ? `Previsto para ${dateLabel(item.expected_on)}` : ''}</span>
        {item.status === 'previsto' && <div className="ml-auto flex gap-1"><Button variant="ghost" size="sm" disabled={busy} onClick={() => void confirm(item)}>Confirmar</Button><Button variant="ghost" size="sm" disabled={busy} onClick={() => void cancel(item)}>Cancelar</Button></div>}
      </li>)}</ul>
    </Section>
    <Section title="Novo lançamento">
      <SubSection title="Registrar">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); if (valid) void add(); }}>
          <div><label className="field-label" htmlFor="fin-kind">Tipo</label><select id="fin-kind" className="native-select" value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value })} disabled={busy}>{Object.entries(financialKinds).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div><label className="field-label" htmlFor="fin-amount">Valor (R$) *</label><Input id="fin-amount" inputMode="decimal" value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="0,00" required disabled={busy} /></div>
          <div><label className="field-label" htmlFor="fin-desc">Descrição *</label><Input id="fin-desc" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} minLength={2} maxLength={200} required disabled={busy} /></div>
          <div><label className="field-label" htmlFor="fin-on">Data prevista</label><Input id="fin-on" type="date" value={form.expected_on} onChange={event => setForm({ ...form, expected_on: event.target.value })} disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy || !valid}><Plus />Registrar lançamento</Button></div>
        </form>
      </SubSection>
    </Section>
  </div>;
}
