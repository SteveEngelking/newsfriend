-- Restrict has_role to only allow checking the calling user's own role.
-- This prevents authenticated users from enumerating admin user IDs by
-- calling has_role(any_uuid, 'admin').
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Allow service_role unrestricted access (used by edge functions)
  IF auth.role() = 'service_role' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    );
  END IF;

  -- For all other callers, only allow checking your own role
  IF _user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$function$;