-- Recreate the missing trigger for auto-granting admin on signup via invite
CREATE OR REPLACE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_signup();