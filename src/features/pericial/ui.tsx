import type { ReactNode } from 'react';
import { FileText, Link2, MoveRight } from 'lucide-react';
import { describeSource, label, movementClass, sourceKinds } from './pericial';
import type { SourceRow } from './api';

export function Section({ title, description, actions, children, className = '' }: { title: string; description?: string; actions?: ReactNode; children?: ReactNode; className?: string }) {
  return <section className={`data-panel ${className}`}>
    <div className="panel-title"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{actions}</div>
    <div className="p-5">{children}</div>
  </section>;
}
export function SubSection({ title, children, actions }: { title: string; children?: ReactNode; actions?: ReactNode }) {
  return <div className="mt-6 border-t pt-5 first:mt-0 first:border-t-0 first:pt-0">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>{actions}</div>
    {children}
  </div>;
}
export function Pill({ tone = 'neutral', children }: { tone?: 'neutral' | 'warning' | 'success'; children: ReactNode }) {
  return <span className={`status-pill ${tone === 'warning' ? 'status-warning' : tone === 'success' ? 'status-success' : 'status-neutral'}`}>{children}</span>;
}
export function movementTone(classification: string): 'neutral' | 'warning' | 'success' {
  if (classification === 'possivel_prazo') return 'warning';
  if (classification === 'requer_acao') return 'warning';
  if (classification === 'agenda') return 'neutral';
  return 'neutral';
}
export function MovementBadge({ movement }: { movement: { classification: string; needs_human_review: boolean; review_state: string } }) {
  return <div className="flex flex-wrap items-center gap-2">
    <Pill tone={movementTone(movement.classification)}>{label(movementClass, movement.classification)}</Pill>
    {movement.needs_human_review && <Pill tone="warning">Confirmar com o responsável</Pill>}
    <Pill tone={movement.review_state === 'nova' ? 'warning' : movement.review_state === 'revisada' ? 'success' : 'neutral'}>{movement.review_state === 'nova' ? 'Não revisada' : movement.review_state === 'revisada' ? 'Revisada' : 'Ignorada'}</Pill>
  </div>;
}
export function Score({ value, caption }: { value: ReactNode; caption: string }) {
  return <div className="rounded-md border bg-muted/40 px-4 py-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{caption}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
}
export function SourceList({ sources, onOpen }: { sources: SourceRow[]; onOpen?: (source: SourceRow) => void }) {
  if (!sources.length) return <p className="mt-2 text-xs text-muted-foreground">Nenhuma fonte citada neste registro. Registros de origem documental sem fonte ficam sinalizados na prontidão do processo.</p>;
  return <ul className="mt-2 space-y-2">{sources.map(source => <li key={source.id} className="flex flex-wrap items-start gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
    <FileText size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
    <div className="min-w-0 flex-1">
      <p className="font-medium">{describeSource({ source_kind: source.source_kind, quote: source.quote, page_number: source.page_number, document_title: source.document?.title, movement_title: source.movement?.title, movement_on: source.movement?.occurred_on, finding_title: source.finding?.title, question_number: source.question?.number, reference_citation: source.reference?.citation })}</p>
      <p className="mt-1 text-muted-foreground">{sourceKinds[source.source_kind as keyof typeof sourceKinds] || source.source_kind}</p>
    </div>
    {onOpen && <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-primary" onClick={() => onOpen(source)}><Link2 size={13} />Abrir</button>}
  </li>)}</ul>;
}
export function Empty({ title, description }: { title: string; description: string }) {
  return <div className="rounded-md border border-dashed px-4 py-6 text-center"><p className="text-sm font-medium">{title}</p><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-muted-foreground">{description}</p></div>;
}
export function KeyValue({ items }: { items: { label: string; value: ReactNode }[] }) {
  return <dl className="grid gap-4 sm:grid-cols-2">{items.map(entry => <div key={entry.label}><dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{entry.label}</dt><dd className="mt-1 text-sm break-words">{entry.value || '—'}</dd></div>)}</dl>;
}
export function NextActionBar({ next }: { next?: { label: string; next_action: string; next_action_on: string | null } | null }) {
  if (!next) return null;
  return <div className="mb-5 flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-secondary px-4 py-3 text-xs">
    <MoveRight size={15} className="text-primary" />
    <strong>Próxima ação:</strong><span>{next.next_action || next.label}</span>
    {next.next_action_on && <Pill tone="neutral">Prevista para {next.next_action_on}</Pill>}
    <span className="text-muted-foreground">Etapa: {next.label}</span>
  </div>;
}
