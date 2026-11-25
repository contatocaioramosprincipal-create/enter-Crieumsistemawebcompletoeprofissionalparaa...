import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { answerStatuses, label, questionAuthors, questionStatuses } from './pericial';
import { fail, type Answer, type Question } from './api';
import { useCaseMutate } from './useCaseMutate';
import { Empty, Pill, Section, SubSection } from './ui';

// Quesitos e respostas. Respostas aprovadas ficam imutáveis (regra do banco); a aprovação formal é do médico.
export default function QuestionsTab({ caseId }: { caseId: string }) {
  const { busy, mutate } = useCaseMutate();
  const [form, setForm] = useState({ author_kind: 'juizo', author_detail: '', topic: '', text: '' });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const questions = useQuery({ queryKey: ['case-questions', caseId], queryFn: async () => fail<Question[]>(supabase.from('amcf_case_questions').select('*').eq('case_id', caseId).order('number')) });
  const answers = useQuery({ queryKey: ['case-answers', caseId], queryFn: async () => fail<Answer[]>(supabase.from('amcf_question_answers').select('*').eq('case_id', caseId)) });
  const answerOf = (questionId: string) => (answers.data || []).find(item => item.question_id === questionId);
  const nextNumber = Math.max(0, ...(questions.data || []).map(item => item.number)) + 1;
  const add = () => mutate(() => supabase.from('amcf_case_questions').insert({ case_id: caseId, number: nextNumber, author_kind: form.author_kind, author_detail: form.author_detail.trim(), topic: form.topic.trim(), text: form.text.trim(), position: nextNumber }).select('id'), 'Quesito registrado.').then(ok => { if (ok) setForm({ ...form, author_detail: '', topic: '', text: '' }); });
  const saveAnswer = (question: Question) => {
    const text = (drafts[question.id] ?? answerOf(question.id)?.answer ?? '').trim();
    const current = answerOf(question.id);
    if (current) return mutate(() => supabase.from('amcf_question_answers').update({ answer: text, status: 'rascunho' }).eq('id', current.id).select('id'), 'Rascunho de resposta salvo.');
    return mutate(() => supabase.from('amcf_question_answers').insert({ question_id: question.id, case_id: caseId, answer: text, status: 'rascunho' }).select('id'), 'Rascunho de resposta salvo.');
  };
  const setAnswerStatus = (answer: Answer, status: 'revisao' | 'revisada') => mutate(() => supabase.from('amcf_question_answers').update({ status }).eq('id', answer.id).select('id'), status === 'revisao' ? 'Enviada para revisão médica.' : 'Resposta marcada como revisada.');
  const markImpugned = (question: Question) => mutate(() => supabase.from('amcf_case_questions').update({ status: 'impugnada' }).eq('id', question.id).select('id'), 'Quesito marcado como impugnado.');
  const remove = (question: Question) => { if (window.confirm('Remover este quesito e a resposta vinculada? A ação fica na auditoria.')) void mutate(() => supabase.from('amcf_case_questions').delete().eq('id', question.id).select('id'), 'Quesito removido.'); };
  return <div className="space-y-6">
    <Section title="Quesitos e respostas" description="Respostas são rascunhos até a revisão do médico. Nada aqui é conclusão pericial: a redação final e a assinatura são do responsável.">
      {questions.isPending && <p className="text-xs text-muted-foreground">Carregando quesitos…</p>}
      {questions.isError && <p role="alert" className="text-xs text-destructive">Não foi possível carregar os quesitos.</p>}
      {!questions.isPending && !questions.isError && !questions.data?.length && <Empty title="Nenhum quesito" description="Cadastre os quesitos do juízo e das partes para responder item por item." />}
      <ol className="space-y-4">{questions.data?.map(question => {
        const answer = answerOf(question.id);
        const locked = answer?.status === 'aprovada';
        return <li key={question.id} className="rounded-md border px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <strong className="text-sm">Quesito {question.number}</strong>
            <Pill tone="neutral">{label(questionAuthors, question.author_kind)}{question.author_detail ? ` · ${question.author_detail}` : ''}</Pill>
            <Pill tone={question.status === 'revisada' ? 'success' : question.status === 'aberta' ? 'warning' : 'neutral'}>{label(questionStatuses, question.status)}</Pill>
            {answer && <Pill tone={answer.status === 'aprovada' || answer.status === 'revisada' ? 'success' : 'warning'}>Resposta: {label(answerStatuses, answer.status)}</Pill>}
            <div className="ml-auto flex gap-1">
              {question.status !== 'impugnada' && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void markImpugned(question)}>Impugnar</Button>}
              <Button variant="ghost" size="icon" aria-label="Remover quesito" disabled={busy || locked} onClick={() => remove(question)}><Trash2 /></Button>
            </div>
          </div>
          {question.topic && <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{question.topic}</p>}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{question.text}</p>
          <div className="mt-3">
            <label className="field-label" htmlFor={`a-${question.id}`}>Resposta (rascunho)</label>
            <Textarea id={`a-${question.id}`} value={drafts[question.id] ?? answer?.answer ?? ''} onChange={event => setDrafts({ ...drafts, [question.id]: event.target.value })} rows={4} maxLength={20000} disabled={busy || locked} placeholder="Responda com base nos documentos e no exame. Cite a fonte (documento e página)." />
            {!locked && <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => void saveAnswer(question)}><Save />Salvar rascunho</Button>
              {answer && answer.status === 'rascunho' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void setAnswerStatus(answer, 'revisao')}>Enviar para revisão médica</Button>}
              {answer && answer.status === 'revisao' && <Button size="sm" variant="outline" disabled={busy} onClick={() => void setAnswerStatus(answer, 'revisada')}>Marcar como revisada</Button>}
            </div>}
            {locked && <p className="mt-2 text-xs text-muted-foreground">Resposta aprovada: não pode mais ser alterada.</p>}
          </div>
        </li>;
      })}</ol>
    </Section>
    <Section title="Cadastrar quesito" description="Copie o texto exatamente como consta nos autos.">
      <SubSection title="Novo quesito">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); void add(); }}>
          <div><label className="field-label" htmlFor="q-author">Autor</label><select id="q-author" className="native-select" value={form.author_kind} onChange={event => setForm({ ...form, author_kind: event.target.value })} disabled={busy}>{Object.entries(questionAuthors).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
          <div><label className="field-label" htmlFor="q-detail">Identificação do autor</label><Input id="q-detail" value={form.author_detail} onChange={event => setForm({ ...form, author_detail: event.target.value })} maxLength={160} disabled={busy} placeholder="Ex.: advogado, manifestação, folha" /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="q-topic">Tema</label><Input id="q-topic" value={form.topic} onChange={event => setForm({ ...form, topic: event.target.value })} maxLength={160} disabled={busy} /></div>
          <div className="sm:col-span-2"><label className="field-label" htmlFor="q-text">Texto do quesito *</label><Textarea id="q-text" value={form.text} onChange={event => setForm({ ...form, text: event.target.value })} rows={3} maxLength={4000} required disabled={busy} /></div>
          <div className="sm:col-span-2"><Button disabled={busy}><Plus />Adicionar quesito {nextNumber}</Button></div>
        </form>
      </SubSection>
    </Section>
  </div>;
}
