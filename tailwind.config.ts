import type { Config } from "tailwindcss";

export default {
  mode: "jit",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-alt': 'var(--primary-alt)',
        background: "var(--background)",
        'background-light': "var(--background-light)",
        foreground: "var(--foreground)",
        'border-color': "var(--border-color)",
      },
    },
  },
  plugins: [],
  darkMode: 'class',
} satisfies Config;
