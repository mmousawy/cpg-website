import { NextRequest, NextResponse } from 'next/server';

const blacklist = process.env.BLACKLIST_IPS?.split(",") || [];

export async function middleware(request: NextRequest) {
  const ipAddress = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for");

  // If IP address exists in blacklist, return 403
  if (blacklist.includes(ipAddress || "")) {
    return NextResponse.json({ message: "Blacklisted" }, { status: 403 });
  }

  return NextResponse.next();
};

export const config = {
  matcher: ['/'],
};
