import {
  Hr,
  Link,
  Text,
} from "@react-email/components";

export default function Footer({
  fullName,
  optOutLink,
}: {
  fullName: string;
  optOutLink?: string;
}) {
  return (
    <>
      <Hr className="mx-0 my-[20px] w-full border border-solid border-[#e5e7ea]" />
      <Text className="!mb-0 text-[12px] leading-[24px] text-[#666666]">
        This message was intended for{" "}
        <span className="text-[#171717]">{fullName}</span>. If you
        were not expecting this email, you can ignore this email. If
        you are concerned about your security, please reply to
        this email to get in touch with us.
      </Text>
      {optOutLink && (
        <Text className="!mt-2 !mb-0 text-[12px] leading-[24px] text-[#666666]">
          <Link href={optOutLink} className="text-[#666666] underline">
            Unsubscribe from event updates
          </Link>
        </Text>
      )}
    </>
  );
}
