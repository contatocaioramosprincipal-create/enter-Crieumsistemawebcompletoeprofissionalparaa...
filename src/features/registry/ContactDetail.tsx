import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/data-table/PageHeader';
import QueryState from '@/components/data-table/QueryState';
import { dateLabel } from '@/lib/format';
import { contactKinds, type RecordRow } from './resources';
import RecordEditor from './RecordEditor';
import NewCaseDialog from '@/features/cases/NewCaseDialog';

// Ficha do contato: dados, casos ligados e atalho para abrir um novo caso.
export default function ContactDetail() {
  const { id = '' } = useParams();
  const { access } = useAuth();
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [creating, setCreating] = useState(false);
  const contact = useQuery({ queryKey: ['contact', id], queryFn: async () => { const result = await supabase.from('amcf_contacts').select('*, organization:amcf_organizations(name)').eq('id', id).maybeSingle(); if (result.error) throw result.error; return result.data as unknown as RecordRow | null; } });
  const cases = useQuery({ queryKey: ['contact-cases', id], enabled: !!contact.data, queryFn: async () => { const result = await supabase.from('amcf_cases').select('id,reference,title,service,due_on,stage:amcf_case_stages(name)').eq('contact_id', id).is('archived_at', null).order('created_at', { ascending: false }).limit(50); if (result.error) throw result.error; return result.data as unknown as { id: string; reference: string; title: string; service: string; due_on: string | null; stage: { name: string } | null }[]; } });
  if (contact.isPending || contact.isError || !contact.data) return <div className="data-panel"><QueryState loading={contact.isPending} error={contact.isError} empty={!contact.isPending && !contact.data} title="Contato indisponível" description="O contato não existe ou não está disponível para a sua conta." onRetry={() => void contact.refetch()} /></div>;
  const item = contact.data;
  const organization = (item.organization as { name?: string } | null)?.name;
  const field = (label: string, value: unknown) => <div><dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt><dd className="mt-1 text-sm">{value ? String(value) : '—'}</dd></div>;
  return <><Link to="/relacionamento" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ArrowLeft size={14} />Voltar ao relacionamento</Link>
    <PageHeader eyebrow="CONTATO" title={String(item.name)} description={contactKinds[item.kind as keyof typeof contactKinds] || 'Contato'}><Button variant="outline" onClick={() => setEditing(item)}><Pencil />Editar</Button>{access?.capabilities.manage && <Button onClick={() => setCreating(true)}><Plus />Novo caso</Button>}</PageHeader>
    <section className="data-panel p-6"><dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{field('Telefone', item.phone)}{field('E-mail', item.email)}{field('Organização', organization)}{field('Origem', item.source)}</dl>{item.notes ? <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{String(item.notes)}</p> : null}</section>
    <section className="data-panel mt-6"><div className="panel-title"><div><h2>Casos deste contato</h2><p>Clique em um caso para abrir, anexar documentos e acompanhar etapas</p></div></div>
      <QueryState loading={cases.isPending} error={cases.isError} empty={!cases.isPending && !cases.isError && !cases.data?.length} onRetry={() => void cases.refetch()} title="Nenhum caso para este contato" description="Use “Novo caso” para abrir o primeiro." />
      {!!cases.data?.length && <div className="table-scroll"><table className="work-table"><thead><tr><th>Referência</th><th>Caso</th><th>Etapa</th><th>Prazo</th></tr></thead><tbody>{cases.data.map(row => <tr key={row.id}><td>{row.reference}</td><td className="font-medium"><Link to={`/casos/${row.id}`} className="hover:underline">{row.title}</Link></td><td><span className="status-pill status-neutral">{row.stage?.name || '—'}</span></td><td>{row.due_on ? dateLabel(row.due_on) : '—'}</td></tr>)}</tbody></table></div>}
    </section>
    {editing && <RecordEditor key={String(editing.id)} resource="contacts" row={editing} onClose={() => setEditing(null)} />}
    {creating && <NewCaseDialog presetContactId={id} onClose={() => setCreating(false)} />}
  </>;
}
