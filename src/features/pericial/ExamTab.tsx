import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dateLabel } from '@/lib/format';
import { examModalities, examStatuses, findingKinds, label } from './pericial';
import { fail, type Exam, type Finding } from './api';
import { useCaseMutate } from './useCaseMutate';
import { Empty, Pill, Section, SubSection } from './ui';

// Exame pericial e achados. Os achados são registrados pelo médico: nada é preenchido por IA.
export default function ExamTab({ caseId }: { caseId: string }) {
  const { busy, mutate } = useCaseMutate();
  const [exam, setExam] = useState({ exam_on: '', modality: 'presencial', place: '', examined_party: '', method_notes: '' });
  const [finding, setFinding] = useState({ exam_id: '', kind: 'achado', title: '', detail: '' });
  const exams = useQuery({ queryKey: ['case-exams', caseId], queryFn: async () => fail<Exam[]>(supabase.from('amcf_exams').select('*').eq('case_id', caseId).order('exam_on', { ascending: false })) });
  const findings = useQuery({ queryKey: ['case-findings', caseId], queryFn: async () => fail<Finding[]>(supabase.from('amcf_exam_findings').select('*').eq('case_id', caseId).order('created_at')) });
  const addExam = () => mutate(() => supabase.from('amcf_exams').insert({ case_id: caseId, exam_on: exam.exam_on, modality: exam.modality, status: 'planejado', place: exam.place.trim(), examined_party: exam.examined_party.trim(), method_notes: exam.method_notes.trim() }).select('id'), 'Exame registrado.').then(ok => { if (ok) setExam({ exam_on: '', modality: 'presencial', place: '', examined_party: '', method_notes: '' }); });
  const setStatus = (item: Exam, status: 'realizado' | 'cancelado') => mutate(() => supabase.from('amcf_exams').update({ status }).eq('id', item.id).select('id'), status === 'realizado' ? 'Exame marcado como realizado.' : 'Exame cancelado.');
  const addFinding = () => mutate(() => supabase.from('amcf_exam_findings').insert({ case_id: caseId, exam_id: finding.exam_id, kind: finding.kind, title: finding.title.trim(), detail: finding.detail.trim() }).select('id'), 'Achado registrado.').then(ok => { if (ok) setFinding({ ...finding, title: '', detail: '' }); });
  const removeFinding = (item: Finding) => { if (window.confirm('Remover este achado? A ação fica na auditoria.')) void mutate(() => supabase.from('amcf_exam_findings').delete().eq('id', item.id).select('id'), 'Achado removido.'); };
  return <div className="space-y-6">
    <Section title="Exame pericial" description="Planeje e registre o exame. Os achados abaixo são do médico; o sistema não deduz achados.">
      {exams.isPending && <p className="text-xs text-muted-foreground">Carregando exames…</p>}
      {!exams.isPending && !exams.data?.length && <Empty title="Nenhum exame registrado" description="Registre a data, a modalidade e o local do exame." />}
      <ul className="space-y-4">{exams.data?.map(item => <li key={item.id} className="rounded-md border px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <strong className="text-sm">{dateLabel(item.exam_on)}</strong>
          <Pill tone="neutral">{label(examModalities, item.modality)}</Pill>
          <Pill tone={item.status === 'realizado' ? 'success' : item.status === 'cancelado' ? 'neutral' : 'warning'}>{label(examStatuses, item.status)}</Pill>
          <div className="ml-auto flex gap-1">
            {item.status === 'planejado' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void setStatus(item, 'realizado')}>Realizado</Button>}
            {item.status === 'planejado' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void setStatus(item, 'cancelado')}>Cancelar</Button>}
          </div>
        </div>
        {(item.place || item.examined_party) && <p className="mt-2 text-xs text-muted-foreground">{[item.place, item.examined_party].filter(Boolean).join(' · ')}</p>}
        {item.method_notes && <p className="mt-2 whitespace-pre-wrap text-xs leading-5">{item.method_notes}</p>}
        <ul className="mt-3 space-y-2">{(findings.data || []).filter(f => f.exam_id === item.id).map(f => <li key={f.id} className="flex items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <div className="min-w-0 flex-1"><p className="font-medium">{f.title} <span className="font-normal text-muted-foreground">· {label(findingKinds, f.kind)}</span></p>{f.detail && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{f.detail}</p>}</div>
          <Button variant="ghost" size="icon" aria-label="Remover achado" disabled={busy} onClick={() => removeFinding(f)}><Trash2 /></Button>
        </li>)}</ul>
      </li>)}</ul>
    </Section>
    <Section title="Registrar" description="Primeiro o exame, depois os achados vinculados a ele.">
      <SubSection title="Novo exame">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void addExam(); }}>
          <div><label className="field-label" htmlFor="e-on">Data *</label><Input id="e-on" type="date" value={exam.exam_on} onChange={event => setExam({ ...exam, exam_on: event.target.value })} required disabled={busy} /></div>
          <div><label className="field-label" htmlFor="e-mod">Modalidade</label><select id="e-mod" className="native-select" value={exam.modality} onChange={event => setExam({ ...exam, modality: event.target.value })} disabled={busy}>{Object.entries(examModalities).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div><label className="field-label" htmlFor="e-place">Local</label><Input id="e-place" value={exam.place} onChange={event => setExam({ ...exam, place: event.target.value })} maxLength={200} disabled={busy} /></div>
          <div><label className="field-label" htmlFor="e-party">Periciando(a)</label><Input id="e-party" value={exam.examined_party} onChange={event => setExam({ ...exam, examined_party: event.target.value })} maxLength={200} disabled={busy} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="e-notes">Método e observações</label><Textarea id="e-notes" value={exam.method_notes} onChange={event => setExam({ ...exam, method_notes: event.target.value })} rows={3} maxLength={4000} disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy}><Plus />Registrar exame</Button></div>
        </form>
      </SubSection>
      <SubSection title="Novo achado">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void addFinding(); }}>
          <div><label className="field-label" htmlFor="f-exam">Exame *</label><select id="f-exam" className="native-select" value={finding.exam_id} onChange={event => setFinding({ ...finding, exam_id: event.target.value })} required disabled={busy}><option value="">Selecione</option>{exams.data?.map(item => <option key={item.id} value={item.id}>{dateLabel(item.exam_on)} · {label(examModalities, item.modality)}</option>)}</select></div>
          <div><label className="field-label" htmlFor="f-kind">Tipo</label><select id="f-kind" className="native-select" value={finding.kind} onChange={event => setFinding({ ...finding, kind: event.target.value })} disabled={busy}>{Object.entries(findingKinds).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="f-title">Título *</label><Input id="f-title" value={finding.title} onChange={event => setFinding({ ...finding, title: event.target.value })} minLength={2} maxLength={200} required disabled={busy} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="f-detail">Descrição</label><Textarea id="f-detail" value={finding.detail} onChange={event => setFinding({ ...finding, detail: event.target.value })} rows={3} maxLength={4000} disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy || !exams.data?.length}><Plus />Registrar achado</Button></div>
        </form>
      </SubSection>
    </Section>
  </div>;
}
