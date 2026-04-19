-- Disable two duplicate/legacy daily report schedules that were silently
-- triggering extra AI runs alongside the active schedule shown in the admin UI.
-- The newest schedule (created 2026-04-15) remains enabled.
UPDATE public.report_schedules
SET enabled = false
WHERE id IN (
  '4ee46c34-fc1d-4ae5-bfcf-83dd6830d741',
  'd27709cd-16e3-48d1-957d-6e8b108f527f'
);