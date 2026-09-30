import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type LookupTable = 'amcf_contacts' | 'amcf_cases' | 'amcf_organizations' | 'amcf_opportunities';
export default function LookupInput({ table, value, onChange, disabled, required, label }: { table: LookupTable; value: string; onChange: (id: string) => void; disabled?: boolean; required?: boolean; label: string }) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const column = table === 'amcf_cases' || table === 'amcf_opportunities' ? 'title' : 'name';
  const selection = table === 'amcf_cases' ? 'id,reference,title' : table === 'amcf_organizations' ? 'id,name' : table === 'amcf_opportunities' ? 'id,title' : 'id,name';
  const selected = useQuery({ queryKey: ['lookup-selected', table, value], enabled: !!value, queryFn: async () => { const result = await supabase.from(table).select(selection).eq('id', value).maybeSingle(); if (result.error) throw result.error; return result.data as unknown as Record<string, string> | null; } });
  const options = useQuery({ queryKey: ['lookup', table, term], enabled: !disabled, queryFn: async () => { let query = supabase.from(table).select(selection).order(column).limit(30); if (term) query = query.ilike(column, `%${term.replace(/[%_\\]/g, '')}%`); const result = await query; if (result.error) throw result.error; return result.data as unknown as Record<string, string>[]; } });
  const all = [...(selected.data ? [selected.data] : []), ...(options.data || []).filter(o => o.id !== value)];
  return <div className="space-y-2">{!disabled && <div className="flex gap-2"><Input aria-label={`Buscar ${label.toLowerCase()}`} placeholder="Busque por nome…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setTerm(search); } }} /><Button type="button" variant="outline" onClick={() => setTerm(search)}>Buscar</Button></div>}<select className="native-select" aria-label={label} required={required} disabled={disabled} value={value} onChange={e => onChange(e.target.value)}><option value="">Selecione…</option>{all.map(o => <option key={o.id} value={o.id}>{o.reference ? `${o.reference} · ` : ''}{o[column]}</option>)}</select>{options.isError && <p className="text-xs text-destructive">Não foi possível buscar opções. Tente novamente.</p>}{!disabled && <p className="text-[11px] text-muted-foreground">Até 30 resultados por busca.</p>}</div>;
}
