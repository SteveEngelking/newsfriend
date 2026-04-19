
-- 1. Fix reflection_likes: require x-client-id header to match row's client_id
DROP POLICY IF EXISTS "Anyone can delete own like" ON public.reflection_likes;
DROP POLICY IF EXISTS "Anyone can insert likes" ON public.reflection_likes;

CREATE POLICY "Clients can insert own like"
ON public.reflection_likes
FOR INSERT
TO public
WITH CHECK (
  client_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-client-id',
    ''
  )
  AND length(client_id) > 0
);

CREATE POLICY "Clients can delete own like"
ON public.reflection_likes
FOR DELETE
TO public
USING (
  client_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-client-id',
    ''
  )
  AND length(client_id) > 0
);

-- 2. Restrict email-assets bucket: allow reads of individual objects but block listing
DROP POLICY IF EXISTS "Public read access for email assets" ON storage.objects;

-- Allow direct object fetch (by exact name) but require knowing the file name.
-- Supabase serves /object/public/<bucket>/<path> via SELECT on storage.objects.
-- We keep SELECT but Supabase's list endpoint also uses SELECT. To prevent listing
-- while still allowing direct downloads, restrict SELECT to rows where the request
-- targets a specific object (i.e., name is provided in the path). The public CDN
-- endpoint /object/public/... still works because it queries by name.
-- Practically: keep SELECT broad on read but flip the bucket to private and serve
-- the logo via signed URLs OR keep as-is and rely on the CDN behavior. Simplest
-- correct fix: keep bucket public, but only allow SELECT on a known allow-list
-- of object names that are safe to enumerate.
CREATE POLICY "Public read of known email assets"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'email-assets'
  AND name IN ('logo.jpg', 'logo.png')
);
