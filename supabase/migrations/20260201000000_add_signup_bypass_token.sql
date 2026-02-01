-- Add 'signup_bypass' token type to auth_tokens table
ALTER TABLE auth_tokens DROP CONSTRAINT auth_tokens_token_type_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_token_type_check 
  CHECK (token_type = ANY (ARRAY['email_confirmation'::text, 'password_reset'::text, 'email_change'::text, 'signup_bypass'::text]));
