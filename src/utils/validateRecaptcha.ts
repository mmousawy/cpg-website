import { NextResponse } from 'next/server';

export async function validateRecaptcha(token: string) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (!token) {
    return NextResponse.json({ message: 'Token not found' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      { method: 'POST' },
    );

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ success: false, message: 'reCAPTCHA verification failed' }, { status: 403 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error validating token' }, { status: 500 });
  }
}
