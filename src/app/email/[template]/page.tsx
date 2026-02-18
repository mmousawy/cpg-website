import { render } from '@react-email/render';

// Provide sample params for build-time validation (required with cacheComponents)
export async function generateStaticParams() {
  return [{ template: 'signup' }];
}

// Email template mapping
type EmailTemplateComponent = React.ComponentType<{ preview?: boolean; [key: string]: unknown }>;
type EmailModule = { default: EmailTemplateComponent };

const templates: Record<string, () => Promise<EmailModule>> = {
  'signup': () => import('../../../emails/signup') as unknown as Promise<EmailModule>,
  'confirm': () => import('../../../emails/confirm') as unknown as Promise<EmailModule>,
  'cancel': () => import('../../../emails/cancel') as unknown as Promise<EmailModule>,
  'verify-email': () => import('../../../emails/auth/verify-email') as unknown as Promise<EmailModule>,
  'reset-password': () => import('../../../emails/auth/reset-password') as unknown as Promise<EmailModule>,
  'welcome': () => import('../../../emails/auth/welcome') as unknown as Promise<EmailModule>,
  'event-announcement': () => import('../../../emails/event-announcement') as unknown as Promise<EmailModule>,
  'attendee-message': () => import('../../../emails/attendee-message') as unknown as Promise<EmailModule>,
  'newsletter': () => import('../../../emails/newsletter') as unknown as Promise<EmailModule>,
  'comment-notification': () => import('../../../emails/comment-notification') as unknown as Promise<EmailModule>,
  'weekly-digest': () => import('../../../emails/weekly-digest') as unknown as Promise<EmailModule>,
};

export default async function Email({
  params,
}: {
  params: Promise<{ template: string }>
}) {
  const { template } = await params;

  const templateLoader = templates[template];

  if (!templateLoader) {
    return (
      <div
        className="flex items-center justify-center h-screen"
      >
        <div
          className="text-center"
        >
          <h1
            className="text-2xl font-bold mb-4"
          >
            Template not found:
            {template}
          </h1>
          <p
            className="text-gray-600"
          >
            Available templates:
          </p>
          <ul
            className="mt-2"
          >
            {Object.keys(templates).map((t) => (
              <li
                key={t}
              >
                <a
                  href={`/email/${t}`}
                  className="text-blue-500 hover:underline"
                >
                  {t}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const EmailComponent = (await templateLoader()).default;
  const renderedTemplate = await render(<EmailComponent
    preview
  />);

  return (
    <iframe
      className="min-h-screen w-full"
      srcDoc={renderedTemplate}
    />
  );
}
