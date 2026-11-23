-- Diferenciar monitoramento recente da pesquisa histórica, com transparência da cobertura.
ALTER TABLE public.amcf_appointment_search_runs
 ADD COLUMN IF NOT EXISTS scan_mode text NOT NULL DEFAULT 'daily',
 ADD COLUMN IF NOT EXISTS inspected integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS truncated boolean NOT NULL DEFAULT false;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='amcf_appointment_runs_mode_check'
  AND conrelid='public.amcf_appointment_search_runs'::regclass)
 THEN ALTER TABLE public.amcf_appointment_search_runs ADD CONSTRAINT amcf_appointment_runs_mode_check
  CHECK(scan_mode IN ('daily','history'));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS amcf_appointment_runs_mode_idx
 ON public.amcf_appointment_search_runs(matched_term,scan_mode,started_at DESC);
