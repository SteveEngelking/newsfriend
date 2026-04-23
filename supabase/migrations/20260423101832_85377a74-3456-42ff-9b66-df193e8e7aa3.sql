-- Make the trigger resilient to existing profile/email collisions
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  existing_profile_id uuid;
BEGIN
  -- If a profile already exists for this email (e.g. from a previous deleted account),
  -- reassign it to the new user instead of inserting a duplicate.
  IF NEW.email IS NOT NULL THEN
    SELECT user_id INTO existing_profile_id
    FROM public.profiles
    WHERE email = NEW.email
    LIMIT 1;

    IF existing_profile_id IS NOT NULL AND existing_profile_id <> NEW.id THEN
      UPDATE public.profiles
      SET user_id = NEW.id,
          display_name = COALESCE(NULLIF(display_name, ''), NEW.raw_user_meta_data->>'display_name', ''),
          updated_at = now()
      WHERE email = NEW.email;
    ELSIF existing_profile_id IS NULL THEN
      INSERT INTO public.profiles (user_id, email, display_name)
      VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  ELSE
    INSERT INTO public.profiles (user_id, email, display_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Ensure notification preferences exist (idempotent)
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- Make sure notification_preferences has the unique index needed for ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS notification_preferences_user_id_key
  ON public.notification_preferences(user_id);