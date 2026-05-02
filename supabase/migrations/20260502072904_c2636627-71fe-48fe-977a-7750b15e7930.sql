-- Add toggle for theme comments feature
ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS theme_comments_enabled boolean NOT NULL DEFAULT false;

-- Per-theme comments table
CREATE TABLE IF NOT EXISTS public.theme_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid NOT NULL,
  theme_id text NOT NULL,
  content text NOT NULL,
  ai_analysis text,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_theme_comments_report_theme
  ON public.theme_comments (report_id, theme_id, created_at DESC);

ALTER TABLE public.theme_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments (they appear publicly under the report)
CREATE POLICY "Anyone can read theme comments"
  ON public.theme_comments FOR SELECT
  USING (true);

-- Logged-in users can post own comments
CREATE POLICY "Users can insert own theme comments"
  ON public.theme_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own theme comments"
  ON public.theme_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can update (edit) any comment
CREATE POLICY "Admins can update theme comments"
  ON public.theme_comments FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete any comment
CREATE POLICY "Admins can delete theme comments"
  ON public.theme_comments FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role bypass (for ai_analysis updates from edge function)
CREATE POLICY "Service role can update theme comments"
  ON public.theme_comments FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_theme_comments_updated_at
  BEFORE UPDATE ON public.theme_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();