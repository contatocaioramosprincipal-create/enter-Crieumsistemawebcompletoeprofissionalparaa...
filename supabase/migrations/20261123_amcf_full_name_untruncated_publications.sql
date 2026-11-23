-- Corrigir homônimos reportados pelo Dr. Adilson em 23/11/2026.
-- Preservar o histórico, descartando somente os pendentes identificados pela busca genérica.
INSERT INTO public.amcf_appointment_search_terms(phrase,active)
VALUES ('ADILSON MACHADO COUTO FILHO',true)
ON CONFLICT (phrase) DO UPDATE SET active=true;

UPDATE public.amcf_appointment_search_terms
 SET active=false
WHERE lower(trim(phrase))=lower('Adilson Couto');

ALTER TABLE public.amcf_appointment_leads
 ADD COLUMN IF NOT EXISTS discard_reason text;
UPDATE public.amcf_appointment_leads
 SET status='descartada',
     discard_reason='Falso positivo da pesquisa genérica por "Adilson Couto"; titular confirmou nome completo ADILSON MACHADO COUTO FILHO.',
     updated_at=now()
 WHERE lower(trim(matched_term))=lower('Adilson Couto')
   AND status IN ('pendente','em_analise')
   AND linked_case_id IS NULL;

-- Texto integral da publicação separado do resumo: a tela não carrega documentos grandes em cada cartão.
CREATE TABLE IF NOT EXISTS public.amcf_appointment_publication_texts(
 lead_id uuid PRIMARY KEY REFERENCES public.amcf_appointment_leads(id) ON DELETE CASCADE,
 publication_text text NOT NULL CHECK(length(publication_text) between 1 and 150000),
 is_truncated boolean NOT NULL DEFAULT false,
 captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.amcf_appointment_publication_texts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.amcf_appointment_publication_texts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.amcf_appointment_publication_texts TO service_role;
GRANT SELECT ON TABLE public.amcf_appointment_publication_texts TO authenticated;
DROP POLICY IF EXISTS amcf_appointment_publication_text_read ON public.amcf_appointment_publication_texts;
CREATE POLICY amcf_appointment_publication_text_read
 ON public.amcf_appointment_publication_texts FOR SELECT TO authenticated
 USING(public.amcf_role() IN ('admin','doctor','assistant'));
