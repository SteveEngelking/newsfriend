
-- 1) reflection_likes: prevent enumeration of all client_ids
DROP POLICY IF EXISTS "Anyone can read likes" ON public.reflection_likes;

CREATE POLICY "Clients can read own likes"
ON public.reflection_likes
FOR SELECT
TO public
USING (
  client_id = COALESCE((current_setting('request.headers', true)::json ->> 'x-client-id'), '')
  AND length(client_id) > 0
);

-- Public aggregate count via SECURITY DEFINER RPC (no client_ids leaked)
CREATE OR REPLACE FUNCTION public.get_reflection_like_count(_report_id uuid, _theme_id text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.reflection_likes
  WHERE report_id = _report_id AND theme_id = _theme_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_reflection_like_count(uuid, text) TO anon, authenticated;

-- 2) Hide prompt_instruction from anonymous visitors
REVOKE SELECT ON public.ethical_perspectives FROM anon;
GRANT SELECT (
  id, name, icon, description, sort_order, enabled,
  color_bg, color_border, color_heading, color_text, created_at
) ON public.ethical_perspectives TO anon;

REVOKE SELECT ON public.mondcivitan_settings FROM anon;
GRANT SELECT (id, title, description, updated_at) ON public.mondcivitan_settings TO anon;
