import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      '2xs': '375px',
      xs: '500px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      fontFamily: {
        geist: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        heading: [
          'var(--font-cheria-heading)',
          'var(--font-geist-sans)',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      colors: {
        primary: 'var(--primary)',
        'primary-light': 'var(--primary-light)',
        'primary-alt': 'var(--primary-alt)',
        'special': 'var(--background-special)',
        background: 'var(--background)',
        'background-medium': 'var(--background-medium)',
        'background-light': 'var(--background-light)',
        'background-raised': 'var(--background-raised)',
        'background-float': 'var(--background-float)',
        'background-chip': 'var(--background-chip)',
        'avatar-fallback': 'var(--avatar-fallback)',
        'background-special': 'var(--background-special)',
        foreground: 'var(--foreground)',
        'border-color': 'var(--border-color)',
        'border-color-strong': 'var(--border-color-strong)',
        'error-red': 'var(--error-red)',
        'challenge-badge': 'var(--challenge-badge)',
      },
    },
  },
  plugins: [],
  // Class strategy only matches `.dark`. Midnight is a separate class on <html>,
  // so include it or `dark:` utilities (and plain `bg-white` behind them) stay light.
  darkMode: ['variant', '&:is(.dark *, .midnight *)'],
} satisfies Config;
