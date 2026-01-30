-- Add storage policy to allow authenticated users to upload badge icons
CREATE POLICY "Users can upload badge icons"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'profile-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  OR (bucket_id = 'profile-assets' AND name LIKE 'badge-icons/%' AND auth.uid() IS NOT NULL)
);

-- Also allow users to update their badge icons
CREATE POLICY "Users can update badge icons"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'profile-assets' 
  AND name LIKE 'badge-icons/%' 
  AND auth.uid() IS NOT NULL
);