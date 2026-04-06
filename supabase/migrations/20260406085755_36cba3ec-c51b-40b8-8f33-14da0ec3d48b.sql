CREATE TABLE public.email_sender_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name text NOT NULL DEFAULT '',
  sender_email text NOT NULL DEFAULT '',
  organization text NOT NULL DEFAULT '',
  reply_to_email text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_sender_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sender config" ON public.email_sender_config FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert sender config" ON public.email_sender_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sender config" ON public.email_sender_config FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

INSERT INTO public.email_sender_config (sender_name, sender_email, organization, reply_to_email) VALUES ('', '', '', '');