-- Threading support for theme comments
ALTER TABLE public.theme_comments
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.theme_comments(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_theme_comments_parent ON public.theme_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_theme_comments_report_theme ON public.theme_comments(report_id, theme_id);

-- Full-text search across daily reports + special editions
CREATE OR REPLACE FUNCTION public.search_reports(q text)
RETURNS TABLE(
  id uuid,
  kind text,
  title text,
  language text,
  created_at timestamptz,
  snippet text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT id, 'daily'::text AS kind, title, language, created_at,
    LEFT(regexp_replace(report_data::text, '\s+', ' ', 'g'), 240) AS snippet
  FROM public.generated_reports
  WHERE title ILIKE '%' || q || '%' OR report_data::text ILIKE '%' || q || '%'
  UNION ALL
  SELECT id, 'special'::text, topic AS title, language, COALESCE(approved_at, created_at) AS created_at,
    LEFT(regexp_replace(report_data::text, '\s+', ' ', 'g'), 240) AS snippet
  FROM public.special_editions
  WHERE status = 'approved'
    AND (topic ILIKE '%' || q || '%' OR report_data::text ILIKE '%' || q || '%')
  ORDER BY created_at DESC
  LIMIT 50;
$$;