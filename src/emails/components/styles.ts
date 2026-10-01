import type { CSSProperties } from 'react';

export const emailColors = {
  pageBg: '#ecedf0',
  cardBorder: '#cdd0d4',
  rule: '#e5e7ea',
  text: '#171717',
  muted: '#666666',
  primary: '#38785f',
  accentLink: '#38785f',
  secondaryBg: '#f7f7f7',
  white: '#ffffff',
  socialBorder: '#cdd0d4',
} as const;

export const emailBodyStyle: CSSProperties = {
  margin: '0 auto',
  backgroundColor: emailColors.pageBg,
  padding: '8px',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
};

export const emailContainerStyle: CSSProperties = {
  margin: '0 auto',
  maxWidth: '465px',
  borderSpacing: 'separate',
  borderRadius: '8px',
  border: `1px solid ${emailColors.cardBorder}`,
  backgroundColor: emailColors.white,
  padding: '20px',
};

export const emailBrandNameStyle: CSSProperties = {
  margin: '8px 0 16px 0',
  padding: 0,
  textAlign: 'center',
  fontSize: '18px',
  fontWeight: 600,
  color: emailColors.text,
};

export const emailTitleHeadingStyle: CSSProperties = {
  margin: '0 0 30px 0',
  padding: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: emailColors.text,
};

export const emailSectionHeadingStyle: CSSProperties = {
  margin: '8px 0 4px 0',
  padding: 0,
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '24px',
  color: emailColors.text,
};

export const emailSectionHeadingLooseStyle: CSSProperties = {
  margin: '28px 0 4px 0',
  padding: 0,
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '24px',
  color: emailColors.text,
};

export const emailSubsectionHeadingStyle: CSSProperties = {
  margin: '0 0 12px 0',
  padding: 0,
  fontSize: '16px',
  fontWeight: 600,
  color: emailColors.text,
};

export const emailTextStyle: CSSProperties = {
  margin: 0,
  fontSize: '14px',
  lineHeight: '24px',
  color: emailColors.text,
};

export const emailMutedTextStyle: CSSProperties = {
  margin: 0,
  fontSize: '12px',
  lineHeight: '24px',
  color: emailColors.muted,
};

export const emailMutedTextSpacedStyle: CSSProperties = {
  margin: '8px 0 0 0',
  fontSize: '12px',
  lineHeight: '24px',
  color: emailColors.muted,
};

export const emailAccentLinkStyle: CSSProperties = {
  color: emailColors.accentLink,
  textDecoration: 'underline',
};

export const emailInlineLinkStyle: CSSProperties = {
  color: emailColors.accentLink,
  textDecoration: 'none',
  fontWeight: 500,
};

export const emailListStyle: CSSProperties = {
  margin: 0,
  paddingLeft: '16px',
  fontSize: '14px',
  lineHeight: '24px',
  color: emailColors.text,
};

export const emailListItemStyle: CSSProperties = {
  marginBottom: '8px',
};

export const emailMutedLinkStyle: CSSProperties = {
  color: emailColors.muted,
  textDecoration: 'underline',
};

export const emailDividerStyles = {
  default: {
    border: 'none',
    borderTop: `1px solid ${emailColors.rule}`,
    margin: '20px 0',
    width: '100%',
  } satisfies CSSProperties,
  tight: {
    border: 'none',
    borderTop: `1px solid ${emailColors.rule}`,
    margin: '12px 0 20px 0',
    width: '100%',
  } satisfies CSSProperties,
};

const emailButtonBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  borderRadius: '6px',
  borderStyle: 'solid',
  borderWidth: '1px',
  padding: '6px 12px',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize: '14px',
  fontWeight: 500,
  lineHeight: '20px',
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export const emailPrimaryButtonStyle: CSSProperties = {
  ...emailButtonBaseStyle,
  marginTop: '16px',
  backgroundColor: emailColors.primary,
  borderColor: emailColors.primary,
  color: emailColors.white,
  boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.16), inset 0 -1px 2px 0 rgba(0, 0, 0, 0.12)',
};

export const emailSecondaryButtonStyle: CSSProperties = {
  ...emailButtonBaseStyle,
  marginTop: '16px',
  backgroundColor: emailColors.pageBg,
  borderColor: emailColors.cardBorder,
  color: emailColors.text,
  boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.28)',
};

export const emailCalendarButtonStyle: CSSProperties = {
  ...emailSecondaryButtonStyle,
  marginTop: 0,
  marginRight: '8px',
  verticalAlign: 'middle',
};

export const emailSocialSectionStyle: CSSProperties = {
  margin: '20px auto',
  maxWidth: '465px',
  textAlign: 'center',
};

export const emailSocialButtonStyle: CSSProperties = {
  display: 'inline-block',
  margin: '0 6px',
  borderRadius: '9999px',
  border: `1px solid ${emailColors.socialBorder}`,
  backgroundColor: emailColors.white,
  padding: '10px',
  lineHeight: 0,
  textDecoration: 'none',
};

export const emailCalloutStyle: CSSProperties = {
  margin: '20px 0',
  borderRadius: '8px',
  border: `1px solid ${emailColors.rule}`,
  backgroundColor: emailColors.secondaryBg,
  padding: '16px',
};

export const emailCalloutPlainStyle: CSSProperties = {
  margin: '20px 0',
  borderRadius: '8px',
  border: `1px solid ${emailColors.rule}`,
  padding: '16px',
};

export const emailCalloutLabelStyle: CSSProperties = {
  margin: '0 0 4px 0',
  fontSize: '12px',
  fontWeight: 600,
  lineHeight: '16px',
  textTransform: 'uppercase',
  color: emailColors.muted,
};

export const emailCalloutTitleStyle: CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: '20px',
  color: emailColors.text,
};

export const emailSmallMutedTextStyle: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: '24px',
  color: '#56595d',
};

export const emailDigestItemDividerStyle: CSSProperties = {
  marginTop: '16px',
  paddingTop: '16px',
  borderTop: `1px solid ${emailColors.rule}`,
};
