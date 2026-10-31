import type { Json } from '@/database.types';
import { buildLinkPublishState } from '@/lib/profileUrl/buildLinkPublishState';
import { fileProfileLinkReport } from '@/lib/profileUrl/fileProfileLinkReport';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse, after } from 'next/server';

type SocialLinkBody = { label: string; url: string };

function userFacingBlockMessage(reason: string): string {
  switch (reason) {
    case 'safe_browsing':
      return 'This link was not published because it was flagged as unsafe.';
    case 'business_address_schema':
    case 'service_title':
      return 'This link was not published because the site looks like an advertisement, not a personal portfolio or social profile.';
    case 'inconclusive':
    case 'fetch_failed':
    case 'unsafe_url':
    case 'safe_browsing_error':
      return 'This link was not published because we could not verify the site.';
    default:
      return 'This link was not published because it could not be verified for your public profile.';
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const website =
      typeof body?.website === 'string' ? body.website.trim() : '';
    const bio = typeof body?.bio === 'string' ? body.bio : '';
    const socialLinks: SocialLinkBody[] = Array.isArray(body?.socialLinks)
      ? body.socialLinks
        .filter((l: unknown): l is SocialLinkBody => l !== null && typeof l === 'object')
        .map((l: SocialLinkBody) => ({
          label: typeof l.label === 'string' ? l.label : '',
          url: typeof l.url === 'string' ? l.url : '',
        }))
        .filter((l: SocialLinkBody) => l.label.trim() && l.url.trim())
      : [];

    const { data: profileJson } = await supabase.rpc('get_own_profile');
    const profile = profileJson && typeof profileJson === 'object' && !Array.isArray(profileJson)
      ? profileJson as { full_name?: string | null }
      : null;

    const { state, checks } = await buildLinkPublishState({
      website: website || null,
      socialLinks,
      bio: bio || null,
      memberFullName: profile?.full_name ?? null,
    });

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from('profiles')
      .update({
        website: website || null,
        social_links: socialLinks.length > 0 ? socialLinks : null,
        bio: bio || null,
        link_publish_state: state as unknown as Json,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('profile-links update error:', updateError);
      if (updateError.message.includes('link_publish_state')) {
        return NextResponse.json(
          { message: 'Profile link checks are not available until the database migration is applied.' },
          { status: 503 },
        );
      }
      return NextResponse.json({ message: 'Failed to save profile links' }, { status: 500 });
    }

    after(() => {
      void fileProfileLinkReport(user.id, checks).catch((err) => {
        console.error('Error filing profile link report:', err);
      });
    });

    const blocked: {
      website?: string;
      bio?: string;
      social?: Record<string, string>;
    } = {};

    if (website && !state.websiteAllowed && state.reasons?.website) {
      blocked.website = userFacingBlockMessage(state.reasons.website);
    }
    if (bio && !state.bioPublic && state.reasons?.bio) {
      blocked.bio = userFacingBlockMessage(state.reasons.bio);
    }
    if (state.reasons?.social) {
      blocked.social = {};
      for (const [url, reason] of Object.entries(state.reasons.social)) {
        blocked.social[url] = userFacingBlockMessage(reason);
      }
    }

    return NextResponse.json({
      success: true,
      state,
      blocked: Object.keys(blocked).length > 0 ? blocked : undefined,
      checks: checks.map((c) => ({
        url: c.url,
        verdict: c.verdict,
        reason: c.reason,
        title: c.title,
        schemaTypes: c.schemaTypes,
        safeBrowsing: c.safeBrowsing,
      })),
    });
  } catch (error) {
    console.error('profile-links error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
