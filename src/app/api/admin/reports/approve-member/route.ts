import { NextRequest, NextResponse } from 'next/server';

import { revalidateAll } from '@/app/actions/revalidate';
import { expireMemberListCaches } from '@/lib/cache/expireTag';
import { requireAdminUser } from '@/lib/auth/requireAdmin';
import { sendAppEmail } from '@/lib/email/sendAppEmail';
import { shouldSkipNotificationsAndEmails } from '@/lib/auth/isTestEmail';
import { notifyAdminsOfMemberJoined } from '@/lib/notifications/notifyAdminsOfMemberJoined';
import { isAutomatedProfileReport } from '@/lib/profileUrl/automatedProfileReport';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

type ApproveBody = {
  reportId?: string;
};

/** POST — clear under_review_at for a held member and resolve their automated report. */
export async function POST(request: NextRequest) {
  const adminResult = await requireAdminUser();
  if ('error' in adminResult) {
    return adminResult.error;
  }

  let body: ApproveBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }

  const reportId = body.reportId;
  if (!reportId || typeof reportId !== 'string') {
    return NextResponse.json({ message: 'Report ID is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .select('id, entity_type, entity_id, status, reporter_id, reporter_name')
    .eq('id', reportId)
    .single();

  if (reportError || !report) {
    return NextResponse.json({ message: 'Report not found' }, { status: 404 });
  }

  if (report.entity_type !== 'profile' || report.status !== 'pending') {
    return NextResponse.json({ message: 'Report cannot be approved' }, { status: 400 });
  }

  if (!isAutomatedProfileReport(report)) {
    return NextResponse.json({ message: 'Only automated profile checks can approve a member' }, { status: 400 });
  }

  const userId = report.entity_id;

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, nickname, under_review_at, suspended_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ message: 'Profile not found' }, { status: 404 });
  }

  if (profile.suspended_at) {
    return NextResponse.json({ message: 'Member is suspended; unsuspend from Members instead' }, { status: 400 });
  }

  if (!profile.under_review_at) {
    return NextResponse.json({ message: 'Member is not under review' }, { status: 400 });
  }

  const now = new Date().toISOString();

  const { error: profileUpdateError } = await admin
    .from('profiles')
    .update({ under_review_at: null })
    .eq('id', userId);

  if (profileUpdateError) {
    console.error('approve-member profile update:', profileUpdateError);
    return NextResponse.json({ message: 'Failed to approve member' }, { status: 500 });
  }

  const { error: resolveError } = await supabase
    .from('reports')
    .update({
      status: 'resolved',
      reviewed_at: now,
      reviewed_by: adminResult.user.id,
      admin_notes: 'Member approved',
    })
    .eq('id', reportId);

  if (resolveError) {
    console.error('approve-member report resolve:', resolveError);
    return NextResponse.json({ message: 'Failed to resolve report' }, { status: 500 });
  }

  expireMemberListCaches(profile.nickname);
  await revalidateAll();

  try {
    await notifyAdminsOfMemberJoined(userId);
  } catch (err) {
    console.error('approve-member notify admins:', err);
  }

  if (profile.email && !shouldSkipNotificationsAndEmails(profile.email)) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const memberName = profile.full_name || profile.nickname || 'there';
    await sendAppEmail({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: profile.email,
      replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
      subject: 'Your Creative Photography Group account is approved',
      html: `<p>Hi ${memberName},</p><p>Your account has been approved. You can sign in and use the site: <a href="${siteUrl}/account/events">${siteUrl}/account/events</a></p>`,
    }).catch((err) => {
      console.error('approve-member email:', err);
    });
  }

  return NextResponse.json({ success: true });
}
