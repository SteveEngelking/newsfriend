CREATE TABLE public.special_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  report_data JSONB NOT NULL,
  created_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notified_at TIMESTAMP WITH TIME ZONE,
  notified_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.special_editions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved special editions"
  ON public.special_editions FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins can read all special editions"
  ON public.special_editions FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update special editions"
  ON public.special_editions FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete special editions"
  ON public.special_editions FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert special editions"
  ON public.special_editions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can insert special editions"
  ON public.special_editions FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_special_editions_updated_at
  BEFORE UPDATE ON public.special_editions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_special_editions_status_created ON public.special_editions(status, created_at DESC);
CREATE INDEX idx_special_editions_language ON public.special_editions(language);