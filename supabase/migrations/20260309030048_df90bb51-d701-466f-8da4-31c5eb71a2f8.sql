
-- Add constraints to news_sources for data integrity
ALTER TABLE public.news_sources
  ADD CONSTRAINT news_sources_url_format CHECK (url ~ '^https?://'),
  ADD CONSTRAINT news_sources_name_length CHECK (char_length(name) <= 200),
  ADD CONSTRAINT news_sources_url_length CHECK (char_length(url) <= 2000);

-- Create a trigger to cap total custom sources at 50
CREATE OR REPLACE FUNCTION public.limit_custom_sources()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT count(*) FROM public.news_sources WHERE id LIKE 'custom-%') >= 50 THEN
    RAISE EXCEPTION 'Maximum number of custom sources (50) reached';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_custom_source_limit
  BEFORE INSERT ON public.news_sources
  FOR EACH ROW
  WHEN (NEW.id LIKE 'custom-%')
  EXECUTE FUNCTION public.limit_custom_sources();
