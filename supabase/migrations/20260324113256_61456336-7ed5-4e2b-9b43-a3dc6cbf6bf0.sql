ALTER TABLE public.report_schedules
ADD COLUMN language text NOT NULL DEFAULT 'en';

ALTER TABLE public.report_schedules
ADD CONSTRAINT report_schedules_language_check
CHECK (language IN ('en', 'de'));