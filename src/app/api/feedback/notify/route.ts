import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import { FeedbackNotificationEmail } from '@/emails/feedback-notification';
import { createNotification } from '@/lib/notifications/create';
import { encrypt } from '@/utils/encrypt';
import { render } from '@react-email/render';
import { adminSupabase } from '@/utils/supabase/admin';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedbackId } = body as { feedbackId: string };

    if (!feedbackId) {
      return NextResponse.json(
        { message: 'Feedback ID is required' },
        { status: 400 },
      );
    }

    const { data: feedback, error: feedbackError } = await adminSupabase
      .from('feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      console.error('Error fetching feedback:', feedbackError);
      return NextResponse.json({ message: 'Feedback not found' }, { status: 404 });
    }

    let submitterName = feedback.name;
    let submitterAvatarUrl: string | null = null;

    if (feedback.user_id) {
      const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, nickname, avatar_url')
        .eq('id', feedback.user_id)
        .single();

      if (profile) {
        submitterName = profile.full_name || profile.nickname || 'User';
        submitterAvatarUrl = profile.avatar_url;
      }
    }

    const subjectLabel = FEEDBACK_SUBJECTS.find((s) => s.value === feedback.subject)?.label ?? feedback.subject;
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const reviewLinkRelative = '/admin/feedback';
    const reviewLinkFull = `${baseUrl}/admin/feedback`;

    const { data: admins, error: adminsError } = await adminSupabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('is_admin', true);

    if (adminsError) {
      console.error('Error fetching admins:', adminsError);
      return NextResponse.json({ message: 'Failed to fetch admins' }, { status: 500 });
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: 0 });
    }

    const notificationPromises = admins.map((admin) =>
      createNotification({
        userId: admin.id,
        actorId: feedback.user_id || null,
        type: 'feedback_submitted',
        entityType: 'feedback',
        entityId: feedback.id,
        data: {
          title: subjectLabel,
          thumbnail: submitterAvatarUrl,
          link: reviewLinkRelative,
          actorName: submitterName,
        },
      }),
    );

    await Promise.all(notificationPromises);

    const { data: emailPreferences } = await adminSupabase
      .from('email_preferences')
      .select('user_id')
      .eq('type_key', 'admin_notifications')
      .eq('enabled', false);

    const optedOutUserIds = new Set((emailPreferences || []).map((p) => p.user_id));

    const adminsToEmail = admins.filter(
      (admin) => admin.email && !optedOutUserIds.has(admin.id),
    );

    if (adminsToEmail.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: admins.length });
    }

    try {
      const emailPromises = adminsToEmail.map(async (admin) => {
        const optOutToken = encrypt(JSON.stringify({
          userId: admin.id,
          emailType: 'admin_notifications',
        }));
        const optOutLink = `${baseUrl}/unsubscribe/${encodeURIComponent(optOutToken)}`;

        const html = await render(
          FeedbackNotificationEmail({
            adminName: admin.full_name || 'Admin',
            submitterName,
            submitterEmail: feedback.email,
            subject: feedback.subject,
            message: feedback.message,
            screenshots: feedback.screenshots ?? null,
            reviewLink: reviewLinkFull,
            optOutLink,
          }),
        );

        return {
          from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
          replyTo: `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`,
          to: admin.email!,
          subject: `New Feedback: ${submitterName} - ${subjectLabel}`,
          html,
        };
      });

      const emails = await Promise.all(emailPromises);

      if (emails.length > 0) {
        await resend.batch.send(emails);
      }
    } catch (emailError) {
      console.error('Error sending feedback notification emails:', emailError);
    }

    return NextResponse.json({
      success: true,
      notifiedCount: admins.length,
      emailedCount: adminsToEmail.length,
    });
  } catch (error) {
    console.error('Feedback notification error:', error);
    return NextResponse.json(
      { message: 'An error occurred' },
      { status: 500 },
    );
  }
}
