
-- Revoke broad SELECT on the two tables from anon and authenticated,
-- then re-grant column-level SELECT on all columns EXCEPT prompt_instruction.
REVOKE SELECT ON public.ethical_perspectives FROM anon, authenticated;
GRANT SELECT (id, name, icon, description, color_bg, color_border, color_heading, color_text, sort_order, enabled, created_at)
  ON public.ethical_perspectives TO anon, authenticated;

REVOKE SELECT ON public.mondcivitan_settings FROM anon, authenticated;
GRANT SELECT (id, title, description, updated_at)
  ON public.mondcivitan_settings TO anon, authenticated;

-- Admin-only RPCs to fetch full rows including prompt_instruction.
CREATE OR REPLACE FUNCTION public.admin_get_ethical_perspectives()
RETURNS SETOF public.ethical_perspectives
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY SELECT * FROM public.ethical_perspectives ORDER BY sort_order ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_get_mondcivitan_settings()
RETURNS public.mondcivitan_settings
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result public.mondcivitan_settings;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  SELECT * INTO result FROM public.mondcivitan_settings WHERE id = 1;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_ethical_perspectives() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_get_mondcivitan_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_ethical_perspectives() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_mondcivitan_settings() TO authenticated;
