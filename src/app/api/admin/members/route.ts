import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import type { Tables } from '@/database.types';
import { revalidateAll } from '@/app/actions/revalidate';
import { AccountDeletionEmail } from '@/emails/account-deletion';

const resend = new Resend(process.env.RESEND_API_KEY!);

type Profile = Pick<Tables<'profiles'>,
  | 'id'
  | 'email'
  | 'full_name'
  | 'nickname'
  | 'avatar_url'
  | 'is_admin'
  | 'created_at'
  | 'last_logged_in'
  | 'suspended_at'
  | 'suspended_reason'
  | 'deletion_scheduled_at'
>

// GET - List all members
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, active, suspended
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('profiles')
      .select('id, email, full_name, nickname, avatar_url, is_admin, created_at, last_logged_in, suspended_at, suspended_reason, deletion_scheduled_at', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%,nickname.ilike.%${search}%`);
    }

    // Apply status filter
    if (filter === 'active') {
      query = query.is('suspended_at', null);
    } else if (filter === 'suspended') {
      query = query.not('suspended_at', 'is', null);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy as keyof Profile, { ascending, nullsFirst: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: members, error, count } = await query;

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    return NextResponse.json({
      members: members || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Error in members API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update member (suspend/unsuspend)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    // Prevent self-suspension
    if (userId === user.id && action === 'suspend') {
      return NextResponse.json({ error: 'Cannot suspend yourself' }, { status: 400 });
    }

    if (action === 'suspend') {
      // Suspend user
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          suspended_at: new Date().toISOString(),
          suspended_reason: reason || null,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error suspending user:', updateError);
        return NextResponse.json({ error: 'Failed to suspend user' }, { status: 500 });
      }

      // Revalidate all pages (suspended users affect homepage, profiles, galleries, etc.)
      await revalidateAll();

      return NextResponse.json({ success: true, message: 'User suspended' });
    } else if (action === 'unsuspend') {
      // Unsuspend user
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error unsuspending user:', updateError);
        return NextResponse.json({ error: 'Failed to unsuspend user' }, { status: 500 });
      }

      // Revalidate all pages (unsuspended users affect homepage, profiles, galleries, etc.)
      await revalidateAll();

      return NextResponse.json({ success: true, message: 'User unsuspended' });
    } else if (action === 'cancel-deletion') {
      // Cancel scheduled deletion
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          deletion_scheduled_at: null,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error canceling deletion:', updateError);
        return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 });
      }

      await revalidateAll();

      return NextResponse.json({ success: true, message: 'Account deletion canceled' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in members PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Schedule member for deletion (30-day retention)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Check target profile
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('is_admin, email, full_name, deletion_scheduled_at')
      .eq('id', userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting other admins
    if (targetProfile.is_admin) {
      return NextResponse.json({ error: 'Cannot delete an admin user' }, { status: 400 });
    }

    // Check if already scheduled
    if (targetProfile.deletion_scheduled_at) {
      return NextResponse.json({ error: 'Account is already scheduled for deletion' }, { status: 400 });
    }

    // Schedule the account for deletion
    const now = new Date().toISOString();
    const { error: updateError } = await adminSupabase
      .from('profiles')
      .update({ deletion_scheduled_at: now })
      .eq('id', userId);

    if (updateError) {
      console.error('Error scheduling deletion:', updateError);
      return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 });
    }

    // Send confirmation email to the user
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);
    const email = targetProfile.email;

    if (email) {
      try {
        const html = await render(
          AccountDeletionEmail({
            fullName: targetProfile.full_name || email,
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
        console.error('Failed to send account deletion email:', emailError);
      }
    }

    // Revalidate all caches
    await revalidateAll();

    return NextResponse.json({ success: true, message: 'Account scheduled for deletion' });
  } catch (error) {
    console.error('Error in members DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
