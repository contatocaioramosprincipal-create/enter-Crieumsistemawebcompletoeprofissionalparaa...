import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LookupInput from '@/features/registry/LookupInput';
import { contactKinds } from '@/features/registry/resources';
import { errorMessage, todayISO } from '@/lib/format';

const newReference = () => `CASO-${todayISO().replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

// Cria contato (ou usa um existente) e o caso em uma única tela, e abre o caso para anexar documentos.
export default function NewCaseDialog({ onClose, presetContactId = '' }: { onClose: () => void; presetContactId?: string }) {
  const { access } = useAuth();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [mode, setMode] = useState<'existing' | 'new'>(presetContactId ? 'existing' : 'new');
  const [contactId, setContactId] = useState(presetContactId);
  const [contactName, setContactName] = useState('');
  const [kind, setKind] = useState('client');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [service, setService] = useState('Perícia médica');
  const [dueOn, setDueOn] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stages = useQuery({ queryKey: ['stages', 'amcf_case_stages'], queryFn: async () => { const result = await supabase.from('amcf_case_stages').select('id,name').order('position'); if (result.error) throw result.error; return result.data; } });
  const memberId = access?.member?.id;

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!memberId) { setError('Sua sessão não tem perfil ativo. Entre novamente e confirme o código de verificação em duas etapas (MFA).'); return; }
    const firstStage = stages.data?.[0]?.id;
    if (!firstStage) { setError('As etapas dos casos não foram carregadas. Tente novamente em instantes.'); return; }
    if (title.trim().length < 3) { setError('Informe um título para o caso (mínimo 3 caracteres).'); return; }
    if (service.trim().length < 2) { setError('Informe o tipo de serviço.'); return; }
    if (mode === 'existing' && !contactId) { setError('Escolha o contato do caso.'); return; }
    if (mode === 'new' && contactName.trim().length < 2) { setError('Informe o nome do contato.'); return; }
    setBusy(true);
    try {
      let owner = contactId;
      if (mode === 'new') {
        const created = await supabase.from('amcf_contacts').insert({ name: contactName.trim(), kind, email: email.trim() ? email.trim().toLowerCase() : null, phone: phone.replace(/\D/g, '') || null, responsible_id: memberId }).select('id');
        if (created.error) throw created.error;
        owner = String(created.data?.[0]?.id ?? '');
        if (!owner) throw new Error('O contato não foi salvo. Sua permissão pode ter sido alterada.');
      }
      const made = await supabase.from('amcf_cases').insert({ reference: newReference(), title: title.trim(), contact_id: owner, service: service.trim(), stage_id: firstStage, responsible_id: memberId, opened_on: todayISO(), due_on: dueOn || null }).select('id');
      if (made.error) throw made.error;
      const caseId = String(made.data?.[0]?.id ?? '');
      if (!caseId) throw new Error('O caso não foi salvo. Sua permissão pode ter sido alterada.');
      await cache.invalidateQueries();
      toast.success('Caso criado. Agora você já pode anexar documentos.');
      onClose();
      navigate(`/casos/${caseId}`);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto"><DialogHeader><DialogTitle>Novo caso</DialogTitle><DialogDescription>Preencha o contato e o caso em uma só tela. Registre somente informações administrativas, sem dados clínicos.</DialogDescription></DialogHeader>
    <form onSubmit={save} className="space-y-4">
      {!presetContactId && <div className="flex gap-2" role="group" aria-label="Origem do contato"><Button type="button" size="sm" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')} disabled={busy}>Contato novo</Button><Button type="button" size="sm" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')} disabled={busy}>Contato já cadastrado</Button></div>}
      {mode === 'existing' ? <div><label className="field-label">Contato *</label><LookupInput table="amcf_contacts" value={contactId} onChange={setContactId} required disabled={busy || !!presetContactId} label="Contato do caso" /></div> : <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="field-label" htmlFor="nc-name">Nome do contato *</label><Input id="nc-name" value={contactName} onChange={e => setContactName(e.target.value)} maxLength={160} disabled={busy} /></div><div><label className="field-label" htmlFor="nc-kind">Categoria</label><select id="nc-kind" className="native-select" value={kind} onChange={e => setKind(e.target.value)} disabled={busy}>{Object.entries(contactKinds).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div><div><label className="field-label" htmlFor="nc-phone">Telefone</label><Input id="nc-phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} /></div><div className="sm:col-span-2"><label className="field-label" htmlFor="nc-email">E-mail</label><Input id="nc-email" type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} /></div></div>}
      <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="field-label" htmlFor="nc-title">Título do caso *</label><Input id="nc-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} placeholder="Ex.: Perícia previdenciária — nome do cliente" disabled={busy} /></div><div><label className="field-label" htmlFor="nc-service">Tipo de serviço *</label><Input id="nc-service" value={service} onChange={e => setService(e.target.value)} maxLength={160} disabled={busy} /></div><div><label className="field-label" htmlFor="nc-due">Prazo (opcional)</label><Input id="nc-due" type="date" value={dueOn} onChange={e => setDueOn(e.target.value)} disabled={busy} /></div></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy || stages.isPending}>{busy ? 'Salvando…' : 'Criar caso'}</Button></div>
    </form></DialogContent></Dialog>;
}
