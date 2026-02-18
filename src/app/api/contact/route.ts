import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

import ContactEmail from '@/emails/contact';
import { render } from '@react-email/render';

const resend = new Resend(process.env.RESEND_API_KEY!);

const CONTACT_EMAIL = 'murtada.al.mousawy@gmail.com';

export async function POST(request: NextRequest) {
  try {
    // Check for bots using BotID
    // In development, checkBotId() automatically returns { isBot: false }
    const { isBot } = await checkBotId();

    if (isBot) {
      console.log('Bot detected, rejecting contact form submission');
      return NextResponse.json(
        { message: 'We couldn\'t verify your request. If you\'re having trouble signing up, please email murtada.al.mousawy@gmail.com for assistance.' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 },
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email address' },
        { status: 400 },
      );
    }

    // Validate field lengths
    if (name.length > 100) {
      return NextResponse.json(
        { message: 'Name is too long (max 100 characters)' },
        { status: 400 },
      );
    }

    if (subject.length > 200) {
      return NextResponse.json(
        { message: 'Subject is too long (max 200 characters)' },
        { status: 400 },
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { message: 'Message is too long (max 5000 characters)' },
        { status: 400 },
      );
    }

    // Send the email
    const emailResult = await resend.emails.send({
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: CONTACT_EMAIL,
      replyTo: email,
      subject: `[Contact Form] ${subject}`,
      html: await render(ContactEmail({ name, email, subject, message })),
    });

    if (emailResult.error) {
      console.error('Email error:', emailResult.error);
      return NextResponse.json(
        { message: 'Failed to send message. Please try again later.' },
        { status: 500 },
      );
    }

    console.log(`📨 Contact form email sent from: ${email}`);

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { message: 'An error occurred. Please try again later.' },
      { status: 500 },
    );
  }
}
