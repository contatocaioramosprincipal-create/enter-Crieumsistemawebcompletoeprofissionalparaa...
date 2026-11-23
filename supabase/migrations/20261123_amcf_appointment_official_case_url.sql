-- Hiperlink do processo fornecido pela própria publicação oficial DJEN, quando disponível.
ALTER TABLE public.amcf_appointment_leads ADD COLUMN IF NOT EXISTS official_case_url text;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.amcf_appointment_leads'::regclass
    AND conname='amcf_appointment_case_url_length_check')
 THEN ALTER TABLE public.amcf_appointment_leads ADD CONSTRAINT amcf_appointment_case_url_length_check
   CHECK (official_case_url IS NULL OR length(official_case_url)<=850);
 END IF;
END $$;