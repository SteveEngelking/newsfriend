ALTER TABLE public.report_schedules
DROP CONSTRAINT IF EXISTS report_schedules_frequency_check;

ALTER TABLE public.report_schedules
ADD CONSTRAINT report_schedules_frequency_check
CHECK (
  frequency IN (
    'immediate',
    'hourly',
    'every_6_hours',
    'every_12_hours',
    'daily',
    'every_other_day',
    'weekly'
  )
);