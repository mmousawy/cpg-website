import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      xs: '500px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-alt': 'var(--primary-alt)',
        background: 'var(--background)',
        'background-medium': 'var(--background-medium)',
        'background-light': 'var(--background-light)',
        foreground: 'var(--foreground)',
        'border-color': 'var(--border-color)',
        'border-color-strong': 'var(--border-color-strong)',
        'error-red': 'var(--error-red)',
        'challenge-badge': 'var(--challenge-badge)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
} satisfies Config;
