import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Upload, Download, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import { uploadResumable, ResumableUnsupported } from './resumable';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import LookupInput from '@/features/registry/LookupInput';
import { documentCategories } from '@/features/registry/resources';
import { dateLabel, errorMessage, todayISO } from '@/lib/format';

const BUCKET = 'amcf-documentos';
const FALLBACK_LIMIT = 50 * 1024 * 1024; // limite do plano gratuito, usado se a função não informar o limite efetivo
const mb = (bytes: number) => `${Math.floor(bytes / 1048576)} MB`;
const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg'];
const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const saveBlob = (content: string, mime: string, name: string) => { const binary = atob(content); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); const url = URL.createObjectURL(new Blob([bytes], { type: mime || 'application/octet-stream' })); const link = document.createElement('a'); link.href = url; link.download = name; link.rel = 'noopener'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000); };

interface DocumentRow { id: string; title: string; category: string; storage_path: string; document_date: string | null; file_name: string; mime_type: string; size_bytes: number; uploaded_by: string; created_at: string; linked_case: { reference?: string; title?: string } | null }

export default function DocumentsPage() {
  const { access } = useAuth();
  const cache = useQueryClient();
  const [search, setSearch] = useState(''); const [term, setTerm] = useState('');
  const [category, setCategory] = useState(''); const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [progress, setProgress] = useState(0); const [caseId, setCaseId] = useState(''); const [title, setTitle] = useState('');
  const [docCategory, setDocCategory] = useState('outro'); const [docDate, setDocDate] = useState(todayISO()); const [file, setFile] = useState<File | null>(null);
  const documents = useQuery({ queryKey: ['documents', term, category, page], queryFn: async () => {
    let query = supabase.from('amcf_documents').select('id,title,category,storage_path,document_date,file_name,mime_type,size_bytes,uploaded_by,created_at, linked_case:amcf_cases(reference,title)', { count: 'exact' }).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
    if (term) query = query.ilike('title', `%${term.replace(/[%_\\]/g, '')}%`);
    if (category) query = query.eq('category', category);
    const result = await query; if (result.error) throw result.error;
    return { rows: result.data as unknown as DocumentRow[], count: result.count || 0 };
  } });
  const directory = useQuery({ queryKey: ['directory'], queryFn: async () => { const result = await supabase.rpc('amcf_directory'); if (result.error) throw result.error; return result.data; } });
  const limits = useQuery({ queryKey: ['document-limits'], staleTime: 10 * 60 * 1000, queryFn: async () => { const result = await supabase.functions.invoke('amcf-files', { body: { action: 'limits' } }); if (result.error || !result.data?.max_bytes) return FALLBACK_LIMIT; return Number(result.data.max_bytes); } });
  const maxBytes = limits.data || FALLBACK_LIMIT;
  const call = async (body: Record<string, unknown>) => { const result = await supabase.functions.invoke('amcf-files', { body }); if (result.error) { let detail = ''; try { detail = (await (result.error as { context?: Response }).context?.json())?.error || ''; } catch { /* sem corpo */ } throw new Error(detail || 'Não foi possível concluir a operação de arquivos.'); } return result.data as Record<string, string>; };
  const upload = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!caseId) { setError('Selecione o caso do documento.'); return; }
    if (!file) { setError('Selecione o arquivo.'); return; }
    if (file.size <= 0) { setError('O arquivo está vazio.'); return; }
    if (file.size > maxBytes) { setError(`O arquivo tem ${(file.size / 1048576).toFixed(1)} MB e o limite efetivo atual é ${mb(maxBytes)} por arquivo.`); return; }
    if (!ALLOWED.includes(file.type)) { setError('Formato não permitido. Envie PDF, PNG ou JPEG.'); return; }
    setBusy(true); setProgress(0);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'documento';
      const path = `${caseId}/${crypto.randomUUID()}-${safeName}`;
      try {
        await uploadResumable({ endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`, apikey: SUPABASE_PUBLISHABLE_KEY, getToken: async () => { const session = await supabase.auth.getSession(); const token = session.data.session?.access_token; if (!token) throw new Error('Sessão expirada. Entre novamente.'); return token; }, bucket: BUCKET, objectName: path, contentType: file.type, file, onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)) });
      } catch (failure) {
        if (!(failure instanceof ResumableUnsupported)) throw failure;
        const plain = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
        if (plain.error) throw new Error(plain.error.message.toLowerCase().includes('size') ? `O arquivo excede o limite do armazenamento (${mb(maxBytes)}).` : 'Não foi possível enviar o arquivo ao armazenamento privado.');
        setProgress(100);
      }
      await call({ action: 'finalize', case_id: caseId, path, title, category: docCategory, document_date: docDate || '', file_name: file.name });
      await cache.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento armazenado em contêiner privado.'); setOpen(false); setTitle(''); setFile(null); setProgress(0);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  const download = async (row: DocumentRow) => {
    setBusy(true);
    try {
      if (row.storage_path.startsWith('db/')) {
        const stored = await supabase.from('amcf_document_files').select('content').eq('document_id', row.id).maybeSingle();
        if (stored.error || !stored.data?.content) throw stored.error || new Error('Arquivo indisponível para a sua conta.');
        saveBlob(stored.data.content, row.mime_type, row.file_name);
      } else {
        const signed = await call({ action: 'download', document_id: row.id });
        const link = document.createElement('a'); const target = new URL(signed.url); target.searchParams.set('download', row.file_name);
        link.href = target.toString(); link.rel = 'noopener'; link.click();
      }
      toast.success('Download iniciado por link temporário de 60 segundos.');
    } catch (failure) { toast.error(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  const remove = async (row: DocumentRow) => {
    if (!window.confirm('Excluir este documento e o arquivo armazenado? A ação é irreversível e fica registrada na auditoria.')) return;
    setBusy(true);
    try {
      await call({ action: 'delete', document_id: row.id });
      await cache.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Documento e arquivo excluídos.');
    } catch (failure) { toast.error(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  const rows = documents.data?.rows || []; const count = documents.data?.count || 0;
  return <><PageHeader eyebrow="ARQUIVOS DO CASO" title="Documentos" description="Arquivos vinculados aos casos, em armazenamento privado com acesso por atribuição."><Button onClick={() => { setError(''); setOpen(true); }}><Upload />Enviar documento</Button></PageHeader>
    <section className="data-panel"><div className="table-toolbar"><form onSubmit={e => { e.preventDefault(); setTerm(search); setPage(0); }} className="flex w-full gap-2 sm:max-w-sm"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar documentos…" aria-label="Buscar documentos" value={search} onChange={e => setSearch(e.target.value)} /></div><Button variant="outline" type="submit">Buscar</Button></form><select className="native-select w-auto min-w-40" aria-label="Filtrar por categoria" value={category} onChange={e => { setCategory(e.target.value); setPage(0); }}><option value="">Todas as categorias</option>{Object.entries(documentCategories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
      <QueryState loading={documents.isPending} error={documents.isError} empty={!documents.isPending && !documents.isError && !rows.length} onRetry={() => void documents.refetch()} title={term || category ? 'Nenhum documento para estes filtros' : 'Nenhum documento armazenado'} description="Envie o primeiro arquivo vinculado a um caso." />
      {!!rows.length && <div className="table-scroll"><table className="work-table"><thead><tr><th>Documento</th><th>Caso</th><th>Categoria</th><th>Data</th><th>Enviado por</th><th>Tamanho</th><th className="text-right">Ações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td className="font-medium"><span className="flex items-center gap-2"><FileText size={14} className="text-muted-foreground" />{row.title}</span><span className="mt-1 block text-[11px] text-muted-foreground">{row.file_name}</span></td><td>{row.linked_case?.reference || '—'}</td><td><span className="status-pill status-neutral">{documentCategories[row.category as keyof typeof documentCategories] || row.category}</span></td><td>{dateLabel(row.document_date || row.created_at)}</td><td>{directory.data?.find(m => m.id === row.uploaded_by)?.name || 'Integrante'}</td><td>{size(row.size_bytes)}</td><td><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" aria-label="Baixar documento" disabled={busy} onClick={() => void download(row)}><Download /></Button><Button variant="ghost" size="icon" aria-label="Excluir documento" disabled={busy} onClick={() => void remove(row)}><Trash2 /></Button></div></td></tr>)}</tbody></table></div>}
      <div className="table-pagination"><span>{documents.isError ? 'Consulta indisponível' : documents.isPending ? 'Consultando…' : `${count} documento${count === 1 ? '' : 's'} · 20 por página`}</span><div className="flex items-center gap-3"><Button variant="outline" size="icon" disabled={page === 0 || documents.isFetching} onClick={() => setPage(p => p - 1)} aria-label="Página anterior"><ChevronLeft /></Button><span>{page + 1} / {Math.max(1, Math.ceil(count / 20))}</span><Button variant="outline" size="icon" disabled={(page + 1) * 20 >= count || documents.isFetching} onClick={() => setPage(p => p + 1)} aria-label="Próxima página"><ChevronRight /></Button></div></div></section>
    <Dialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}><DialogContent><DialogHeader><DialogTitle>Enviar documento</DialogTitle><DialogDescription>{`PDF, PNG ou JPEG até ${mb(maxBytes)}. O arquivo vai direto ao armazenamento privado, em partes, e só é acessível a quem tem acesso ao caso.`}</DialogDescription></DialogHeader><form onSubmit={upload} className="space-y-4"><div><label className="field-label">Caso vinculado *</label><LookupInput table="amcf_cases" value={caseId} onChange={setCaseId} required disabled={busy} label="Caso do documento" /></div><div><label className="field-label" htmlFor="doc-title">Nome do documento *</label><Input id="doc-title" value={title} onChange={e => setTitle(e.target.value)} minLength={2} maxLength={200} required disabled={busy} /></div><div className="grid gap-4 sm:grid-cols-2"><div><label className="field-label" htmlFor="doc-category">Categoria *</label><select id="doc-category" className="native-select" value={docCategory} onChange={e => setDocCategory(e.target.value)} disabled={busy}>{Object.entries(documentCategories).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div><div><label className="field-label" htmlFor="doc-date">Data do documento</label><Input id="doc-date" type="date" value={docDate} onChange={e => setDocDate(e.target.value)} disabled={busy} /></div></div><div><label className="field-label" htmlFor="doc-file">Arquivo *</label><Input id="doc-file" type="file" accept="application/pdf,image/png,image/jpeg" onChange={e => setFile(e.target.files?.[0] || null)} required disabled={busy} /></div>{busy && progress > 0 && <div aria-label="Progresso do envio" className="space-y-1"><div className="h-2 w-full overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div><p className="text-xs text-muted-foreground">{progress}% enviado — não feche esta janela.</p></div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar ao armazenamento privado'}</Button></div></form></DialogContent></Dialog>
  </>;
}
