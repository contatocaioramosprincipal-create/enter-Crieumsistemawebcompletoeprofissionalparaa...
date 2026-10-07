import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Plus, Save, ShieldAlert, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dateLabel } from '@/lib/format';
import { actionTypes, cnjError, formatCnj, isValidCnj, label, readinessLines, stepStatuses } from './pericial';
import { caseInputSummary, caseNextAction, caseReadiness, fail, type CaseStep, type Readiness } from './api';
import { useCaseMutate } from './useCaseMutate';
import { Empty, KeyValue, NextActionBar, Pill, Score, Section, SubSection } from './ui';

interface CaseProcess { id: string; cnj_number: string | null; action_type: string | null; court: string | null; court_unit: string | null; claimant: string | null; defendant: string | null; claim_summary: string | null }

export default function ProcessOverviewTab({ item }: { item: CaseProcess }) {
  const { busy, mutate } = useCaseMutate();
  const [draft, setDraft] = useState({ cnj: item.cnj_number || '', action_type: item.action_type || 'pericia_judicial', court: item.court || '', court_unit: item.court_unit || '', claimant: item.claimant || '', defendant: item.defendant || '', claim_summary: item.claim_summary || '' });
  const [step, setStep] = useState({ label: '', detail: '', next_action: '', next_action_on: '' });
  const cnjMessage = cnjError(draft.cnj);
  const steps = useQuery({ queryKey: ['case-steps', item.id], queryFn: async () => fail<CaseStep[]>(supabase.from('amcf_case_steps').select('*').eq('case_id', item.id).order('position')) });
  const readiness = useQuery({ queryKey: ['case-readiness', item.id], queryFn: async () => caseReadiness(item.id) });
  const summary = useQuery({ queryKey: ['case-input-summary', item.id], queryFn: async () => caseInputSummary(item.id) });
  const next = useQuery({ queryKey: ['case-next-action', item.id], queryFn: async () => caseNextAction(item.id) });
  const save = () => mutate(() => supabase.from('amcf_cases').update({ cnj_number: draft.cnj.trim() ? formatCnj(draft.cnj) : null, action_type: draft.action_type || null, court: draft.court || null, court_unit: draft.court_unit || null, claimant: draft.claimant || null, defendant: draft.defendant || null, claim_summary: draft.claim_summary || null }).eq('id', item.id).select('id'), 'Dados do processo atualizados.');
  const addStep = () => mutate(() => supabase.from('amcf_case_steps').insert({ case_id: item.id, label: step.label, detail: step.detail, next_action: step.next_action, next_action_on: step.next_action_on || null, position: (steps.data?.length || 0) + 1, status: 'pendente' }).select('id'), 'Etapa registrada.').then(ok => { if (ok) setStep({ label: '', detail: '', next_action: '', next_action_on: '' }); });
  const readinessLinesValue = readinessLines(readiness.data as Readiness | undefined);
  return <div className="space-y-6">
    <NextActionBar next={next.data || null} />
    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Dados do processo" description="Preencha apenas o que existe no processo. Nenhum dado é completado automaticamente.">
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (cnjMessage) return; void save(); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="p-cnj">Número único CNJ</label><Input id="p-cnj" value={draft.cnj} onChange={event => setDraft({ ...draft, cnj: formatCnj(event.target.value) })} placeholder="0000000-00.0000.0.00.0000" disabled={busy} aria-invalid={!!cnjMessage} aria-describedby="p-cnj-hint" />{cnjMessage && <p id="p-cnj-hint" role="alert" className="mt-1 text-[11px] text-destructive">{cnjMessage}</p>}</div>
            <div><label className="field-label" htmlFor="p-action">Tipo de atuação</label><select id="p-action" className="native-select" value={draft.action_type} onChange={event => setDraft({ ...draft, action_type: event.target.value })} disabled={busy}>{Object.entries(actionTypes).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
            <div><label className="field-label" htmlFor="p-court">Tribunal</label><Input id="p-court" value={draft.court} onChange={event => setDraft({ ...draft, court: event.target.value })} maxLength={160} disabled={busy} /></div>
            <div><label className="field-label" htmlFor="p-unit">Vara / unidade</label><Input id="p-unit" value={draft.court_unit} onChange={event => setDraft({ ...draft, court_unit: event.target.value })} maxLength={160} disabled={busy} /></div>
            <div><label className="field-label" htmlFor="p-claimant">Autor(es)</label><Input id="p-claimant" value={draft.claimant} onChange={event => setDraft({ ...draft, claimant: event.target.value })} maxLength={200} disabled={busy} /></div>
            <div><label className="field-label" htmlFor="p-defendant">Réu(s)</label><Input id="p-defendant" value={draft.defendant} onChange={event => setDraft({ ...draft, defendant: event.target.value })} maxLength={200} disabled={busy} /></div>
          </div>
          <div><label className="field-label" htmlFor="p-claim">Objeto da ação (resumo administrativo)</label><Textarea id="p-claim" value={draft.claim_summary} onChange={event => setDraft({ ...draft, claim_summary: event.target.value })} maxLength={4000} rows={4} disabled={busy} /></div>
          <Button disabled={busy || !!cnjMessage}><Save />Salvar dados do processo</Button>
        </form>
      </Section>
      <div className="space-y-6">
        <Section title="Prontidão para o laudo" description="Calculada no servidor a partir dos registros do processo. Aprovações não são liberadas com quesito pendente.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Score value={readiness.data?.questions_pending ?? '—'} caption="Quesitos sem resposta revisada" />
            <Score value={readiness.data?.unsourced_items ?? '—'} caption="Itens da análise sem fonte" />
            <Score value={readiness.data?.documents_without_text ?? '—'} caption="Documentos sem texto" />
            <Score value={readiness.data?.movements_unreviewed ?? '—'} caption="Movimentações não revisadas" />
          </div>
          {!!readinessLinesValue.blocking.length && <div className="notice mt-4"><ShieldAlert size={16} className="shrink-0" /><div><strong>Aprovação bloqueada:</strong><ul className="mt-1 list-disc pl-4">{readinessLinesValue.blocking.map(line => <li key={line}>{line}</li>)}</ul></div></div>}
          {!!readinessLinesValue.warnings.length && <div className="mt-4 text-xs leading-6 text-muted-foreground"><p className="font-medium text-foreground">Avisos (não bloqueiam)</p><ul className="mt-1 list-disc pl-4">{readinessLinesValue.warnings.map(line => <li key={line}>{line}</li>)}</ul></div>}
          {!readinessLinesValue.blocking.length && !readinessLinesValue.warnings.length && !readiness.isPending && <p className="mt-3 text-xs text-muted-foreground">Sem pendências registradas até o momento.</p>}
        </Section>
        <Section title="Registros do processo" description="Contagem real dos insumos que alimentam a análise pericial.">
          <KeyValue items={[
            { label: 'Documentos', value: `${summary.data?.documents ?? '—'} (${summary.data?.documents_with_text ?? 0} com texto, ${summary.data?.pages ?? 0} páginas)` },
            { label: 'Movimentações', value: `${summary.data?.movements ?? '—'} (${summary.data?.movements_unreviewed ?? 0} não revisadas)` },
            { label: 'Quesitos', value: `${summary.data?.questions ?? '—'} (${summary.data?.questions_open ?? 0} em aberto)` },
            { label: 'Exame', value: `${summary.data?.exams ?? '—'} exame(s), ${summary.data?.findings ?? 0} achado(s)` },
            { label: 'Referências verificadas', value: `${summary.data?.references_verified ?? 0} de ${summary.data?.references ?? 0}` },
            { label: 'Etapas em aberto', value: summary.data?.steps_open ?? '—' },
          ]} />
        </Section>
      </div>
    </div>
    <Section title="Etapas da atuação" description="Cada etapa registra o que foi feito, a próxima ação e a data prevista. O histórico não é reescrito.">
      {steps.isPending && <p className="text-xs text-muted-foreground">Carregando etapas…</p>}
      {!steps.isPending && !steps.data?.length && <Empty title="Nenhuma etapa registrada" description="Registre a primeira etapa da atuação para acompanhar a próxima ação do processo." />}
      <ol className="space-y-3">{steps.data?.map(itemStep => <li key={itemStep.id} className="rounded-md border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">{itemStep.position}.</span>
          <strong className="text-sm">{itemStep.label}</strong>
          <Pill tone={itemStep.status === 'concluida' ? 'success' : itemStep.status === 'cancelada' ? 'neutral' : 'warning'}>{label(stepStatuses, itemStep.status)}</Pill>
          {itemStep.completed_at && <span className="text-[11px] text-muted-foreground">Concluída em {dateLabel(itemStep.completed_at)}</span>}
          <div className="ml-auto flex gap-1">
            {itemStep.status !== 'concluida' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void mutate(() => supabase.from('amcf_case_steps').update({ status: 'concluida' }).eq('id', itemStep.id).select('id'), 'Etapa concluída.')}><Check />Concluir</Button>}
            <Button variant="ghost" size="icon" aria-label="Remover etapa" disabled={busy || itemStep.status === 'concluida'} onClick={() => { if (window.confirm('Remover esta etapa? A ação fica registrada na auditoria.')) void mutate(() => supabase.from('amcf_case_steps').delete().eq('id', itemStep.id).select('id'), 'Etapa removida.'); }}><Trash2 /></Button>
          </div>
        </div>
        {itemStep.detail && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{itemStep.detail}</p>}
        {itemStep.next_action && <p className="mt-2 text-xs"><strong>Próxima ação:</strong> {itemStep.next_action}{itemStep.next_action_on ? ` · prevista para ${dateLabel(itemStep.next_action_on)}` : ''}</p>}
      </li>)}</ol>
      <SubSection title="Registrar etapa">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void addStep(); }}>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="s-label">Etapa *</label><Input id="s-label" value={step.label} onChange={event => setStep({ ...step, label: event.target.value })} minLength={2} maxLength={160} required disabled={busy} /></div>
          <div><label className="field-label" htmlFor="s-next">Próxima ação</label><Input id="s-next" value={step.next_action} onChange={event => setStep({ ...step, next_action: event.target.value })} maxLength={500} disabled={busy} /></div>
          <div><label className="field-label" htmlFor="s-on">Data prevista</label><Input id="s-on" type="date" value={step.next_action_on} onChange={event => setStep({ ...step, next_action_on: event.target.value })} disabled={busy} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="s-detail">Descrição</label><Textarea id="s-detail" value={step.detail} onChange={event => setStep({ ...step, detail: event.target.value })} maxLength={2000} rows={3} disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy}><Plus />Adicionar etapa</Button></div>
        </form>
      </SubSection>
    </Section>
    {item.cnj_number && !isValidCnj(item.cnj_number) && <p className="text-xs text-destructive">O número CNJ salvo não segue o padrão esperado. Revise o cadastro.</p>}
  </div>;
}
