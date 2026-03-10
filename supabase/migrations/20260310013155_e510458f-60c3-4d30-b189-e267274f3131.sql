
CREATE TABLE public.report_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'every_other_day', 'weekly')),
  source_ids text[] NOT NULL DEFAULT '{}',
  articles_per_source int NOT NULL DEFAULT 8,
  enabled boolean NOT NULL DEFAULT true,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.report_schedules(id) ON DELETE CASCADE,
  title text NOT NULL,
  report_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage schedules" ON public.report_schedules FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can read reports" ON public.generated_reports FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can delete reports" ON public.generated_reports FOR DELETE TO public USING (true);
CREATE POLICY "System can insert reports" ON public.generated_reports FOR INSERT TO public WITH CHECK (true);
