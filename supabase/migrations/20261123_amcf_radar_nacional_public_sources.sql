-- Radar Nacional AMCF: enriquecimento via metadados públicos do DataJud
-- e varredura histórica incremental no DJEN.
ALTER TABLE public.amcf_appointment_leads
  ADD COLUMN IF NOT EXISTS datajud_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS datajud_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS datajud_tribunal_alias text,
  ADD COLUMN IF NOT EXISTS datajud_summary jsonb NOT NULL DEFAULT '{}'::jsonb;
DO $ddl$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid='public.amcf_appointment_leads'::regclass
      AND conname='amcf_appointment_leads_datajud_status_check'
  ) THEN
    ALTER TABLE public.amcf_appointment_leads ADD CONSTRAINT amcf_appointment_leads_datajud_status_check
      CHECK (datajud_status IN ('pendente','localizado','nao_localizado','indisponivel','nao_suportado'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid='public.amcf_appointment_leads'::regclass
      AND conname='amcf_appointment_leads_datajud_summary_limit'
  ) THEN
    ALTER TABLE public.amcf_appointment_leads ADD CONSTRAINT amcf_appointment_leads_datajud_summary_limit
      CHECK (octet_length(datajud_summary::text) <= 12000);
  END IF;
END $ddl$;
CREATE INDEX IF NOT EXISTS amcf_appointment_datajud_pending_idx
 ON public.amcf_appointment_leads(datajud_status,datajud_checked_at,created_at DESC)
 WHERE cnj_number IS NOT NULL AND status <> 'descartada';

CREATE TABLE IF NOT EXISTS public.amcf_appointment_history_progress (
 term_id uuid PRIMARY KEY REFERENCES public.amcf_appointment_search_terms(id) ON DELETE CASCADE,
 next_end_on date NOT NULL,
 finished_on date,
 last_run_at timestamptz,
 windows_checked integer NOT NULL DEFAULT 0 CHECK (windows_checked >= 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.amcf_appointment_history_progress ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.amcf_appointment_history_progress FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.amcf_appointment_history_progress TO service_role;
GRANT SELECT ON public.amcf_appointment_history_progress TO authenticated;
DROP POLICY IF EXISTS appointment_history_read ON public.amcf_appointment_history_progress;
CREATE POLICY appointment_history_read ON public.amcf_appointment_history_progress
 FOR SELECT TO authenticated
 USING (public.amcf_role() IN ('admin','doctor','assistant'));

-- Frontend: only human review fields; enrichment and source metadata are server-owned.
REVOKE UPDATE ON public.amcf_appointment_leads FROM authenticated;
GRANT UPDATE (status,linked_case_id,reviewed_by,reviewed_at)
 ON public.amcf_appointment_leads TO authenticated;

SELECT cron.schedule('amcf_appointment_history_daily','45 13 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-appointment-discovery',
    body := '{"mode":"history"}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets
         WHERE name='amcf_monitor_runner_token' LIMIT 1)),
    timeout_milliseconds := 15000
  );
  $job$
);
SELECT cron.schedule('amcf_appointment_datajud_enrichment_4h','55 */4 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://phjhedoavxicpsvuxmls.supabase.co/functions/v1/amcf-appointment-enrich',
    body := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' ||
        (SELECT decrypted_secret FROM vault.decrypted_secrets
         WHERE name='amcf_monitor_runner_token' LIMIT 1)),
    timeout_milliseconds := 15000
  );
  $job$
);
