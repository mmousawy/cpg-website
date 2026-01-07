-- Add 'midnight' to the theme check constraint

-- Drop the existing constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS theme_check;

-- Add the updated constraint with 'midnight' included
ALTER TABLE profiles
ADD CONSTRAINT theme_check
CHECK (theme IS NULL OR theme IN ('light', 'dark', 'midnight', 'system'));


