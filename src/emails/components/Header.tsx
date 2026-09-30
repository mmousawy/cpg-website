import {
  Img,
  Section,
  Text,
} from '@react-email/components';

import { getEmailAssetsUrl } from '@/emails/utils/siteUrl';

import EmailDivider from './EmailDivider';
import { emailBrandNameStyle } from './styles';

export default function Header() {
  return (
    <>
      <Section>
        <Img
          src={`${getEmailAssetsUrl()}/cpg-logo-small.png`}
          width="50"
          height="50"
          alt="Creative Photography Group"
          style={{ margin: '0 auto', display: 'block' }}
        />
      </Section>
      <Text
        style={emailBrandNameStyle}
      >
        Creative Photography Group
      </Text>
      <EmailDivider />
    </>
  );
}
