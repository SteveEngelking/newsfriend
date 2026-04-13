
-- Fix report_schedules: drop overly permissive policy, add admin-only policies
DROP POLICY IF EXISTS "Anyone can manage schedules" ON public.report_schedules;

CREATE POLICY "Admins can select schedules"
ON public.report_schedules FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert schedules"
ON public.report_schedules FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update schedules"
ON public.report_schedules FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete schedules"
ON public.report_schedules FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role needs access for scheduled report generation
CREATE POLICY "Service role can manage schedules"
ON public.report_schedules FOR ALL
TO public
USING (auth.role() = 'service_role'::text)
WITH CHECK (auth.role() = 'service_role'::text);

-- Fix generated_reports: replace public delete with admin-only
DROP POLICY IF EXISTS "Anyone can delete reports" ON public.generated_reports;

CREATE POLICY "Admins can delete reports"
ON public.generated_reports FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix email_sender_config: replace public read with admin-only read + service role read
DROP POLICY IF EXISTS "Anyone can read sender config" ON public.email_sender_config;

CREATE POLICY "Admins can read sender config"
ON public.email_sender_config FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can read sender config"
ON public.email_sender_config FOR SELECT
TO public
USING (auth.role() = 'service_role'::text);

-- Fix news_sources: restrict public insert/delete on custom sources to authenticated users
DROP POLICY IF EXISTS "Anyone can insert custom sources" ON public.news_sources;
DROP POLICY IF EXISTS "Anyone can delete custom sources" ON public.news_sources;

CREATE POLICY "Admins can insert sources"
ON public.news_sources FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sources"
ON public.news_sources FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
