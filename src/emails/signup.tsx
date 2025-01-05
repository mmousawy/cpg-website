import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

import { Database } from "../../database.types";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";

export const SignupEmail = ({
  fullName,
  event,
  confirmLink,
}: {
  fullName: string,
  event: Database['public']['Tables']['events']['Row'],
  confirmLink: string,
}) => {
  const previewText = `Sign up for: ${event?.title}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Tailwind>
        <Body className="m-auto bg-[#f7f7f7] p-6 font-sans">
          <Container className="mx-auto max-w-[465px] border-separate rounded border border-solid border-[#e5e7ea] bg-white p-[20px]">
            <Section className="">
              <Img
                src={`${baseUrl}/cpg-logo-small.png`}
                width="40"
                height="37"
                alt="Creative Photography Group"
                className="mx-auto my-0"
              />
            </Section>
            <Text className="mx-0 my-[30px] p-0 text-center text-[18px] font-semibold text-[#171717]">
              Creative Photography Group
            </Text>
            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />

            <Heading className="mx-0 mb-[30px] p-0 text-[16px] font-normal text-[#171717]">
              Sign up for <strong>{event?.title}</strong>
            </Heading>

            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Hello {fullName},
            </Text>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              Someone recently signed up for a meetup with your email address.
              If this was you, you can confirm your sign up here:
            </Text>

            <Section className="my-[20px]">
              <Button
                className="rounded-full bg-[#38785f] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={confirmLink}
              >
                Confirm sign up
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-[#171717]">
              or copy and paste this URL into your browser:{" "}
              <Link href={confirmLink} className="text-blue-600 no-underline">
                {confirmLink}
              </Link>
            </Text>

            <Text className="mt-8 text-[14px] leading-[24px] text-[#171717]">
              The Creative Photography Group team
            </Text>
            <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />
            <Text className="!mb-0 text-[12px] leading-[24px] text-[#666666]">
              This invitation was intended for{" "}
              <span className="text-[#171717]">{fullName}</span>. If you
              were not expecting this email, you can ignore this email. If
              you are concerned about your safety, please reply to
              this email to get in touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SignupEmail;
