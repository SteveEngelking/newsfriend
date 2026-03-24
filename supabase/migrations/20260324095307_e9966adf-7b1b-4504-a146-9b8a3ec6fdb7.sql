
-- Add sort_order column to news_sources
ALTER TABLE public.news_sources ADD COLUMN sort_order integer NOT NULL DEFAULT 0;

-- Set initial sort_order based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM public.news_sources
)
UPDATE public.news_sources SET sort_order = numbered.rn
FROM numbered WHERE news_sources.id = numbered.id;

-- Add UPDATE policy for admins on news_sources
CREATE POLICY "Admins can update sources"
ON public.news_sources
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
