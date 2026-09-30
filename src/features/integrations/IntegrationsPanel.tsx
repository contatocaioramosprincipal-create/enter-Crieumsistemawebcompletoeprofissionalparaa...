import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Webhook, ScrollText, Copy, Trash2, RefreshCw, Radio } from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel, errorMessage } from '@/lib/format';
import { integrationScopes, integrationEvents, integrationEndpoints, randomToken, hashToken } from './contract';

export default function IntegrationsPanel() {
  const { access } = useAuth();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState('');
  const [secret, setSecret] = useState('');
  const [keyLabel, setKeyLabel] = useState('');
  const [keyScopes, setKeyScopes] = useState<string[]>(['contacts:write', 'events:read']);
  const [hookLabel, setHookLabel] = useState('');
  const [hookUrl, setHookUrl] = useState('');
  const [hookEvents, setHookEvents] = useState<string[]>([]);
  const keys = useQuery({ queryKey: ['integration-keys'], queryFn: async () => { const result = await supabase.from('amcf_integration_keys').select('id,label,scopes,active,created_at,last_used_at,revoked_at').order('created_at', { ascending: false }).limit(50); if (result.error) throw result.error; return result.data; } });
  const hooks = useQuery({ queryKey: ['integration-hooks'], queryFn: async () => { const result = await supabase.from('amcf_integration_hooks').select('id,label,url,events,active,created_at').order('created_at', { ascending: false }).limit(50); if (result.error) throw result.error; return result.data; } });
  const logs = useQuery({ queryKey: ['integration-logs'], queryFn: async () => { const result = await supabase.from('amcf_integration_logs').select('id,at,action,success,resource,resource_id,external_ref,detail,key_id').order('id', { ascending: false }).limit(25); if (result.error) throw result.error; return result.data; } });
  const deliveries = useQuery({ queryKey: ['integration-deliveries'], queryFn: async () => { const result = await supabase.from('amcf_integration_deliveries').select('id,event_id,status,attempts,created_at, updated:amcf_integration_events(event)').order('id', { ascending: false }).limit(25); if (result.error) throw result.error; return result.data; } });
  const pending = useQuery({ queryKey: ['integration-pending'], queryFn: async () => { const result = await supabase.from('amcf_integration_events').select('id', { count: 'exact', head: true }).is('delivered_at', null); if (result.error) throw result.error; return result.count || 0; } });
  const refresh = async () => { await cache.invalidateQueries(); };
  const createKey = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setToken('');
    try {
      if (!access?.member?.id) throw new Error('Sessão sem integrante identificado.');
      if (!keyScopes.length) throw new Error('Selecione ao menos um escopo.');
      const generated = randomToken();
      const result = await supabase.from('amcf_integration_keys').insert({ label: keyLabel.trim(), token_hash: await hashToken(generated), scopes: keyScopes, owner_id: access.member.id }).select('id').maybeSingle();
      if (result.error || !result.data) throw result.error || new Error('Sem permissão para criar a chave.');
      setToken(generated); setKeyLabel(''); await refresh();
      toast.success('Chave criada. Copie o token agora: ele não é exibido novamente.');
    } catch (failure) { toast.error(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  const revokeKey = async (id: string) => {
    if (!window.confirm('Revogar esta chave? Integrações que a utilizam perdem o acesso imediatamente.')) return;
    setBusy(true);
    const result = await supabase.from('amcf_integration_keys').update({ active: false, revoked_at: new Date().toISOString() }).eq('id', id).select('id');
    if (result.error || !result.data?.length) toast.error(errorMessage(result.error || new Error('Sem permissão para revogar.')));
    else { toast.success('Chave revogada.'); await refresh(); }
    setBusy(false);
  };
  const createHook = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setSecret('');
    try {
      if (!hookUrl.startsWith('https://')) throw new Error('A URL do webhook precisa usar https.');
      const generated = randomToken();
      const result = await supabase.from('amcf_integration_hooks').insert({ label: hookLabel.trim(), url: hookUrl.trim(), secret: generated, events: hookEvents, created_by: access?.member?.id }).select('id').maybeSingle();
      if (result.error || !result.data) throw result.error || new Error('Sem permissão para criar o webhook.');
      setSecret(generated); setHookLabel(''); setHookUrl(''); await refresh();
      toast.success('Webhook criado. Copie o segredo agora: ele não é exibido novamente.');
    } catch (failure) { toast.error(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  const toggleHook = async (id: string, active: boolean) => {
    setBusy(true);
    const result = await supabase.from('amcf_integration_hooks').update({ active }).eq('id', id).select('id');
    if (result.error || !result.data?.length) toast.error(errorMessage(result.error || new Error('Sem permissão.')));
    else await refresh();
    setBusy(false);
  };
  const removeHook = async (id: string) => {
    if (!window.confirm('Excluir este webhook? O histórico de entregas dele também será removido.')) return;
    setBusy(true);
    const result = await supabase.from('amcf_integration_hooks').delete().eq('id', id).select('id');
    if (result.error || !result.data?.length) toast.error(errorMessage(result.error || new Error('Sem permissão para excluir.')));
    else { toast.success('Webhook excluído.'); await refresh(); }
    setBusy(false);
  };
  const retry = async () => {
    setBusy(true);
    const result = await supabase.rpc('amcf_integration_retry_failures');
    if (result.error) toast.error(errorMessage(result.error));
    else { toast.success('Reconciliação concluída no banco.'); await refresh(); }
    setBusy(false);
  };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success('Copiado. Guarde em local seguro.'); } catch { toast.error('Não foi possível copiar automaticamente.'); } };
  return <div className="space-y-6">
    <section className="data-panel p-6"><div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /><h2 className="text-sm font-semibold">Chaves de API para integrações</h2></div><p className="mt-2 text-xs leading-6 text-muted-foreground">O token é gerado no seu navegador e o banco guarda somente o resumo (SHA-256). Ele aparece uma única vez. Revogar invalida imediatamente.</p>
      <form onSubmit={createKey} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="key-label">Nome da integração</label><Input id="key-label" value={keyLabel} onChange={e => setKeyLabel(e.target.value)} required minLength={2} maxLength={80} placeholder="n8n produção" disabled={busy} /></div><div><span className="field-label">Escopos</span><div className="grid gap-2 sm:grid-cols-2">{Object.entries(integrationScopes).map(([scope, description]) => <label key={scope} className="flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={keyScopes.includes(scope)} onChange={e => setKeyScopes(current => e.target.checked ? [...current, scope] : current.filter(item => item !== scope))} className="mt-1" />{description}</label>)}</div></div></div><Button disabled={busy}>{busy ? 'Gerando…' : 'Gerar token de integração'}</Button></form>
      {token && <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft p-4"><p className="text-xs font-semibold text-warning">Copie agora — este token não será exibido novamente</p><div className="mt-3 flex flex-wrap items-center gap-2"><code className="break-all rounded bg-card px-3 py-2 text-xs">{token}</code><Button type="button" variant="outline" size="sm" onClick={() => void copy(token)}><Copy />Copiar</Button></div></div>}
      <QueryState loading={keys.isPending} error={keys.isError} empty={!keys.isPending && !keys.data?.length} onRetry={() => void keys.refetch()} title="Nenhuma chave criada" description="Crie a primeira chave para conectar o n8n." />
      {!!keys.data?.length && <div className="mt-4 table-scroll"><table className="work-table"><thead><tr><th>Integração</th><th>Escopos</th><th>Último uso</th><th>Estado</th><th className="text-right">Ações</th></tr></thead><tbody>{keys.data.map(key => <tr key={key.id}><td className="font-medium">{key.label}</td><td className="max-w-72 whitespace-normal text-[11px] text-muted-foreground">{key.scopes.join(', ') || 'nenhum'}</td><td>{key.last_used_at ? dateLabel(key.last_used_at) : 'Nunca usada'}</td><td><span className={`status-pill ${key.active && !key.revoked_at ? 'status-success' : 'status-warning'}`}>{key.active && !key.revoked_at ? 'Ativa' : 'Revogada'}</span></td><td><div className="flex justify-end">{key.active && !key.revoked_at && <Button variant="ghost" size="sm" disabled={busy} onClick={() => void revokeKey(key.id)}>Revogar</Button>}</div></td></tr>)}</tbody></table></div>}
    </section>
    <section className="data-panel p-6"><div className="flex items-center gap-2"><Webhook className="h-5 w-5 text-primary" /><h2 className="text-sm font-semibold">Webhooks de saída (n8n)</h2></div><p className="mt-2 text-xs leading-6 text-muted-foreground">Cada evento é enviado por POST com JSON e o cabeçalho <code>X-AMCF-Signature: sha256=HMAC(secret, corpo)</code>. Sem eventos marcados, o webhook recebe todos.</p>
      <form onSubmit={createHook} className="mt-5 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="hook-label">Nome</label><Input id="hook-label" value={hookLabel} onChange={e => setHookLabel(e.target.value)} required minLength={2} maxLength={80} placeholder="n8n" disabled={busy} /></div><div><label className="field-label" htmlFor="hook-url">URL https do webhook</label><Input id="hook-url" type="url" value={hookUrl} onChange={e => setHookUrl(e.target.value)} required placeholder="https://n8n.exemplo.com/webhook/..." disabled={busy} /></div></div><div><span className="field-label">Eventos</span><div className="grid gap-2 sm:grid-cols-2">{integrationEvents.map(event => <label key={event} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={hookEvents.includes(event)} onChange={e => setHookEvents(current => e.target.checked ? [...current, event] : current.filter(item => item !== event))} />{event}</label>)}</div></div><Button disabled={busy}>{busy ? 'Salvando…' : 'Criar webhook'}</Button></form>
      {secret && <div className="mt-4 rounded-lg border border-warning/30 bg-warning-soft p-4"><p className="text-xs font-semibold text-warning">Segredo de assinatura — copie agora, não será exibido novamente</p><div className="mt-3 flex flex-wrap items-center gap-2"><code className="break-all rounded bg-card px-3 py-2 text-xs">{secret}</code><Button type="button" variant="outline" size="sm" onClick={() => void copy(secret)}><Copy />Copiar</Button></div></div>}
      <QueryState loading={hooks.isPending} error={hooks.isError} empty={!hooks.isPending && !hooks.data?.length} onRetry={() => void hooks.refetch()} title="Nenhum webhook configurado" description="Sem webhook, os eventos ficam disponíveis para consulta por polling." />
      {!!hooks.data?.length && <div className="mt-4 table-scroll"><table className="work-table"><thead><tr><th>Nome</th><th>URL</th><th>Eventos</th><th>Estado</th><th className="text-right">Ações</th></tr></thead><tbody>{hooks.data.map(hook => <tr key={hook.id}><td className="font-medium">{hook.label}</td><td className="max-w-72 truncate text-[11px] text-muted-foreground">{hook.url}</td><td className="max-w-72 whitespace-normal text-[11px] text-muted-foreground">{hook.events.length ? hook.events.join(', ') : 'todos'}</td><td><span className={`status-pill ${hook.active ? 'status-success' : 'status-warning'}`}>{hook.active ? 'Ativo' : 'Pausado'}</span></td><td><div className="flex justify-end gap-1"><Button variant="ghost" size="sm" disabled={busy} onClick={() => void toggleHook(hook.id, !hook.active)}>{hook.active ? 'Pausar' : 'Ativar'}</Button><Button variant="ghost" size="icon" aria-label="Excluir webhook" disabled={busy} onClick={() => void removeHook(hook.id)}><Trash2 /></Button></div></td></tr>)}</tbody></table></div>}
    </section>
    <section className="data-panel p-6"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-2"><ScrollText className="h-5 w-5 text-primary" /><h2 className="text-sm font-semibold">Logs e entregas</h2></div><div className="flex items-center gap-3"><span className="text-[11px] text-muted-foreground"><Radio className="mr-1 inline h-3 w-3" />{pending.data ?? 0} evento(s) pendente(s)</span><Button variant="outline" size="sm" disabled={busy} onClick={() => void retry()}><RefreshCw />Reprocessar falhas</Button></div></div><p className="mt-2 text-xs leading-6 text-muted-foreground">Registra data/hora, ação, sucesso ou erro e identificador relacionado. Tokens e segredos nunca são gravados no log.</p>
      <QueryState loading={logs.isPending} error={logs.isError} empty={!logs.isPending && !logs.data?.length} onRetry={() => void logs.refetch()} title="Nenhuma chamada registrada" description="As chamadas da API e os eventos aparecerão aqui." />
      {!!logs.data?.length && <div className="mt-4 table-scroll"><table className="work-table"><thead><tr><th>Data</th><th>Ação</th><th>Resultado</th><th>Recurso</th><th>Referência</th></tr></thead><tbody>{logs.data.map(log => <tr key={log.id}><td>{dateLabel(log.at)}</td><td className="font-medium">{log.action}</td><td><span className={`status-pill ${log.success ? 'status-success' : 'status-warning'}`}>{log.success ? 'Sucesso' : 'Erro'}</span></td><td>{log.resource || '—'}</td><td className="max-w-56 truncate text-[11px] text-muted-foreground">{log.resource_id || log.external_ref || log.detail || '—'}</td></tr>)}</tbody></table></div>}
      {!!deliveries.data?.length && <div className="mt-5 table-scroll"><table className="work-table"><thead><tr><th>Entrega</th><th>Evento</th><th>Tentativas</th><th>Resposta</th></tr></thead><tbody>{deliveries.data.map(item => <tr key={item.id}><td>#{item.id}</td><td>{(item.updated as { event?: string } | null)?.event || '—'}</td><td>{item.attempts}</td><td>{item.status === null ? 'Aguardando resposta' : item.status === -1 ? 'Falha ao enviar' : `HTTP ${item.status}`}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="data-panel p-6"><h2 className="text-sm font-semibold">Como conectar o n8n</h2><p className="mt-2 text-xs leading-6 text-muted-foreground">Use o nó HTTP Request com método POST, cabeçalhos <code>apikey</code> e <code>Authorization: Bearer</code> iguais à chave publicável, e corpo JSON contendo <code>p_token</code> com o token gerado acima.</p><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">Endereço base (RPC)</dt><dd className="mt-1 break-all font-mono">{SUPABASE_URL}/rest/v1/rpc/&lt;função&gt;</dd></div><div><dt className="text-muted-foreground">Chave publicável (pública, já usada pelo aplicativo)</dt><dd className="mt-1 break-all font-mono">{SUPABASE_PUBLISHABLE_KEY}</dd></div><div><dt className="text-muted-foreground">Exemplo de corpo</dt><dd className="mt-1 break-all font-mono">{`{"p_token":"SEU_TOKEN","p_external_ref":"lead-1234","p_name":"Fulano de Tal","p_kind":"lawyer","p_email":"fulano@exemplo.com"}`}</dd></div></dl><p className="mt-4 text-xs font-medium">Endpoints disponíveis</p><ul className="mt-2 grid gap-1 text-[11px] font-mono text-muted-foreground sm:grid-cols-2">{integrationEndpoints.map(endpoint => <li key={endpoint}>POST /rest/v1/rpc/{endpoint}</li>)}</ul><p className="mt-4 text-xs font-medium">Eventos disponíveis</p><p className="mt-2 text-[11px] text-muted-foreground">{integrationEvents.join(' · ')}</p><p className="mt-4 text-[11px] leading-5 text-muted-foreground">Idempotência: use o mesmo <code>p_external_ref</code> para repetir com segurança — a segunda chamada atualiza o registro existente em vez de criar outro. A leitura por polling usa amcf_api_events e marca os eventos como entregues.</p></section>
  </div>;
}
