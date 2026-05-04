CREATE OR REPLACE FUNCTION public.get_commenter_display_names(_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT p.user_id, p.display_name
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids)
    AND COALESCE(p.display_name, '') <> '';
$$;