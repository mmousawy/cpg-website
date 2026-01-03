-- Auth tokens table for custom email verification and password reset
CREATE TABLE IF NOT EXISTS auth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('email_confirmation', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX idx_auth_tokens_email_type ON auth_tokens(email, token_type);
CREATE INDEX idx_auth_tokens_expires ON auth_tokens(expires_at) WHERE used_at IS NULL;

-- RLS policies
ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (used by API routes)
CREATE POLICY "Service role only" ON auth_tokens
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Function to clean up expired tokens (can be called by a cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth_tokens
  WHERE expires_at < NOW() OR used_at IS NOT NULL;
END;
$$;

