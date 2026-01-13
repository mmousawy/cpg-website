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
  const email = searchParams.get("email"); // This is the NEW email

  if (!token || !email) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=missing_params&message=${encodeURIComponent("Invalid verification link")}`,
    );
  }

  const supabase = createAdminClient();
  const tokenHash = hashToken(token);

  // Find the token by new_email (since that's where we sent the confirmation)
  const { data: authToken, error: tokenError } = await supabase
    .from("auth_tokens")
    .select("*")
    .eq("new_email", email.toLowerCase())
    .eq("token_hash", tokenHash)
    .eq("token_type", "email_change")
    .is("used_at", null)
    .single();

  if (tokenError || !authToken) {
    console.error("Token lookup error:", tokenError);
    return NextResponse.redirect(
      `${origin}/auth-error?error=invalid_token&message=${encodeURIComponent("This verification link is invalid or has already been used")}`,
    );
  }

  // Check if token is expired
  if (new Date(authToken.expires_at) < new Date()) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=expired_token&message=${encodeURIComponent("This verification link has expired. Please request a new email change.")}`,
    );
  }

  // Mark token as used
  await supabase
    .from("auth_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", authToken.id);

  const newEmail = authToken.new_email?.toLowerCase();
  const userId = authToken.user_id;

  if (!newEmail || !userId) {
    return NextResponse.redirect(
      `${origin}/auth-error?error=invalid_data&message=${encodeURIComponent("Invalid token data")}`,
    );
  }

  // Update email in auth.users
  const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
    userId,
    { email: newEmail },
  );

  if (authUpdateError) {
    console.error("Error updating auth email:", authUpdateError);
    return NextResponse.redirect(
      `${origin}/auth-error?error=update_failed&message=${encodeURIComponent("Failed to update email. Please try again.")}`,
    );
  }

  // Update email in profiles table
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ email: newEmail })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error("Error updating profile email:", profileUpdateError);
    // Don't fail - auth email was updated, profile can be synced later
  }

  console.log(`✅ Email changed for user ${userId}: ${authToken.email} → ${newEmail}`);

  // Redirect to account page with success message
  return NextResponse.redirect(
    `${origin}/account?email_changed=true`,
  );
}
