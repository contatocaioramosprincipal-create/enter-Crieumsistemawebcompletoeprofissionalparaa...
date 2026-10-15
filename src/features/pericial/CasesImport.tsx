import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { errorMessage } from '@/lib/format';
import { normName, parseCaseImport } from './caseImport';

// Cadastro em lote de casos por planilha CSV. Só administrador/médico (mesma regra do botão "Novo caso" e do banco).
export default function CasesImport() {
  const { access } = useAuth();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [report, setReport] = useState('');
  const [busy, setBusy] = useState(false);
  if (!access?.capabilities.manage || !access.member) return null;
  const memberId = access.member.id;

  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 500_000) { setReport('Arquivo grande demais (máximo 500 KB).'); return; }
    setText(await file.text());
  };
  const run = async () => {
    setBusy(true); setReport('');
    try {
      const parsed = parseCaseImport(text);
      if (!parsed.rows.length) { setReport(parsed.errors.join('\n')); return; }
      const [contacts, stages, existing] = await Promise.all([
        supabase.from('amcf_contacts').select('id,name').is('archived_at', null).limit(5000),
        supabase.from('amcf_case_stages').select('id').order('position').limit(1),
        supabase.from('amcf_cases').select('reference').in('reference', parsed.rows.map(row => row.reference)),
      ]);
      if (contacts.error || stages.error || existing.error || !stages.data?.length) { setReport('Não foi possível carregar contatos e etapas.'); return; }
      const byName = new Map<string, string[]>();
      for (const contact of contacts.data) { const key = normName(contact.name); byName.set(key, [...(byName.get(key) || []), contact.id]); }
      const taken = new Set((existing.data || []).map(item => item.reference.toLowerCase()));
      const problems = [...parsed.errors]; const payload: Record<string, unknown>[] = [];
      for (const row of parsed.rows) {
        const ids = byName.get(normName(row.contact)) || [];
        if (taken.has(row.reference.toLowerCase())) { problems.push(`Linha ${row.line}: referência ${row.reference} já existe.`); continue; }
        if (ids.length !== 1) { problems.push(`Linha ${row.line}: contato "${row.contact}" ${ids.length ? 'tem nome repetido' : 'não foi encontrado'}; cadastre-o antes.`); continue; }
        payload.push({ reference: row.reference, title: row.title, contact_id: ids[0], service: row.service, stage_id: stages.data[0].id, responsible_id: memberId, cnj_number: row.cnj || null, claimant: row.claimant || null, defendant: row.defendant || null, court: row.court || null });
      }
      let created = 0;
      if (payload.length) {
        const batch = await supabase.from('amcf_cases').insert(payload).select('id');
        if (!batch.error) created = payload.length;
        else for (const one of payload) { const single = await supabase.from('amcf_cases').insert(one).select('id'); if (single.error) problems.push(`${String(one.reference)}: ${errorMessage(single.error)}`); else created++; }
      }
      setReport(`Casos criados: ${created}. Linhas com problema: ${problems.length}.` + (problems.length ? '\n' + problems.join('\n') : ''));
      if (created) { toast.success(`${created} caso(s) importado(s).`); setText(''); await cache.invalidateQueries(); }
    } catch (error) { setReport(errorMessage(error)); } finally { setBusy(false); }
  };
  return <>
    <Button type="button" variant="outline" onClick={() => setOpen(true)}><Upload />Importar planilha</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Importar casos por planilha</DialogTitle><DialogDescription>Envie ou cole um CSV com cabeçalho. Colunas: <code>referencia; titulo; contato; servico</code> (obrigatórias) e <code>cnj; autor; reu; vara</code> (opcionais). O contato precisa já estar cadastrado, com o mesmo nome. Os casos entram na primeira etapa, com você como responsável. Não coloque dados clínicos.</DialogDescription></DialogHeader>
        <input type="file" accept=".csv,text/csv,text/plain" aria-label="Arquivo CSV" disabled={busy} onChange={event => void readFile(event.target.files?.[0])} className="text-xs" />
        <Textarea aria-label="Conteúdo da planilha" rows={8} value={text} onChange={event => setText(event.target.value)} disabled={busy} placeholder={'referencia;titulo;contato;servico;cnj\nP-001;Ação de teste;Nome do Contato;Perícia judicial;'} />
        <div><Button type="button" disabled={busy || !text.trim()} onClick={() => void run()}>{busy ? 'Importando…' : 'Importar'}</Button></div>
        {report && <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-xs">{report}</pre>}
      </DialogContent>
    </Dialog>
  </>;
}
