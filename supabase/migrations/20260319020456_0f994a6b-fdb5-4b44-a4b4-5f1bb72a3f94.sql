DROP POLICY "Anyone can update impressum" ON public.impressum;
DROP POLICY "Anyone can insert impressum" ON public.impressum;
CREATE POLICY "Authenticated users can update impressum" ON public.impressum FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can insert impressum" ON public.impressum FOR INSERT TO authenticated WITH CHECK (true);