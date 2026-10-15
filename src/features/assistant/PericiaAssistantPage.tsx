import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Send, ShieldCheck, AlertTriangle, LoaderCircle, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';

type ChatMessage = { id: string; role: 'assistant' | 'user'; text: string };
type CaseOption = { id: string; title: string; reference: string };
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
        setStatus('Conexão configurada. Anexos clínicos aguardam homologação e testes do n8n.');
      }
    }).catch(() => {
      if (!cancelled) setStatus('Não foi possível verificar a integração. Atualize a página.');
    });
    return () => { cancelled = true; };
  }, [session?.user.id]);
  const send = async (event: FormEvent) => {
    event.preventDefault();
    const chatInput = input.trim();
    if (!chatInput || busy || !available) return;
    setMessages(current => [...current, { id: crypto.randomUUID(), role: 'user', text: chatInput }]);
    setInput('');
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('amcf-pericia-bridge', {
        body: { chatInput, caseId, conversationId },
      });
      if (error || !data?.ok || !data?.answer) throw new Error(data?.error || 'A IA não respondeu. Confira se o fluxo está publicado.');
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', text: String(data.answer) }]);
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Falha de conexão.';
      setMessages(current => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Não foi possível responder: ' + message }]);
    } finally { setBusy(false); }
  };
  return <div className={compact ? "flex h-full min-h-0 w-full flex-col gap-3" : "mx-auto max-w-5xl space-y-6"}>
    {!compact && <div>
      <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-muted-foreground">AMCF / Ferramentas de trabalho</p>
      <h1 className="mt-2 flex items-center gap-3 text-2xl font-semibold"><Bot size={27} /> Assistente de Perícia</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Apoio técnico para organização, consulta e análise preliminar. Conclusões e assinaturas permanecem exclusivamente com o médico.</p>
    </div>}
    <section className={compact ? 'data-panel shrink-0 p-3' : 'data-panel p-5'}>
      <div className="flex flex-wrap items-center gap-3 text-sm"><ShieldCheck size={19} className="text-primary" />
        <span>{status}</span><span className={available ? 'status-pill status-success' : 'status-pill status-warning'}>{available ? 'Somente texto' : 'Configuração pendente'}</span>
      </div>
      <div className={compact ? "mt-3 flex flex-col gap-3" : "mt-5 flex flex-wrap items-end gap-4"}>
        <label className={compact ? "flex min-w-0 flex-col gap-2 text-xs font-semibold" : "flex min-w-60 flex-1 flex-col gap-2 text-xs font-semibold"}>Processo autorizado
          <select className="native-select" value={caseId} onChange={e => { setCaseId(e.target.value); setConversationId(newConversation()); setMessages([]); }}>
            <option value="">Conversa geral (sem processo)</option>
            {cases.map(c => <option key={c.id} value={c.id}>{c.reference} — {c.title}</option>)}
          </select>
        </label>
        <Button type="button" variant="outline" className={compact ? "self-start" : undefined} onClick={() => { setConversationId(newConversation()); setMessages([]); }}>Nova conversa</Button>
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
        <div className="flex items-end gap-3">
          <textarea id={compact ? "amcf-assistant-compact-input" : "amcf-assistant-input"} className={compact ? "min-h-14 min-w-0 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm" : "min-h-20 flex-1 resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm"} value={input} onChange={e => setInput(e.target.value)} maxLength={5000} placeholder="Escreva sua pergunta…" disabled={!available || busy} />
          <Button disabled={!available || busy || !input.trim()}><Send size={16} /> Enviar</Button>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-muted-foreground"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{compact ? "Não envie laudos nem dados clínicos antes da homologação de segurança." : "A entrada de laudos, imagens e dados clínicos ainda depende de homologação de sigilo, retenção e segurança. Não envie documentos médicos sensíveis nesta etapa."}</p>
      </form>
    </section>
  </div>;
}
