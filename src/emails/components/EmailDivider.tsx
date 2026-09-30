import { Hr } from '@react-email/components';
import type { CSSProperties } from 'react';

import { emailDividerStyles } from './styles';

type EmailDividerProps = {
  spacing?: 'default' | 'tight';
  style?: CSSProperties;
};

export default function EmailDivider({
  spacing = 'default',
  style,
}: EmailDividerProps) {
  return (
    <Hr
      style={{ ...emailDividerStyles[spacing], ...style }}
    />
  );
}
