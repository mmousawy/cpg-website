-- ============================================
-- Member Interests System Migration
-- ============================================
-- Creates a shared interests system for member profiles
-- with usage count tracking and member discovery.

-- 1. Create the central interests table
CREATE TABLE IF NOT EXISTS interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_interests_name ON interests(name);
CREATE INDEX IF NOT EXISTS idx_interests_count ON interests(count DESC);
CREATE INDEX IF NOT EXISTS idx_interests_name_prefix ON interests(name text_pattern_ops);

-- Enable Row Level Security (RLS)
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Interests are viewable by everyone (for autocomplete and discovery)
DROP POLICY IF EXISTS "Interests are viewable by everyone" ON interests;
CREATE POLICY "Interests are viewable by everyone"
  ON interests FOR SELECT
  USING (true);

-- Only authenticated users can create interests (via triggers)
DROP POLICY IF EXISTS "Authenticated users can insert interests" ON interests;
CREATE POLICY "Authenticated users can insert interests"
  ON interests FOR INSERT
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Interests can be updated by authenticated users (for count updates via triggers)
DROP POLICY IF EXISTS "Authenticated users can update interests" ON interests;
CREATE POLICY "Authenticated users can update interests"
  ON interests FOR UPDATE
  USING ((SELECT auth.uid()) IS NOT NULL);

-- 2. Create profile_interests junction table
CREATE TABLE IF NOT EXISTS profile_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interest TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, interest)
);

-- Create indexes for profile_interests
CREATE INDEX IF NOT EXISTS idx_profile_interests_profile_id ON profile_interests(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_interests_interest ON profile_interests(interest);

-- Enable RLS for profile_interests
ALTER TABLE profile_interests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profile_interests
-- Everyone can view interests (profiles are public)
DROP POLICY IF EXISTS "Profile interests are viewable by everyone" ON profile_interests;
CREATE POLICY "Profile interests are viewable by everyone"
  ON profile_interests FOR SELECT
  USING (true);

-- Users can add interests to their own profile
DROP POLICY IF EXISTS "Users can add interests to their own profile" ON profile_interests;
CREATE POLICY "Users can add interests to their own profile"
  ON profile_interests FOR INSERT
  WITH CHECK (profile_id = (SELECT auth.uid()));

-- Users can delete interests from their own profile
DROP POLICY IF EXISTS "Users can delete interests from their own profile" ON profile_interests;
CREATE POLICY "Users can delete interests from their own profile"
  ON profile_interests FOR DELETE
  USING (profile_id = (SELECT auth.uid()));

-- 3. Function to update interest counts when interests are added/removed
CREATE OR REPLACE FUNCTION update_interest_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Insert interest if it doesn't exist, or increment count
    INSERT INTO interests (name, count)
    VALUES (NEW.interest, 1)
    ON CONFLICT (name) DO UPDATE SET count = interests.count + 1;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement count (don't delete interest even if count reaches 0, for history)
    UPDATE interests SET count = GREATEST(count - 1, 0) WHERE name = OLD.interest;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Create trigger for profile_interests
DROP TRIGGER IF EXISTS trigger_profile_interests_count ON profile_interests;
CREATE TRIGGER trigger_profile_interests_count
  AFTER INSERT OR DELETE ON profile_interests
  FOR EACH ROW EXECUTE FUNCTION update_interest_count();

-- 5. Grant permissions
GRANT SELECT ON TABLE interests TO anon;
GRANT SELECT ON TABLE interests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE interests TO service_role;

GRANT SELECT ON TABLE profile_interests TO anon;
GRANT SELECT, INSERT, DELETE ON TABLE profile_interests TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE profile_interests TO service_role;
