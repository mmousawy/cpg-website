import { decrypt } from '@/utils/encrypt';
import { createAdminClient } from '@/utils/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { message: 'Missing token' },
        { status: 400 },
      );
    }

    // Decrypt the token to get userId and emailType
    // We only encrypt userId and emailType (not email) to keep token smaller
    let decryptedData: { userId: string; emailType?: string };
    try {
      // Try to decode the token (handles URL encoding)
      // If it's already decoded, decodeURIComponent will just return it as-is
      let decodedToken = token;
      try {
        decodedToken = decodeURIComponent(token);
      } catch {
        // If decoding fails, token might already be decoded, use as-is
        decodedToken = token;
      }

      // Check if token has the expected format (iv:encrypted)
      if (!decodedToken.includes(':')) {
        console.error('Token missing colon separator:', decodedToken.substring(0, 50));
        return NextResponse.json(
          { message: 'Invalid token format' },
          { status: 400 },
        );
      }

      const decrypted = decrypt(decodedToken);
      decryptedData = JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      console.error('Token format check:', token?.includes(':') ? 'Has colon' : 'Missing colon');
      console.error('Token length:', token?.length);
      console.error('Token preview:', token?.substring(0, 100));
      return NextResponse.json(
        { message: 'Invalid or corrupted unsubscribe link' },
        { status: 400 },
      );
    }

    const { userId, emailType: emailTypeKey = 'newsletter' } = decryptedData;

    if (!userId) {
      return NextResponse.json(
        { message: 'Invalid unsubscribe data' },
        { status: 400 },
      );
    }

    // Validate email type
    const validEmailTypes = ['events', 'newsletter', 'notifications'];
    if (!validEmailTypes.includes(emailTypeKey)) {
      return NextResponse.json(
        { message: 'Invalid email type' },
        { status: 400 },
      );
    }

    // Use admin client to bypass RLS for unsubscribe operations
    // This is safe because we've already verified the token contains valid user info
    const supabase = createAdminClient();

    // Verify the user exists (we look up email from userId, not from token)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 },
      );
    }

    // Get the email type ID (using type assertion since types haven't been regenerated yet)
    const { data: emailTypeData, error: emailTypeError } = await supabase
      .from('email_types')
      .select('id, type_key, type_label')
      .eq('type_key', emailTypeKey)
      .single();

    if (emailTypeError || !emailTypeData) {
      return NextResponse.json(
        { message: 'Email type not found' },
        { status: 404 },
      );
    }

    const emailTypeId = emailTypeData.id;

    // Check if already unsubscribed - prevent duplicate unsubscribes
    const { data: existingPreference } = await supabase
      .from('email_preferences')
      .select('opted_out')
      .eq('user_id', userId)
      .eq('email_type_id', emailTypeId)
      .single();

    if (existingPreference?.opted_out) {
      return NextResponse.json(
        {
          message: 'You are already unsubscribed from this email type',
          alreadyUnsubscribed: true,
          emailType: emailTypeKey,
        },
        { status: 200 },
      );
    }

    // For backward compatibility: if newsletter type and newsletter_opt_in is false, they're already out
    if (emailTypeKey === 'newsletter') {
      const { data: profileWithNewsletter } = await supabase
        .from('profiles')
        .select('newsletter_opt_in')
        .eq('id', userId)
        .single();

      if (profileWithNewsletter?.newsletter_opt_in === false) {
        // Also ensure preference is set in new table
        await supabase
          .from('email_preferences')
          .upsert({
            user_id: userId,
            email_type_id: emailTypeId,
            opted_out: true,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,email_type_id',
          });

        return NextResponse.json(
          {
            message: 'You are already unsubscribed from this email type',
            alreadyUnsubscribed: true,
            emailType: emailTypeKey,
          },
          { status: 200 },
        );
      }
    }

    // Upsert the preference (insert or update)
    const { error: updateError } = await supabase
      .from('email_preferences')
      .upsert({
        user_id: userId,
        email_type_id: emailTypeId,
        opted_out: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,email_type_id',
      });

    if (updateError) {
      console.error('Error updating email preferences:', updateError);
      return NextResponse.json(
        { message: 'Failed to unsubscribe. Please try again.' },
        { status: 500 },
      );
    }

    // For backward compatibility: also update newsletter_opt_in if it's newsletter type
    if (emailTypeKey === 'newsletter') {
      await supabase
        .from('profiles')
        .update({ newsletter_opt_in: false })
        .eq('id', userId);
    }

    return NextResponse.json(
      {
        message: 'Successfully unsubscribed',
        emailType: emailTypeKey,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Unexpected error in unsubscribe:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred' },
      { status: 500 },
    );
  }
}
