
-- App-wide settings (single row, id=1)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1,
  banner_images_enabled boolean NOT NULL DEFAULT false,
  banner_image_model text NOT NULL DEFAULT 'google/gemini-2.5-flash-image',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_singleton CHECK (id = 1)
);

INSERT INTO public.app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update app settings"
  ON public.app_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert app settings"
  ON public.app_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public storage bucket for AI-generated banner images
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-banners', 'report-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can read report banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'report-banners');

CREATE POLICY "Service role can write report banners"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'report-banners' AND auth.role() = 'service_role');

CREATE POLICY "Service role can update report banners"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'report-banners' AND auth.role() = 'service_role');
