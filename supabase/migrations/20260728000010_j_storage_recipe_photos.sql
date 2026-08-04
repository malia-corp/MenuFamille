-- Bucket public pour les photos de recettes
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-photos', 'recipe-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Tout utilisateur authentifié peut uploader dans son dossier ({user_id}/filename)
CREATE POLICY "authenticated_upload_recipe_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipe-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Mise à jour par le propriétaire
CREATE POLICY "owner_update_recipe_photos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recipe-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Suppression par le propriétaire
CREATE POLICY "owner_delete_recipe_photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recipe-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Lecture publique (bucket public)
CREATE POLICY "public_read_recipe_photos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'recipe-photos');
