-- Add email_change to the token_type check constraint
ALTER TABLE auth_tokens DROP CONSTRAINT auth_tokens_token_type_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_token_type_check 
  CHECK (token_type IN ('email_confirmation', 'password_reset', 'email_change'));

-- Add new_email column to store the target email for email changes
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS new_email TEXT;
