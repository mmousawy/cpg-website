import { NextResponse } from 'next/server';

const secretKey = process.env.RECAPTCHA_SECRET_KEY;

export async function validateRecaptcha(token: string) {
  if (!token) {
    return NextResponse.json({ message: 'Token not found' }, { status: 405 });
  }

  try {
    const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.success) {
      return NextResponse.json({ success: true }, { status: 200 });
    } else {
      return NextResponse.json({ success: true }, { status: 200 });
    }
  } catch (error) {
    console.error(error);

    return NextResponse.json({ message: 'Error validating token' }, { status: 500 });
  }
}
