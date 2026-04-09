
CREATE TABLE public.nav_menu_order (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_key text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_menu_order ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nav order" ON public.nav_menu_order
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can insert nav order" ON public.nav_menu_order
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update nav order" ON public.nav_menu_order
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete nav order" ON public.nav_menu_order
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default order
INSERT INTO public.nav_menu_order (item_key, sort_order) VALUES
  ('home', 0),
  ('support', 1),
  ('comments', 2),
  ('account', 3),
  ('admin', 4),
  ('impressum', 5);

-- Also insert existing CMS pages
INSERT INTO public.nav_menu_order (item_key, sort_order)
SELECT 'cms:' || slug, 10 + nav_order FROM public.cms_pages WHERE published = true AND show_in_nav = true
ON CONFLICT (item_key) DO NOTHING;
