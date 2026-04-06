
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_en text NOT NULL DEFAULT '',
  title_de text NOT NULL DEFAULT '',
  content_en text NOT NULL DEFAULT '',
  content_de text NOT NULL DEFAULT '',
  show_in_nav boolean NOT NULL DEFAULT true,
  nav_order integer NOT NULL DEFAULT 0,
  icon text NOT NULL DEFAULT 'FileText',
  published boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published pages" ON public.cms_pages FOR SELECT TO public USING (published = true);
CREATE POLICY "Admins can read all pages" ON public.cms_pages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert pages" ON public.cms_pages FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update pages" ON public.cms_pages FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete pages" ON public.cms_pages FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin') AND is_system = false);
