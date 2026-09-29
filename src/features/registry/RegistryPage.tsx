import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Search, SlidersHorizontal, LayoutList, Columns3, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, ArrowUpRight, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel, errorMessage } from '@/lib/format';
import { resources, contactKinds, taskStatuses, priorities, type ResourceKey, type RecordRow } from './resources';
import RecordEditor from './RecordEditor';

export default function RegistryPage({ resource }: { resource: ResourceKey }) {
  const definition = resources[resource];
  const { access } = useAuth();
  const cache = useQueryClient();
  const [search, setSearch] = useState(''); const [term, setTerm] = useState('');
  const [page, setPage] = useState(0); const [ascending, setAscending] = useState(false);
  const [stage, setStage] = useState(''); const [view, setView] = useState<'list' | 'board'>('list');
  const [editor, setEditor] = useState<RecordRow | null | undefined>(undefined);
  const [archive, setArchive] = useState<RecordRow | null>(null); const [archiving, setArchiving] = useState(false);
  const directory = useQuery({ queryKey: ['directory'], queryFn: async () => { const result = await supabase.rpc('amcf_directory'); if (result.error) throw result.error; return result.data; } });
  const stages = useQuery({ queryKey: ['stages', definition.stageTable], enabled: !!definition.stageTable, queryFn: async () => { const result = await supabase.from(definition.stageTable!).select('*').order('position'); if (result.error) throw result.error; return result.data; } });
  const query = useQuery({ queryKey: ['registry', resource, term, page, ascending, stage], queryFn: async () => {
    let q = supabase.from(definition.table).select(definition.select, { count: 'exact' }).order('created_at', { ascending }).order('id').range(page * 20, page * 20 + 19);
    if (term) q = q.ilike(definition.search, `%${term.replace(/[%_\\]/g, '')}%`);
    if (stage) q = q.filter(resource === 'tasks' ? 'status' : 'stage_id', 'eq', stage);
    if (resource === 'contacts' || resource === 'cases') q = q.is('archived_at', null);
    const result = await q; if (result.error) throw result.error;
    return { rows: result.data as unknown as RecordRow[], count: result.count || 0 };
  } });
  const count = query.data?.count || 0;
  const rows = query.data?.rows || [];
  const label = (row: RecordRow, column: typeof definition.columns[number]) => {
    const value = row[column.key];
    if (column.type === 'date') return dateLabel(value as string);
    if (column.type === 'member') return directory.data?.find(m => m.id === value)?.name || 'Responsável';
    if (column.type === 'relation') { const related = value as { name?: string; reference?: string } | null; return related?.name || related?.reference || '—'; }
    if (column.type === 'status') return ({ ...contactKinds, ...taskStatuses, ...priorities } as Record<string, string>)[String(value)] || String(value);
    return value ? String(value) : '—';
  };
  const archiveRecord = async () => {
    if (!archive || (resource !== 'contacts' && resource !== 'cases')) return;
    setArchiving(true);
    const result = await supabase.from(resource === 'cases' ? 'amcf_cases' : 'amcf_contacts').update({ archived_at: new Date().toISOString() }).eq('id', archive.id).select('id');
    if (result.error || !result.data?.length) toast.error(result.error ? errorMessage(result.error) : 'Não foi possível arquivar.');
    else { toast.success('Registro arquivado; histórico preservado.'); setArchive(null); await cache.invalidateQueries(); }
    setArchiving(false);
  };
  return <><PageHeader eyebrow={resource === 'cases' ? 'ATUAÇÃO MÉDICO-PERICIAL' : 'GESTÃO OPERACIONAL'} title={definition.title} description={definition.description}>{(resource !== 'cases' || access?.capabilities.manage) && <Button onClick={() => setEditor(null)}><Plus />{resource === 'contacts' ? 'Novo contato' : resource === 'cases' ? 'Novo caso' : resource === 'tasks' ? 'Nova tarefa' : 'Nova oportunidade'}</Button>}</PageHeader>
    {resource === 'tasks' && <div className="notice mb-5"><SlidersHorizontal className="h-4 w-4 shrink-0" /><p>A conferência humana de prazos judiciais é indispensável. Recorrência e alertas automáticos ainda não estão ativos.</p></div>}
    <section className="data-panel"><div className="table-toolbar"><form onSubmit={e => { e.preventDefault(); setTerm(search); setPage(0); }} className="flex w-full gap-2 sm:max-w-sm"><div className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder={`Buscar ${definition.title.toLowerCase()}…`} aria-label="Buscar registros" value={search} onChange={e => setSearch(e.target.value)} /></div><Button variant="outline" type="submit">Buscar</Button></form><div className="flex flex-wrap items-center gap-2">{(definition.stageTable || resource === 'tasks') && <select className="native-select w-auto min-w-36" aria-label="Filtrar por etapa ou situação" value={stage} onChange={e => { setStage(e.target.value); setPage(0); }}><option value="">{resource === 'tasks' ? 'Todas as situações' : 'Todas as etapas'}</option>{resource === 'tasks' ? Object.entries(taskStatuses).map(([id, name]) => <option value={id} key={id}>{name}</option>) : stages.data?.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}</select>}<Button variant="outline" size="icon" aria-label={ascending ? 'Ordenar mais recentes primeiro' : 'Ordenar mais antigos primeiro'} onClick={() => { setAscending(!ascending); setPage(0); }}><ArrowUpDown /></Button>{definition.stageTable && <div className="flex rounded-md border p-1"><Button variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" aria-label="Visualização em lista" onClick={() => setView('list')}><LayoutList /></Button><Button variant={view === 'board' ? 'secondary' : 'ghost'} size="sm" aria-label="Visualização em kanban" onClick={() => setView('board')}><Columns3 /></Button></div>}</div></div>
    <QueryState loading={query.isPending} error={query.isError} empty={!query.isPending && !query.isError && !rows.length} onRetry={() => void query.refetch()} title={term || stage ? 'Nenhum resultado para estes filtros' : `Nenhum ${definition.singular} cadastrado`} />
    {!query.isPending && !query.isError && rows.length > 0 && (view === 'list' ? <div className="table-scroll"><table className="work-table"><thead><tr>{definition.columns.map(c => <th key={c.key}>{c.label}</th>)}<th className="text-right">Ações</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>{definition.columns.map((c, index) => <td key={c.key} className={index === 0 ? 'font-medium' : ''}>{c.type === 'status' || c.key === 'stage' ? <span className={`status-pill ${row[c.key] === 'urgent' || row[c.key] === 'high' ? 'status-warning' : 'status-neutral'}`}>{label(row, c)}</span> : index === 1 && resource === 'cases' ? <Link to={`/casos/${row.id}`} className="hover:underline">{label(row, c)}</Link> : label(row, c)}</td>)}<td><div className="flex justify-end gap-1">{resource === 'cases' && <Button asChild variant="ghost" size="icon" aria-label="Abrir caso"><Link to={`/casos/${row.id}`}><ArrowUpRight /></Link></Button>}<Button variant="ghost" size="icon" aria-label={`Editar ${definition.singular}`} onClick={() => setEditor(row)}><Pencil /></Button>{access?.capabilities.manage && ['contacts', 'cases'].includes(resource) && <Button variant="ghost" size="icon" aria-label={`Arquivar ${definition.singular}`} onClick={() => setArchive(row)}><Archive /></Button>}</div></td></tr>)}</tbody></table></div> : <div className="kanban-board">{stages.data?.map(s => <section key={s.id} className="kanban-column"><div className="mb-4 flex items-center justify-between text-xs font-semibold"><span>{s.name}</span><span className="text-muted-foreground">{rows.filter(r => r.stage_id === s.id).length}</span></div>{rows.filter(r => r.stage_id === s.id).map(row => <button key={row.id} onClick={() => setEditor(row)} className="kanban-item"><span className="text-[10px] uppercase tracking-wider text-muted-foreground">{String(row.reference || definition.singular)}</span><strong className="mt-2 block text-sm font-medium">{String(row.title)}</strong><span className="mt-4 block text-xs text-muted-foreground">{String(row.service)}</span></button>)}</section>)}</div>)}
    <div className="table-pagination"><span>{query.isError ? 'Consulta indisponível' : query.isPending ? 'Consultando…' : `${count} registro${count === 1 ? '' : 's'} · ${view === 'board' ? 'Kanban da página atual' : '20 por página'}`}</span><div className="flex items-center gap-3"><Button variant="outline" size="icon" disabled={page === 0 || query.isFetching} onClick={() => setPage(p => p - 1)} aria-label="Página anterior"><ChevronLeft /></Button><span>{page + 1} / {Math.max(1, Math.ceil(count / 20))}</span><Button variant="outline" size="icon" disabled={(page + 1) * 20 >= count || query.isFetching} onClick={() => setPage(p => p + 1)} aria-label="Próxima página"><ChevronRight /></Button></div></div></section>
    {resource === 'opportunities' && <p className="mt-4 text-xs leading-5 text-muted-foreground">Nesta etapa: cadastro e acompanhamento operacional. Valores, conversão automática e propostas serão disponibilizados após a implementação e validação dos respectivos fluxos.</p>}
    {editor !== undefined && <RecordEditor key={editor?.id || 'new'} resource={resource} row={editor} onClose={() => setEditor(undefined)} />}
    <Dialog open={!!archive} onOpenChange={open => { if (!open && !archiving) setArchive(null); }}><DialogContent><DialogHeader><DialogTitle>Arquivar este registro?</DialogTitle><DialogDescription>Ele sairá da listagem ativa. Os vínculos e o histórico serão preservados; nenhum dado será excluído.</DialogDescription></DialogHeader><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setArchive(null)} disabled={archiving}>Cancelar</Button><Button onClick={() => void archiveRecord()} disabled={archiving}>{archiving ? 'Arquivando…' : 'Confirmar arquivamento'}</Button></div></DialogContent></Dialog>
  </>;
}
