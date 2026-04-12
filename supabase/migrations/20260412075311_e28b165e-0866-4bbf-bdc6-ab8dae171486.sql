UPDATE public.report_schedules 
SET last_run_at = last_run_at + interval '2 hours'
WHERE enabled = true;