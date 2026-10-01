import { Heading, Text } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';

import {
  emailSectionHeadingLooseStyle,
  emailSectionHeadingStyle,
  emailSubsectionHeadingStyle,
  emailTitleHeadingStyle,
} from './styles';

type EmailHeadingProps = {
  children: ReactNode;
  variant?: 'title' | 'section' | 'sectionLoose' | 'subsection';
  style?: CSSProperties;
};

export default function EmailHeading({
  children,
  variant = 'title',
  style,
}: EmailHeadingProps) {
  if (variant === 'title') {
    return (
      <Heading
        as="h1"
        style={{ ...emailTitleHeadingStyle, ...style }}
      >
        {children}
      </Heading>
    );
  }

  const sectionStyle =
    variant === 'sectionLoose'
      ? emailSectionHeadingLooseStyle
      : variant === 'subsection'
        ? emailSubsectionHeadingStyle
        : emailSectionHeadingStyle;

  return (
    <Text
      style={{ ...sectionStyle, ...style }}
    >
      {children}
    </Text>
  );
}
