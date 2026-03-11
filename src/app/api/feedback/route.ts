import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminSupabase } from '@/utils/supabase/admin';
import { FEEDBACK_SUBJECTS } from '@/types/feedback';

const VALID_SUBJECTS = FEEDBACK_SUBJECTS.map((s) => s.value);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, screenshots } = body;

    // Validate screenshots if provided (max 3 URLs)
    let screenshotsArray: string[] | undefined;
    if (screenshots != null) {
      if (!Array.isArray(screenshots)) {
        return NextResponse.json(
          { error: 'Screenshots must be an array' },
          { status: 400 },
        );
      }
      if (screenshots.length > 3) {
        return NextResponse.json(
          { error: 'Maximum 3 screenshots allowed' },
          { status: 400 },
        );
      }
      screenshotsArray = screenshots.filter(
        (s: unknown): s is string =>
          typeof s === 'string' && s.startsWith('http') && s.length < 2048,
      );
    }

    // Validate required fields
    if (!name || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, subject, and message are required' },
        { status: 400 },
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 },
      );
    }

    if (!VALID_SUBJECTS.includes(subject)) {
      return NextResponse.json(
        { error: 'Invalid subject' },
        { status: 400 },
      );
    }

    if (typeof message !== 'string' || message.trim().length < 10) {
      return NextResponse.json(
        { error: 'Message must be at least 10 characters' },
        { status: 400 },
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (max 5000 characters)' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;

    if (!isAuthenticated) {
      // Anonymous feedback - validate BotID
      const { isBot } = await checkBotId();

      if (isBot) {
        console.log('Bot detected, rejecting feedback submission');
        return NextResponse.json(
          { error: "We couldn't verify your request. Please try again." },
          { status: 403 },
        );
      }

      if (name.trim().length > 100) {
        return NextResponse.json(
          { error: 'Name is too long (max 100 characters)' },
          { status: 400 },
        );
      }

      if (email != null && email !== '' && email.length > 255) {
        return NextResponse.json(
          { error: 'Email is too long (max 255 characters)' },
          { status: 400 },
        );
      }

      if (email != null && email !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return NextResponse.json(
            { error: 'Invalid email address' },
            { status: 400 },
          );
        }
      }

      const { data: feedback, error: insertError } = await adminSupabase
        .from('feedback')
        .insert({
          name: name.trim(),
          email: email?.trim() || null,
          subject: subject.trim(),
          message: message.trim(),
          user_id: null,
          status: 'new',
          screenshots: screenshotsArray?.length ? screenshotsArray : null,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting anonymous feedback:', insertError);
        return NextResponse.json(
          { error: 'Failed to submit feedback' },
          { status: 500 },
        );
      }

      fetch(`${request.nextUrl.origin}/api/feedback/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: feedback.id }),
      }).catch((err) => {
        console.error('Error notifying admins:', err);
      });

      return NextResponse.json(
        { message: 'Feedback submitted successfully' },
        { status: 200 },
      );
    }

    // Authenticated feedback
    const userId = user.id;

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Name is too long (max 100 characters)' },
        { status: 400 },
      );
    }

    const { data: feedback, error: insertError } = await supabase
      .from('feedback')
      .insert({
        name: name.trim(),
        email: null,
        subject: subject.trim(),
        message: message.trim(),
        user_id: userId,
        status: 'new',
        screenshots: screenshotsArray?.length ? screenshotsArray : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting feedback:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 },
      );
    }

    fetch(`${request.nextUrl.origin}/api/feedback/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedbackId: feedback.id }),
    }).catch((err) => {
      console.error('Error notifying admins:', err);
    });

    return NextResponse.json(
      { message: 'Feedback submitted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
