-- Allow deletion of profiles (for account cleanup)
CREATE POLICY "Service role can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow deletion of notification preferences
CREATE POLICY "Users can delete own prefs"
ON public.notification_preferences
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to delete own comments  
CREATE POLICY "Users can delete own comments"
ON public.user_comments
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
