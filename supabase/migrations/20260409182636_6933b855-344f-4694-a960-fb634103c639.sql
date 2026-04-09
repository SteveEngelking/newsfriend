
-- Clean up orphaned profiles (no matching auth user)
DELETE FROM profiles WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM notification_preferences WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add unique constraint on profiles email to prevent duplicates
ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Add unique constraint on profiles user_id
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
