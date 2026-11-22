import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Save, BookOpen, Archive, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import LookupInput from '@/features/registry/LookupInput';
import { currency, dateLabel, errorMessage } from '@/lib/format';

const centsFromBRL = (text: string) => {
  const clean = text.replace(/[R$\s]/g, '').trim().replace(/\./g, '').replace(',', '.');
  const number = Number(clean);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
};
const statusLabels: Record<string, string> = { draft: 'Rascunho', sent: 'Enviada', accepted: 'Aceita', refused: 'Recusada', expired: 'Expirada' };

export default function HonorariosPropostasPage() {
  const { access } = useAuth();
  const canManage = !!access?.capabilities.finance;
  const memberId = access?.member?.id;
  const cache = useQueryClient();
  const [params] = useSearchParams();
  const [caseId, setCaseId] = useState(params.get('caso') || '');
  const [templateId, setTemplateId] = useState('');
  const [proposalTitle, setProposalTitle] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ title: '', service: 'Perícia médica', description: '', amount: '' });

  const templates = useQuery({ queryKey: ['amcf-fee-templates'], queryFn: async () => {
    const r = await supabase.from('amcf_fee_templates').select('*').order('title');
    if (r.error) throw r.error;
    return r.data;
  } });
  const caseInfo = useQuery({ queryKey: ['proposal-target-case', caseId], enabled: !!caseId, queryFn: async () => {
    const r = await supabase.from('amcf_cases').select('id,contact_id,reference,cnj_number,title').eq('id', caseId).maybeSingle();
    if (r.error) throw r.error;
    return r.data;
  } });
  const proposals = useQuery({ queryKey: ['amcf-case-proposals'], queryFn: async () => {
    const r = await supabase.from('amcf_proposals').select('id,title,amount_cents,status,case_id,created_at,linked_case:amcf_cases(reference,cnj_number,title)').order('created_at', { ascending: false }).limit(100);
    if (r.error) throw r.error;
    return r.data;
  } });
  const selectedTemplate = templates.data?.find(t => t.id === templateId && t.active);

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManage) return;
    const amount_cents = centsFromBRL(newTemplate.amount);
    if (!amount_cents) return toast.error('Informe um valor válido maior que zero.');
    if (newTemplate.title.trim().length < 3 || newTemplate.service.trim().length < 2) return toast.error('Informe nome e serviço.');
    setBusy(true);
    try {
      const r = await supabase.from('amcf_fee_templates').insert({
        title: newTemplate.title.trim(), service: newTemplate.service.trim(),
        description: newTemplate.description.trim(), amount_cents
      }).select('id');
      if (r.error || !r.data?.length) throw r.error || new Error('Modelo não gravado.');
      await cache.invalidateQueries({ queryKey: ['amcf-fee-templates'] });
      setNewTemplate({ title: '', service: 'Perícia médica', description: '', amount: '' });
      setShowTemplateForm(false);
      toast.success('Modelo de honorários cadastrado.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const toggleTemplate = async (id: string, active: boolean) => {
    if (!canManage) return;
    setBusy(true);
    try {
      const r = await supabase.from('amcf_fee_templates').update({ active: !active }).eq('id', id).select('id');
      if (r.error || !r.data?.length) throw r.error || new Error('Sem permissão.');
      await cache.invalidateQueries({ queryKey: ['amcf-fee-templates'] });
      toast.success(active ? 'Modelo desativado.' : 'Modelo reativado.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };

  const setProposalStatus = async (id: string, status: string) => {
    if (!canManage || !Object.hasOwn(statusLabels, status)) return;
    setStatusBusy(id);
    try {
      const result = await supabase.from('amcf_proposals').update({ status }).eq('id', id).select('id');
      if (result.error || !result.data?.length) throw result.error || new Error('Atualização não autorizada.');
      await Promise.all([cache.invalidateQueries({ queryKey: ['amcf-case-proposals'] }), cache.invalidateQueries({ queryKey: ['case-proposals'] })]);
      toast.success('Situação da proposta atualizada.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setStatusBusy(null); }
  };

  const saveProposal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!caseId || !caseInfo.data || !memberId || !selectedTemplate) return toast.error('Selecione o processo e um modelo ativo de honorários.');
    setBusy(true);
    try {
      const r = await supabase.from('amcf_proposals').insert({
        title: proposalTitle.trim() || `Proposta de honorários — ${selectedTemplate.title}`,
        contact_id: caseInfo.data.contact_id, case_id: caseId,
        fee_template_id: selectedTemplate.id,
        service: selectedTemplate.service, description: selectedTemplate.description,
        amount_cents: selectedTemplate.amount_cents, valid_until: validUntil || null,
        notes: notes.trim(), status: 'draft', responsible_id: memberId
      }).select('id');
      if (r.error || !r.data?.length) throw r.error || new Error('Proposta não gravada.');
      setTemplateId(''); setProposalTitle(''); setValidUntil(''); setNotes('');
      await cache.invalidateQueries({ queryKey: ['amcf-case-proposals'] });
      toast.success('Proposta vinculada ao processo. Status: rascunho.');
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setBusy(false); }
  };

  return <div className="space-y-6">
    <PageHeader eyebrow="GESTÃO PROCESSUAL" title="Propostas de honorários" description="Escolha valores configurados pelo médico e vincule cada proposta ao número do processo. Assistentes criam somente rascunhos autorizados." />
    <section className="data-panel p-6">
      <h2 className="text-sm font-semibold">Nova proposta vinculada ao processo</h2>
      <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={saveProposal}>
        <div className="sm:col-span-2"><label className="field-label">Nº processo / caso *</label><LookupInput table="amcf_cases" value={caseId} onChange={setCaseId} required disabled={busy} label="Processo vinculado" />{caseInfo.data && <p className="mt-2 text-xs text-muted-foreground">Processo: {caseInfo.data.cnj_number || caseInfo.data.reference} · {caseInfo.data.title}</p>}</div>
        <div className="sm:col-span-2"><label htmlFor="fee-template" className="field-label">Tabela de honorários — selecione o valor *</label>
          <select className="native-select" id="fee-template" required value={templateId} onChange={e => setTemplateId(e.target.value)} disabled={busy || templates.isPending}>
            <option value="">Selecione um modelo previamente configurado</option>
            {templates.data?.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.title} · {currency(t.amount_cents)}</option>)}
          </select>
          {selectedTemplate && <p className="mt-2 text-xs text-muted-foreground">{selectedTemplate.service} · {selectedTemplate.description || 'Sem descrição adicional'}</p>}
          {!templates.isPending && !templates.data?.some(t => t.active) && <p className="mt-2 text-xs text-muted-foreground">Nenhum valor cadastrado. Um administrador ou o médico deve configurar os modelos primeiro.</p>}
        </div>
        <div className="sm:col-span-2"><label htmlFor="proposal-title" className="field-label">Título da proposta (opcional)</label><Input id="proposal-title" value={proposalTitle} onChange={e => setProposalTitle(e.target.value)} maxLength={200} disabled={busy} /></div>
        <div><label htmlFor="proposal-valid" className="field-label">Validade (opcional)</label><Input id="proposal-valid" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} disabled={busy} /></div>
        <div><label className="field-label">Valor selecionado</label><div className="rounded-md border px-3 py-2 text-sm font-semibold tabular-nums">{selectedTemplate ? currency(selectedTemplate.amount_cents) : 'Selecione um modelo'}</div></div>
        <div className="sm:col-span-2"><label htmlFor="proposal-notes" className="field-label">Observações administrativas</label><Textarea id="proposal-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} rows={3} disabled={busy} /></div>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy || !caseInfo.data || !selectedTemplate || !memberId}><Save />{busy ? 'Salvando…' : 'Salvar proposta em rascunho'}</Button></div>
      </form>
      <p className="mt-3 text-xs text-muted-foreground">O salvamento de uma proposta não registra automaticamente recebimento, depósito ou honorário liquidado.</p>
    </section>
    {canManage && <section className="data-panel p-6">
      <div className="flex items-center justify-between gap-4"><div><h2 className="text-sm font-semibold">Tabela de valores configuráveis</h2><p className="mt-1 text-xs text-muted-foreground">Somente administrador e médico podem cadastrar ou alterar opções de valor.</p></div><Button variant="outline" onClick={() => setShowTemplateForm(v => !v)}><Plus />Novo valor</Button></div>
      {showTemplateForm && <form onSubmit={saveTemplate} className="mt-5 grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <div><label htmlFor="fee-title" className="field-label">Nome do modelo *</label><Input id="fee-title" value={newTemplate.title} onChange={e => setNewTemplate(v => ({ ...v, title: e.target.value }))} minLength={3} maxLength={160} required disabled={busy} placeholder="Ex.: Perícia judicial" /></div>
        <div><label htmlFor="fee-service" className="field-label">Tipo de serviço *</label><Input id="fee-service" value={newTemplate.service} onChange={e => setNewTemplate(v => ({ ...v, service: e.target.value }))} minLength={2} maxLength={160} required disabled={busy} /></div>
        <div><label htmlFor="fee-amount" className="field-label">Valor em reais (R$) *</label><Input id="fee-amount" inputMode="decimal" placeholder="Ex.: 1.500,00" value={newTemplate.amount} onChange={e => setNewTemplate(v => ({ ...v, amount: e.target.value }))} required disabled={busy} /></div>
        <div className="sm:col-span-2"><label htmlFor="fee-description" className="field-label">Descrição do escopo</label><Textarea id="fee-description" value={newTemplate.description} onChange={e => setNewTemplate(v => ({ ...v, description: e.target.value }))} maxLength={4000} disabled={busy} /></div>
        <div className="sm:col-span-2"><Button disabled={busy}><Save />Salvar opção de honorários</Button></div>
      </form>}
      <div className="mt-4 space-y-2">{templates.data?.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"><div><strong className="text-sm">{t.title}</strong><p className="mt-1 text-xs text-muted-foreground">{t.service} · {currency(t.amount_cents)} · {t.active ? 'Ativo' : 'Inativo'}</p></div><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void toggleTemplate(t.id, t.active)}><Archive size={14} />{t.active ? 'Desativar' : 'Reativar'}</Button></div>)}</div>
    </section>}
    <section className="data-panel p-6">
      <div className="flex items-center gap-2"><BookOpen size={17}/><h2 className="text-sm font-semibold">Propostas cadastradas</h2></div>
      <QueryState loading={proposals.isPending} error={proposals.isError} empty={!proposals.isPending && !proposals.isError && !proposals.data?.length} title="Nenhuma proposta visível" onRetry={() => void proposals.refetch()} />
      <div className="mt-4 space-y-2">{proposals.data?.map(p => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
        <div><strong className="text-sm">{p.title}</strong><p className="mt-1 text-xs text-muted-foreground">Processo: {p.linked_case?.cnj_number || p.linked_case?.reference || 'Não identificado'} · Status: {statusLabels[p.status] || p.status} · {dateLabel(p.created_at)} · Valor {currency(p.amount_cents)}</p></div>
        <div className="flex flex-wrap items-center gap-2">{canManage && <select aria-label={`Alterar status da proposta ${p.title}`} className="native-select w-auto" value={p.status} disabled={statusBusy === p.id} onChange={e => void setProposalStatus(p.id, e.target.value)}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>}
        {p.case_id && <Button asChild variant="outline" size="sm"><Link to={`/casos/${p.case_id}`}><ArrowUpRight size={14}/>Abrir processo</Link></Button>}</div>
      </div>)}</div>
    </section>
  </div>;
}
