import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { createAdminClient } from "@/utils/supabase/admin";
import ResetPasswordTemplate from "@/emails/auth/reset-password";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Hash token for storage
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find the user
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      return NextResponse.json(
        { success: true, message: "If an account exists, you will receive an email" },
        { status: 200 }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    // Invalidate any existing password reset tokens for this user
    await supabase
      .from("auth_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("email", email.toLowerCase())
      .eq("token_type", "password_reset")
      .is("used_at", null);

    // Generate new token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    const { error: tokenError } = await supabase.from("auth_tokens").insert({
      user_id: user.id,
      email: email.toLowerCase(),
      token_hash: tokenHash,
      token_type: "password_reset",
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      console.error("Error storing reset token:", tokenError);
      return NextResponse.json(
        { message: "Failed to process request. Please try again." },
        { status: 500 }
      );
    }

    // Send reset email
    const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: "Reset your password - Creative Photography Group",
      html: await render(
        ResetPasswordTemplate({
          fullName: profile?.full_name || email.split("@")[0],
          resetLink,
        })
      ),
    });

    if (emailResult.error) {
      console.error("Email error:", emailResult.error);
    }

    console.log(`✅ Password reset email sent to: ${email}`);

    return NextResponse.json(
      { success: true, message: "If an account exists, you will receive an email" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

