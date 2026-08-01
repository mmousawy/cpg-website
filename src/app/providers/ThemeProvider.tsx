import { ThemeProvider } from '@wrksz/themes/next';

import { appThemes } from '@/hooks/useAppTheme';

const themes = appThemes;

export default async function ThemeProviderShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      themes={themes}
    >
      {children}
    </ThemeProvider>
  );
}
