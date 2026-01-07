import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { title, description, date, time, location, cover_image } = body;

  if (!title || !date) {
    return NextResponse.json({ message: "Title and date are required" }, { status: 400 });
  }

  // Generate slug from title (simple example, adjust as needed)
  const slug = title
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  // Create event
  const { data, error } = await supabase
    .from('events')
    .insert({
      title,
      description,
      date,
      time,
      location,
      cover_image,
      slug,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Revalidate event pages
  revalidatePath('/events');
  revalidatePath('/');

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { id, title, description, date, time, location, cover_image } = body;

  if (!id) {
    return NextResponse.json({ message: "Event ID is required" }, { status: 400 });
  }

  if (!title || !date) {
    return NextResponse.json({ message: "Title and date are required" }, { status: 400 });
  }

  // Update event
  const { data, error } = await supabase
    .from('events')
    .update({
      title,
      description,
      date,
      time,
      location,
      cover_image,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Revalidate event pages
  if (data?.slug) {
    revalidatePath(`/events/${data.slug}`);
  }
  revalidatePath('/events');
  revalidatePath('/');

  return NextResponse.json(data, { status: 200 });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ message: "Admin access required" }, { status: 403 });
  }

  const body = await request.json();
  const { id, slug } = body;

  if (!id && !slug) {
    return NextResponse.json({ message: "Event ID or slug is required" }, { status: 400 });
  }

  // Delete event - use ID if provided, otherwise use slug
  let query = supabase.from('events').delete();

  if (id) {
    query = query.eq('id', id);
  } else {
    query = query.eq('slug', slug);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Revalidate event pages
  if (slug) {
    revalidatePath(`/events/${slug}`);
  }
  revalidatePath('/events');
  revalidatePath('/');

  return NextResponse.json({ success: true }, { status: 200 });
}
