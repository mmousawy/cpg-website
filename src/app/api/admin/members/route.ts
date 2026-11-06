import { sendAppEmail } from '@/lib/email/sendAppEmail';
import { revalidateAll } from '@/app/actions/revalidate';
import type { Tables } from '@/database.types';
import { AccountDeletionEmail } from '@/emails/account-deletion';
import { checkIsAdmin } from '@/lib/auth/checkIsAdmin';
import { buildPostgrestIlikeOr } from '@/lib/search/fuzzyQuery';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { notifyAdminsOfAccountDeletion } from '@/lib/notifications/notifyAdminsOfAccountDeletion';
import { AdminSuspensionDeletionScheduledEmail } from '@/emails/admin-suspension-deletion-scheduled';
import {
  blockClientIpsForProfile,
  unblockClientIpsForProfile,
} from '@/lib/memberReview/ipBlocking';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { render } from '@react-email/render';
import { NextRequest, NextResponse, after } from 'next/server';

import type { AdminMember, AdminMemberActivity, AdminMemberSignupSignal } from '@/types/adminMember';

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
  | 'deletion_source'
  | 'under_review_at'
  | 'website'
  | 'bio'
  | 'social_links'
  | 'link_publish_state'
  | 'newsletter_opt_in'
  | 'terms_accepted_at'
>

const ADMIN_MEMBER_SORT_KEYS: (keyof Profile)[] = [
  'email',
  'full_name',
  'nickname',
  'created_at',
  'last_logged_in',
  'suspended_at',
  'under_review_at',
];

const emptyActivity: AdminMemberActivity = {
  photo_count: 0,
  album_count: 0,
  storage_bytes: 0,
  views_received: 0,
  likes_received: 0,
  followers: 0,
  following: 0,
};

