
DROP POLICY IF EXISTS "Public can read report banners" ON storage.objects;

-- Public can read individual files only when they request them by name.
-- Listing the bucket via supabase.storage.from('report-banners').list() will return empty.
-- Direct GETs on object URLs still work for image rendering.
CREATE POLICY "Public can read individual report banners"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'report-banners'
    AND (storage.foldername(name))[1] IS NOT NULL
  );
