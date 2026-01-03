-- Add album_card_style column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS album_card_style TEXT DEFAULT 'large';

-- Add a check constraint to ensure valid values
ALTER TABLE public.profiles
ADD CONSTRAINT album_card_style_check 
CHECK (album_card_style IS NULL OR album_card_style IN ('large', 'compact'));

