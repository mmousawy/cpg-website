import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { adminSupabase } from '@/utils/supabase/admin';
import type { ReportEntityType } from '@/types/reports';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      entityType,
      entityId,
      reason,
      details,
      reporterName,
      reporterEmail,
    } = body;

    // Validate required fields
    if (!entityType || !entityId || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Validate entity type
    const validEntityTypes: ReportEntityType[] = ['photo', 'album', 'profile', 'comment'];
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type' },
        { status: 400 },
      );
    }

    // Check if user is authenticated
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const isAuthenticated = !!session;

    if (!isAuthenticated) {
      // Anonymous report - validate BotID and required fields
      const { isBot } = await checkBotId();

      if (isBot) {
        console.log('Bot detected, rejecting report submission');
        return NextResponse.json(
          { error: 'We couldn\'t verify your request. Please try again.' },
          { status: 403 },
        );
      }

      // Validate anonymous fields
      if (!reporterName || !reporterEmail) {
        return NextResponse.json(
          { error: 'Name and email are required for anonymous reports' },
          { status: 400 },
        );
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(reporterEmail)) {
        return NextResponse.json(
          { error: 'Invalid email address' },
          { status: 400 },
        );
      }

      // Validate field lengths
      if (reporterName.length > 100) {
        return NextResponse.json(
          { error: 'Name is too long (max 100 characters)' },
          { status: 400 },
        );
      }

      if (reporterEmail.length > 255) {
        return NextResponse.json(
          { error: 'Email is too long (max 255 characters)' },
          { status: 400 },
        );
      }

      // Check for duplicate pending reports from same email
      const { data: existingReport } = await adminSupabase
        .from('reports')
        .select('id')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('reporter_email', reporterEmail)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingReport) {
        return NextResponse.json(
          { error: 'You have already submitted a pending report for this content' },
          { status: 409 },
        );
      }

      // Insert anonymous report using service role (bypasses RLS)
      const { data: report, error: insertError } = await adminSupabase
        .from('reports')
        .insert({
          reporter_id: null,
          reporter_email: reporterEmail.trim(),
          reporter_name: reporterName.trim(),
          entity_type: entityType,
          entity_id: entityId,
          reason: reason.trim(),
          details: details?.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting anonymous report:', insertError);
        return NextResponse.json(
          { error: 'Failed to submit report' },
          { status: 500 },
        );
      }

      // Trigger admin notifications (fire-and-forget)
      fetch(`${request.nextUrl.origin}/api/reports/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id }),
      }).catch((err) => {
        console.error('Error notifying admins:', err);
      });

      return NextResponse.json(
        { message: 'Report submitted successfully' },
        { status: 200 },
      );
    }

    // Authenticated report
    const userId = session.user.id;

    // Check for duplicate pending reports from same user
    const { data: existingReport } = await supabase
      .from('reports')
      .select('id')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('reporter_id', userId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already submitted a pending report for this content' },
        { status: 409 },
      );
    }

    // Validate reason length
    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'Reason is too long (max 500 characters)' },
        { status: 400 },
      );
    }

    if (details && details.length > 1000) {
      return NextResponse.json(
        { error: 'Details are too long (max 1000 characters)' },
        { status: 400 },
      );
    }

    // Insert authenticated report
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        reporter_id: userId,
        reporter_email: null,
        reporter_name: null,
        entity_type: entityType,
        entity_id: entityId,
        reason: reason.trim(),
        details: details?.trim() || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting report:', insertError);
      return NextResponse.json(
        { error: 'Failed to submit report' },
        { status: 500 },
      );
    }

    // Trigger admin notifications (fire-and-forget)
    fetch(`${request.nextUrl.origin}/api/reports/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId: report.id }),
    }).catch((err) => {
      console.error('Error notifying admins:', err);
    });

    return NextResponse.json(
      { message: 'Report submitted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Report submission error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
