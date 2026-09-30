import { Text } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';

import { emailMutedTextSpacedStyle, emailMutedTextStyle, emailTextStyle } from './styles';

type EmailTextProps = {
  children: ReactNode;
  variant?: 'body' | 'muted' | 'mutedSpaced';
  style?: CSSProperties;
};

export default function EmailText({
  children,
  variant = 'body',
  style,
}: EmailTextProps) {
  const baseStyle =
    variant === 'muted'
      ? emailMutedTextStyle
      : variant === 'mutedSpaced'
        ? emailMutedTextSpacedStyle
        : emailTextStyle;

  return (
    <Text
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </Text>
  );
}
