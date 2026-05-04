REVOKE EXECUTE ON FUNCTION public.get_commenter_display_names(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_commenter_display_names(uuid[]) TO authenticated, service_role;