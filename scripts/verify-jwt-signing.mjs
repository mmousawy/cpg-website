#!/usr/bin/env node
/**
 * Verifies the Supabase project exposes a JWKS endpoint (asymmetric JWT signing).
 * Run before relying on getClaims() for local JWT verification:
 *
 *   pnpm verify:jwt
 *
 * Loads .env.local (same as other scripts in this repo), then .env as fallback.
 * Dashboard: Project Settings → API → JWT Keys → migrate if this script fails.
 */
import { config } from 'dotenv';

config({ path: '.env.local' });
config();

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!baseUrl) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set. Add it to .env.local and retry.');
  process.exit(1);
}

if (!anonKey) {
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Add it to .env.local and retry.');
  process.exit(1);
}

const jwksUrl = `${baseUrl}/auth/v1/.well-known/jwks.json`;

try {
  const res = await fetch(jwksUrl, {
    headers: {
      Accept: 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  if (!res.ok) {
    console.error(`JWKS fetch failed: ${res.status} ${res.statusText}`);
    console.error(`URL: ${jwksUrl}`);
    console.error('If the project still uses the legacy HS256 JWT secret, migrate in Supabase dashboard → API → JWT Keys.');
    process.exit(1);
  }

  const body = await res.json();
  const keys = body?.keys;

  if (!Array.isArray(keys) || keys.length === 0) {
    console.error('JWKS endpoint returned no signing keys (keys: []).');
    console.error('The project is likely still on the legacy HS256 JWT secret.');
    console.error('Migrate in Supabase dashboard → Project Settings → API → JWT Keys.');
    console.error('Until then, getClaims() falls back to /auth/v1/user and auth-call savings are reduced.');
    process.exit(1);
  }

  const algs = [...new Set(keys.map((k) => k.alg).filter(Boolean))];
  console.log('OK: asymmetric JWT signing is available.');
  console.log(`JWKS: ${jwksUrl}`);
  console.log(`Keys: ${keys.length}, algorithms: ${algs.join(', ') || 'unknown'}`);
} catch (error) {
  console.error('JWKS check failed:', error instanceof Error ? error.message : error);
  process.exit(1);
}
