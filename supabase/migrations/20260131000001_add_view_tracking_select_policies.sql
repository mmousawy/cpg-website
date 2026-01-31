-- Migration: Add SELECT policies for view tracking tables
-- Fixes RLS policies to allow reading view data for weekly trending queries

-- Allow public reads for aggregate queries (view counts are public statistics)
CREATE POLICY "Photo views are publicly readable" ON "public"."photo_views" FOR SELECT USING (true);
CREATE POLICY "Album views are publicly readable" ON "public"."album_views" FOR SELECT USING (true);
