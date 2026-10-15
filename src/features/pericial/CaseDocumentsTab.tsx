import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { dateLabel } from '@/lib/format';
import { extractionHint, label, textStatuses } from './pericial';
import { fail, type DocRow } from './api';
import { Empty, Pill, Section } from './ui';

// Documentos do caso: leitura do que já está armazenado. O envio e o download seguem na aba Documentos do menu.
export default function CaseDocumentsTab({ caseId }: { caseId: string }) {
  const docs = useQuery({ queryKey: ['case-documents', caseId], queryFn: async () => fail<DocRow[]>(supabase.from('amcf_documents').select('*').eq('case_id', caseId).order('created_at', { ascending: false }).limit(200)) });
  return <Section title="Documentos, exames e prontuários do processo" description="Lista o que está guardado no armazenamento privado para este processo, com a situação da extração de texto. Laudos lidos pelo Assistente com a opção “Salvar no processo” aparecem aqui.">
    {docs.isPending && <p className="text-xs text-muted-foreground">Carregando documentos…</p>}
    {docs.isError && <p role="alert" className="text-xs text-destructive">Não foi possível carregar os documentos.</p>}
    {!docs.isPending && !docs.isError && !docs.data?.length && <Empty title="Nenhum documento neste processo" description="Envie pela aba Documentos do menu, ou anexe um laudo no Assistente Virtual marcando “Salvar no processo”." />}
    <ul className="space-y-3">{docs.data?.map(doc => <li key={doc.id} className="rounded-md border px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <FileText size={15} className="text-muted-foreground" />
        <strong className="text-sm">{doc.title}</strong>
        <Pill tone="neutral">{doc.category}</Pill>
        <Pill tone={doc.text_status === 'extraido' ? 'success' : 'warning'}>{label(textStatuses, doc.text_status)}</Pill>
        <span className="ml-auto text-[11px] text-muted-foreground">{dateLabel(doc.document_date || doc.created_at)}</span>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{doc.file_name} · {(doc.size_bytes / 1048576).toFixed(2)} MB · {extractionHint(doc.text_status, doc.extraction_engine)}</p>
    </li>)}</ul>
    <p className="mt-4 text-xs text-muted-foreground"><Link className="text-primary underline" to="/documentos">Ir para Documentos</Link> para enviar, baixar ou excluir arquivos.</p>
  </Section>;
}
