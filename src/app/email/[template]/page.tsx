import { render } from "@react-email/render";

// Email template mapping
const templates: Record<string, () => Promise<any>> = {
  // Event emails
  'signup': () => import('../../../emails/signup'),
  'confirm': () => import('../../../emails/confirm'),
  'cancel': () => import('../../../emails/cancel'),
  // Auth emails
  'verify-email': () => import('../../../emails/auth/verify-email'),
  'reset-password': () => import('../../../emails/auth/reset-password'),
  'welcome': () => import('../../../emails/auth/welcome'),
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Template not found: {template}</h1>
          <p className="text-gray-600">Available templates:</p>
          <ul className="mt-2">
            {Object.keys(templates).map((t) => (
              <li key={t}>
                <a href={`/email/${t}`} className="text-blue-500 hover:underline">{t}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  const EmailComponent = (await templateLoader()).default;
  const renderedTemplate = await render(<EmailComponent preview />);

  return (
    <iframe
      className="size-full"
      srcDoc={renderedTemplate}
    />
  );
}
