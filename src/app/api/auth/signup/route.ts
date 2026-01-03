import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";
import { render } from "@react-email/render";

import { createAdminClient } from "@/utils/supabase/admin";
import VerifyEmailTemplate from "@/emails/auth/verify-email";

const resend = new Resend(process.env.RESEND_API_KEY!);

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Hash token for storage (we store hash, send plain token in email)
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, nickname } = await request.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if email already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (emailExists) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Check if nickname is taken
    if (nickname) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("nickname", nickname.toLowerCase())
        .single();

      if (existingProfile) {
        return NextResponse.json(
          { message: "This nickname is already taken" },
          { status: 400 }
        );
      }
    }

    // Create user with email_confirm set to false
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // Don't auto-confirm
        user_metadata: {
          full_name,
          nickname: nickname?.toLowerCase(),
        },
      });

    if (createError) {
      console.error("Error creating user:", createError);
      return NextResponse.json(
        { message: createError.message || "Failed to create account" },
        { status: 500 }
      );
    }

    // Generate verification token
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    const { error: tokenError } = await supabase.from("auth_tokens").insert({
      user_id: userData.user.id,
      email: email.toLowerCase(),
      token_hash: tokenHash,
      token_type: "email_confirmation",
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      console.error("Error storing token:", tokenError);
      // Delete the user since we couldn't complete signup
      await supabase.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { message: "Failed to create account. Please try again." },
        { status: 500 }
      );
    }

    // Create profile
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userData.user.id,
      email: email.toLowerCase(),
      full_name: full_name || null,
      nickname: nickname?.toLowerCase() || null,
    });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Non-fatal - profile can be created later
    }

    // Send verification email
    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: email,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: "Verify your email - Creative Photography Group",
      html: await render(
        VerifyEmailTemplate({
          fullName: full_name || email.split("@")[0],
          verifyLink,
        })
      ),
    });

    if (emailResult.error) {
      console.error("Email error:", emailResult.error);
      // Don't fail the request - user can request a new verification email
    }

    console.log(`✅ User created: ${email} (pending verification)`);

    return NextResponse.json(
      {
        success: true,
        message: "Account created. Please check your email to verify.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

