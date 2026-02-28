import { revalidateTag } from 'next/cache';
import { COLOR_PALETTE } from '@/lib/colorDraw';
import { createClient, createPublicClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export type ColorDrawWithProfile = {
  id: string;
  event_id: number;
  user_id: string | null;
  guest_nickname: string | null;
  color: string;
  swapped_at: string | null;
  created_at: string;
  profiles: {
    avatar_url: string | null;
    full_name: string | null;
    nickname: string | null;
  } | null;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const eventId = searchParams.get('event_id');

  if (!eventId) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
  }

  const eventIdNum = parseInt(eventId, 10);
  if (Number.isNaN(eventIdNum)) {
    return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
  }

  const supabase = createPublicClient();

  const { data: draws, error } = await supabase
    .from('event_color_draws')
    .select(`
      id,
      event_id,
      user_id,
      guest_nickname,
      color,
      swapped_at,
      created_at,
      profiles (avatar_url, full_name, nickname)
    `)
    .eq('event_id', eventIdNum)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching color draws:', error);
    return NextResponse.json({ error: 'Failed to fetch color draws' }, { status: 500 });
  }

  return NextResponse.json({ draws: draws || [] });
}

function pickRandomColor(exclude: Set<string>): string {
  const available = COLOR_PALETTE.filter((c) => !exclude.has(c));
  const pool = available.length > 0 ? available : [...COLOR_PALETTE];
  return pool[Math.floor(Math.random() * pool.length)];
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: { event_id: number; guest_nickname?: string; swap?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event_id, guest_nickname, swap } = body;

  if (!event_id) {
    return NextResponse.json({ error: 'Missing event_id' }, { status: 400 });
  }

  const eventIdNum = typeof event_id === 'string' ? parseInt(event_id, 10) : event_id;
  if (Number.isNaN(eventIdNum)) {
    return NextResponse.json({ error: 'Invalid event_id' }, { status: 400 });
  }

  const isAuthenticated = !!user;

  if (isAuthenticated) {
    // Logged-in user: draw or swap
    const { data: existing } = await supabase
      .from('event_color_draws')
      .select('id, color, swapped_at')
      .eq('event_id', eventIdNum)
      .eq('user_id', user!.id)
      .single();

    if (existing) {
      if (swap) {
        if (existing.swapped_at) {
          return NextResponse.json({ error: 'You have already used your one swap' }, { status: 400 });
        }
        const { data: allDraws } = await supabase
          .from('event_color_draws')
          .select('color')
          .eq('event_id', eventIdNum);
        const taken = new Set((allDraws || []).map((d) => d.color));
        taken.add(existing.color);
        const newColor = pickRandomColor(taken);

        const { data: updated, error: updateError } = await supabase
          .from('event_color_draws')
          .update({ color: newColor, swapped_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error swapping color:', updateError);
          return NextResponse.json({ error: 'Failed to swap color' }, { status: 500 });
        }
        revalidateTag('event-color-draws', 'max');
        revalidateTag(`event-color-draws-${eventIdNum}`, 'max');
        return NextResponse.json({ draw: updated, swapped: true });
      }
      return NextResponse.json({ error: 'You have already drawn a color for this event' }, { status: 400 });
    }

    // New draw for authenticated user
    const { data: allDraws } = await supabase
      .from('event_color_draws')
      .select('color')
      .eq('event_id', eventIdNum);
    const taken = new Set((allDraws || []).map((d) => d.color));
    const color = pickRandomColor(taken);

    const { data: inserted, error: insertError } = await supabase
      .from('event_color_draws')
      .insert({
        event_id: eventIdNum,
        user_id: user!.id,
        guest_nickname: null,
        color,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating color draw:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    revalidateTag('event-color-draws', 'max');
    revalidateTag(`event-color-draws-${eventIdNum}`, 'max');
    return NextResponse.json({ draw: inserted });
  }

  // Guest: require nickname
  const nickname = typeof guest_nickname === 'string' ? guest_nickname.trim() : '';
  if (!nickname) {
    return NextResponse.json({ error: 'Guest nickname is required' }, { status: 400 });
  }

  if (swap) {
    const { data: existing } = await supabase
      .from('event_color_draws')
      .select('id, color, swapped_at')
      .eq('event_id', eventIdNum)
      .eq('guest_nickname', nickname)
      .is('user_id', null)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'No draw found for this guest. Draw a color first.' }, { status: 400 });
    }
    if (existing.swapped_at) {
      return NextResponse.json({ error: 'You have already used your one swap' }, { status: 400 });
    }

    const { data: allDraws } = await supabase
      .from('event_color_draws')
      .select('color')
      .eq('event_id', eventIdNum);
    const taken = new Set((allDraws || []).map((d) => d.color));
    taken.add(existing.color);
    const newColor = pickRandomColor(taken);

    const { data: updated, error: updateError } = await supabase
      .from('event_color_draws')
      .update({ color: newColor, swapped_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error swapping color:', updateError);
      return NextResponse.json({ error: 'Failed to swap color' }, { status: 500 });
    }
    revalidateTag('event-color-draws', 'max');
    revalidateTag(`event-color-draws-${eventIdNum}`, 'max');
    return NextResponse.json({ draw: updated, swapped: true });
  }

  const { data: existing } = await supabase
    .from('event_color_draws')
    .select('id')
    .eq('event_id', eventIdNum)
    .eq('guest_nickname', nickname)
    .is('user_id', null)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'This nickname has already drawn a color for this event' }, { status: 400 });
  }

  const { data: allDraws } = await supabase
    .from('event_color_draws')
    .select('color')
    .eq('event_id', eventIdNum);
  const taken = new Set((allDraws || []).map((d) => d.color));
  const color = pickRandomColor(taken);

  const { data: inserted, error: insertError } = await supabase
    .from('event_color_draws')
    .insert({
      event_id: eventIdNum,
      user_id: null,
      guest_nickname: nickname,
      color,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating guest color draw:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }
  revalidateTag('event-color-draws', 'max');
  revalidateTag(`event-color-draws-${eventIdNum}`, 'max');
  return NextResponse.json({ draw: inserted });
}
