-- Allow admins to read all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to read all notification preferences
CREATE POLICY "Admins can view all notification prefs"
ON public.notification_preferences
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));