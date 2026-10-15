import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, EyeOff, Plus, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dateLabel } from '@/lib/format';
import { label, movementClass, movementSources, parseManualImport } from './pericial';
import { fail, type Movement } from './api';
import { useCaseMutate } from './useCaseMutate';
import { Empty, MovementBadge, Section, SubSection } from './ui';

// Chave de comparação alinhada à regra do banco (data + título + início do detalhe).
const keyOf = (date: string, title: string, detail: string) => [date, title.trim().toLowerCase(), (detail || '').trim().slice(0, 500).toLowerCase()].join('|');

export default function MovementsTab({ caseId }: { caseId: string }) {
  const { busy, mutate } = useCaseMutate();
  const [filter, setFilter] = useState<'todas' | 'nova' | 'acao'>('todas');
  const [form, setForm] = useState({ occurred_on: '', title: '', detail: '' });
  const [bulk, setBulk] = useState('');
  const [bulkReport, setBulkReport] = useState('');
  const movements = useQuery({
    queryKey: ['case-movements', caseId],
    queryFn: async () => fail<Movement[]>(supabase.from('amcf_movements').select('*').eq('case_id', caseId).order('occurred_on', { ascending: false }).order('created_at', { ascending: false }).limit(500)),
  });
  const rows = (movements.data || []).filter(item => filter === 'todas' ? true : filter === 'nova' ? item.review_state === 'nova' : (item.classification === 'requer_acao' || item.classification === 'possivel_prazo' || item.classification === 'agenda') && item.review_state !== 'ignorada');
  const add = () => mutate(() => supabase.from('amcf_movements').insert({ case_id: caseId, occurred_on: form.occurred_on, title: form.title.trim(), detail: form.detail.trim(), source: 'manual' }).select('id'), 'Movimentação registrada.').then(ok => { if (ok) setForm({ occurred_on: '', title: '', detail: '' }); });
  const review = (item: Movement, state: 'revisada' | 'ignorada') => mutate(() => supabase.from('amcf_movements').update({ review_state: state }).eq('id', item.id).select('id'), state === 'revisada' ? 'Movimentação marcada como revisada.' : 'Movimentação ignorada.');
  const importBulk = async () => {
    const parsed = parseManualImport(bulk);
    if (!parsed.items.length) { setBulkReport(parsed.errors.length ? parsed.errors.join('\n') : 'Nenhuma linha para importar.'); return; }
    const existing = new Set((movements.data || []).map(item => keyOf(item.occurred_on, item.title, item.detail)));
    const fresh = parsed.items.filter((item, index, all) => {
      const key = keyOf(item.occurred_on, item.title, item.detail);
      return !existing.has(key) && all.findIndex(other => keyOf(other.occurred_on, other.title, other.detail) === key) === index;
    });
    const duplicated = parsed.items.length - fresh.length;
    if (!fresh.length) { setBulkReport(`Nada novo: ${duplicated} linha(s) já existiam.` + (parsed.errors.length ? '\n' + parsed.errors.join('\n') : '')); return; }
    const ok = await mutate(() => supabase.from('amcf_movements').insert(fresh.map(item => ({ case_id: caseId, occurred_on: item.occurred_on, title: item.title, detail: item.detail, source: 'importacao' }))).select('id'), `${fresh.length} movimentação(ões) importada(s).`);
    if (ok) {
      setBulkReport(`Importadas: ${fresh.length}. Já existentes (ignoradas): ${duplicated}. Linhas com erro: ${parsed.errors.length}.` + (parsed.errors.length ? '\n' + parsed.errors.join('\n') : ''));
      setBulk('');
      await supabase.from('amcf_movement_syncs').insert({ case_id: caseId, source_kind: 'importacao', status: 'concluida', items_found: parsed.items.length, items_new: fresh.length, items_duplicated: duplicated, coverage: ['importação manual'], finished_at: new Date().toISOString() });
    }
  };
  return <div className="space-y-6">
    <Section title="Linha do tempo do processo" description="Mostra somente o que foi registrado ou importado. Nenhuma movimentação ou prazo é inventado: termos que podem indicar prazo são apenas sinalizados para o responsável confirmar.">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtro de movimentações">
        {([['todas', 'Todas'], ['nova', 'Não revisadas'], ['acao', 'Exigem atenção']] as const).map(([key, name]) => <Button key={key} type="button" size="sm" variant={filter === key ? 'default' : 'outline'} onClick={() => setFilter(key)}>{name}</Button>)}
      </div>
      {movements.isPending && <p className="text-xs text-muted-foreground">Carregando movimentações…</p>}
      {movements.isError && <p role="alert" className="text-xs text-destructive">Não foi possível carregar as movimentações.</p>}
      {!movements.isPending && !movements.isError && !rows.length && <Empty title="Nenhuma movimentação" description="Registre uma movimentação ou importe várias de uma vez abaixo. A integração automática com o DataJud será ligada em uma fase própria." />}
      <ol className="space-y-3">{rows.map(item => <li key={item.id} className="rounded-md border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tabular-nums">{dateLabel(item.occurred_on)}</span>
          <strong className="text-sm">{item.title}</strong>
          <span className="text-[11px] text-muted-foreground">Fonte: {label(movementSources, item.source)}</span>
          <div className="ml-auto flex gap-1">
            {item.review_state === 'nova' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void review(item, 'revisada')}><Check />Revisada</Button>}
            {item.review_state === 'nova' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void review(item, 'ignorada')}><EyeOff />Ignorar</Button>}
          </div>
        </div>
        <div className="mt-2"><MovementBadge movement={item} /></div>
        {item.detail && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.detail}</p>}
        {item.classification_note && <p className="mt-2 text-[11px] text-muted-foreground">Classificação automática por regra: {item.classification_note} Revise antes de agir.</p>}
      </li>)}</ol>
    </Section>
    <Section title="Adicionar movimentações" description="Registro manual ou importação em lote por texto. Duplicadas são ignoradas.">
      <SubSection title="Uma movimentação">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void add(); }}>
          <div><label className="field-label" htmlFor="m-date">Data *</label><Input id="m-date" type="date" value={form.occurred_on} onChange={event => setForm({ ...form, occurred_on: event.target.value })} required disabled={busy} /></div>
          <div><label className="field-label" htmlFor="m-title">Título *</label><Input id="m-title" value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} minLength={2} maxLength={300} required disabled={busy} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="m-detail">Texto da movimentação</label><Textarea id="m-detail" value={form.detail} onChange={event => setForm({ ...form, detail: event.target.value })} maxLength={20000} rows={3} disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy}><Plus />Registrar</Button></div>
        </form>
      </SubSection>
      <SubSection title="Importar várias">
        <p className="mb-2 text-xs text-muted-foreground">Uma por linha: <code>AAAA-MM-DD; Título; texto (opcional)</code></p>
        <Textarea aria-label="Movimentações para importar" value={bulk} onChange={event => setBulk(event.target.value)} rows={5} disabled={busy} placeholder="2026-10-01; Nomeação de perito; Fica nomeado o Dr. ..." />
        <div className="mt-3"><Button type="button" variant="outline" disabled={busy || !bulk.trim()} onClick={() => void importBulk()}><Upload />Importar</Button></div>
        {bulkReport && <pre className="mt-3 whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">{bulkReport}</pre>}
      </SubSection>
    </Section>
  </div>;
}
