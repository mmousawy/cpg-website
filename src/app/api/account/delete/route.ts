import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { AccountDeletionEmail } from '@/emails/account-deletion';
import { revalidateAll } from '@/app/actions/revalidate';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST() {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Authenticate the user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, email, full_name, is_admin, deletion_scheduled_at')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Check if already scheduled for deletion
    if (profile.deletion_scheduled_at) {
      return NextResponse.json({ error: 'Account is already scheduled for deletion' }, { status: 400 });
    }

    // Guard: prevent last admin from deleting their account
    if (profile.is_admin) {
      const { count } = await adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_admin', true)
        .is('deletion_scheduled_at', null);

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Cannot delete your account — you are the last admin. Please assign another admin first.' },
          { status: 400 },
        );
      }
    }

    // Schedule the account for deletion
    const now = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ deletion_scheduled_at: now })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error scheduling account deletion:', updateError);
      return NextResponse.json({ error: 'Failed to schedule account deletion' }, { status: 500 });
    }

    // Revalidate entire website so deleted user's content is hidden immediately
    await revalidateAll();

    // Calculate the permanent deletion date (30 days from now)
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    // Send confirmation email
    const email = profile.email || user.email;
    if (email) {
      try {
        const html = await render(
          AccountDeletionEmail({
            fullName: profile.full_name || email,
            deletionDate: deletionDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          }),
        );

        await resend.emails.send({
          from: 'Creative Photography Group <noreply@creativephotography.group>',
          to: email,
          subject: 'Your account is scheduled for deletion',
          html,
        });
      } catch (emailError) {
        // Log but don't fail the request if email fails
        console.error('Failed to send account deletion email:', emailError);
      }
    }

    // Sign out the user
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Account scheduled for deletion',
      deletionDate: deletionDate.toISOString(),
    });
  } catch (error) {
    console.error('Error in account deletion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
