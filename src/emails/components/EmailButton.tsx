import { Link } from '@react-email/components';
import type { CSSProperties, ReactNode } from 'react';

import { emailPrimaryButtonStyle, emailSecondaryButtonStyle } from './styles';

type EmailButtonProps = {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  download?: string;
  style?: CSSProperties;
};

export default function EmailButton({
  href,
  children,
  variant = 'primary',
  download,
  style,
}: EmailButtonProps) {
  const baseStyle = variant === 'primary' ? emailPrimaryButtonStyle : emailSecondaryButtonStyle;

  return (
    <Link
      href={href}
      style={{ ...baseStyle, ...style }}
      {...(download ? { download } : {})}
    >
      {children}
    </Link>
  );
}
