import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { createAdminClient } from "@/utils/supabase/admin";

// Hash token for comparison
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { token, email, password } = await request.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 },
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
      .eq("token_type", "password_reset")
      .is("used_at", null)
      .single();

    if (tokenError || !authToken) {
      return NextResponse.json(
        { message: "This reset link is invalid or has already been used" },
        { status: 400 },
      );
    }

    // Check if token is expired
    if (new Date(authToken.expires_at) < new Date()) {
      return NextResponse.json(
        { message: "This reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Mark token as used
    await supabase
      .from("auth_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("id", authToken.id);

    // Update the user's password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authToken.user_id!,
      { password },
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return NextResponse.json(
        { message: "Failed to update password. Please try again." },
        { status: 500 },
      );
    }

    console.log(`✅ Password reset for user: ${email}`);

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
