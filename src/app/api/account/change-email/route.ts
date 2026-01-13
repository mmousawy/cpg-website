import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { newEmail } = await request.json();

    if (!newEmail) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { message: "Invalid email format" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check if new email is already in use
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers();
    const emailExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === newEmail.toLowerCase() && u.id !== user.id,
    );

    if (emailExists) {
      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 400 },
      );
    }

    // Update email in auth.users (Supabase will handle confirmation emails)
    // With double_confirm_changes = true, both old and new emails need confirmation
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(
      user.id,
      { email: newEmail.toLowerCase() },
    );

    if (updateError) {
      console.error("Error updating email:", updateError);
      return NextResponse.json(
        { message: updateError.message || "Failed to update email" },
        { status: 500 },
      );
    }

    // Note: profiles.email will be updated after user confirms the new email
    // We could store pending email in a separate field, but for simplicity,
    // we'll let Supabase handle the confirmation flow and update profiles.email
    // after confirmation via a webhook or manual check

    return NextResponse.json(
      {
        success: true,
        message: "Email change initiated. Please check your new email address to confirm.",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Email change error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
