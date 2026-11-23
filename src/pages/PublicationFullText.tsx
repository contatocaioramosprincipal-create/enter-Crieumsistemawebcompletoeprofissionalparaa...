import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

// Consulta a íntegra apenas após pedido, sem carregar textos extensos para todos os cartões.
export default function PublicationFullText({leadId,sourceUrl}:{leadId:string;sourceUrl:string}){
 const [open,setOpen]=useState(false);
 const details=useQuery({
  queryKey:['amcf-djen-publication-full-text',leadId],
  enabled:open,
  queryFn:async()=>{
   const r=await supabase.from('amcf_appointment_publication_texts')
      .select('publication_text,is_truncated,captured_at').eq('lead_id',leadId).maybeSingle();
   if(r.error)throw r.error;
   return r.data;
  }
 });
 const source=/^https:\/\/comunicaapi\.pje\.jus\.br\/api\/v1\/comunicacao\/[a-zA-Z0-9_-]+\/certidao$/.test(sourceUrl)
   ?sourceUrl:'https://comunica.pje.jus.br/';
 return <div className="mt-3">
  <Button type="button" variant="outline" size="sm" aria-expanded={open}
   onClick={()=>setOpen(x=>!x)}>
   <BookOpen size={15}/>{open?'Recolher publicação':'Ler texto completo da publicação'}
   {open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
  </Button>
  {open&&<div className="mt-3 rounded-lg border bg-background p-4" role="region" aria-label="Texto integral da publicação judicial">
   {details.isPending&&<p className="text-xs text-muted-foreground">Carregando texto da publicação…</p>}
   {details.isError&&<p role="alert" className="text-xs text-destructive">Não foi possível carregar o texto completo do DJEN.</p>}
   {!details.isPending&&!details.isError&&!details.data&&
    <p className="text-xs text-muted-foreground">Esta publicação foi encontrada antes da captura integral de textos. Confira a certidão no portal do CNJ. As novas publicações serão armazenadas para leitura aqui.</p>}
   {details.data&&<>
    <div className="flex flex-wrap justify-between gap-2">
     <p className="text-xs font-semibold">{details.data.is_truncated?'Texto disponível (parcial devido ao limite de armazenamento)':'Texto integral capturado do DJEN'}</p>
     <span className="text-[11px] text-muted-foreground">Documento público — conferência obrigatória</span>
    </div>
    <div className="mt-3 max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-muted/20 p-4 font-mono text-xs leading-6 text-foreground selection:bg-primary/20" tabIndex={0}>
      {details.data.publication_text}
    </div>
    {details.data.is_truncated&&<p className="mt-2 text-xs text-warning">Texto muito extenso. Abra a certidão oficial para consultar o restante.</p>}
   </>}
   <a className="mt-3 inline-flex items-center gap-2 text-xs text-primary underline"
      target="_blank" rel="noopener noreferrer" href={source}>
    <ExternalLink size={14}/>Consultar o documento na fonte oficial
   </a>
  </div>}
 </div>;
}
