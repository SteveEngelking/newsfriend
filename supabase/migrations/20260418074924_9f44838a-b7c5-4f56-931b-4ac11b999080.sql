CREATE TABLE public.reflection_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL,
  theme_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (report_id, theme_id, client_id)
);

CREATE INDEX idx_reflection_likes_report_theme ON public.reflection_likes (report_id, theme_id);

ALTER TABLE public.reflection_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes"
ON public.reflection_likes
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert likes"
ON public.reflection_likes
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete own like"
ON public.reflection_likes
FOR DELETE
USING (true);