
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admins can view all roles
CREATE POLICY "Admins can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert roles (invite)
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create admin_invites table for tracking invitations
CREATE TABLE public.admin_invites (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    used_at timestamp with time zone,
    UNIQUE (email)
);

ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- Admins can manage invites
CREATE POLICY "Admins can view invites"
ON public.admin_invites
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create invites"
ON public.admin_invites
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete invites"
ON public.admin_invites
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Function to auto-assign admin role on signup if invited
CREATE OR REPLACE FUNCTION public.handle_admin_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the new user's email has a pending invite
  IF EXISTS (
    SELECT 1 FROM public.admin_invites
    WHERE email = NEW.email AND used_at IS NULL
  ) THEN
    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    -- Mark invite as used
    UPDATE public.admin_invites SET used_at = now() WHERE email = NEW.email;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on new user creation
CREATE TRIGGER on_auth_user_created_admin
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_admin_signup();

-- Also update impressum policies to require admin role
DROP POLICY IF EXISTS "Authenticated users can insert impressum" ON public.impressum;
DROP POLICY IF EXISTS "Authenticated users can update impressum" ON public.impressum;

CREATE POLICY "Admins can insert impressum"
ON public.impressum
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update impressum"
ON public.impressum
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
