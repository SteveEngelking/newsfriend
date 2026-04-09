
-- Drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete pages" ON public.cms_pages;

-- Recreate without the is_system restriction
CREATE POLICY "Admins can delete pages"
ON public.cms_pages
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
