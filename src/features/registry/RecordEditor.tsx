import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-context';
import { todayISO, errorMessage, currency } from '@/lib/format';
import { resources, type ResourceKey, type RecordRow } from './resources';
import { validateRecord } from './validation';
import LookupInput from './LookupInput';

const parseCents = (input: string) => {
  const value = Number(input.trim().replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
};

export default function RecordEditor({ resource, row, onClose }: { resource: ResourceKey; row: RecordRow | null; onClose: () => void }) {
  const definition = resources[resource];
  const { access } = useAuth();
  const cache = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(definition.fields.map(field => [field.key, String(row?.[field.key] ?? ({ responsible_id: access?.member?.id, opened_on: todayISO(), kind: 'lawyer', priority: 'normal', status: 'pending' }[field.key] ?? ''))])));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [amount, setAmount] = useState('');
  const canSeeValue = resource === 'opportunities' && !!access?.capabilities.manage;
  const storedValue = useQuery({ queryKey: ['opportunity-value', row?.id], enabled: canSeeValue && !!row?.id, queryFn: async () => { const result = await supabase.from('amcf_opportunity_values').select('amount_cents').eq('opportunity_id', String(row!.id)).maybeSingle(); if (result.error) throw result.error; return result.data; } });
  useEffect(() => { if (storedValue.data) setAmount((storedValue.data.amount_cents / 100).toFixed(2).replace('.', ',')); }, [storedValue.data]);
  const directory = useQuery({ queryKey: ['directory'], queryFn: async () => { const result = await supabase.rpc('amcf_directory'); if (result.error) throw result.error; return result.data; } });
  const stages = useQuery({ queryKey: ['stages', definition.stageTable], enabled: !!definition.stageTable, queryFn: async () => { const result = await supabase.from(definition.stageTable!).select('*').order('position'); if (result.error) throw result.error; return result.data; } });
  const change = (key: string, value: string) => { setValues(v => ({ ...v, [key]: value })); if (key === 'email' || key === 'phone') { setReviewed(false); setDuplicates([]); } };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    const data: Record<string, string | null> = { ...values };
    for (const key of Object.keys(data)) if (data[key] === '' && (key.endsWith('_id') || key.endsWith('_on') || ['email', 'phone', 'loss_reason'].includes(key))) data[key] = null;
    const validationError = validateRecord(resource, data);
    if (validationError) { setError(validationError); return; }
    const cents = amount.trim() ? parseCents(amount) : null;
    if (canSeeValue && amount.trim() && cents === null) { setError('Informe o valor estimado no formato 12.500,00.'); return; }
    setBusy(true);
    try {
      if (resource === 'contacts' && !reviewed && (data.email || data.phone)) {
        const normalizedEmail = data.email?.trim().toLowerCase();
        const normalizedPhone = data.phone?.replace(/\D/g, '');
        const filters = [normalizedEmail ? `email.eq.${normalizedEmail.replace(/[,()]/g, '')}` : '', normalizedPhone ? `phone.eq.${normalizedPhone}` : ''].filter(Boolean).join(',');
        const result = await supabase.from('amcf_contacts').select('id,name').or(filters).limit(10);
        if (result.error) throw result.error;
        const names = (result.data || []).filter(d => d.id !== row?.id).map(d => d.name);
        if (names.length) { setDuplicates(names); setError('Possíveis duplicatas encontradas. Revise antes de salvar um cadastro separado.'); return; }
      }
      const payload = data as unknown as Database['public']['Tables'][typeof definition.table]['Insert'];
      const result = row ? await supabase.from(definition.table).update(payload).eq('id', row.id).select('id') : await supabase.from(definition.table).insert(payload).select('id');
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error('O registro não foi salvo. Sua permissão pode ter sido alterada.');
      if (canSeeValue && cents !== null) {
        const savedId = String(row?.id ?? (result.data[0] as { id?: string } | undefined)?.id ?? '');
        const persisted = await supabase.from('amcf_opportunity_values').upsert({ opportunity_id: savedId, amount_cents: cents }).select('opportunity_id');
        if (persisted.error || !persisted.data?.length) throw new Error('Oportunidade salva, mas o valor estimado não foi gravado. Verifique sua permissão.');
      }
      await cache.invalidateQueries();
      toast.success(`${definition.singular[0].toUpperCase()}${definition.singular.slice(1)} salvo com sucesso.`); onClose();
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{row ? 'Editar' : 'Novo registro:'} {definition.singular}</DialogTitle><DialogDescription>Somente informações administrativas fictícias. Não inclua dados clínicos.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{definition.fields.map(field => {
    const disabled = busy || (!!row && !!field.immutable) || (!!field.managerOnly && !access?.capabilities.manage);
    let options: { id: string; name: string }[] = [];
    if (field.type === 'member') options = directory.data || [];
    if (field.type === 'stage') options = stages.data || [];
    return <div key={field.key} className={['textarea', 'contact', 'organization', 'case'].includes(field.type || '') ? 'sm:col-span-2' : ''}><label className="field-label" htmlFor={`field-${field.key}`}>{field.label}{field.required ? ' *' : ''}</label>{field.type === 'contact' || field.type === 'case' || field.type === 'organization' ? <LookupInput table={field.type === 'contact' ? 'amcf_contacts' : field.type === 'case' ? 'amcf_cases' : 'amcf_organizations'} value={values[field.key]} onChange={v => change(field.key, v)} disabled={disabled} required={field.required} label={field.label} /> : field.type === 'textarea' ? <Textarea id={`field-${field.key}`} rows={3} value={values[field.key]} onChange={e => change(field.key, e.target.value)} maxLength={field.max} disabled={disabled} /> : ['select', 'member', 'stage'].includes(field.type || '') ? <select id={`field-${field.key}`} className="native-select" value={values[field.key]} onChange={e => change(field.key, e.target.value)} disabled={disabled} required={field.required}><option value="">Selecione…</option>{field.options ? Object.entries(field.options).map(([id, name]) => <option key={id} value={id}>{name}</option>) : options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select> : <Input id={`field-${field.key}`} type={field.type || 'text'} value={values[field.key]} onChange={e => change(field.key, e.target.value)} required={field.required} minLength={field.min} maxLength={field.max} disabled={disabled} />}</div>;
  })}{canSeeValue && <div className="sm:col-span-2"><label className="field-label" htmlFor="field-amount">Valor estimado (R$)</label><Input id="field-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" disabled={busy} /><p className="mt-2 text-[11px] leading-5 text-muted-foreground">Campo restrito a administrador e médico. {storedValue.data ? `Valor atual: ${currency(storedValue.data.amount_cents)}.` : ''} Assistente não vê nem altera este valor.</p></div>}</div>{(directory.isError || stages.isError) && <p className="text-sm text-destructive">Não foi possível carregar responsáveis ou etapas. Feche e tente novamente.</p>}{duplicates.length > 0 && <div className="rounded-lg border border-warning/30 bg-warning-soft p-4"><p className="text-sm font-medium">Revise estes cadastros:</p><ul className="mt-2 list-inside list-disc text-sm">{duplicates.map((name, index) => <li key={index}>{name}</li>)}</ul><label className="mt-3 flex items-start gap-2 text-xs leading-5"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} className="mt-1" />Revisei e desejo manter este registro separado. A mesclagem ainda não está disponível nesta etapa.</label></div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2 border-t pt-4"><Button variant="outline" type="button" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy || (duplicates.length > 0 && !reviewed)}>{busy ? 'Salvando…' : 'Salvar registro'}</Button></div></form></DialogContent></Dialog>;
}
