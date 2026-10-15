import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Plus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { analysisSections, analysisStatuses, itemKinds, label } from './pericial';
import { approveAnalysis, composeAnalysis, createAnalysis, fail, loadSources, type Analysis, type AnalysisItem, type SourceRow } from './api';
import { runRpc, useCaseMutate } from './useCaseMutate';
import { Empty, Pill, Section, SourceList } from './ui';

// Análise do processo: cada item nasce de um registro real e carrega sua fonte. A aprovação é do médico.
export default function AnalysisTab({ caseId }: { caseId: string }) {
  const { access } = useAuth();
  const { busy, mutate, cache } = useCaseMutate();
  const [title, setTitle] = useState('Análise pericial');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState('');
  const analyses = useQuery({ queryKey: ['case-analyses', caseId], queryFn: async () => fail<Analysis[]>(supabase.from('amcf_case_analyses').select('*').eq('case_id', caseId).order('version', { ascending: false })) });
  const current = (analyses.data || []).find(item => item.id === selected) || analyses.data?.[0];
  const items = useQuery({ queryKey: ['analysis-items', current?.id], enabled: !!current, queryFn: async () => fail<AnalysisItem[]>(supabase.from('amcf_analysis_items').select('*').eq('analysis_id', current!.id).order('section').order('position')) });
  const sources = useQuery({ queryKey: ['analysis-sources', current?.id, items.data?.length], enabled: !!items.data?.length, queryFn: async () => loadSources('item_analise', (items.data || []).map(item => item.id)) });
  const sourcesOf = (id: string): SourceRow[] => (sources.data || []).filter(source => source.owner_id === id);
  const canApprove = !!access?.capabilities.manage;
  const locked = current?.status === 'aprovada' || current?.status === 'substituida';
  const refresh = async () => { await cache.invalidateQueries(); };
  const create = async () => { const id = await runRpc(() => createAnalysis(caseId, title.trim() || 'Análise pericial', current?.id), 'Nova análise criada.'); if (id) { setSelected(String(id)); await refresh(); } };
  const compose = async () => { if (!current) return; const result = await runRpc(() => composeAnalysis(current.id), 'Análise atualizada a partir dos registros do processo.'); if (result) await refresh(); };
  const approve = async () => { if (!current) return; if (!window.confirm('Aprovar esta análise? Depois de aprovada ela não pode ser alterada: só nova versão.')) return; const result = await runRpc(() => approveAnalysis(current.id, note.trim()), 'Análise aprovada.'); if (result) await refresh(); };
  const toReview = () => { if (current) void mutate(() => supabase.from('amcf_case_analyses').update({ status: 'revisao' }).eq('id', current.id).select('id'), 'Análise enviada para revisão médica.'); };
  const sections = Object.keys(analysisSections) as (keyof typeof analysisSections)[];
  return <div className="space-y-6">
    <Section title="Análise do processo" description="Monta cronologia, evidências e lacunas só a partir de movimentações, documentos, achados e quesitos já registrados. Cada item mostra a fonte. Não contém conclusão pericial.">
      {analyses.isPending && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!analyses.isPending && !analyses.data?.length && <Empty title="Nenhuma análise" description="Crie a primeira análise e depois use “Atualizar a partir dos registros”." />}
      {!!analyses.data?.length && current && <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select className="native-select max-w-xs" aria-label="Versão da análise" value={current.id} onChange={event => setSelected(event.target.value)}>{analyses.data.map(item => <option key={item.id} value={item.id}>v{item.version} · {item.title}</option>)}</select>
          <Pill tone={current.status === 'aprovada' ? 'success' : 'warning'}>{label(analysisStatuses, current.status)}</Pill>
          <span className="text-[11px] text-muted-foreground">Método: {current.method === 'composicao' ? 'composição local a partir dos registros' : current.method || 'manual'}</span>
          {!locked && <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void compose()}><RefreshCw />Atualizar a partir dos registros</Button>
            {current.status === 'rascunho' && <Button size="sm" variant="outline" disabled={busy} onClick={toReview}>Enviar para revisão médica</Button>}
          </div>}
        </div>
        {sections.map(section => {
          const list = (items.data || []).filter(item => item.section === section);
          if (!list.length) return null;
          return <div key={section}><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{analysisSections[section]}</h3>
            <ul className="mt-2 space-y-3">{list.map(item => <li key={item.id} className="rounded-md border px-4 py-3">
              <div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{item.title}</strong><Pill tone={item.kind === 'registro' ? 'success' : 'warning'}>{label(itemKinds, item.kind)}</Pill></div>
              {item.content && <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{item.content.length > 900 ? item.content.slice(0, 900) + '…' : item.content}</p>}
              <SourceList sources={sourcesOf(item.id)} />
            </li>)}</ul></div>;
        })}
        {!items.isPending && !items.data?.length && <p className="text-xs text-muted-foreground">Esta análise ainda não tem itens. Use “Atualizar a partir dos registros”.</p>}
        {!!current.warnings?.length && <ul className="list-disc pl-4 text-xs text-muted-foreground">{current.warnings.map(warning => <li key={String(warning)}>{String(warning)}</li>)}</ul>}
        {canApprove && !locked && <div className="border-t pt-4"><label className="field-label" htmlFor="an-note">Observação da aprovação</label><Input id="an-note" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} disabled={busy} /><div className="mt-3"><Button size="sm" disabled={busy} onClick={() => void approve()}><BadgeCheck />Aprovar análise (médico)</Button></div></div>}
        {locked && <p className="text-xs text-muted-foreground">Versão {current.status === 'aprovada' ? 'aprovada' : 'substituída'}: imutável. Para alterar, crie nova versão abaixo.</p>}
      </div>}
    </Section>
    <Section title={analyses.data?.length ? 'Nova versão' : 'Criar análise'}>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); void create(); }}>
        <div className="min-w-60 flex-1"><label className="field-label" htmlFor="an-title">Título</label><Input id="an-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={160} disabled={busy} /></div>
        <Button disabled={busy}><Plus />{analyses.data?.length ? 'Criar nova versão a partir da atual' : 'Criar análise'}</Button>
      </form>
    </Section>
  </div>;
}
