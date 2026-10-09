import type { CreateBatchEmailOptions, CreateEmailOptions } from 'resend';
import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function getAppEmailFrom(): string {
  return `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM_ADDRESS}>`;
}

export function getAppEmailReplyTo(): string {
  return `${process.env.EMAIL_REPLY_TO_NAME} <${process.env.EMAIL_REPLY_TO_ADDRESS}>`;
}

export type AppEmailPayload = Omit<CreateEmailOptions, 'from'> & {
  from?: string;
};

export type AppBatchEmailPayload = Omit<CreateBatchEmailOptions, 'from'> & {
  from?: string;
};

export async function sendAppEmail(payload: AppEmailPayload) {
  const { from, replyTo, ...rest } = payload;
  return getResend().emails.send({
    ...rest,
    from: from ?? getAppEmailFrom(),
    replyTo: replyTo ?? getAppEmailReplyTo(),
  } as CreateEmailOptions);
}

export async function sendAppEmailBatch(payloads: AppBatchEmailPayload[]) {
  if (payloads.length === 0) {
    return { data: null, error: null };
  }

  const emails = payloads.map(({ from, replyTo, ...rest }) => ({
    ...rest,
    from: from ?? getAppEmailFrom(),
    replyTo: replyTo ?? getAppEmailReplyTo(),
  })) as CreateBatchEmailOptions[];

  return getResend().batch.send(emails);
}
