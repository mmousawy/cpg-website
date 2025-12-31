#!/usr/bin/env node

/**
 * Generate JWT secrets for self-hosted Supabase
 * Run: node scripts/generate-supabase-keys.js
 */

const crypto = require('crypto');

// Generate random JWT secret (min 32 characters)
const JWT_SECRET = crypto.randomBytes(32).toString('base64');

console.log('\n🔑 Generated Supabase Keys\n');
console.log('━'.repeat(60));
console.log('\n1. JWT Secret (use for JWT_SECRET):');
console.log('━'.repeat(60));
console.log(JWT_SECRET);

// Generate ANON key
const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

// Generate SERVICE_ROLE key
const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

// Simple JWT encoding (header.payload.signature)
function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

const ANON_KEY = createJWT(anonPayload, JWT_SECRET);
const SERVICE_KEY = createJWT(servicePayload, JWT_SECRET);

console.log('\n2. ANON Key (use for ANON_KEY):');
console.log('━'.repeat(60));
console.log(ANON_KEY);

console.log('\n3. SERVICE_ROLE Key (use for SERVICE_ROLE_KEY):');
console.log('━'.repeat(60));
console.log(SERVICE_KEY);

console.log('\n4. Postgres Password (alphanumeric only - SAFE for URLs):');
console.log('━'.repeat(60));
const POSTGRES_PASSWORD = crypto.randomBytes(32).toString('hex').substring(0, 32);
console.log(POSTGRES_PASSWORD);

console.log('\n5. Dashboard Password (alphanumeric only - SAFE):');
console.log('━'.repeat(60));
const DASHBOARD_PASSWORD = crypto.randomBytes(16).toString('hex').substring(0, 24);
console.log(DASHBOARD_PASSWORD);

console.log('\n6. VAULT_ENC_KEY (32 characters for Vault encryption):');
console.log('━'.repeat(60));
const VAULT_ENC_KEY = crypto.randomBytes(32).toString('hex').substring(0, 32);
console.log(VAULT_ENC_KEY);

console.log('\n7. PG_META_CRYPTO_KEY (32+ characters for pg-meta):');
console.log('━'.repeat(60));
const PG_META_CRYPTO_KEY = crypto.randomBytes(32).toString('hex');
console.log(PG_META_CRYPTO_KEY);

console.log('\n━'.repeat(60));
console.log('✅ Copy these values to your VPS .env file\n');
