import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Upload, Download, Trash2, ChevronLeft, ChevronRight, ShieldAlert, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import LookupInput from '@/features/registry/LookupInput';
import { documentCategories } from '@/features/registry/resources';
import { dateLabel, errorMessage, todayISO } from '@/lib/format';

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];
const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

function formData(entries: Record<string, string>) { const form = new FormData(); for (const [key, value] of Object.entries(entries)) form.set(key, value); return form; }

export default function DocumentsPage() {
  const { access } = useAuth();
  const cache = useQueryClient();
  const [search, setSearch] = useState(''); const [term, setTerm] = useState('');
  const [category, setCategory] = useState(''); const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [caseId, setCaseId] = useState(''); const [title, setTitle] = useState('');
  const [docCategory, setDocCategory] = useState('outro'); const [docDate, setDocDate] = useState(todayISO()); const [file, setFile] = useState<File | null>(null);
  const documents = useQuery({ queryKey: ['documents', term, category, page], queryFn: async () => {
    let query = supabase.from('amcf_documents').select('id,title,category,document_date,file_name,mime_type,size_bytes,uploaded_by,created_at, linked_case:amcf_cases(reference,title), contact:amcf_contacts(name)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
    if (term) query = query.ilike('title', `%${term.replace(/[%_\\]/g, '')}%`);
    if (category) query = query.eq('category', category);
    const result = await query; if (result.error) throw result.error;
    return { rows: result.data, count: result.count || 0 };
  } });
  const directory = useQuery({ queryKey: ['directory'], queryFn: async () => { const result = await supabase.rpc('amcf_directory'); if (result.error) throw result.error; return result.data; } });
  const invoke = async (form: FormData) => {
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase.functions.invoke('amcf-files', { body: form });
      if (failure) { let message = 'Serviço privado de arquivos indisponível no momento. Nenhum arquivo foi registrado.'; try { const body = await failure.context?.json(); if (body?.error) message = body.error; } catch { /* resposta sem corpo legível */ } throw new Error(message); }
      if (data?.error) throw new Error(data.error);
      return data as { url?: string; message?: string };
    } finally { setBusy(false); }
  };
  const upload = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!caseId) { setError('Selecione o caso do documento.'); return; }
    if (!file) { setError('Selecione o arquivo.'); return; }
    if (file.size > MAX_BYTES) { setError('O arquivo deve ter no máximo 20 MB.'); return; }
    if (!ALLOWED.includes(file.type)) { setError('Formato não permitido. Envie PDF, PNG ou JPEG.'); return; }
    const form = formData({ action: 'upload', case_id: caseId, title, category: docCategory, document_date: docDate });
    form.set('file', file);
    try { const data = await invoke(form); await cache.invalidateQueries({ queryKey: ['documents'] }); toast.success(data.message || 'Documento armazenado.'); setOpen(false); setTitle(''); setFile(null); }
    catch (failure) { setError(errorMessage(failure)); }
  };
  const download = async (id: string) => {
    try { const data = await invoke(formData({ action: 'download', document_id: id })); if (!data.url) throw new Error('Download não liberado.'); const link = document.createElement('a'); link.href = data.url; link.target = '_blank'; link.rel = 'noopener'; link.click(); toast.success('Link temporário liberado por 60 segundos.'); }
    catch (failure) { toast.error(errorMessage(failure)); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Excluir este documento do registro e do armazenamento privado? A ação é irreversível e fica registrada na auditoria.')) return;
    try { const data = await invoke(formData({ action: 'delete', document_id: id })); await cache.invalidateQueries({ queryKey: ['documents'] }); toast.success(data.message || 'Documento excluído.'); }
    catch (failure) { toast.error(errorMessage(failure)); }
  };
  const rows = documents.data?.rows || []; const count = documents.data?.count || 0;
  return <><PageHeader eyebrow="ARQUIVOS DO CASO" title="Documentos" description="Arquivos vinculados aos casos, em armazenamento privado com acesso por atribuição."><Button onClick={() => { setError(''); setOpen(true); }}><Upload />Enviar documento</Button></PageHeader>
    <div className="notice mb-5"><ShieldAlert className="h-4 w-4 shrink-0" /><p>Envio e download usam um serviço privado de arquivos. Se estiver indisponível, a operação falha com aviso e nenhum arquivo é registrado. Prontuários reais permanecem bloqueados até antivirus e criptografia comprovados.</p></div>
    <section className="data-panel"><div className="table-toolbar"><form onSubmit={e => { e.preventDefault(); setTerm(search); setPage(0); }} className="flex w-full gap-2 sm:max-w-sm"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar documentos…" aria-label="Buscar documentos" value={search} onChange={e => setSearch(e.target.value)} /></div><Button variant="outline" type="submit">Buscar</Button></form><select className="native-select w-auto min-w-40" aria-label="Filtrar por categoria" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }}><option value="">Todas as categorias</option>{Object.entries(documentCategories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
      <QueryState loading={documents.isPending} error={documents.isError} empty={!documents.isPending && !documents.isError && !rows.length} onRetry={() => void documents.refetch()} title={term || category ? 'Nenhum documento para estes filtros' : 'Nenhum documento armazenado'} description="Envie o primeiro arquivo vinculado a um caso." />
      {!!rows.length && <div className="table-scroll"><table className="work-table"><thead><tr><th>Documento</th><th>Caso</th><th>Categoria</th><th>Data</th><th>Enviado por</th><th>Tamanho</th><th className="text-right">Ações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="font-medium"><span className="flex items-center gap-2"><FileText size={14} className="text-muted-foreground" />{row.title}</span><span className="mt-1 block text-[11px] text-muted-foreground">{row.file_name}</span></td><td>{row.linked_case?.reference || '—'}</td><td><span className="status-pill status-neutral">{documentCategories[row.category as keyof typeof documentCategories] || row.category}</span></td><td>{dateLabel(row.document_date || row.created_at)}</td><td>{directory.data?.find(m => m.id === row.uploaded_by)?.name || 'Integrante'}</td><td>{size(row.size_bytes)}</td><td><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Baixar documento" disabled={busy} onClick={() => void download(row.id)}><Download /></Button>{access?.capabilities.operate && <Button variant="ghost" size="icon" aria-label="Excluir documento" disabled={busy} onClick={() => void remove(row.id)}><Trash2 /></Button>}</div></td></tr>)}</tbody></table></div>}
      <div className="table-pagination"><span>{documents.isError ? 'Consulta indisponível' : documents.isPending ? 'Consultando…' : `${count} documento${count === 1 ? '' : 's'} · 20 por página`}</span><div className="flex items-center gap-3"><Button variant="outline" size="icon" disabled={page === 0 || documents.isFetching} onClick={() => setPage(p => p - 1)} aria-label="Página anterior"><ChevronLeft /></Button><span>{page + 1} / {Math.max(1, Math.ceil(count / 20))}</span><Button variant="outline" size="icon" disabled={(page + 1) * 20 >= count || documents.isFetching} onClick={() => setPage(p => p + 1)} aria-label="Próxima página"><ChevronRight /></Button></div></div></section>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent><DialogHeader><DialogTitle>Enviar documento</DialogTitle><DialogDescription>PDF, PNG ou JPEG até 20 MB. O arquivo fica em contêiner privado e só é acessível por quem tem acesso ao caso.</DialogDescription></DialogHeader><form onSubmit={upload} className="space-y-4"><div><label className="field-label">Caso vinculado *</label><LookupInput table="amcf_cases" value={caseId} onChange={setCaseId} required disabled={busy} label="Caso do documento" /></div><div><label className="field-label" htmlFor="doc-title">Nome do documento *</label><Input id="doc-title" value={title} onChange={e => setTitle(e.target.value)} minLength={2} maxLength={200} required disabled={busy} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="doc-category">Categoria *</label><select id="doc-category" className="native-select" value={docCategory} onChange={e => setDocCategory(e.target.value)} disabled={busy}>{Object.entries(documentCategories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div><div><label className="field-label" htmlFor="doc-date">Data do documento</label><Input id="doc-date" type="date" value={docDate} onChange={e => setDocDate(e.target.value)} disabled={busy} /></div></div><div><label className="field-label" htmlFor="doc-file">Arquivo *</label><Input id="doc-file" type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} required disabled={busy} /></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar ao armazenamento privado'}</Button></div></form></DialogContent></Dialog>
  </>;
}
