ALTER TABLE public.generated_reports ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

-- Backfill from existing report_data
UPDATE public.generated_reports SET language = COALESCE(report_data->>'language', 'en');