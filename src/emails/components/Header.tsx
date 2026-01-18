import {
  Hr,
  Img,
  Section,
  Text,
} from '@react-email/components';

// Use production URL for email images (localhost won't work in email clients)
const EMAIL_ASSETS_URL = process.env.EMAIL_ASSETS_URL || 'https://creativephotography.group';

export default function Header() {
  return (
    <>
      <Section
        className=""
      >
        <Img
          src={`${EMAIL_ASSETS_URL}/cpg-logo-small.png`}
          width="50"
          height="50"
          alt="Creative Photography Group"
          className="mx-auto my-0"
        />
      </Section>
      <Text
        className="mx-0 mt-2 mb-[16px] p-0 text-center text-[18px] font-semibold text-[#171717]"
      >
        Creative Photography Group
      </Text>
      <Hr
        className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]"
      />
    </>
  );
}
