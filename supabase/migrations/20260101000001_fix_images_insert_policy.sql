-- Fix images table INSERT policy to allow users to upload their own images
-- Previously only admins could insert, which broke photo uploads for regular users

-- Drop the admin-only policy
DROP POLICY IF EXISTS "Only admins can insert image metadata" ON public.images;

-- Create new policy: Users can insert their own image metadata
CREATE POLICY "Users can insert own image metadata"
  ON public.images
  FOR INSERT
  WITH CHECK (uploaded_by = (select auth.uid()));

-- Also allow users to update their own image metadata
CREATE POLICY "Users can update own image metadata"
  ON public.images
  FOR UPDATE
  USING (uploaded_by = (select auth.uid()));

-- Fix the delete policy too - let users delete their own images
DROP POLICY IF EXISTS "Only admins can delete image metadata" ON public.images;
CREATE POLICY "Users can delete own image metadata"
  ON public.images
  FOR DELETE
  USING (uploaded_by = (select auth.uid()));

