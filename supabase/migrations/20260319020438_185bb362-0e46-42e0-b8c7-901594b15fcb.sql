CREATE TABLE public.impressum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  managing_director text NOT NULL DEFAULT '',
  register_court text NOT NULL DEFAULT '',
  register_number text NOT NULL DEFAULT '',
  vat_id text NOT NULL DEFAULT '',
  additional_info text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.impressum ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read impressum" ON public.impressum FOR SELECT TO public USING (true);
CREATE POLICY "Anyone can update impressum" ON public.impressum FOR UPDATE TO public USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can insert impressum" ON public.impressum FOR INSERT TO public WITH CHECK (true);

INSERT INTO public.impressum (company_name) VALUES ('');