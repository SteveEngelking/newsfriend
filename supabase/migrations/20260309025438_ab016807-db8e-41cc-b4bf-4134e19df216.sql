
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert sources" ON public.news_sources;
DROP POLICY IF EXISTS "Anyone can delete sources" ON public.news_sources;

-- Only allow inserting custom sources (id must start with 'custom-')
CREATE POLICY "Anyone can insert custom sources"
ON public.news_sources
FOR INSERT
WITH CHECK (id LIKE 'custom-%');

-- Only allow deleting custom sources (protect default/seeded sources)
CREATE POLICY "Anyone can delete custom sources"
ON public.news_sources
FOR DELETE
USING (id LIKE 'custom-%');
