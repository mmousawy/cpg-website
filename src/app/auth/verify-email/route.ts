import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { createAdminClient } from "@/utils/supabase/admin";

// Hash token for comparison
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=missing_params&message=${encodeURIComponent("Invalid verification link")}`
    );
  }

  const supabase = createAdminClient();
  const tokenHash = hashToken(token);

  // Find the token
  const { data: authToken, error: tokenError } = await supabase
    .from("auth_tokens")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("token_hash", tokenHash)
    .eq("token_type", "email_confirmation")
    .is("used_at", null)
    .single();

  if (tokenError || !authToken) {
    console.error("Token lookup error:", tokenError);
    return NextResponse.redirect(
      `${origin}/auth-error?error=invalid_token&message=${encodeURIComponent("This verification link is invalid or has already been used")}`
    );
  }

  // Check if token is expired
  if (new Date(authToken.expires_at) < new Date()) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=expired_token&message=${encodeURIComponent("This verification link has expired. Please sign up again.")}`
    );
  }

  // Mark token as used
  await supabase
    .from("auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", authToken.id);

  // Confirm the user's email
  const { error: confirmError } = await supabase.auth.admin.updateUserById(
    authToken.user_id!,
    { email_confirm: true }
  );

  if (confirmError) {
    console.error("Error confirming user:", confirmError);
    return NextResponse.redirect(
      `${origin}/auth-error?error=confirm_failed&message=${encodeURIComponent("Failed to verify email. Please try again.")}`
    );
  }

  console.log(`✅ Email verified for user: ${email}`);

  // Redirect to login with success message
  return NextResponse.redirect(
    `${origin}/login?verified=true`
  );
}

