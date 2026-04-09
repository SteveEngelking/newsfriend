-- Backfill missing profile and notification_preferences for existing users
INSERT INTO public.profiles (user_id, email, display_name)
SELECT id, email, ''
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;

INSERT INTO public.notification_preferences (user_id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.notification_preferences)
ON CONFLICT DO NOTHING;