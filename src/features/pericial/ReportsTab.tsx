import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, Copy, FileDown, FilePlus, Printer, Save } from 'lucide-react';
import { downloadWord, printAsPdf } from './exportDoc';
import { diffLines } from './textDiff';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fillTemplate, label, missingPlaceholders, readinessLines, reportKinds, reportStatuses } from './pericial';
import { approveReport, caseReadiness, fail, type Answer, type Exam, type Finding, type Movement, type Question, type Report, type Template } from './api';
import { runRpc, useCaseMutate } from './useCaseMutate';
import { Empty, Pill, Section, SubSection } from './ui';

interface CaseHeader { cnj_number: string | null; claimant: string | null; defendant: string | null; court_unit: string | null; court: string | null; claim_summary: string | null }
const PLACEHOLDER_MARK = '[a preencher pelo perito]';

// Laudos, petições e esclarecimentos: rascunhos montados com dados reais do processo. Conclusão e assinatura são do médico.
export default function ReportsTab({ caseId, header }: { caseId: string; header: CaseHeader }) {
  const { access } = useAuth();
  const { busy, mutate, cache } = useCaseMutate();
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [selected, setSelected] = useState('');
  const [body, setBody] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [compareId, setCompareId] = useState('');
  const templates = useQuery({ queryKey: ['report-templates'], queryFn: async () => fail<Template[]>(supabase.from('amcf_report_templates').select('*').order('name')) });
  const reports = useQuery({ queryKey: ['case-reports', caseId], queryFn: async () => fail<Report[]>(supabase.from('amcf_reports').select('*').eq('case_id', caseId).order('created_at', { ascending: false })) });
  const readiness = useQuery({ queryKey: ['case-readiness', caseId], queryFn: async () => caseReadiness(caseId) });
  const current = (reports.data || []).find(item => item.id === selected) || reports.data?.[0];
  const locked = current?.status === 'aprovado' || current?.status === 'substituido';
  const canApprove = !!access?.capabilities.manage;
  const lines = readinessLines(readiness.data);

  const build = async (): Promise<Record<string, string>> => {
    const [movements, questions, answers, exams, findings] = await Promise.all([
      fail<Movement[]>(supabase.from('amcf_movements').select('occurred_on,title,detail').eq('case_id', caseId).neq('review_state', 'ignorada').order('occurred_on')),
      fail<Question[]>(supabase.from('amcf_case_questions').select('id,number,text').eq('case_id', caseId).order('number')),
      fail<Answer[]>(supabase.from('amcf_question_answers').select('question_id,answer,status').eq('case_id', caseId)),
      fail<Exam[]>(supabase.from('amcf_exams').select('id,exam_on,modality,place').eq('case_id', caseId).order('exam_on')),
      fail<Finding[]>(supabase.from('amcf_exam_findings').select('exam_id,title,detail,kind').eq('case_id', caseId).order('created_at')),
    ]);
    const answerOf = (id: string) => answers.find(item => item.question_id === id);
    return {
      cnj: header.cnj_number || '', autor: header.claimant || '', re: header.defendant || '', vara: [header.court, header.court_unit].filter(Boolean).join(' — '), objeto: header.claim_summary || '',
      cronologia: movements.map(item => `- ${item.occurred_on}: ${item.title}`).join('\n'),
      achados: exams.map(exam => `Exame de ${exam.exam_on} (${exam.modality})${exam.place ? ', ' + exam.place : ''}:\n` + findings.filter(f => f.exam_id === exam.id).map(f => `  - ${f.title}${f.detail ? ': ' + f.detail : ''}`).join('\n')).join('\n'),
      quesitos: questions.map(q => `Quesito ${q.number}: ${q.text}\nResposta: ${answerOf(q.id)?.answer || PLACEHOLDER_MARK}`).join('\n\n'),
    };
  };
  const create = async () => {
    const template = (templates.data || []).find(item => item.id === templateId);
    if (!template) return;
    const values = await build().catch(() => null);
    if (!values) { await mutate(() => Promise.resolve({ error: new Error('Não foi possível reunir os dados do processo.') }), ''); return; }
    const missing = missingPlaceholders(template.body, values);
    const filled = fillTemplate(template.body, values).replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, PLACEHOLDER_MARK);
    const ok = await mutate(() => supabase.from('amcf_reports').insert({ case_id: caseId, kind: template.scope, title: title.trim() || template.name, version: (reports.data?.length || 0) + 1, status: 'rascunho', body: filled, template_id: template.id }).select('id'), missing.length ? `Rascunho criado. Campos a preencher: ${missing.join(', ')}.` : 'Rascunho criado.');
    if (ok) setTitle('');
  };
  const save = () => { if (!current) return; void mutate(() => supabase.from('amcf_reports').update({ body: body[current.id] ?? current.body, status: 'rascunho' }).eq('id', current.id).select('id'), 'Rascunho salvo.'); };
  const toReview = () => { if (current) void mutate(() => supabase.from('amcf_reports').update({ status: 'revisao' }).eq('id', current.id).select('id'), 'Enviado para revisão médica.'); };
  const approve = async () => { if (!current) return; if (!window.confirm('Aprovar este documento? Depois de aprovado ele não pode ser alterado: só nova versão.')) return; const result = await runRpc(() => approveReport(current.id, note.trim()), 'Documento aprovado.'); if (result) await cache.invalidateQueries(); };
  const copyText = async () => { if (!current) return; try { await navigator.clipboard.writeText(body[current.id] ?? current.body); } catch { /* sem permissão de área de transferência */ } };
  const text = current ? body[current.id] ?? current.body : '';
  const other = (reports.data || []).find(item => item.id === compareId && item.id !== current?.id);
  const diff = current && other ? diffLines(other.body, text) : undefined;
  const exportFile = (kind: 'word' | 'pdf') => {
    if (!current) return;
    const open = (text.match(/\[a preencher pelo perito\]/gi) || []).length;
    const approved = current.status === 'aprovado';
    if (open > 0 && !window.confirm(`Há ${open} campo(s) “[a preencher pelo perito]” em aberto. Exportar mesmo assim?`)) return;
    const footer = approved ? `Versão ${current.version} aprovada pelo médico responsável.` : `RASCUNHO — versão ${current.version}, não aprovado. Revisão e assinatura do médico responsável pendentes.`;
    (kind === 'word' ? downloadWord : printAsPdf)(current.title, text, footer);
  };
  const pending = (text.match(/\[a preencher pelo perito\]/gi) || []).length;
  return <div className="space-y-6">
    <Section title="Laudos, petições e esclarecimentos" description="O texto é montado com dados reais do processo; o que faltar fica marcado “[a preencher pelo perito]”. Nenhuma conclusão é gerada automaticamente e a aprovação é exclusiva do médico.">
      {reports.isPending && <p className="text-xs text-muted-foreground">Carregando…</p>}
      {!reports.isPending && !reports.data?.length && <Empty title="Nenhum documento" description="Crie um rascunho a partir de um modelo abaixo." />}
      {!!reports.data?.length && current && <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <select className="native-select max-w-sm" aria-label="Documento" value={current.id} onChange={event => setSelected(event.target.value)}>{reports.data.map(item => <option key={item.id} value={item.id}>v{item.version} · {item.title}</option>)}</select>
          <Pill tone="neutral">{label(reportKinds, current.kind)}</Pill>
          <Pill tone={current.status === 'aprovado' ? 'success' : 'warning'}>{label(reportStatuses, current.status)}</Pill>
          {!locked && pending > 0 && <Pill tone="warning">{pending} campo(s) a preencher</Pill>}
        </div>
        <Textarea aria-label="Texto do documento" value={text} onChange={event => setBody({ ...body, [current.id]: event.target.value })} rows={20} maxLength={200000} disabled={busy || locked} className="font-mono text-xs leading-5" />
        <div className="flex flex-wrap gap-2">
          {!locked && <Button size="sm" disabled={busy} onClick={save}><Save />Salvar rascunho</Button>}
          {!locked && current.status === 'rascunho' && <Button size="sm" variant="outline" disabled={busy} onClick={toReview}>Enviar para revisão médica</Button>}
          <Button size="sm" variant="outline" type="button" onClick={() => void copyText()}><Copy />Copiar texto</Button>
          <Button size="sm" variant="outline" type="button" onClick={() => exportFile('word')}><FileDown />Baixar Word</Button>
          <Button size="sm" variant="outline" type="button" onClick={() => exportFile('pdf')}><Printer />Salvar PDF</Button>
        </div>
        {reports.data.length > 1 && <div className="border-t pt-4">
          <label className="field-label" htmlFor="rp-compare">Comparar o texto acima com outra versão</label>
          <select id="rp-compare" className="native-select max-w-sm" value={compareId} onChange={event => setCompareId(event.target.value)}><option value="">Não comparar</option>{reports.data.filter(item => item.id !== current.id).map(item => <option key={item.id} value={item.id}>v{item.version} · {item.title}</option>)}</select>
          {other && diff === null && <p className="mt-2 text-xs text-muted-foreground">Texto longo demais para comparar no navegador.</p>}
          {other && diff && <div className="mt-3 max-h-96 overflow-auto rounded-md border bg-muted/20 p-3 font-mono text-xs leading-5" aria-label="Diferenças entre versões">
            <p className="mb-2 text-[11px] text-muted-foreground">Vermelho: só na v{other.version}. Verde: só na versão selecionada.</p>
            {diff.some(line => line.kind !== 'same') ? diff.map((line, index) => <div key={index} className={line.kind === 'add' ? 'bg-success/15' : line.kind === 'del' ? 'bg-destructive/15 line-through' : 'text-muted-foreground'}>{line.kind === 'add' ? '+ ' : line.kind === 'del' ? '− ' : '  '}{line.text || ' '}</div>) : <p>Os textos são idênticos.</p>}
          </div>}
        </div>}
        {!locked && canApprove && <div className="border-t pt-4">
          {!!lines.blocking.length && <div className="notice mb-3"><div><strong>Aprovação bloqueada pelo servidor:</strong><ul className="mt-1 list-disc pl-4">{lines.blocking.map(line => <li key={line}>{line}</li>)}</ul></div></div>}
          <label className="field-label" htmlFor="rp-note">Observação da aprovação</label><Input id="rp-note" value={note} onChange={event => setNote(event.target.value)} maxLength={1000} disabled={busy} />
          <div className="mt-3"><Button size="sm" disabled={busy || current.status !== 'revisao'} onClick={() => void approve()}><BadgeCheck />Aprovar (médico)</Button>{current.status !== 'revisao' && <span className="ml-3 text-xs text-muted-foreground">Envie para revisão antes de aprovar.</span>}</div>
        </div>}
        {locked && <p className="text-xs text-muted-foreground">Versão aprovada: imutável. Crie uma nova versão para alterar.</p>}
      </div>}
    </Section>
    <Section title="Novo documento">
      <SubSection title="A partir de um modelo">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void create(); }}>
          <div><label className="field-label" htmlFor="rp-template">Modelo *</label><select id="rp-template" className="native-select" value={templateId} onChange={event => setTemplateId(event.target.value)} required disabled={busy}><option value="">Selecione</option>{templates.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
          <div><label className="field-label" htmlFor="rp-title">Título</label><Input id="rp-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy || !templateId}><FilePlus />Criar rascunho</Button></div>
        </form>
      </SubSection>
    </Section>
  </div>;
}
