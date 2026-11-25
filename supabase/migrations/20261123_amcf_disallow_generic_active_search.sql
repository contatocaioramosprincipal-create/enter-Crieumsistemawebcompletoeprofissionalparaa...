-- Impede reativar nomes genéricos com apenas duas palavras e reinserir homônimos.
DO $$
BEGIN
 IF NOT EXISTS(
  SELECT 1 FROM pg_constraint
  WHERE conrelid='public.amcf_appointment_search_terms'::regclass
    AND conname='amcf_appointment_search_terms_active_full_name'
 ) THEN
  ALTER TABLE public.amcf_appointment_search_terms
   ADD CONSTRAINT amcf_appointment_search_terms_active_full_name
   CHECK (NOT active OR array_length(regexp_split_to_array(btrim(phrase), E'\\s+'),1)>=3);
 END IF;
END $$;