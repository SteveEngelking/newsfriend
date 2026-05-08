
CREATE TABLE public.report_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.generated_reports(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  title TEXT NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (report_id, language)
);

ALTER TABLE public.report_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON public.report_translations FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert translations"
  ON public.report_translations FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can update translations"
  ON public.report_translations FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can delete translations"
  ON public.report_translations FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_report_translations_report_lang
  ON public.report_translations (report_id, language);

CREATE TABLE public.translation_glossary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_term TEXT NOT NULL UNIQUE,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  do_not_translate BOOLEAN NOT NULL DEFAULT false,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.translation_glossary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read glossary"
  ON public.translation_glossary FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert glossary"
  ON public.translation_glossary FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update glossary"
  ON public.translation_glossary FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete glossary"
  ON public.translation_glossary FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_translation_glossary_updated_at
  BEFORE UPDATE ON public.translation_glossary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