// GET - List all members
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all'; // all, active, suspended, under_review
    const sortByRaw = searchParams.get('sortBy') || 'created_at';
    const sortBy = ADMIN_MEMBER_SORT_KEYS.includes(sortByRaw as keyof Profile)
      ? sortByRaw
      : 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query (exclude automation / scraper identities)
    let query = adminSupabase
      .from('profiles')
      .select(
        'id, email, full_name, nickname, avatar_url, is_admin, created_at, last_logged_in, suspended_at, suspended_reason, deletion_scheduled_at, deletion_source, under_review_at, website, bio, social_links, link_publish_state, newsletter_opt_in, terms_accepted_at',
        { count: 'exact' },
      )
      .eq('is_service_account', false);

    // Apply search filter
    if (search) {
      query = query.or(buildPostgrestIlikeOr(['email', 'full_name', 'nickname'], search));
    }

    // Apply status filter
    if (filter === 'active') {
      query = query.is('suspended_at', null);
    } else if (filter === 'suspended') {
      query = query.not('suspended_at', 'is', null);
    } else if (filter === 'under_review') {
      query = query.not('under_review_at', 'is', null).is('suspended_at', null);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy as keyof Profile, { ascending, nullsFirst: false });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: profileRows, error, count } = await query;

    if (error) {
      console.error('Error fetching members:', error);
      return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
    }

    const profiles = (profileRows ?? []) as Profile[];
    let members: AdminMember[] = profiles.map((p) => ({
      ...p,
      signup_signal: null,
      activity: { ...emptyActivity },
    }));

    if (profiles.length > 0) {
      const ids = profiles.map((p) => p.id);

      const { data: signalRows, error: signalError } = await adminSupabase
        .from('signup_signals')
        .select('profile_id, ip_address, user_agent, accept_language, source')
        .in('profile_id', ids);

      if (signalError) {
        console.error('Error fetching signup signals:', signalError);
      }

      const signalByProfile = new Map<string, AdminMemberSignupSignal>();
      for (const row of signalRows ?? []) {
        signalByProfile.set(row.profile_id, {
          ip_address: row.ip_address,
          user_agent: row.user_agent,
          accept_language: row.accept_language,
          source: row.source,
        });
      }

      const activityByUser = new Map<string, AdminMemberActivity>();
      const { data: statsPayload, error: statsError } = await supabase.rpc('get_admin_member_stats', {
        p_search: search,
        p_filter: filter === 'under_review' ? 'all' : filter,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_page: page,
        p_limit: limit,
      });

      if (statsError) {
        console.error('Error fetching member activity:', statsError);
      } else {
        const statsMembers = (statsPayload as { members?: Array<AdminMemberActivity & { id: string }> } | null)
          ?.members ?? [];
        for (const row of statsMembers) {
          activityByUser.set(row.id, {
            photo_count: row.photo_count ?? 0,
            album_count: row.album_count ?? 0,
            storage_bytes: Number(row.storage_bytes ?? 0),
            views_received: row.views_received ?? 0,
            likes_received: row.likes_received ?? 0,
            followers: row.followers ?? 0,
            following: row.following ?? 0,
          });
        }
      }

      members = profiles.map((p) => ({
        ...p,
        signup_signal: signalByProfile.get(p.id) ?? null,
        activity: activityByUser.get(p.id) ?? { ...emptyActivity },
      }));
    }

    return NextResponse.json({
      members,
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

    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId || !action) {
      return NextResponse.json({ error: 'Missing userId or action' }, { status: 400 });
    }

    const { data: patchTarget } = await adminSupabase
      .from('profiles')
      .select('is_service_account')
      .eq('id', userId)
      .maybeSingle();
    if (patchTarget?.is_service_account === true) {
      return NextResponse.json(
        { error: 'Service accounts cannot be suspended or have deletion changed from the admin UI' },
        { status: 400 },
      );
    }

    // Prevent self-suspension
    if (userId === user.id && action === 'suspend') {
      return NextResponse.json({ error: 'Cannot suspend yourself' }, { status: 400 });
    }

    if (action === 'suspend') {
      const now = new Date().toISOString();
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + 30);

      // Suspend user and start 30-day deletion clock (admin suspension)
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          suspended_at: now,
          suspended_reason: reason || null,
          deletion_scheduled_at: now,
          deletion_source: 'suspension',
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error suspending user:', updateError);
        return NextResponse.json({ error: 'Failed to suspend user' }, { status: 500 });
      }

      await blockClientIpsForProfile(userId, reason || null);

      const { data: suspendedProfile } = await adminSupabase
        .from('profiles')
        .select('email, full_name, nickname')
        .eq('id', userId)
        .single();

      const memberEmail = suspendedProfile?.email;
      if (memberEmail && !shouldSkipNotificationsAndEmails(memberEmail, { userId })) {
        try {
          const html = await render(
            AdminSuspensionDeletionScheduledEmail({
              fullName: suspendedProfile?.full_name || suspendedProfile?.nickname || memberEmail,
              recipientEmail: memberEmail,
              deletionDate: deletionDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            }),
          );
          await sendAppEmail({
            from: 'Creative Photography Group <noreply@creativephotography.group>',
            to: memberEmail,
            subject: 'Your suspended account is scheduled for deletion',
            html,
          });
        } catch (emailError) {
          console.error('Failed to send suspension deletion email:', emailError);
        }
      }

      // Revalidate all pages (suspended users affect homepage, profiles, galleries, etc.)
      await revalidateAll();

      return NextResponse.json({ success: true, message: 'User suspended' });
    } else if (action === 'unsuspend') {
      // Unsuspend user
      const { data: before } = await adminSupabase
        .from('profiles')
        .select('deletion_source, deletion_scheduled_at')
        .eq('id', userId)
        .single();

      const clearSchedule = before?.deletion_source === 'suspension';

      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          suspended_at: null,
          suspended_reason: null,
          ...(clearSchedule
            ? { deletion_scheduled_at: null, deletion_source: null }
            : {}),
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error unsuspending user:', updateError);
        return NextResponse.json({ error: 'Failed to unsuspend user' }, { status: 500 });
      }

      await unblockClientIpsForProfile(userId);

      // Revalidate all pages (unsuspended users affect homepage, profiles, galleries, etc.)
      await revalidateAll();

      return NextResponse.json({ success: true, message: 'User unsuspended' });
    } else if (action === 'cancel-deletion') {
      // Cancel scheduled deletion
      const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({
          deletion_scheduled_at: null,
          deletion_source: null,
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

    const isAdmin = await checkIsAdmin(supabase);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const { data: deleteTarget } = await adminSupabase
      .from('profiles')
      .select('is_service_account')
      .eq('id', userId)
      .maybeSingle();
    if (deleteTarget?.is_service_account === true) {
      return NextResponse.json({ error: 'Service accounts cannot be scheduled for deletion' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Check target profile
    const { data: targetProfile } = await adminSupabase
      .from('profiles')
      .select('is_admin, email, full_name, deletion_scheduled_at, is_service_account')
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
      .update({ deletion_scheduled_at: now, deletion_source: 'admin' })
      .eq('id', userId);

    if (updateError) {
      console.error('Error scheduling deletion:', updateError);
      return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 });
    }

    // Send confirmation email to the user
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);
    const email = targetProfile.email;

    if (email && !shouldSkipNotificationsAndEmails(email, { userId })) {
      try {
        const html = await render(
          AccountDeletionEmail({
            fullName: targetProfile.full_name || email,
            recipientEmail: email,
            deletionDate: deletionDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          }),
        );

        await sendAppEmail({
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

    after(() => {
      void notifyAdminsOfAccountDeletion(userId, { initiatedByAdminId: user.id }).catch((err) => {
        console.error('Error notifying admins of account deletion:', err);
      });
    });

    return NextResponse.json({ success: true, message: 'Account scheduled for deletion' });
  } catch (error) {
    console.error('Error in members DELETE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
