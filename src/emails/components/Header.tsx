import {
  Hr,
  Img,
  Section,
  Text,
} from "@react-email/components";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export default function Header() {
  return (
    <>
      <Section className="">
        <Img
          src={`${baseUrl}/cpg-logo-small.png`}
          width="50"
          height="50"
          alt="Creative Photography Group"
          className="mx-auto my-0"
        />
      </Section>
      <Text className="mx-0 my-[30px] p-0 text-center text-[18px] font-semibold text-[#171717]">
        Creative Photography Group
      </Text>
      <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />
    </>
  )
}
