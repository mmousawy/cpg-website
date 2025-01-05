import { render } from "@react-email/render";

export default async function Email({
  params,
}: {
  params: Promise<{ template: string }>
}) {
  const { template } = await params;

  // Get dynamic component based on template
  const EmailComponent = (await import(`../../../emails/${template}`)).default;

  const renderedTemplate = await render(<EmailComponent />)

  return (
    <iframe
      className="size-full"
      srcDoc={
        renderedTemplate
      }
    />
  );
}
