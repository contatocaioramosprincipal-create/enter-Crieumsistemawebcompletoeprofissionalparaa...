import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Bot, Send, ShieldCheck, LoaderCircle, MessageCircle, Paperclip, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string };
type CaseOption = { id: string; title: string; reference: string };
type Attachment = { id: string; name: string };
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 3;
const STAGING_BUCKET = 'amcf-ai-staging';
const newConversation = () => crypto.randomUUID();
export default function PericiaAssistantPage({ compact = false }: { compact?: boolean }) {
  const { session } = useAuth();
  const [conversationId, setConversationId] = useState(newConversation);
  const [cases, setCases] = useState<CaseOption[]>([]);
  const [caseId, setCaseId] = useState('');
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState('Verificando disponibilidade da integração…');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachmentsEnabled, setAttachmentsEnabled] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saveToCase, setSaveToCase] = useState(true);
  const [attachError, setAttachError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  // Descarta no servidor os anexos ainda não enviados (best-effort; o servidor também expira e apaga).
  const discardAll = (list: Attachment[], forCase: string, forConversation: string) => {
    list.forEach(a => { void supabase.functions.invoke('amcf-ai-uploads', { body: { action: 'discard', id: a.id, case_id: forCase, conversation_id: forConversation } }).catch(() => undefined); });
  };
  const resetConversation = (nextCase = caseId) => {
    if (attachments.length && caseId) discardAll(attachments, caseId, conversationId);
    setAttachments([]); setAttachError('');
    setCaseId(nextCase); setConversationId(newConversation()); setMessages([]);
  };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      supabase.functions.invoke('amcf-pericia-bridge', { body: { action: 'status' } }),
      supabase.from('amcf_cases').select('id,title,reference').order('opened_on', { ascending: false }).limit(60),
    ]).then(([integration, authorizedCases]) => {
      if (cancelled) return;
      if (!authorizedCases.error) setCases((authorizedCases.data || []) as CaseOption[]);
      if (integration.error || !integration.data?.ready) {
        setAvailable(false);
        setStatus(integration.data?.error || 'Aguardando a configuração do webhook protegido no n8n.');
      } else {
        setAvailable(true);
        setAttachmentsEnabled(integration.data?.attachments_enabled === true);
        setStatus(integration.data?.attachments_enabled === true ? 'Conexão configurada. Você pode anexar até 3 laudos (PDF ou foto) por mensagem.' : 'Conexão configurada. Anexo de laudos ainda não liberado.');
      }
    }).catch(() => {
      if (!cancelled) setStatus('Não foi possível verificar a integração. Atualize a página.');
    });
    return () => { cancelled = true; };
  }, [session?.user.id]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const typed = input.trim();
    const sending = attachments;
    const chatInput = typed || (sending.length ? 'Analise o(s) documento(s) anexado(s): resuma, destaque CID, datas e lacunas.' : '');
    if (!chatInput || busy || uploading || !available) return;
    setMessages(current => [...current, { id: crypto.randomUUID(), role: 'user', text: (typed || chatInput) + (sending.length ? '\n\n📎 ' + sending.map(a => a.name).join(', ') : '') }]);
    setInput('');
    setAttachments([]);
    setBusy(true);
    try {
      const body: Record<string, unknown> = { chatInput, caseId, conversationId };
      if (sending.length) { body.attachmentIds = sending.map(a => a.id); body.fileNames = sending.map(a => a.name); body.saveToCase = saveToCase; }
      const { data, error } = await supabase.functions.invoke('amcf-pericia-bridge', { body });
      if (error || !data?.ok || !data?.answer) throw new Error(data?.error || 'A IA não respondeu. Confira se o fluxo está publicado.');
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', text: String(data.answer) + (sending.length && saveToCase ? (data.saved === sending.length ? '\n\n✅ Arquivo(s) salvo(s) em Documentos do processo.' : '\n\n⚠️ A leitura foi feita, mas não consegui salvar todos os arquivos no processo (' + String(data.saved ?? 0) + ' de ' + sending.length + '). Envie-os pela aba Documentos.') : sending.length ? '\n\nArquivo(s) apagado(s) após a leitura.' : '') }]);
    } catch (failure) {
      // O servidor apaga os arquivos ao processar; se falhou antes disso, descarta o que sobrou.
      if (sending.length && caseId) discardAll(sending, caseId, conversationId);
      const message = failure instanceof Error ? failure.message : 'Falha de conexão.';
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Não foi possível responder: ' + message + (sending.length ? ' Anexe os arquivos novamente.' : '') }]);
    } finally { setBusy(false); }
  };
  const removeAttachment = (a: Attachment) => {
    setAttachments(current => current.filter(x => x.id !== a.id));
    if (caseId) discardAll([a], caseId, conversationId);
  };
  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    setAttachError('');
    if (!picked.length) return;
    if (!caseId) { setAttachError('Selecione um processo antes de anexar.'); return; }
    if (attachments.length + picked.length > MAX_FILES) { setAttachError('Máximo de ' + MAX_FILES + ' arquivos por mensagem.'); return; }
    const invalid = picked.find(f => !ALLOWED_TYPES.includes(f.type) || f.size < 1 || f.size > MAX_BYTES);
    if (invalid) { setAttachError('Use PDF, PNG ou JPG de até 10 MB.'); return; }
    setUploading(true);
    const added: Attachment[] = [];
    try {
      for (const file of picked) {
        const reserve = await supabase.functions.invoke('amcf-ai-uploads', { body: { action: 'reserve', case_id: caseId, conversation_id: conversationId, media_type: file.type, size_bytes: file.size } });
        if (reserve.error || !reserve.data?.ok) throw new Error(reserve.data?.error || 'Não foi possível preparar o envio.');
        const { id, path, upload_token } = reserve.data as { id: string; path: string; upload_token: string };
        const discardThis = () => discardAll([{ id, name: file.name }], caseId, conversationId);
        const up = await supabase.storage.from(STAGING_BUCKET).uploadToSignedUrl(path, upload_token, file, { contentType: file.type });
        if (up.error) { discardThis(); throw new Error('Falha ao enviar o arquivo.'); }
        const fin = await supabase.functions.invoke('amcf-ai-uploads', { body: { action: 'finalize', id, case_id: caseId, conversation_id: conversationId } });
        if (fin.error || !fin.data?.ok) { discardThis(); throw new Error(fin.data?.error || 'Arquivo recusado pela verificação de segurança.'); }
        added.push({ id, name: file.name });
      }
      setAttachments(current => [...current, ...added]);
    } catch (failure) {
      if (added.length) discardAll(added, caseId, conversationId);
      setAttachError(failure instanceof Error ? failure.message : 'Falha no envio do arquivo.');
    } finally { setUploading(false); }
  };
  return <div className={compact ? "flex h-full min-h-0 w-full flex-col gap-3" : "mx-auto max-w-5xl space-y-6"}>
    {!compact && <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">AMCF / Ferramentas de trabalho</p>
      <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold"><Bot size={27} /> Assistente de Perícia</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Apoio técnico para organização, consulta e análise preliminar. Conclusões e assinaturas permanecem exclusivamente com o médico.</p>
    </div>}
    <section className={compact ? 'data-panel shrink-0 p-3' : 'data-panel p-5'}>
      <div className="flex flex-wrap items-center gap-3 text-sm"><ShieldCheck size={19} className="text-primary" />
        <span>{status}</span><span className={available ? 'status-pill status-success' : 'status-pill status-warning'}>{!available ? 'Configuração pendente' : attachmentsEnabled ? 'Texto e laudos' : 'Somente texto'}</span>
      </div>
      <div className={compact ? "mt-3 flex flex-col gap-3" : "mt-5 flex flex-wrap items-end gap-4"}>
        <label className={compact ? "flex min-w-0 flex-col gap-2 text-xs font-semibold" : "flex min-w-60 flex-1 flex-col gap-2 text-xs font-semibold"}>Processo autorizado
          <select className="native-select" value={caseId} onChange={e => resetConversation(e.target.value)}>
            <option value="">Conversa geral (sem processo)</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.reference} — {c.title}</option>)}
          </select>
        </label>
        <Button type="button" variant="outline" className={compact ? "self-start" : undefined} onClick={() => resetConversation()}>Nova conversa</Button>
      </div>
    </section>
    <section className={compact ? "data-panel flex min-h-0 flex-1 flex-col overflow-hidden" : "data-panel flex min-h-[440px] flex-col overflow-hidden"}>
      <div className={compact ? "min-h-0 flex-1 space-y-3 overflow-y-auto p-3" : "min-h-0 flex-1 space-y-4 overflow-y-auto p-5"} aria-live="polite">
        {!messages.length && <div className="mx-auto max-w-xl py-12 text-center text-muted-foreground"><MessageCircle className="mx-auto mb-4" size={30} /><p className="font-medium">O que você precisa analisar?</p><p className="mt-3 text-xs leading-6">Faça perguntas sobre organização e procedimentos. Selecione um caso quando desejar utilizar o contexto administrativo autorizado.</p></div>}
        {messages.map(m => <article key={m.id} className={'max-w-[90%] whitespace-pre-wrap rounded-xl p-4 text-sm leading-7 ' + (m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'border bg-card text-foreground')}><span className="mb-2 block text-[10px] font-semibold uppercase opacity-70">{m.role === 'user' ? 'Você' : 'Assistente de Perícia'}</span>{m.text}</article>)}
        {busy && <div className="flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircle className="animate-spin" size={15}/>Analisando sua pergunta…</div>}
      </div>
      <form onSubmit={e => void send(e)} className={compact ? "shrink-0 border-t p-3" : "border-t p-4"}>
        <label htmlFor={compact ? "amcf-assistant-compact-input" : "amcf-assistant-input"} className="sr-only">Mensagem para a assistente</label>
        {attachmentsEnabled && !caseId && <p className="mb-2 text-xs text-muted-foreground">Para anexar um laudo, escolha acima um processo{cases.length === 0 ? ' (ainda não há nenhum: cadastre em Casos)' : ''}.</p>}
        {(attachments.length > 0 || attachError) && <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          {attachments.map(a => <span key={a.id} className="inline-flex items-center gap-1 rounded-full border bg-muted px-2 py-1"><Paperclip size={12} />{a.name.length > 28 ? a.name.slice(0, 25) + '…' : a.name}<button type="button" aria-label={'Remover ' + a.name} onClick={() => removeAttachment(a)} disabled={busy}><X size={12} /></button></span>)}
          {attachments.length > 0 && <label className="ml-auto inline-flex items-center gap-2"><input type="checkbox" checked={saveToCase} onChange={e => setSaveToCase(e.target.checked)} disabled={busy} />Salvar no processo (Documentos)</label>}
          {attachError && <span role="alert" className="text-destructive">{attachError}</span>}
        </div>}
        <div className="flex items-end gap-3">
          <input ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg" multiple className="hidden" onChange={e => void onPick(e)} />
          <Button type="button" variant="outline" aria-label="Anexar laudo" title={!attachmentsEnabled ? 'Anexos ainda não liberados' : !caseId ? 'Selecione um processo para anexar' : 'Anexar PDF ou foto (até 3, 10 MB cada)'} disabled={!available || !attachmentsEnabled || !caseId || busy || uploading || attachments.length >= MAX_FILES} onClick={() => fileInput.current?.click()}>{uploading ? <LoaderCircle className="animate-spin" size={16} /> : <Paperclip size={16} />}</Button>
          <textarea id={compact ? "amcf-assistant-compact-input" : "amcf-assistant-input"} className={compact ? "min-h-14 min-w-0 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm" : "min-h-20 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"} value={input} onChange={e => setInput(e.target.value)} maxLength={5000} placeholder="Escreva sua pergunta…" disabled={!available || busy} />
          <Button disabled={!available || busy || uploading || (!input.trim() && !attachments.length)}><Send size={16} /> Enviar</Button>
        </div>
      </form>
    </section>
  </div>;
}
